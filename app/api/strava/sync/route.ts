import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const STRAVA_BASE = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const REFRESH_BUFFER_SEC = 120;

function getHeartRateSampleIntervalSec() {
  const raw = process.env.STRAVA_HEART_RATE_SAMPLE_INTERVAL_SEC;
  const parsed = raw ? Math.floor(Number(raw)) : 5;
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(parsed, 60);
}

type SyncRequestBody = {
  athlete_id?: number;
  athleteId?: number;
  activity_id?: number;
  activityId?: number;
  limit?: number;
};

type StravaUserRow = {
  athlete_id: number;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

type StravaActivityUpsertRow = Record<string, unknown>;

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stravaUsersTable = process.env.SUPABASE_STRAVA_USERS_TABLE ?? 'strava_users';
  const stravaActivitiesTable =
    process.env.SUPABASE_STRAVA_ACTIVITIES_TABLE ?? 'strava_activities';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    stravaUsersTable,
    stravaActivitiesTable,
  };
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function sanitizeLimit(value: unknown): number {
  const limit = Math.floor(toNumber(value));
  if (!Number.isFinite(limit) || limit <= 0) return 30;
  return Math.min(limit, 50);
}

function parseAthleteId(body: SyncRequestBody | null) {
  const athleteId = Math.floor(toNumber(body?.athlete_id ?? body?.athleteId));
  return athleteId > 0 ? athleteId : null;
}

function parseActivityId(body: SyncRequestBody | null) {
  const activityId = Math.floor(toNumber(body?.activity_id ?? body?.activityId));
  return activityId > 0 ? activityId : null;
}

function extractActivityPhotoUrl(
  activity: { photos?: { primary?: { urls?: Record<string, string> | null } | null } | null },
): string | null {
  const urls = activity.photos?.primary?.urls;
  if (!urls) return null;

  const directBest = urls['2048'] ?? urls['1024'] ?? urls['600'];
  if (directBest) return directBest;

  const numericBest = Object.entries(urls)
    .filter(([key, value]) => Number.isFinite(Number(key)) && Boolean(value))
    .sort((a, b) => Number(b[0]) - Number(a[0]))[0]?.[1];
  if (numericBest) return numericBest;

  return (
    urls['100'] ??
    Object.values(urls).find((value) => typeof value === 'string') ??
    null
  );
}

async function loadStravaUserToken(athleteId: number) {
  const { supabaseUrl, serviceRoleKey, stravaUsersTable } = getSupabaseConfig();
  const lookupUrl =
    `${supabaseUrl}/rest/v1/${stravaUsersTable}` +
    `?select=athlete_id,access_token,refresh_token,expires_at` +
    `&athlete_id=eq.${athleteId}` +
    '&limit=1';

  const response = await fetch(lookupUrl, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to load Strava user token. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }

  const rows = (await response.json()) as StravaUserRow[];
  return rows[0] ?? null;
}

async function updateStravaUserToken(params: {
  athleteId: number;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  raw?: unknown;
}) {
  const { supabaseUrl, serviceRoleKey, stravaUsersTable } = getSupabaseConfig();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${stravaUsersTable}?on_conflict=athlete_id`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([
        {
          athlete_id: params.athleteId,
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
          expires_at: params.expiresAt,
          raw: params.raw ?? null,
          updated_at: new Date().toISOString(),
        },
      ]),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to update Strava user token. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }
}

async function refreshStravaAccessToken(refreshToken: string) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET.');
  }

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        athlete?: { id?: number };
        access_token?: string;
        refresh_token?: string;
        expires_at?: number;
      }
    | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'Failed to refresh Strava token.',
    );
  }

  return payload;
}

async function fetchStravaJson(path: string, accessToken: string) {
  const response = await fetch(`${STRAVA_BASE}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Strava request failed. path=${path}; status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }

  return response.json();
}

async function fetchActivityDetails(accessToken: string, activityId: number) {
  try {
    return (await fetchStravaJson(
      `/activities/${activityId}`,
      accessToken,
    )) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchActivityPhotos(accessToken: string, activityId: number) {
  try {
    const photos = (await fetchStravaJson(
      `/activities/${activityId}/photos?size=2048`,
      accessToken,
    )) as Array<{ urls?: Record<string, string> }>;
    const first = photos[0];
    if (!first?.urls) return null;

    const directBest =
      first.urls['2048'] ?? first.urls['1024'] ?? first.urls['600'];
    if (directBest) return directBest;

    const numericBest = Object.entries(first.urls)
      .filter(([key, value]) => Number.isFinite(Number(key)) && Boolean(value))
      .sort((a, b) => Number(b[0]) - Number(a[0]))[0]?.[1];
    if (numericBest) return numericBest;

    return (
      first.urls['100'] ??
      Object.values(first.urls).find((value) => typeof value === 'string') ??
      null
    );
  } catch {
    return null;
  }
}

async function fetchActivityLaps(accessToken: string, activityId: number) {
  try {
    const laps = (await fetchStravaJson(
      `/activities/${activityId}/laps`,
      accessToken,
    )) as Array<Record<string, unknown>>;

    return laps
      .map((lap, index) => {
        const distance = toNumber(lap.distance);
        const movingTime = toNumber(lap.moving_time);
        const elapsedTime = toNumber(lap.elapsed_time) || movingTime;
        if (distance <= 0 || movingTime <= 0) return null;

        return {
          id: toNumber(lap.id) || null,
          name: typeof lap.name === 'string' ? lap.name : null,
          lap_index:
            typeof lap.lap_index === 'number'
              ? lap.lap_index
              : typeof lap.split === 'number'
                ? lap.split
                : index + 1,
          distance,
          moving_time: movingTime,
          elapsed_time: elapsedTime,
          average_speed:
            typeof lap.average_speed === 'number' ? lap.average_speed : null,
          average_heartrate:
            typeof lap.average_heartrate === 'number'
              ? lap.average_heartrate
              : null,
          max_heartrate:
            typeof lap.max_heartrate === 'number' ? lap.max_heartrate : null,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchActivityHeartRateStream(
  accessToken: string,
  activityId: number,
) {
  try {
    const streams = (await fetchStravaJson(
      `/activities/${activityId}/streams?keys=time,heartrate&key_by_type=true`,
      accessToken,
    )) as {
      time?: { data?: number[] };
      heartrate?: { data?: number[] };
    };

    const time = streams.time?.data ?? [];
    const heartrate = streams.heartrate?.data ?? [];
    const count = Math.min(time.length, heartrate.length);
    const sampleIntervalSec = getHeartRateSampleIntervalSec();

    const points: Array<{ seconds: number; bpm: number }> = [];
    let lastSampledSecond = -sampleIntervalSec;
    let sampleCount = 0;
    let maxHeartrate: number | null = null;
    for (let i = 0; i < count; i += 1) {
      const seconds = time[i];
      const bpm = heartrate[i];
      if (
        typeof seconds !== 'number' ||
        !Number.isFinite(seconds) ||
        typeof bpm !== 'number' ||
        !Number.isFinite(bpm)
      ) {
        continue;
      }

      const roundedBpm = Math.round(bpm);
      sampleCount += 1;
      maxHeartrate =
        maxHeartrate === null ? roundedBpm : Math.max(maxHeartrate, roundedBpm);

      const roundedSeconds = Math.max(0, Math.round(seconds));
      if (roundedSeconds - lastSampledSecond < sampleIntervalSec) {
        continue;
      }

      points.push({
        seconds: roundedSeconds,
        bpm: roundedBpm,
      });
      lastSampledSecond = roundedSeconds;
    }

    return {
      points,
      sampleCount,
      maxHeartrate,
    };
  } catch {
    return {
      points: [],
      sampleCount: 0,
      maxHeartrate: null,
    };
  }
}

async function upsertStravaActivities(rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const { supabaseUrl, serviceRoleKey, stravaActivitiesTable } =
    getSupabaseConfig();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${stravaActivitiesTable}?on_conflict=activity_id`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to upsert Strava activities. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }
}

async function deleteStravaActivity(athleteId: number, activityId: number) {
  const { supabaseUrl, serviceRoleKey, stravaActivitiesTable } =
    getSupabaseConfig();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${stravaActivitiesTable}?activity_id=eq.${activityId}&athlete_id=eq.${athleteId}`,
    {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=minimal',
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to delete Strava activity. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }
}

async function buildActivityRow(
  athleteId: number,
  activity: Record<string, unknown>,
  accessToken: string,
) {
  const activityId = Math.floor(toNumber(activity.id));
  if (!activityId) return null;

  const [detail, photoUrl, laps, heartRate] = await Promise.all([
    fetchActivityDetails(accessToken, activityId),
    fetchActivityPhotos(accessToken, activityId),
    fetchActivityLaps(accessToken, activityId),
    fetchActivityHeartRateStream(accessToken, activityId),
  ]);

  const detailMap =
    detail?.map && typeof detail.map === 'object'
      ? (detail.map as { summary_polyline?: string })
      : null;
  const summaryMap =
    activity.map && typeof activity.map === 'object'
      ? (activity.map as { summary_polyline?: string })
      : null;
  const photosPayload =
    detail?.photos && typeof detail.photos === 'object'
      ? detail.photos
      : activity.photos && typeof activity.photos === 'object'
        ? activity.photos
        : null;

  const row: StravaActivityUpsertRow = {
    activity_id: activityId,
    athlete_id: athleteId,
    name:
      (typeof activity.name === 'string' && activity.name.trim()) ||
      (typeof detail?.name === 'string' && detail.name.trim()) ||
      `Strava ${activityId}`,
    distance: toNumber(activity.distance ?? detail?.distance),
    moving_time: Math.round(
      toNumber(activity.moving_time ?? detail?.moving_time),
    ),
    elapsed_time: Math.round(
      toNumber(activity.elapsed_time ?? detail?.elapsed_time),
    ),
    total_elevation_gain: toNumber(
      activity.total_elevation_gain ?? detail?.total_elevation_gain,
    ),
    type:
      (typeof activity.type === 'string' && activity.type) ||
      (typeof detail?.type === 'string' && detail.type) ||
      'Workout',
    start_date:
      (typeof activity.start_date === 'string' && activity.start_date) ||
      (typeof detail?.start_date === 'string' && detail.start_date) ||
      new Date().toISOString(),
    timezone:
      (typeof activity.timezone === 'string' && activity.timezone) ||
      (typeof detail?.timezone === 'string' && detail.timezone) ||
      null,
    average_speed: toNumber(activity.average_speed ?? detail?.average_speed),
    average_cadence:
      typeof detail?.average_cadence === 'number'
        ? detail.average_cadence
        : typeof activity.average_cadence === 'number'
          ? activity.average_cadence
          : null,
    average_heartrate:
      typeof detail?.average_heartrate === 'number'
        ? detail.average_heartrate
        : typeof activity.average_heartrate === 'number'
          ? activity.average_heartrate
          : null,
    kilojoules:
      typeof detail?.kilojoules === 'number'
        ? detail.kilojoules
        : typeof activity.kilojoules === 'number'
          ? activity.kilojoules
          : null,
    calories:
      typeof detail?.calories === 'number'
        ? detail.calories
        : typeof activity.calories === 'number'
          ? activity.calories
          : null,
    location_city:
      (typeof detail?.location_city === 'string' && detail.location_city) ||
      (typeof activity.location_city === 'string' && activity.location_city) ||
      null,
    location_state:
      (typeof detail?.location_state === 'string' && detail.location_state) ||
      (typeof activity.location_state === 'string' && activity.location_state) ||
      null,
    location_country:
      (typeof detail?.location_country === 'string' &&
        detail.location_country) ||
      (typeof activity.location_country === 'string' &&
        activity.location_country) ||
      null,
    device_name:
      (typeof detail?.device_name === 'string' && detail.device_name) ||
      (typeof activity.device_name === 'string' && activity.device_name) ||
      null,
    summary_polyline:
      detailMap?.summary_polyline ?? summaryMap?.summary_polyline ?? null,
    start_latlng:
      (Array.isArray(detail?.start_latlng)
        ? detail.start_latlng
        : Array.isArray(activity.start_latlng)
          ? activity.start_latlng
          : null) ?? null,
    end_latlng:
      (Array.isArray(detail?.end_latlng)
        ? detail.end_latlng
        : Array.isArray(activity.end_latlng)
          ? activity.end_latlng
          : null) ?? null,
    photo_url:
      photoUrl ||
      (detail ? extractActivityPhotoUrl(detail as never) : null) ||
      extractActivityPhotoUrl(activity as never),
    photos: photosPayload,
    laps,
    max_heartrate:
      heartRate.maxHeartrate ??
      (typeof detail?.max_heartrate === 'number'
        ? detail.max_heartrate
        : typeof activity.max_heartrate === 'number'
          ? activity.max_heartrate
          : null),
    heart_rate_samples_count: heartRate.sampleCount,
    heart_rate_stream: heartRate.points,
    raw_summary: activity,
    raw_detail: detail,
    updated_at: new Date().toISOString(),
  };

  return row;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as SyncRequestBody | null;
    const athleteId = parseAthleteId(body);
    if (!athleteId) {
      return NextResponse.json(
        { success: false, error: 'Missing athlete_id in request body.' },
        { status: 400 },
      );
    }

    const limit = sanitizeLimit(body?.limit);
    const activityId = parseActivityId(body);
    const connection = await loadStravaUserToken(athleteId);

    if (!connection?.access_token) {
      return NextResponse.json(
        { success: false, error: 'Strava user not connected or token missing.' },
        { status: 404 },
      );
    }

    let accessToken = connection.access_token;
    let refreshToken = connection.refresh_token;
    let expiresAt = connection.expires_at ?? 0;
    const nowSec = Math.floor(Date.now() / 1000);

    if (refreshToken && (!expiresAt || expiresAt <= nowSec + REFRESH_BUFFER_SEC)) {
      const refreshed = await refreshStravaAccessToken(refreshToken);
      accessToken = refreshed.access_token ?? accessToken;
      refreshToken = refreshed.refresh_token ?? refreshToken;
      expiresAt = refreshed.expires_at ?? expiresAt;

      await updateStravaUserToken({
        athleteId,
        accessToken,
        refreshToken,
        expiresAt,
        raw: refreshed,
      });
    }

    const summaries = activityId
      ? [
          ((await fetchStravaJson(
            `/activities/${activityId}`,
            accessToken,
          )) as Record<string, unknown>),
        ]
      : ((await fetchStravaJson(
          `/athlete/activities?per_page=${limit}`,
          accessToken,
        )) as Array<Record<string, unknown>>);

    const rawRows = await Promise.all(
      summaries.map((activity) => buildActivityRow(athleteId, activity, accessToken)),
    );

    const rows: StravaActivityUpsertRow[] = [];
    rawRows.forEach((row) => {
      if (row) {
        rows.push(row);
      }
    });

    await upsertStravaActivities(rows);

    return NextResponse.json({
      success: true,
      athlete_id: athleteId,
      activity_id: activityId,
      synced: rows.length,
      limit,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected Strava sync error.';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as SyncRequestBody | null;
    const athleteId = parseAthleteId(body);
    const activityId = parseActivityId(body);

    if (!athleteId || !activityId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing athlete_id or activity_id in request body.',
        },
        { status: 400 },
      );
    }

    await deleteStravaActivity(athleteId, activityId);

    return NextResponse.json({
      success: true,
      athlete_id: athleteId,
      activity_id: activityId,
      deleted: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected Strava delete error.';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
