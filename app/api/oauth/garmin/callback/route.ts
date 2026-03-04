import { NextRequest, NextResponse } from "next/server";

const GARMIN_TOKEN_URL = "https://connectapi.garmin.com/di-oauth2-service/oauth/token";
const GARMIN_USER_ID_URL_DEFAULT = "https://apis.garmin.com/wellness-api/rest/user/id";
const DEFAULT_MOBILE_REDIRECT_URI = "paceframe://oauth/garmin/callback";

const OAUTH_STATE_COOKIE = "garmin_oauth_state";
const OAUTH_VERIFIER_COOKIE = "garmin_oauth_verifier";
const OAUTH_RETURN_URI_COOKIE = "garmin_oauth_return_uri";

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
  user?: {
    id?: string;
  };
};

function withQueryParams(baseUrl: string, params: Record<string, string | undefined>) {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(OAUTH_VERIFIER_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(OAUTH_RETURN_URI_COOKIE, "", { path: "/", maxAge: 0 });
}

function redirectWithError(
  mobileRedirectUri: string,
  code: string,
  description?: string
) {
  return withQueryParams(mobileRedirectUri, {
    provider: "garmin",
    status: "error",
    error: code,
    error_description: description,
  });
}

async function fetchGarminUserId(accessToken: string) {
  const userIdUrl = process.env.GARMIN_USER_ID_URL ?? GARMIN_USER_ID_URL_DEFAULT;
  const response = await fetch(userIdUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`status=${response.status}; body=${details.slice(0, 300)}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as GarminUserIdResponse;
    const userId = payload.userId ?? payload.user_id ?? payload.id ?? payload.user?.id;
    if (userId) {
      return userId;
    }
    throw new Error("Garmin user ID not found in JSON response.");
  }

  const rawText = (await response.text()).trim();
  if (!rawText) {
    throw new Error("Garmin user ID response was empty.");
  }

  // Some Garmin endpoints can return plain text identifiers.
  return rawText.replace(/^"|"$/g, "");
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? undefined;
  const returnedState = request.nextUrl.searchParams.get("state") ?? undefined;
  const error = request.nextUrl.searchParams.get("error") ?? undefined;
  const errorDescription =
    request.nextUrl.searchParams.get("error_description") ?? undefined;

  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
  const mobileRedirectUri =
    request.cookies.get(OAUTH_RETURN_URI_COOKIE)?.value ??
    process.env.GARMIN_MOBILE_REDIRECT_URI ??
    DEFAULT_MOBILE_REDIRECT_URI;

  if (error) {
    const redirectUrl = withQueryParams(mobileRedirectUri, {
      provider: "garmin",
      status: "error",
      error,
      error_description: errorDescription,
      state: returnedState,
    });

    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response);
    return response;
  }

  if (!code) {
    const response = NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        "missing_code",
        "Missing Garmin OAuth code in callback query parameters."
      )
    );
    clearOAuthCookies(response);
    return response;
  }

  if (!storedState || !returnedState || storedState !== returnedState) {
    const response = NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        "invalid_state",
        "Invalid OAuth state. Start the flow again."
      )
    );
    clearOAuthCookies(response);
    return response;
  }

  if (!codeVerifier) {
    const response = NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        "missing_code_verifier",
        "Missing PKCE code_verifier. Start the flow again."
      )
    );
    clearOAuthCookies(response);
    return response;
  }

  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri = process.env.GARMIN_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    const response = NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        "garmin_config_missing",
        "Missing GARMIN_CLIENT_ID or GARMIN_CLIENT_SECRET in environment variables."
      )
    );
    clearOAuthCookies(response);
    return response;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("code", code);
  body.set("code_verifier", codeVerifier);

  if (redirectUri) {
    body.set("redirect_uri", redirectUri);
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(GARMIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Garmin token exchange network error", error);
    const response = NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        "token_exchange_network_error",
        "Failed to reach Garmin token endpoint."
      )
    );
    clearOAuthCookies(response);
    return response;
  }

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text();
    console.error("Garmin token exchange failed", {
      status: tokenResponse.status,
      details,
    });

    const redirectUrl = redirectWithError(
      mobileRedirectUri,
      "token_exchange_failed",
      details.slice(0, 500)
    );

    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response);
    return response;
  }

  const tokenPayload = (await tokenResponse.json()) as GarminTokenResponse;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_GARMIN_USERS_TABLE ?? "garmin_users";

  if (!tokenPayload.access_token) {
    const response = NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        "missing_access_token",
        "Garmin token response did not include access_token."
      )
    );
    clearOAuthCookies(response);
    return response;
  }

  let garminUserId: string;
  try {
    garminUserId = await fetchGarminUserId(tokenPayload.access_token);
  } catch (error) {
    console.error("Garmin user id fetch failed", error);
    const response = NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        "garmin_user_id_fetch_failed",
        error instanceof Error ? error.message : "Unable to fetch Garmin user ID."
      )
    );
    clearOAuthCookies(response);
    return response;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    const redirectUrl = redirectWithError(
      mobileRedirectUri,
      "supabase_config_missing",
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );

    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response);
    return response;
  }

  const nowIso = new Date().toISOString();
  const expiresAt = tokenPayload.expires_in
    ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
    : null;
  const refreshTokenExpiresAt = tokenPayload.refresh_token_expires_in
    ? new Date(Date.now() + tokenPayload.refresh_token_expires_in * 1000).toISOString()
    : null;

  let dbResponse: Response;
  try {
    const dbUrl = `${supabaseUrl}/rest/v1/${table}?on_conflict=garmin_user_id`;
    const preferHeader = "resolution=merge-duplicates,return=minimal";

    dbResponse = await fetch(dbUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: preferHeader,
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
  } catch (error) {
    console.error("Supabase insert network error", error);
    const response = NextResponse.redirect(
      redirectWithError(
        mobileRedirectUri,
        "db_network_error",
        "Failed to reach Supabase REST API."
      )
    );
    clearOAuthCookies(response);
    return response;
  }

  if (!dbResponse.ok) {
    const details = await dbResponse.text();
    console.error("Supabase insert failed", {
      status: dbResponse.status,
      details,
    });

    const redirectUrl = redirectWithError(
      mobileRedirectUri,
      "db_insert_failed",
      details.slice(0, 500)
    );

    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response);
    return response;
  }

  const redirectUrl = withQueryParams(mobileRedirectUri, {
    provider: "garmin",
    status: "success",
    linked: "true",
    user_id: garminUserId,
    garmin_user_id: garminUserId,
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token,
    expires_in: tokenPayload.expires_in?.toString(),
  });

  const response = NextResponse.redirect(redirectUrl);
  clearOAuthCookies(response);
  return response;
}
