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

  console.log("Garmin activities raw", {
    userId,
    summaryType,
    count: activities.length,
    activities,
  });

  const normalizedCandidates = activities.map((activity) =>
    normalizeGarminActivity(userId, activity)
  );
  const normalized = normalizedCandidates.filter(
    (activity): activity is NormalizedActivity => activity !== null
  );
  const dropped = normalizedCandidates.length - normalized.length;

  if (normalized.length === 0) {
    console.log("Activities processed", {
      provider: GARMIN_PROVIDER,
      userId,
      summaryType,
      received: activities.length,
      normalized: 0,
      inserted: 0,
      duplicates: 0,
      dropped,
      droppedReason: "missing provider activity id (summaryId/activityId/activityUUID/uuid)",
      sampleKeys: activities[0] ? Object.keys(activities[0]) : [],
    });
    return;
  }

  await upsertActivities(normalized);

  console.log("Garmin activities DB upsert success", {
    provider: GARMIN_PROVIDER,
    userId,
    summaryType,
    upserted: normalized.length,
  });

  console.log("Activities processed", {
    provider: GARMIN_PROVIDER,
    userId,
    summaryType,
    received: activities.length,
    normalized: normalized.length,
    inserted: normalized.length,
    duplicates: "handled-by-upsert",
  });
}

async function processSinglePingActivity(activity: GarminPingActivity) {
  console.log("Garmin ping item raw", {
    activity,
  });

  const userId = extractUserId(activity);
  const callbackURL = extractCallbackUrl(activity);

  if (!userId) {
    console.warn("Garmin ping activity missing required fields", {
      hasUserId: Boolean(userId),
      hasCallbackURL: Boolean(callbackURL),
      keys: Object.keys(activity),
    });
    return;
  }

  const knownGarminUserId = await resolveKnownGarminUserId(userId);

  const effectiveUserId = knownGarminUserId ?? userId;

  if (!knownGarminUserId) {
    console.warn("Garmin ping user not linked in garmin_users, using ping userId directly", {
      garminUserId: userId,
      callbackURL,
    });
  }

  let summaryGroups: Array<{ summaryType: string; items: GarminSummaryActivity[] }> = [];

  if (callbackURL) {
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

    console.log("Garmin callback raw payload", {
      userId: knownGarminUserId,
      callbackURL,
      payload,
    });

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

    summaryGroups = [
      { summaryType: "activities", items: payload.activities ?? [] },
      { summaryType: "activityDetails", items: payload.activityDetails ?? [] },
      { summaryType: "activityFiles", items: payload.activityFiles ?? [] },
      { summaryType: "moveIQActivities", items: payload.moveIQActivities ?? [] },
    ];
  } else {
    const inlineActivities = extractInlineActivitiesFromPing(activity);

    console.log("Garmin ping inline payload detected", {
      userId: effectiveUserId,
      keys: Object.keys(activity),
      inlineCount: inlineActivities.length,
    });

    if (inlineActivities.length === 0) {
      console.warn("Garmin inline payload had no processable activity id", {
        userId: knownGarminUserId,
        keys: Object.keys(activity),
      });
    }

    summaryGroups = [
      {
        summaryType: "activityDetails",
        items: inlineActivities,
      },
    ];
  }

  for (const group of summaryGroups) {
    if (group.items.length === 0) {
      continue;
    }

    await processGarminActivities({
      userId: effectiveUserId,
      summaryType: group.summaryType,
      activities: group.items,
    });
  }
}

function extractInlineActivitiesFromPing(
  activity: GarminPingActivity
): GarminSummaryActivity[] {
  const summaryRaw =
    typeof activity.summary === "object" && activity.summary !== null
      ? (activity.summary as Record<string, unknown>)
      : null;

  const candidate: GarminSummaryActivity = summaryRaw
    ? {
        ...summaryRaw,
      }
    : ({ ...activity } as GarminSummaryActivity);

  // Ensure we still have an ID field for normalization/upsert.
  if (candidate.summaryId === undefined && activity.summaryId !== undefined) {
    candidate.summaryId = activity.summaryId as string | number;
  }
  if (candidate.activityId === undefined && activity.activityId !== undefined) {
    candidate.activityId = activity.activityId as string | number;
  }

  if (candidate.summaryId === undefined && candidate.activityId === undefined) {
    return [];
  }

  return [candidate];
}

function extractUserId(activity: GarminPingActivity) {
  const direct =
    activity.userId ?? activity.userID ?? activity.userid ?? undefined;
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct.trim();
  }

  for (const [key, value] of Object.entries(activity)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "userid" || normalizedKey === "user_id") {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }

  return undefined;
}

function extractCallbackUrl(source: Record<string, unknown>) {
  const directCandidates = [
    source.callbackURL,
    source.callbackUrl,
    source.callback_url,
    source.callbackURI,
    source.callbackUri,
    source.callback_uri,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes("callback") &&
      (normalizedKey.includes("url") || normalizedKey.includes("uri")) &&
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }
  }

  return undefined;
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

  const payloadCallbackUrl = extractCallbackUrl(payload as Record<string, unknown>);
  const pingActivities = [
    ...activities,
    ...activityDetails,
    ...activityFiles,
    ...moveIQActivities,
  ].map((activity) => {
    const callbackURL =
      extractCallbackUrl(activity as Record<string, unknown>) ?? payloadCallbackUrl;
    return callbackURL ? { ...activity, callbackURL } : activity;
  });

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
