import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type PushRegistrationPayload = {
  expo_push_token?: string;
  platform?: string;
  active_provider?: 'garmin' | 'strava' | null;
  garmin_user_id?: string | null;
  strava_athlete_id?: number | null;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pushTokensTable =
    process.env.SUPABASE_PUSH_TOKENS_TABLE ?? 'push_tokens';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return { supabaseUrl, serviceRoleKey, pushTokensTable };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseBody(body: PushRegistrationPayload | null) {
  const expoPushToken = normalizeString(body?.expo_push_token);
  const platform = normalizeString(body?.platform);
  const activeProvider = normalizeString(body?.active_provider) as
    | 'garmin'
    | 'strava'
    | null;
  const garminUserId = normalizeString(body?.garmin_user_id);
  const stravaAthleteId = normalizeNumber(body?.strava_athlete_id);

  if (!expoPushToken) {
    throw new Error('Missing expo_push_token.');
  }

  if (!platform) {
    throw new Error('Missing platform.');
  }

  if (!garminUserId && !stravaAthleteId) {
    throw new Error(
      'Missing garmin_user_id or strava_athlete_id.',
    );
  }

  return {
    expo_push_token: expoPushToken,
    platform,
    active_provider: activeProvider,
    garmin_user_id: garminUserId,
    strava_athlete_id: stravaAthleteId,
  };
}

async function upsertPushToken(row: ReturnType<typeof parseBody>) {
  const { supabaseUrl, serviceRoleKey, pushTokensTable } = getSupabaseConfig();
  const nowIso = new Date().toISOString();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${pushTokensTable}?on_conflict=expo_push_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([
        {
          ...row,
          updated_at: nowIso,
        },
      ]),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to store push token. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }

  const rows = (await response.json().catch(() => [])) as Array<
    Record<string, unknown>
  >;
  return rows[0] ?? null;
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : 'Unexpected error while registering push token.';

  const status = message.startsWith('Missing ') ? 400 : 500;

  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as PushRegistrationPayload | null;
    const payload = parseBody(body);
    const row = await upsertPushToken(payload);

    return NextResponse.json({
      success: true,
      push_token: row?.expo_push_token ?? payload.expo_push_token,
      garmin_user_id: payload.garmin_user_id,
      strava_athlete_id: payload.strava_athlete_id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
