import { NextRequest, NextResponse } from 'next/server';
import { processGarminPing } from '@/lib/garmin/processActivities';
import { GarminPingPayload } from '@/lib/garmin/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let payload: GarminPingPayload;

  try {
    payload = (await request.json()) as GarminPingPayload;
  } catch {
    return NextResponse.json(
      { received: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  void processGarminPing(payload).catch((error) => {
    console.error('processGarminPing failed', error);
  });

  return NextResponse.json({ received: true });
}
