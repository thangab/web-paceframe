import {
  GarminPingPayload,
  GarminActivityPayload,
  GarminActivitySummary,
  GarminActivityDetailPayload,
  GarminActivityDetail,
} from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TABLE_ACTIVITIES = "garmin_activities";
const TABLE_DETAILS = "garmin_activity_details";

function getEnv(): { supabaseUrl: string; supabaseKey: string } {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY };
}

function toDate(seconds?: number): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function getUserId(item: { userId?: string }, fallback?: string): string | undefined {
  return item.userId ?? fallback;
}

async function supabaseInsert<T extends object>(table: string, rows: T[]): Promise<void> {
  if (!rows.length) {
    return;
  }

  const { supabaseUrl, supabaseKey } = getEnv();

  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Supabase insert failed for ${table}: status=${res.status}; body=${details}`);
  }
}

function mapActivitySummaryRow(item: GarminActivitySummary, userId: string) {
  if (item.summaryId === undefined || item.summaryId === null) {
    throw new Error("Missing summaryId in activity summary payload");
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

function mapActivityDetailsRow(item: GarminActivityDetail, userId: string) {
  if (item.summaryId === undefined || item.summaryId === null) {
    throw new Error("Missing summaryId in activityDetails payload");
  }

  return {
    garmin_user_id: userId,
    summary_id: String(item.summaryId),
    activity_id: item.activityId ?? null,
    start_time: toDate(item.startTimeInSeconds),
    device_name: item.deviceName ?? null,
    samples: item.samples ?? [],
    raw_json: item,
  };
}

export async function processActivities(
  items: GarminActivityPayload[],
  fallbackUserId?: string,
): Promise<void> {
  for (const item of items) {
    const userId = getUserId(item, fallbackUserId);

    if (!userId) {
      console.warn("Garmin activities item skipped: missing userId", { item });
      continue;
    }

    let rows: ReturnType<typeof mapActivitySummaryRow>[] = [];

    try {
      rows = [mapActivitySummaryRow(item, userId)];
    } catch {
      console.warn("Garmin activities item has no direct summary payload", { item });
      rows = [];
    }

    await supabaseInsert(TABLE_ACTIVITIES, rows);
  }
}

export async function processActivityDetails(
  items: GarminActivityDetailPayload[],
  fallbackUserId?: string,
): Promise<void> {
  for (const item of items) {
    const userId = getUserId(item, fallbackUserId);

    if (!userId) {
      console.warn("Garmin activityDetails item skipped: missing userId", { item });
      continue;
    }

    let rows: ReturnType<typeof mapActivityDetailsRow>[] = [];

    try {
      rows = [mapActivityDetailsRow(item as GarminActivityDetail, userId)];
    } catch {
      console.warn("Garmin activityDetails item has no direct detail payload", { item });
      rows = [];
    }

    await supabaseInsert(TABLE_DETAILS, rows);
  }
}

export async function processGarminPing(payload: GarminPingPayload): Promise<void> {
  const activities = Array.isArray(payload.activities) ? payload.activities : [];
  const activityDetails = Array.isArray(payload.activityDetails) ? payload.activityDetails : [];
  const payloadUserId = payload.userId;

  console.log("Garmin ping payload received", {
    activitiesCount: activities.length,
    activityDetailsCount: activityDetails.length,
    hasPayloadUserId: !!payloadUserId,
  });

  await Promise.all([
    processActivities(activities, payloadUserId),
    processActivityDetails(activityDetails, payloadUserId),
  ]);
}
