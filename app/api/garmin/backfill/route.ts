import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_GARMIN_API_BASE_URL = "https://apis.garmin.com/wellness-api";
const BACKFILL_PATH = "/rest/backfill/activities";
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

function toBasicAuthHeader(consumerKey: string, consumerSecret: string) {
  const credentials = `${consumerKey}:${consumerSecret}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export async function POST() {
  try {
    const baseUrl = process.env.GARMIN_API_BASE_URL ?? DEFAULT_GARMIN_API_BASE_URL;
    const consumerKey = process.env.GARMIN_CONSUMER_KEY;
    const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing GARMIN_CONSUMER_KEY or GARMIN_CONSUMER_SECRET.",
        },
        { status: 500 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - SEVEN_DAYS_IN_SECONDS;

    const url = new URL(BACKFILL_PATH, baseUrl);
    url.searchParams.set("summaryStartTimeInSeconds", String(sevenDaysAgo));
    url.searchParams.set("summaryEndTimeInSeconds", String(now));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: toBasicAuthHeader(consumerKey, consumerSecret),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    console.log("Garmin backfill response", {
      status: response.status,
      summaryStartTimeInSeconds: sevenDaysAgo,
      summaryEndTimeInSeconds: now,
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: "Garmin backfill request failed.",
          status: response.status,
          details: details.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Garmin backfill route error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error while requesting Garmin backfill.",
      },
      { status: 500 }
    );
  }
}
