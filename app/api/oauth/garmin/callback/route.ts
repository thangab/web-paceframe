import { NextRequest, NextResponse } from 'next/server';

const GARMIN_TOKEN_URL =
  'https://connectapi.garmin.com/di-oauth2-service/oauth/token';
const GARMIN_USER_ID_URL_DEFAULT =
  'https://apis.garmin.com/wellness-api/rest/user/id';
const DEFAULT_MOBILE_REDIRECT_URI = 'paceframe://app/oauth';

type GarminTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  refresh_token_expires_in?: number;
};

type GarminUserIdResponse = {
  userId?: string;
  user_id?: string;
  id?: string;
  user?: { id?: string };
};

function withQueryParams(
  baseUrl: string,
  params: Record<string, string | undefined>,
) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

function redirectWithError(
  mobileRedirectUri: string,
  code: string,
  description?: string,
) {
  return withQueryParams(mobileRedirectUri, {
    provider: 'garmin',
    status: 'error',
    error: code,
    error_description: description,
  });
}

async function fetchGarminUserId(accessToken: string) {
  const userIdUrl =
    process.env.GARMIN_USER_ID_URL ?? GARMIN_USER_ID_URL_DEFAULT;
  const response = await fetch(userIdUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`status=${response.status}; body=${details.slice(0, 300)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as GarminUserIdResponse;
    const userId =
      payload.userId ?? payload.user_id ?? payload.id ?? payload.user?.id;
    if (userId) return userId;
    throw new Error('Garmin user ID not found in JSON response.');
  }

  const rawText = (await response.text()).trim();
  if (!rawText) throw new Error('Garmin user ID response was empty.');
  return rawText.replace(/^"|"$/g, '');
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') ?? undefined;
  const returnedState = request.nextUrl.searchParams.get('state') ?? undefined;
  const error = request.nextUrl.searchParams.get('error') ?? undefined;
  const errorDescription =
    request.nextUrl.searchParams.get('error_description') ?? undefined;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sessionTable =
    process.env.SUPABASE_GARMIN_OAUTH_SESSIONS_TABLE ?? 'garmin_oauth_sessions';
  const usersTable = process.env.SUPABASE_GARMIN_USERS_TABLE ?? 'garmin_users';
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri = process.env.GARMIN_REDIRECT_URI;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.redirect(
      redirectWithError(
        DEFAULT_MOBILE_REDIRECT_URI,
        'supabase_config_missing',
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
      ),
    );
  }

  let mobileRedirectUri = DEFAULT_MOBILE_REDIRECT_URI;

  if (error) {
    return NextResponse.redirect(
      withQueryParams(DEFAULT_MOBILE_REDIRECT_URI, {
        provider: 'garmin',
        status: 'error',
        error,
        error_description: errorDescription,
        state: returnedState,
      }),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      redirectWithError(
        DEFAULT_MOBILE_REDIRECT_URI,
        'missing_code',
        'Missing Garmin OAuth code in callback query parameters.',
      ),
    );
  }

  if (!returnedState) {
    return NextResponse.redirect(
      redirectWithError(
        DEFAULT_MOBILE_REDIRECT_URI,
        'missing_state',
        'Missing OAuth state.',
      ),
    );
  }

  const sessionLookupUrl =
    `${supabaseUrl}/rest/v1/${sessionTable}` +
    `?state=eq.${encodeURIComponent(returnedState)}&select=state,code_verifier,mobile_redirect_uri,expires_at&limit=1`;

  const sessionResponse = await fetch(sessionLookupUrl, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!sessionResponse.ok) {
    const details = await sessionResponse.text();
    return NextResponse.redirect(
      redirectWithError(
        DEFAULT_MOBILE_REDIRECT_URI,
        'session_lookup_failed',
        details.slice(0, 500),
      ),
    );
  }

  const sessions = (await sessionResponse.json()) as Array<{
    state: string;
    code_verifier: string;
    mobile_redirect_uri?: string | null;
    expires_at?: string | null;
  }>;

  const session = sessions[0];
  if (!session?.code_verifier) {
    return NextResponse.redirect(
      redirectWithError(
        DEFAULT_MOBILE_REDIRECT_URI,
        'invalid_state',
        'Unknown or expired OAuth state.',
      ),
    );
  }

  if (session.mobile_redirect_uri) {
    mobileRedirectUri = session.mobile_redirect_uri;
  }

  if (
    session.expires_at &&
    new Date(session.expires_at).getTime() < Date.now()
  ) {
    return NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        'expired_state',
        'OAuth session expired. Start again.',
      ),
    );
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        'garmin_config_missing',
        'Missing GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET, or GARMIN_REDIRECT_URI.',
      ),
    );
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('code', code);
  body.set('code_verifier', session.code_verifier);
  body.set('redirect_uri', redirectUri);

  const tokenResponse = await fetch(GARMIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text();
    return NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        'token_exchange_failed',
        details.slice(0, 500),
      ),
    );
  }

  const tokenPayload = (await tokenResponse.json()) as GarminTokenResponse;
  if (!tokenPayload.access_token) {
    return NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        'missing_access_token',
        'Garmin token response did not include access_token.',
      ),
    );
  }

  let garminUserId: string;
  try {
    garminUserId = await fetchGarminUserId(tokenPayload.access_token);
  } catch (error) {
    return NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        'garmin_user_id_fetch_failed',
        error instanceof Error
          ? error.message
          : 'Unable to fetch Garmin user ID.',
      ),
    );
  }

  const nowIso = new Date().toISOString();
  const expiresAt = tokenPayload.expires_in
    ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
    : null;
  const refreshTokenExpiresAt = tokenPayload.refresh_token_expires_in
    ? new Date(
        Date.now() + tokenPayload.refresh_token_expires_in * 1000,
      ).toISOString()
    : null;

  const dbUrl = `${supabaseUrl}/rest/v1/${usersTable}?on_conflict=garmin_user_id`;
  const dbResponse = await fetch(dbUrl, {
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
        access_token: tokenPayload.access_token,
        refresh_token: tokenPayload.refresh_token,
        token_type: tokenPayload.token_type,
        scope: tokenPayload.scope,
        expires_at: expiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
        updated_at: nowIso,
      },
    ]),
  });

  if (!dbResponse.ok) {
    const details = await dbResponse.text();
    return NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        'db_insert_failed',
        details.slice(0, 500),
      ),
    );
  }

  await fetch(
    `${supabaseUrl}/rest/v1/${sessionTable}?state=eq.${encodeURIComponent(returnedState)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  return NextResponse.redirect(
    withQueryParams(mobileRedirectUri, {
      provider: 'garmin',
      status: 'success',
      linked: 'true',
      user_id: garminUserId,
      garmin_user_id: garminUserId,
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
      expires_in: tokenPayload.expires_in?.toString(),
    }),
  );
}
