import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_GARMIN_API_BASE_URL = 'https://healthapi.garmin.com/wellness-api';
const BACKFILL_PATH = 'rest/backfill/activities';
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

function toBasicAuthHeader(consumerKey: string, consumerSecret: string) {
  const credentials = `${consumerKey}:${consumerSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export async function POST() {
  try {
    const baseUrl =
      process.env.GARMIN_API_BASE_URL ?? DEFAULT_GARMIN_API_BASE_URL;

    const consumerKey =
      process.env.GARMIN_CONSUMER_KEY ?? process.env.GARMIN_CLIENT_ID;
    const consumerSecret =
      process.env.GARMIN_CONSUMER_SECRET ?? process.env.GARMIN_CLIENT_SECRET;

    if (!consumerKey || !consumerSecret) {
      console.error('Garmin backfill missing credentials');

      return NextResponse.json(
        {
          success: false,
          error:
            'Missing GARMIN_CONSUMER_KEY/GARMIN_CONSUMER_SECRET (or GARMIN_CLIENT_ID/GARMIN_CLIENT_SECRET fallback).',
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

    url.searchParams.set('summaryStartTimeInSeconds', sevenDaysAgo.toString());

    url.searchParams.set('summaryEndTimeInSeconds', now.toString());

    console.log('Garmin backfill triggered', {
      summaryStartTimeInSeconds: sevenDaysAgo,
      summaryEndTimeInSeconds: now,
      url: url.toString(),
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: toBasicAuthHeader(consumerKey, consumerSecret),
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
