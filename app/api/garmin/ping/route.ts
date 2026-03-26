import { NextRequest, NextResponse } from 'next/server';
import { processGarminPing } from '@/lib/garmin/processActivities';
import { GarminPingPayload } from '@/lib/garmin/types';

export const runtime = 'nodejs';

function extractGarminUserIds(payload: GarminPingPayload) {
  const userIds = new Set<string>();

  if (typeof payload.userId === 'string' && payload.userId.trim()) {
    userIds.add(payload.userId.trim());
  }

  const candidates = [
    ...(Array.isArray(payload.activities) ? payload.activities : []),
    ...(Array.isArray(payload.activityDetails) ? payload.activityDetails : []),
  ];

  for (const item of candidates) {
    if (typeof item.userId === 'string' && item.userId.trim()) {
      userIds.add(item.userId.trim());
    }
  }

  return [...userIds];
}

async function sendPushNotifications(
  request: NextRequest,
  garminUserIds: string[],
) {
  if (!garminUserIds.length) {
    console.log('Garmin ping push skipped: no user IDs extracted');
    return [];
  }

  const origin = request.nextUrl.origin;
  const pushBody = 'Turn it into a shareable visual';

  const results = await Promise.all(
    garminUserIds.map(async (garminUserId) => {
      try {
        const response = await fetch(`${origin}/api/push/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            garmin_user_id: garminUserId,
            title: 'Your activity is ready 🔥',
            body: pushBody,
            data: {
              provider: 'garmin',
              type: 'garmin_ping',
            },
          }),
          cache: 'no-store',
        });

        const result = (await response.json().catch(() => null)) as unknown;

        console.log('Garmin ping push send response', {
          garminUserId,
          result,
          status: response.status,
        });

        return {
          garminUserId,
          ok: response.ok,
          status: response.status,
        };
      } catch (error) {
        console.error('Garmin ping push send failed', {
          error,
          garminUserId,
        });

        return {
          garminUserId,
          ok: false,
          status: 500,
        };
      }
    }),
  );

  return results;
}

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
    console.log('Garmin ping process response', JSON.stringify(result));
    const hasActivityPayload =
      Array.isArray(payload.activities) && payload.activities.length > 0;
    const hasInsertedActivities =
      hasActivityPayload && result.activities.inserted > 0;
    const garminUserIds = extractGarminUserIds(payload);

    const pushResults = hasInsertedActivities
      ? await sendPushNotifications(request, garminUserIds)
      : [];

    return NextResponse.json({ received: true, result, pushResults });
  } catch (error) {
    console.error('processGarminPing failed', error);
    return NextResponse.json(
      { received: false, error: 'Failed to process Garmin ping payload.' },
      { status: 500 },
    );
  }
}
