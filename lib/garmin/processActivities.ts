import {
  GarminCallbackPayload,
  GarminPingActivity,
  GarminPingPayload,
  GarminSummaryActivity,
  NormalizedActivity,
} from "@/lib/garmin/types";

const GARMIN_PROVIDER = "garmin" as const;

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_ACTIVITIES_TABLE ?? "activities";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Garmin activities processing."
    );
  }

  return { supabaseUrl, serviceRoleKey, table };
}

function getGarminUsersTableName() {
  return process.env.SUPABASE_GARMIN_USERS_TABLE ?? "garmin_users";
}

function toProviderActivityId(activity: GarminSummaryActivity) {
  const value =
    activity.summaryId ?? activity.activityId ?? activity.activityUUID ?? activity.uuid;

  if (value === undefined || value === null) {
    return null;
  }

  const id = String(value).trim();
  return id.length > 0 ? id : null;
}

function toStartTimeIso(activity: GarminSummaryActivity) {
  if (typeof activity.startTimeInSeconds === "number") {
    return new Date(activity.startTimeInSeconds * 1000).toISOString();
  }

  if (typeof activity.startTimeInMilliseconds === "number") {
    return new Date(activity.startTimeInMilliseconds).toISOString();
  }

  return null;
}

function normalizeGarminActivity(
  userId: string,
  activity: GarminSummaryActivity
): NormalizedActivity | null {
  const providerActivityId = toProviderActivityId(activity);

  if (!providerActivityId) {
    return null;
  }

  return {
    user_id: userId,
    provider: GARMIN_PROVIDER,
    provider_activity_id: providerActivityId,
    activity_type: typeof activity.activityType === "string" ? activity.activityType : null,
    distance:
      typeof activity.distanceInMeters === "number" ? activity.distanceInMeters : null,
    duration:
      typeof activity.durationInSeconds === "number" ? activity.durationInSeconds : null,
    pace:
      typeof activity.averagePaceInMinutesPerKilometer === "number"
        ? activity.averagePaceInMinutesPerKilometer
        : null,
    device_name: typeof activity.deviceName === "string" ? activity.deviceName : null,
    start_time: toStartTimeIso(activity),
    raw_json: activity,
  };
}

function toInFilter(ids: string[]) {
  return ids
    .map((id) => `"${id.replaceAll('"', '\\"')}"`)
    .join(",");
}

async function fetchExistingActivityIds(ids: string[]) {
  if (ids.length === 0) {
    return new Set<string>();
  }

  const { supabaseUrl, serviceRoleKey, table } = getSupabaseConfig();
  const inFilter = toInFilter(ids);
  const existingUrl =
    `${supabaseUrl}/rest/v1/${table}` +
    `?select=provider_activity_id` +
    `&provider=eq.${GARMIN_PROVIDER}` +
    `&provider_activity_id=in.(${encodeURIComponent(inFilter)})`;

  const response = await fetch(existingUrl, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to check existing activities. status=${response.status}; body=${details.slice(
        0,
        500
      )}`
    );
  }

  const rows = (await response.json()) as Array<{ provider_activity_id?: string }>;
  return new Set(rows.map((row) => row.provider_activity_id).filter(Boolean) as string[]);
}

async function upsertActivities(activities: NormalizedActivity[]) {
  if (activities.length === 0) {
    return;
  }

  const { supabaseUrl, serviceRoleKey, table } = getSupabaseConfig();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=provider,provider_activity_id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(activities),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to upsert activities. status=${response.status}; body=${details.slice(0, 1000)}`
    );
  }
}

async function resolveKnownGarminUserId(garminUserId: string) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const garminUsersTable = getGarminUsersTableName();
  const lookupUrl =
    `${supabaseUrl}/rest/v1/${garminUsersTable}` +
    `?select=garmin_user_id` +
    `&garmin_user_id=eq.${encodeURIComponent(garminUserId)}` +
    `&limit=1`;

  const response = await fetch(lookupUrl, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to resolve Garmin user. status=${response.status}; body=${details.slice(0, 500)}`
    );
  }

  const rows = (await response.json()) as Array<{ garmin_user_id?: string }>;
  const row = rows[0];
  return row?.garmin_user_id ?? null;
}

export async function processGarminActivities(params: {
  userId: string;
  summaryType: string;
  activities: GarminSummaryActivity[];
}) {
  const { userId, summaryType, activities } = params;

  const normalized = activities
    .map((activity) => normalizeGarminActivity(userId, activity))
    .filter((activity): activity is NormalizedActivity => activity !== null);

  if (normalized.length === 0) {
    console.log("Activities processed", {
      provider: GARMIN_PROVIDER,
      userId,
      summaryType,
      received: activities.length,
      normalized: 0,
      inserted: 0,
      duplicates: 0,
    });
    return;
  }

  const ids = normalized.map((activity) => activity.provider_activity_id);
  const existing = await fetchExistingActivityIds(ids);

  const duplicates = normalized.filter((activity) =>
    existing.has(activity.provider_activity_id)
  );
  const toInsert = normalized.filter(
    (activity) => !existing.has(activity.provider_activity_id)
  );

  duplicates.forEach((activity) => {
    console.log("Duplicate activity skipped", {
      provider: GARMIN_PROVIDER,
      userId,
      providerActivityId: activity.provider_activity_id,
    });
  });

  await upsertActivities(toInsert);

  console.log("Activities processed", {
    provider: GARMIN_PROVIDER,
    userId,
    summaryType,
    received: activities.length,
    normalized: normalized.length,
    inserted: toInsert.length,
    duplicates: duplicates.length,
  });
}

async function processSinglePingActivity(activity: GarminPingActivity) {
  const userId = activity.userId;
  const callbackURL =
    activity.callbackURL ?? activity.callbackUrl ?? activity.callback_url;

  if (!userId || !callbackURL) {
    console.warn("Garmin ping activity missing required fields", {
      hasUserId: Boolean(userId),
      hasCallbackURL: Boolean(callbackURL),
      keys: Object.keys(activity),
    });
    return;
  }

  const knownGarminUserId = await resolveKnownGarminUserId(userId);

  if (!knownGarminUserId) {
    console.warn("Garmin ping user not linked yet, skipping payload", {
      garminUserId: userId,
      callbackURL,
    });
    return;
  }

  const callbackResponse = await fetch(callbackURL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!callbackResponse.ok) {
    const details = await callbackResponse.text();
    throw new Error(
      `Garmin callback fetch failed. status=${callbackResponse.status}; body=${details.slice(
        0,
        1000
      )}`
    );
  }

  const payload = (await callbackResponse.json()) as GarminCallbackPayload;

  console.log("Garmin callback fetched", {
    userId: knownGarminUserId,
    callbackURL,
    counts: {
      activities: payload.activities?.length ?? 0,
      activityDetails: payload.activityDetails?.length ?? 0,
      activityFiles: payload.activityFiles?.length ?? 0,
      moveIQActivities: payload.moveIQActivities?.length ?? 0,
    },
  });

  const summaryGroups: Array<{ summaryType: string; items: GarminSummaryActivity[] }> = [
    { summaryType: "activities", items: payload.activities ?? [] },
    { summaryType: "activityDetails", items: payload.activityDetails ?? [] },
    { summaryType: "activityFiles", items: payload.activityFiles ?? [] },
    { summaryType: "moveIQActivities", items: payload.moveIQActivities ?? [] },
  ];

  for (const group of summaryGroups) {
    if (group.items.length === 0) {
      continue;
    }

    await processGarminActivities({
      userId: knownGarminUserId,
      summaryType: group.summaryType,
      activities: group.items,
    });
  }
}

export async function processGarminPingPayload(payload: GarminPingPayload) {
  const activities = Array.isArray(payload.activities) ? payload.activities : [];
  const activityDetails = Array.isArray(payload.activityDetails)
    ? payload.activityDetails
    : [];
  const activityFiles = Array.isArray(payload.activityFiles)
    ? payload.activityFiles
    : [];
  const moveIQActivities = Array.isArray(payload.moveIQActivities)
    ? payload.moveIQActivities
    : [];

  const pingActivities = [
    ...activities,
    ...activityDetails,
    ...activityFiles,
    ...moveIQActivities,
  ];

  console.log("Garmin ping received", {
    activitiesCount: activities.length,
    activityDetailsCount: activityDetails.length,
    activityFilesCount: activityFiles.length,
    moveIQActivitiesCount: moveIQActivities.length,
    totalCallbacks: pingActivities.length,
  });

  await Promise.all(
    pingActivities.map(async (activity) => {
      try {
        await processSinglePingActivity(activity);
      } catch (error) {
        console.error("Garmin ping activity processing failed", {
          userId: activity.userId,
          callbackURL: activity.callbackURL,
          error,
        });
      }
    })
  );
}
