import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_GARMIN_API_BASE_URL = 'https://apis.garmin.com/wellness-api';
const USER_REGISTRATION_PATH = 'rest/user/registration';
const GARMIN_OAUTH_TOKEN_URL =
  'https://connectapi.garmin.com/di-oauth2-service/oauth/token';

type DeregistrationPayload =
  | {
      garmin_user_id?: string;
      garminUserId?: string;
      user_id?: string;
      userId?: string;
      deregistrations?: unknown[];
      deregistration?: unknown;
      users?: unknown[];
    }
  | null;

type DeleteTarget = {
  table: string;
  filters: Record<string, string>;
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
};

type DeregistrationResult = {
  deletedByTable: Record<string, number>;
  garminUserIds: string[];
  registrations: Array<{
    garmin_user_id: string;
    garmin_registration_deleted: boolean;
    garmin_status: number | 'skipped';
  }>;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const garminUsersTable = process.env.SUPABASE_GARMIN_USERS_TABLE ?? 'garmin_users';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return { supabaseUrl, serviceRoleKey, garminUsersTable };
}

function extractUserId(candidate: unknown): string | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const rawUserId =
    record.garmin_user_id ??
    record.garminUserId ??
    record.user_id ??
    record.userId;

  if (typeof rawUserId !== 'string') {
    return null;
  }

  const normalized = rawUserId.trim();
  return normalized ? normalized : null;
}

function extractGarminUserIds(payload: DeregistrationPayload) {
  const userIds = new Set<string>();

  const directUserId = extractUserId(payload);
  if (directUserId) {
    userIds.add(directUserId);
  }

  const nestedCandidates = [
    ...(Array.isArray(payload?.deregistrations) ? payload.deregistrations : []),
    ...(Array.isArray(payload?.users) ? payload.users : []),
    ...(payload?.deregistration ? [payload.deregistration] : []),
  ];

  for (const candidate of nestedCandidates) {
    const userId = extractUserId(candidate);
    if (userId) {
      userIds.add(userId);
    }
  }

  return [...userIds];
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

async function callGarminDeleteRegistration(accessToken: string) {
  const baseUrl =
    process.env.GARMIN_API_BASE_URL ?? DEFAULT_GARMIN_API_BASE_URL;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(USER_REGISTRATION_PATH, normalizedBase);

  if (!url.hostname.includes('garmin.com')) {
    throw new Error(
      `GARMIN_API_BASE_URL must point to Garmin. Resolved URL: ${url.toString()}`,
    );
  }

  return fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    },
    cache: 'no-store',
  });
}

async function deleteRows(target: DeleteTarget) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${target.table}`);

  for (const [column, value] of Object.entries(target.filters)) {
    url.searchParams.set(column, `eq.${value}`);
  }

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to delete from ${target.table}. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }

  const deletedRows = (await response.json().catch(() => [])) as unknown[];
  return deletedRows.length;
}

function buildDeleteTargets(garminUserId: string): DeleteTarget[] {
  return [
    {
      table:
        process.env.SUPABASE_GARMIN_ACTIVITY_DETAILS_TABLE ??
        'garmin_activity_details',
      filters: { garmin_user_id: garminUserId },
    },
    {
      table: process.env.SUPABASE_GARMIN_ACTIVITIES_TABLE ?? 'garmin_activities',
      filters: { garmin_user_id: garminUserId },
    },
    {
      table: process.env.SUPABASE_ACTIVITIES_TABLE ?? 'activities',
      filters: {
        provider: 'garmin',
        user_id: garminUserId,
      },
    },
    {
      table: process.env.SUPABASE_GARMIN_USERS_TABLE ?? 'garmin_users',
      filters: { garmin_user_id: garminUserId },
    },
  ];
}

async function handleDeregistration(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as DeregistrationPayload;
  const garminUserIds = extractGarminUserIds(body);

  if (!garminUserIds.length) {
    throw new Error(
      'Missing Garmin user identifier. Expected garmin_user_id, garminUserId, user_id, or userId.',
    );
  }

  const deletedByTable: DeregistrationResult['deletedByTable'] = {};
  const registrations: DeregistrationResult['registrations'] = [];

  for (const garminUserId of garminUserIds) {
    const connection = await loadGarminUserToken(garminUserId);
    let garminStatus: number | 'skipped' = 'skipped';
    let registrationDeleted = false;

    if (connection?.access_token) {
      let accessToken = connection.access_token;
      let response = await callGarminDeleteRegistration(accessToken);

      if (response.status === 401 && connection.refresh_token) {
        const refreshed = await refreshGarminAccessToken(connection.refresh_token);
        if (!refreshed?.access_token) {
          throw new Error(
            `Failed to refresh Garmin token before deregistration for ${garminUserId}.`,
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

        response = await callGarminDeleteRegistration(accessToken);
      }

      garminStatus = response.status;

      if (response.ok || response.status === 404) {
        registrationDeleted = true;
      } else {
        const details = await response.text();
        throw new Error(
          `Garmin deregistration failed for ${garminUserId}. status=${response.status}; body=${details.slice(0, 500)}`,
        );
      }
    }

    for (const target of buildDeleteTargets(garminUserId)) {
      const deletedCount = await deleteRows(target);
      deletedByTable[target.table] =
        (deletedByTable[target.table] ?? 0) + deletedCount;
    }

    registrations.push({
      garmin_user_id: garminUserId,
      garmin_registration_deleted: registrationDeleted,
      garmin_status: garminStatus,
    });
  }

  return { deletedByTable, garminUserIds, registrations };
}

function errorResponse(error: unknown) {
  const isValidationError =
    error instanceof Error &&
    error.message.includes('Missing Garmin user identifier');

  return NextResponse.json(
    {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unexpected error while deleting Garmin user data.',
    },
    { status: isValidationError ? 400 : 500 },
  );
}

async function handleRequest(request: NextRequest) {
  try {
    const result = await handleDeregistration(request);

    return NextResponse.json({
      success: true,
      deleted_user_ids: result.garminUserIds,
      deleted_counts: result.deletedByTable,
      registrations: result.registrations,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
