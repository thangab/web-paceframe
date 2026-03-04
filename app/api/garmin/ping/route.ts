import { NextRequest, NextResponse } from "next/server";
import { processGarminPingPayload } from "@/lib/garmin/processActivities";
import { GarminPingPayload } from "@/lib/garmin/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let payload: GarminPingPayload;

  try {
    payload = (await request.json()) as GarminPingPayload;
  } catch {
    // Garmin expects a fast 200 ack.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Respond immediately, then process callback URLs asynchronously.
  void processGarminPingPayload(payload);

  return NextResponse.json({ received: true }, { status: 200 });
}
