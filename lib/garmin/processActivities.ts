import {
  GarminPingPayload,
  GarminActivityPayload,
  GarminActivitySummary,
  GarminActivityDetailPayload,
  GarminActivityDetail,
} from './types';
import {
  buildVisualizationFromSamples,
  stripSamplesFromDetail,
} from './transformSamples';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TABLE_ACTIVITIES = 'garmin_activities';
const TABLE_DETAILS = 'garmin_activity_details';
const UPSERT_CONFLICT_COLUMNS: Partial<Record<string, string>> = {
  [TABLE_ACTIVITIES]: 'garmin_user_id,summary_id',
  [TABLE_DETAILS]: 'garmin_user_id,summary_id',
};

function getEnv(): { supabaseUrl: string; supabaseKey: string } {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  return { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY };
}

function toDate(seconds?: number): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function getUserId(
  item: { userId?: string },
  fallback?: string,
): string | undefined {
  return item.userId ?? fallback;
}

async function supabaseInsert<T extends object>(
  table: string,
  rows: T[],
): Promise<void> {
  if (!rows.length) {
    return;
  }

  const { supabaseUrl, supabaseKey } = getEnv();
  const conflictColumns = UPSERT_CONFLICT_COLUMNS[table];
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);

  if (conflictColumns) {
    url.searchParams.set('on_conflict', conflictColumns);
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(
      `Supabase insert failed for ${table}: status=${res.status}; body=${details}`,
    );
  }
}

function mapActivitySummaryRow(item: GarminActivitySummary, userId: string) {
  if (item.summaryId === undefined || item.summaryId === null) {
    throw new Error('Missing summaryId in activity summary payload');
  }

  return {
    garmin_user_id: userId,
    summary_id: String(item.summaryId),
    activity_id: item.activityId ?? null,

    activity_type: item.activityType ?? null,
    activity_name: item.activityName ?? null,

    start_time: toDate(item.startTimeInSeconds),
    start_time_in_seconds: item.startTimeInSeconds ?? null,

    duration_seconds: item.durationInSeconds ?? null,
    moving_duration_seconds: item.movingDurationInSeconds ?? null,

    distance_meters: item.distanceInMeters ?? null,

    average_speed_mps: item.averageSpeedInMetersPerSecond ?? null,
    max_speed_mps: item.maxSpeedInMetersPerSecond ?? null,
    average_pace_min_per_km: item.averagePaceInMinutesPerKilometer ?? null,

    average_hr_bpm: item.averageHeartRateInBeatsPerMinute ?? null,
    max_hr_bpm: item.maxHeartRateInBeatsPerMinute ?? null,

    active_kilocalories: item.activeKilocalories ?? null,

    total_elevation_gain_m: item.totalElevationGainInMeters ?? null,
    total_elevation_loss_m: item.totalElevationLossInMeters ?? null,

    device_name: item.deviceName ?? null,

    manual: item.manual ?? null,
    is_web_upload: item.isWebUpload ?? null,

    raw_json: item,
  };
}

export type GarminProcessResult = {
  attempted: number;
  inserted: number;
  skipped: number;
};

export async function processActivities(
  items: GarminActivityPayload[],
  fallbackUserId?: string,
): Promise<GarminProcessResult> {
  const result: GarminProcessResult = { attempted: 0, inserted: 0, skipped: 0 };

  for (const item of items) {
    const userId = getUserId(item, fallbackUserId);

    if (!userId) {
      console.warn('Garmin activities item skipped: missing userId', { item });
      result.skipped += 1;
      continue;
    }

    result.attempted += 1;
    let rows: ReturnType<typeof mapActivitySummaryRow>[] = [];

    try {
      rows = [mapActivitySummaryRow(item, userId)];
    } catch {
      console.warn('Garmin activities item has no direct summary payload', {
        item,
      });
      result.skipped += 1;
      rows = [];
    }

    await supabaseInsert(TABLE_ACTIVITIES, rows);
    result.inserted += rows.length;
  }

  return result;
}

export async function processActivityDetails(
  items: GarminActivityDetailPayload[],
  fallbackUserId?: string,
  activitySummaryUserIds?: Map<string, string>,
): Promise<GarminProcessResult> {
  const result: GarminProcessResult = {
    attempted: 0,
    inserted: 0,
    skipped: 0,
  };

  for (const item of items) {
    const derivedUserId =
      getUserId(item, fallbackUserId) ??
      (item.summaryId
        ? activitySummaryUserIds?.get(String(item.summaryId))
        : undefined) ??
      (item.activityId !== undefined
        ? activitySummaryUserIds?.get(`activity:${item.activityId}`)
        : undefined);

    if (!derivedUserId) {
      console.warn('Garmin activityDetails item skipped: missing userId', {
        item,
      });
      result.skipped += 1;
      continue;
    }

    result.attempted += 1;

    try {
      const detail = item as GarminActivityDetail;
      const summary = detail.summary ?? {};

      const samples = Array.isArray(detail.samples) ? detail.samples : [];

      const {
        summaryPolyline,
        hrSeries,
        paceSeries,
        gpsPointsCount,
        samplesCount,
      } = buildVisualizationFromSamples(samples);

      const row = {
        garmin_user_id: derivedUserId,

        summary_id:
          detail.summaryId ??
          (detail.activityId
            ? `${detail.activityId}-detail`
            : crypto.randomUUID()),

        activity_id: detail.activityId ?? null,

        start_time: summary.startTimeInSeconds
          ? new Date((summary.startTimeInSeconds ?? 0) * 1000).toISOString()
          : null,

        activity_type: summary.activityType ?? null,
        activity_name: summary.activityName ?? null,
        start_time_offset_in_seconds:
          summary.startTimeOffsetInSeconds ??
          detail.startTimeOffsetInSeconds ??
          null,
        duration_seconds: summary.durationInSeconds ?? null,
        moving_duration_seconds: summary.movingDurationInSeconds ?? null,
        distance_meters: summary.distanceInMeters ?? null,
        average_speed_mps: summary.averageSpeedInMetersPerSecond ?? null,
        max_speed_mps: summary.maxSpeedInMetersPerSecond ?? null,
        average_pace_min_per_km:
          summary.averagePaceInMinutesPerKilometer ?? null,
        max_pace_min_per_km: summary.maxPaceInMinutesPerKilometer ?? null,
        average_hr_bpm: summary.averageHeartRateInBeatsPerMinute ?? null,
        max_hr_bpm: summary.maxHeartRateInBeatsPerMinute ?? null,
        average_run_cadence_spm:
          summary.averageRunCadenceInStepsPerMinute ?? null,
        max_run_cadence_spm: summary.maxRunCadenceInStepsPerMinute ?? null,
        active_kilocalories: summary.activeKilocalories ?? null,
        total_elevation_gain_m: summary.totalElevationGainInMeters ?? null,
        total_elevation_loss_m: summary.totalElevationLossInMeters ?? null,
        steps: summary.steps ?? null,
        starting_latitude_in_degree: summary.startingLatitudeInDegree ?? null,
        starting_longitude_in_degree: summary.startingLongitudeInDegree ?? null,
        start_latlng:
          summary.startingLatitudeInDegree != null &&
          summary.startingLongitudeInDegree != null
            ? [
                summary.startingLatitudeInDegree,
                summary.startingLongitudeInDegree,
              ]
            : null,
        manual: summary.manual ?? null,
        is_web_upload: summary.isWebUpload ?? null,

        device_name: summary.deviceName ?? null,

        summary_polyline: summaryPolyline,
        hr_series: hrSeries,
        pace_series: paceSeries,

        gps_points_count: gpsPointsCount,
        samples_count: samplesCount,

        raw_json: stripSamplesFromDetail(detail),
      };

      await supabaseInsert(TABLE_DETAILS, [row]);

      result.inserted += 1;
    } catch (error) {
      console.error('Garmin activityDetails processing failed', {
        item,
        error,
      });

      result.skipped += 1;
    }
  }

  return result;
}

export type GarminPingProcessSummary = {
  activities: GarminProcessResult;
  activityDetails: GarminProcessResult;
};

export async function processGarminPing(
  payload: GarminPingPayload,
): Promise<GarminPingProcessSummary> {
  const activities = Array.isArray(payload.activities)
    ? payload.activities
    : [];
  const activityDetails = Array.isArray(payload.activityDetails)
    ? payload.activityDetails
    : [];
  const payloadUserId = payload.userId;

  const activitySummaryUserIds = new Map<string, string>();

  for (const activity of activities) {
    const userId = getUserId(activity, payloadUserId);
    if (!userId) {
      continue;
    }

    if (activity.summaryId !== undefined) {
      activitySummaryUserIds.set(String(activity.summaryId), userId);
    }

    if (activity.activityId !== undefined) {
      activitySummaryUserIds.set(`activity:${activity.activityId}`, userId);
    }
  }

  const [activitiesResult, activityDetailsResult] = await Promise.all([
    processActivities(activities, payloadUserId),
    processActivityDetails(
      activityDetails,
      payloadUserId,
      activitySummaryUserIds,
    ),
  ]);

  const summary: GarminPingProcessSummary = {
    activities: activitiesResult,
    activityDetails: activityDetailsResult,
  };

  console.log('Garmin ping payload received', {
    activitiesCount: activities.length,
    activityDetailsCount: activityDetails.length,
    hasPayloadUserId: !!payloadUserId,
    summary,
  });

  return summary;
}
