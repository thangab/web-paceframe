import { NextRequest, NextResponse } from "next/server";
import { processGarminPingPayload } from "@/lib/garmin/processActivities";
import { GarminPingPayload } from "@/lib/garmin/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let payload: GarminPingPayload | null = null;

  try {
    payload = (await request.json()) as GarminPingPayload;
  } catch {
    payload = null;
  }

  if (!payload || !Array.isArray(payload.activities) || payload.activities.length === 0) {
    const callbackURL = process.env.GARMIN_TEST_CALLBACK_URL;

    if (!callbackURL) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Provide a Garmin ping payload in body or set GARMIN_TEST_CALLBACK_URL in environment.",
        },
        { status: 400 }
      );
    }

    payload = {
      activities: [
        {
          userId: process.env.GARMIN_TEST_USER_ID ?? "test-user",
          callbackURL,
        },
      ],
    };
  }

  await processGarminPingPayload(payload);

  return NextResponse.json({ success: true, received: true });
}
