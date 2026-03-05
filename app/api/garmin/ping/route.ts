import { NextRequest, NextResponse } from 'next/server';
import { processGarminPing } from '@/lib/garmin/processActivities';
import { GarminPingPayload } from '@/lib/garmin/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let payload: GarminPingPayload;
  let rawBody = '';

  try {
    rawBody = await request.text();
    console.log('Garmin ping raw payload', rawBody);
    payload = JSON.parse(rawBody) as GarminPingPayload;
  } catch {
    return NextResponse.json(
      { received: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  console.log('Garmin ping parsed payload', JSON.stringify(payload));

  try {
    const result = await processGarminPing(payload);
    console.log("Garmin ping process response", JSON.stringify(result));

    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error('processGarminPing failed', error);
    return NextResponse.json(
      { received: false, error: 'Failed to process Garmin ping payload.' },
      { status: 500 },
    );
  }
}
