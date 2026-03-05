import {
  GarminPingPayload,
  GarminActivitiesResponse,
  GarminActivityDetailsResponse,
  GarminActivitySummary,
  GarminActivityDetail,
} from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function toDate(seconds?: number): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

async function fetchActivities(url: string): Promise<GarminActivitiesResponse> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json() as Promise<GarminActivitiesResponse>;
}

async function fetchActivityDetails(
  url: string,
): Promise<GarminActivityDetailsResponse> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json() as Promise<GarminActivityDetailsResponse>;
}

async function supabaseInsert<T extends object>(
  table: string,
  rows: T[],
): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
}

export async function processGarminPing(
  payload: GarminPingPayload,
): Promise<void> {
  const activities = payload.activities ?? [];
  const activityDetails = payload.activityDetails ?? [];

  await Promise.all([
    processActivities(activities),
    processActivityDetails(activityDetails),
  ]);
}

async function processActivities(
  items: { userId: string; callbackURL: string }[],
): Promise<void> {
  for (const item of items) {
    const data = await fetchActivities(item.callbackURL);

    const rows = data.activities.map((activity: GarminActivitySummary) => ({
      garmin_user_id: item.userId,
      summary_id: activity.summaryId,
      activity_id: activity.activityId ?? null,

      activity_type: activity.activityType ?? null,
      activity_name: activity.activityName ?? null,

      start_time: toDate(activity.startTimeInSeconds),
      start_time_in_seconds: activity.startTimeInSeconds ?? null,

      duration_seconds: activity.durationInSeconds ?? null,
      moving_duration_seconds: activity.movingDurationInSeconds ?? null,

      distance_meters: activity.distanceInMeters ?? null,

      average_speed_mps: activity.averageSpeedInMetersPerSecond ?? null,
      max_speed_mps: activity.maxSpeedInMetersPerSecond ?? null,

      average_pace_min_per_km:
        activity.averagePaceInMinutesPerKilometer ?? null,

      average_hr_bpm: activity.averageHeartRateInBeatsPerMinute ?? null,
      max_hr_bpm: activity.maxHeartRateInBeatsPerMinute ?? null,

      active_kilocalories: activity.activeKilocalories ?? null,

      total_elevation_gain_m: activity.totalElevationGainInMeters ?? null,
      total_elevation_loss_m: activity.totalElevationLossInMeters ?? null,

      device_name: activity.deviceName ?? null,

      manual: activity.manual ?? null,
      is_web_upload: activity.isWebUpload ?? null,

      raw_json: activity,
    }));

    if (rows.length) {
      await supabaseInsert('garmin_activities', rows);
    }
  }
}

async function processActivityDetails(
  items: { userId: string; callbackURL: string }[],
): Promise<void> {
  for (const item of items) {
    const data = await fetchActivityDetails(item.callbackURL);

    const rows = data.activityDetails.map((detail: GarminActivityDetail) => ({
      garmin_user_id: item.userId,
      summary_id: detail.summaryId,
      activity_id: detail.activityId ?? null,

      start_time: toDate(detail.startTimeInSeconds),

      device_name: detail.deviceName ?? null,

      samples: detail.samples ?? [],

      raw_json: detail,
    }));

    if (rows.length) {
      await supabaseInsert('garmin_activity_details', rows);
    }
  }
}
