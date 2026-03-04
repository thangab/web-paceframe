import { NextRequest, NextResponse } from "next/server";

const GARMIN_TOKEN_URL = "https://connectapi.garmin.com/di-oauth2-service/oauth/token";
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
    return NextResponse.json(
      {
        message: "Missing Garmin OAuth code in callback query parameters.",
      },
      { status: 400 }
    );
  }

  if (!storedState || !returnedState || storedState !== returnedState) {
    return NextResponse.json(
      {
        message: "Invalid OAuth state. Start the flow again.",
      },
      { status: 400 }
    );
  }

  if (!codeVerifier) {
    return NextResponse.json(
      {
        message: "Missing PKCE code_verifier. Start the flow again.",
      },
      { status: 400 }
    );
  }

  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri = process.env.GARMIN_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        message:
          "Missing GARMIN_CLIENT_ID or GARMIN_CLIENT_SECRET in environment variables.",
      },
      { status: 500 }
    );
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

  const tokenResponse = await fetch(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text();

    const redirectUrl = withQueryParams(mobileRedirectUri, {
      provider: "garmin",
      status: "error",
      error: "token_exchange_failed",
      error_description: details.slice(0, 500),
    });

    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response);
    return response;
  }

  const tokenPayload = (await tokenResponse.json()) as GarminTokenResponse;

  // Keep secrets off URL by default. Set GARMIN_FORWARD_TOKENS_TO_MOBILE=true only if needed.
  const forwardTokens = process.env.GARMIN_FORWARD_TOKENS_TO_MOBILE === "true";

  const redirectUrl = withQueryParams(mobileRedirectUri, {
    provider: "garmin",
    status: "success",
    token_type: tokenPayload.token_type,
    expires_in: tokenPayload.expires_in?.toString(),
    scope: tokenPayload.scope,
    access_token: forwardTokens ? tokenPayload.access_token : undefined,
    refresh_token: forwardTokens ? tokenPayload.refresh_token : undefined,
    refresh_token_expires_in: forwardTokens
      ? tokenPayload.refresh_token_expires_in?.toString()
      : undefined,
  });

  const response = NextResponse.redirect(redirectUrl);
  clearOAuthCookies(response);
  return response;
}
