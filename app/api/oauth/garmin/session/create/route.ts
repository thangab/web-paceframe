import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const GARMIN_AUTHORIZE_URL = 'https://connect.garmin.com/oauth2Confirm';
const DEFAULT_MOBILE_REDIRECT_URI = 'paceframe://app/oauth';
const SESSION_TTL_SECONDS = 10 * 60;

function toBase64Url(input: Buffer) {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createCodeVerifier() {
  return toBase64Url(randomBytes(64));
}

function createCodeChallenge(codeVerifier: string) {
  return toBase64Url(createHash('sha256').update(codeVerifier).digest());
}

function createState() {
  return toBase64Url(randomBytes(32));
}

function isAllowedMobileRedirectUri(uri: string) {
  return uri.startsWith('paceframe://') || uri.startsWith('https://');
}

export async function POST(request: NextRequest) {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const redirectUri = process.env.GARMIN_REDIRECT_URI;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table =
    process.env.SUPABASE_GARMIN_OAUTH_SESSIONS_TABLE ?? 'garmin_oauth_sessions';

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { message: 'Missing GARMIN_CLIENT_ID or GARMIN_REDIRECT_URI.' },
      { status: 500 },
    );
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        message:
          'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
      },
      { status: 500 },
    );
  }

  let mobileRedirectUri = DEFAULT_MOBILE_REDIRECT_URI;
  try {
    const body = (await request.json()) as { return_to?: string };
    if (body.return_to && isAllowedMobileRedirectUri(body.return_to)) {
      mobileRedirectUri = body.return_to;
    }
  } catch {
    // keep default
  }

  const state = createState();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_SECONDS * 1000,
  ).toISOString();

  const dbUrl = `${supabaseUrl}/rest/v1/${table}`;
  const dbResponse = await fetch(dbUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify([
      {
        state,
        code_verifier: codeVerifier,
        mobile_redirect_uri: mobileRedirectUri,
        expires_at: expiresAt,
      },
    ]),
    cache: 'no-store',
  });

  if (!dbResponse.ok) {
    const details = await dbResponse.text();
    return NextResponse.json(
      { message: 'Failed to persist Garmin OAuth session.', details },
      { status: 500 },
    );
  }

  const authUrl = new URL(GARMIN_AUTHORIZE_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  return NextResponse.json({
    authUrl: authUrl.toString(),
    state,
  });
}
