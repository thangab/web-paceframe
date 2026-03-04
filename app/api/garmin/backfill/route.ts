import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_GARMIN_API_BASE_URL = 'https://apis.garmin.com/wellness-api';
const GARMIN_OAUTH_TOKEN_URL =
  'https://connectapi.garmin.com/di-oauth2-service/oauth/token';
const BACKFILL_PATH = 'rest/backfill/activities';

type BackfillRequestBody = {
  garmin_user_id?: string;
};

type GarminUserTokenRow = {
  garmin_user_id: string;
  access_token: string;
  refresh_token: string | null;
};

type GarminRefreshTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  scope?: string;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const garminUsersTable = process.env.SUPABASE_GARMIN_USERS_TABLE ?? 'garmin_users';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  return { supabaseUrl, serviceRoleKey, garminUsersTable };
}

async function loadGarminUserToken(garminUserId: string) {
  const { supabaseUrl, serviceRoleKey, garminUsersTable } = getSupabaseConfig();
  const lookupUrl =
    `${supabaseUrl}/rest/v1/${garminUsersTable}` +
    `?select=garmin_user_id,access_token,refresh_token` +
    `&garmin_user_id=eq.${encodeURIComponent(garminUserId)}` +
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
      `Failed to load Garmin user token. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }

  const rows = (await response.json()) as GarminUserTokenRow[];
  return rows[0] ?? null;
}

async function updateGarminUserToken(params: {
  garminUserId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number;
  refreshTokenExpiresIn?: number;
}) {
  const { supabaseUrl, serviceRoleKey, garminUsersTable } = getSupabaseConfig();
  const nowIso = new Date().toISOString();
  const expiresAt = params.expiresIn
    ? new Date(Date.now() + params.expiresIn * 1000).toISOString()
    : null;
  const refreshTokenExpiresAt = params.refreshTokenExpiresIn
    ? new Date(Date.now() + params.refreshTokenExpiresIn * 1000).toISOString()
    : null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${garminUsersTable}?on_conflict=garmin_user_id`,
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
          garmin_user_id: params.garminUserId,
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
          expires_at: expiresAt,
          refresh_token_expires_at: refreshTokenExpiresAt,
          updated_at: nowIso,
        },
      ]),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to update Garmin user token. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }
}

async function callBackfill(params: {
  baseUrl: string;
  accessToken: string;
  summaryStartTimeInSeconds: number;
  summaryEndTimeInSeconds: number;
}) {
  const normalizedBase = params.baseUrl.endsWith('/')
    ? params.baseUrl
    : `${params.baseUrl}/`;
  const url = new URL(BACKFILL_PATH, normalizedBase);

  if (!url.hostname.includes('garmin.com')) {
    throw new Error(
      `GARMIN_API_BASE_URL must point to Garmin. Resolved URL: ${url.toString()}`,
    );
  }

  url.searchParams.set(
    'summaryStartTimeInSeconds',
    params.summaryStartTimeInSeconds.toString(),
  );
  url.searchParams.set(
    'summaryEndTimeInSeconds',
    params.summaryEndTimeInSeconds.toString(),
  );

  return fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
}

async function refreshGarminAccessToken(refreshToken: string) {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('refresh_token', refreshToken);

  const response = await fetch(GARMIN_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to refresh Garmin token. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }

  const payload = (await response.json()) as GarminRefreshTokenResponse;

  if (!payload.access_token) {
    throw new Error('Garmin refresh response missing access_token.');
  }

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as BackfillRequestBody | null;
    const garminUserId = body?.garmin_user_id?.trim();

    if (!garminUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing garmin_user_id in request body.',
        },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.GARMIN_API_BASE_URL ?? DEFAULT_GARMIN_API_BASE_URL;

    const connection = await loadGarminUserToken(garminUserId);

    if (!connection || !connection.access_token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Garmin user not connected or token missing.',
        },
        { status: 404 },
      );
    }

    const currentDate = new Date();
    const currentMonthStart = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1, 0, 0, 0),
    );
    const previousMonthStart = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1, 0, 0, 0),
    );

    const summaryStartTimeInSeconds = Math.floor(
      previousMonthStart.getTime() / 1000,
    );
    const summaryEndTimeInSeconds =
      Math.floor(currentMonthStart.getTime() / 1000) - 1;

    let accessToken = connection.access_token;
    let response = await callBackfill({
      baseUrl,
      accessToken,
      summaryStartTimeInSeconds,
      summaryEndTimeInSeconds,
    });

    if (response.status === 401 && connection.refresh_token) {
      try {
        const refreshed = await refreshGarminAccessToken(connection.refresh_token);
        if (refreshed?.access_token) {
          accessToken = refreshed.access_token;
          await updateGarminUserToken({
            garminUserId,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token ?? connection.refresh_token,
            expiresIn: refreshed.expires_in,
            refreshTokenExpiresIn: refreshed.refresh_token_expires_in,
          });

          response = await callBackfill({
            baseUrl,
            accessToken,
            summaryStartTimeInSeconds,
            summaryEndTimeInSeconds,
          });
        }
      } catch (refreshError) {
        console.error('Garmin backfill refresh failed', refreshError);
      }
    }

    console.log('Garmin backfill response', {
      garminUserId,
      status: response.status,
      summaryStartTimeInSeconds,
      summaryEndTimeInSeconds,
    });

    if (!(response.status === 202 || response.status === 200 || response.status === 409)) {
      const details = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: 'Garmin backfill request failed.',
          status: response.status,
          details: details.slice(0, 1000),
        },
        { status: 502 },
      );
    }

    if (response.status === 409) {
      const details = await response.text();
      const isDuplicateBackfill = /duplicate backfill/i.test(details);

      if (isDuplicateBackfill) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: 'Backfill already requested for this time window.',
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Garmin backfill conflict.',
          status: response.status,
          details: details.slice(0, 1000),
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Garmin backfill route error', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error while requesting Garmin backfill.',
      },
      { status: 500 },
    );
  }
}
