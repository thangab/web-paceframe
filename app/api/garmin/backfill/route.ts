import { createHmac, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_GARMIN_API_BASE_URL = 'https://healthapi.garmin.com/wellness-api';
const BACKFILL_PATH = 'rest/backfill/activities';
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildOAuth1Header(params: {
  method: 'GET' | 'POST';
  url: string;
  queryParams: Record<string, string>;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
}) {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };

  if (params.token) {
    oauthParams.oauth_token = params.token;
  }

  const signatureParams = {
    ...params.queryParams,
    ...oauthParams,
  };

  const normalized = Object.entries(signatureParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');

  const signatureBaseString = [
    params.method.toUpperCase(),
    percentEncode(params.url),
    percentEncode(normalized),
  ].join('&');

  const signingKey = `${percentEncode(params.consumerSecret)}&${percentEncode(
    params.tokenSecret ?? '',
  )}`;

  const signature = createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  const authParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const authHeader = `OAuth ${Object.entries(authParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ')}`;

  return authHeader;
}

export async function POST() {
  try {
    const baseUrl =
      process.env.GARMIN_API_BASE_URL ?? DEFAULT_GARMIN_API_BASE_URL;

    const consumerKey = process.env.GARMIN_CLIENT_ID;
    const consumerSecret = process.env.GARMIN_CLIENT_SECRET;
    const token = process.env.GARMIN_TOKEN;
    const tokenSecret = process.env.GARMIN_TOKEN_SECRET;

    if (!consumerKey || !consumerSecret) {
      console.error('Garmin backfill missing credentials');

      return NextResponse.json(
        {
          success: false,
          error: 'Missing GARMIN_CLIENT_ID/GARMIN_CLIENT_SECRET.',
        },
        { status: 500 },
      );
    }

    // Calculate timestamps
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - SEVEN_DAYS_IN_SECONDS;

    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = new URL(BACKFILL_PATH, normalizedBase);

    if (!url.hostname.includes('garmin.com')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GARMIN_API_BASE_URL must point to a Garmin domain (e.g. https://healthapi.garmin.com/wellness-api).',
          resolvedUrl: url.toString(),
        },
        { status: 500 },
      );
    }

    const queryParams = {
      summaryStartTimeInSeconds: sevenDaysAgo.toString(),
      summaryEndTimeInSeconds: now.toString(),
    };

    url.searchParams.set(
      'summaryStartTimeInSeconds',
      queryParams.summaryStartTimeInSeconds,
    );
    url.searchParams.set(
      'summaryEndTimeInSeconds',
      queryParams.summaryEndTimeInSeconds,
    );

    const authorizationHeader = buildOAuth1Header({
      method: 'GET',
      url: new URL(BACKFILL_PATH, normalizedBase).toString(),
      queryParams,
      consumerKey,
      consumerSecret,
      token,
      tokenSecret,
    });

    console.log('Garmin backfill triggered', {
      summaryStartTimeInSeconds: sevenDaysAgo,
      summaryEndTimeInSeconds: now,
      url: url.toString(),
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: authorizationHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    console.log('Garmin backfill response', {
      status: response.status,
    });

    // Garmin normally returns 202 Accepted
    if (!(response.status === 202 || response.status === 200)) {
      const details = await response.text();

      console.error('Garmin backfill failed', {
        status: response.status,
        body: details.slice(0, 1000),
      });

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

    return NextResponse.json({
      success: true,
      message:
        'Garmin backfill requested successfully. Activities will be delivered via the ping webhook.',
      summaryStartTimeInSeconds: sevenDaysAgo,
      summaryEndTimeInSeconds: now,
    });
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
