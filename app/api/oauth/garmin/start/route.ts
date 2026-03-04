import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const GARMIN_AUTHORIZE_URL = "https://connect.garmin.com/oauth2Confirm";
const DEFAULT_MOBILE_REDIRECT_URI = "paceframe://oauth/garmin/callback";

const OAUTH_STATE_COOKIE = "garmin_oauth_state";
const OAUTH_VERIFIER_COOKIE = "garmin_oauth_verifier";
const OAUTH_RETURN_URI_COOKIE = "garmin_oauth_return_uri";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

function toBase64Url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createCodeVerifier() {
  return toBase64Url(randomBytes(64));
}

function createCodeChallenge(codeVerifier: string) {
  return toBase64Url(createHash("sha256").update(codeVerifier).digest());
}

function createState() {
  return toBase64Url(randomBytes(32));
}

function isAllowedMobileRedirectUri(uri: string) {
  return uri.startsWith("paceframe://") || uri.startsWith("https://");
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const configuredRedirectUri = process.env.GARMIN_REDIRECT_URI;

  if (!clientId) {
    return NextResponse.json(
      {
        message:
          "Missing GARMIN_CLIENT_ID. Add it to environment variables before starting OAuth.",
      },
      { status: 500 }
    );
  }

  const returnToFromQuery = request.nextUrl.searchParams.get("return_to") ?? undefined;
  const mobileRedirectUri =
    returnToFromQuery && isAllowedMobileRedirectUri(returnToFromQuery)
      ? returnToFromQuery
      : process.env.GARMIN_MOBILE_REDIRECT_URI ?? DEFAULT_MOBILE_REDIRECT_URI;

  const state = createState();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);

  const authorizeUrl = new URL(GARMIN_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", state);

  if (configuredRedirectUri) {
    authorizeUrl.searchParams.set("redirect_uri", configuredRedirectUri);
  }

  const response = NextResponse.redirect(authorizeUrl);

  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });

  response.cookies.set(OAUTH_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });

  response.cookies.set(OAUTH_RETURN_URI_COOKIE, mobileRedirectUri, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
