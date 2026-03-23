import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_GARMIN_API_BASE_URL = 'https://apis.garmin.com/wellness-api';
const USER_PERMISSIONS_PATH = 'rest/user/permissions';
const GARMIN_OAUTH_TOKEN_URL =
  'https://connectapi.garmin.com/di-oauth2-service/oauth/token';

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
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const garminUsersTable =
    process.env.SUPABASE_GARMIN_USERS_TABLE ?? 'garmin_users';
  const garminPermissionsTable =
    process.env.SUPABASE_GARMIN_USER_PERMISSIONS_TABLE ??
    'garmin_user_permissions';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return {
    garminPermissionsTable,
    garminUsersTable,
    serviceRoleKey,
    supabaseUrl,
  };
}

function getGarminUserId(request: NextRequest) {
  const garminUserId =
    request.nextUrl.searchParams.get('garmin_user_id') ??
    request.nextUrl.searchParams.get('garminUserId') ??
    request.nextUrl.searchParams.get('user_id') ??
    request.nextUrl.searchParams.get('userId');

  return garminUserId?.trim() || null;
}

async function getGarminUserIdFromBody(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        garmin_user_id?: string;
        garminUserId?: string;
        user_id?: string;
        userId?: string;
      }
    | null;

  const garminUserId =
    body?.garmin_user_id ??
    body?.garminUserId ??
    body?.user_id ??
    body?.userId;

  return garminUserId?.trim() || null;
}

async function loadGarminUserToken(garminUserId: string) {
  const { garminUsersTable, serviceRoleKey, supabaseUrl } = getSupabaseConfig();
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
  const { garminUsersTable, serviceRoleKey, supabaseUrl } = getSupabaseConfig();
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

async function callGarminUserPermissions(accessToken: string) {
  const baseUrl =
    process.env.GARMIN_API_BASE_URL ?? DEFAULT_GARMIN_API_BASE_URL;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(USER_PERMISSIONS_PATH, normalizedBase);

  if (!url.hostname.includes('garmin.com')) {
    throw new Error(
      `GARMIN_API_BASE_URL must point to Garmin. Resolved URL: ${url.toString()}`,
    );
  }

  return fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
}

function parsePermissions(payload: unknown) {
  if (!Array.isArray(payload)) {
    throw new Error('Garmin permissions response is not an array.');
  }

  return payload.filter((permission): permission is string => {
    return typeof permission === 'string' && permission.trim().length > 0;
  });
}

async function storePermissions(garminUserId: string, permissions: string[]) {
  const { garminPermissionsTable, serviceRoleKey, supabaseUrl } =
    getSupabaseConfig();
  const nowIso = new Date().toISOString();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${garminPermissionsTable}?on_conflict=garmin_user_id`,
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
          garmin_user_id: garminUserId,
          permissions,
          synced_at: nowIso,
          updated_at: nowIso,
        },
      ]),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to store Garmin permissions. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : 'Unexpected error while fetching Garmin permissions.';

  const status = message.includes('Missing Garmin user identifier')
    ? 400
    : message.includes('Garmin user not connected')
      ? 404
      : 500;

  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export async function GET(request: NextRequest) {
  try {
    const garminUserId = getGarminUserId(request);

    if (!garminUserId) {
      throw new Error(
        'Missing Garmin user identifier. Pass garmin_user_id in the query string, for example: /api/garmin/permissions?garmin_user_id=123456.',
      );
    }

    const connection = await loadGarminUserToken(garminUserId);

    if (!connection?.access_token) {
      throw new Error(`Garmin user not connected: ${garminUserId}.`);
    }

    let accessToken = connection.access_token;
    let response = await callGarminUserPermissions(accessToken);

    if (response.status === 401 && connection.refresh_token) {
      const refreshed = await refreshGarminAccessToken(connection.refresh_token);

      if (!refreshed?.access_token) {
        throw new Error(
          `Failed to refresh Garmin token before fetching permissions for ${garminUserId}.`,
        );
      }

      accessToken = refreshed.access_token;

      await updateGarminUserToken({
        garminUserId,
        accessToken,
        refreshToken: refreshed.refresh_token ?? connection.refresh_token,
        expiresIn: refreshed.expires_in,
        refreshTokenExpiresIn: refreshed.refresh_token_expires_in,
      });

      response = await callGarminUserPermissions(accessToken);
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Garmin permissions fetch failed for ${garminUserId}. status=${response.status}; body=${details.slice(0, 500)}`,
      );
    }

    const permissions = parsePermissions(await response.json());
    await storePermissions(garminUserId, permissions);

    return NextResponse.json({
      success: true,
      garmin_user_id: garminUserId,
      permissions,
    });
  } catch (error) {
    console.error('Garmin permissions route failed', {
      error: error instanceof Error ? error.message : error,
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
    });

    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const garminUserId = await getGarminUserIdFromBody(request);

    if (!garminUserId) {
      throw new Error(
        'Missing Garmin user identifier. Pass garmin_user_id in the JSON body, for example: { "garmin_user_id": "123456" }.',
      );
    }

    const connection = await loadGarminUserToken(garminUserId);

    if (!connection?.access_token) {
      throw new Error(`Garmin user not connected: ${garminUserId}.`);
    }

    let accessToken = connection.access_token;
    let response = await callGarminUserPermissions(accessToken);

    if (response.status === 401 && connection.refresh_token) {
      const refreshed = await refreshGarminAccessToken(connection.refresh_token);

      if (!refreshed?.access_token) {
        throw new Error(
          `Failed to refresh Garmin token before fetching permissions for ${garminUserId}.`,
        );
      }

      accessToken = refreshed.access_token;

      await updateGarminUserToken({
        garminUserId,
        accessToken,
        refreshToken: refreshed.refresh_token ?? connection.refresh_token,
        expiresIn: refreshed.expires_in,
        refreshTokenExpiresIn: refreshed.refresh_token_expires_in,
      });

      response = await callGarminUserPermissions(accessToken);
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Garmin permissions fetch failed for ${garminUserId}. status=${response.status}; body=${details.slice(0, 500)}`,
      );
    }

    const permissions = parsePermissions(await response.json());
    await storePermissions(garminUserId, permissions);

    return NextResponse.json({
      success: true,
      garmin_user_id: garminUserId,
      permissions,
    });
  } catch (error) {
    console.error('Garmin permissions route failed', {
      error: error instanceof Error ? error.message : error,
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
    });

    return errorResponse(error);
  }
}
