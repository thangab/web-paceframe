import { after, NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type StravaWebhookEvent = {
  aspect_type?: string;
  event_time?: number;
  object_id?: number;
  object_type?: string;
  owner_id?: number;
  subscription_id?: number;
  updates?: Record<string, unknown>;
};

function getVerifyToken() {
  const token = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (!token) {
    throw new Error('Missing STRAVA_WEBHOOK_VERIFY_TOKEN.');
  }

  return token;
}

function normalizeString(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

async function sendPushNotification(
  origin: string,
  stravaAthleteId: number,
  event: StravaWebhookEvent,
) {
  const response = await fetch(`${origin}/api/push/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      strava_athlete_id: stravaAthleteId,
      title: 'Your activity is ready 🔥',
      body: 'Turn it into a shareable visual',
      data: {
        provider: 'strava',
        type: 'strava_activity_created',
        aspect_type: event.aspect_type ?? null,
        object_type: event.object_type ?? null,
        activity_id: event.object_id ?? null,
        event_time: event.event_time ?? null,
        subscription_id: event.subscription_id ?? null,
      },
    }),
    cache: 'no-store',
  });

  const result = (await response.json().catch(() => null)) as unknown;

  return {
    ok: response.ok,
    status: response.status,
    result,
  };
}

async function syncStravaActivity(
  origin: string,
  athleteId: number,
  activityId: number,
) {
  const response = await fetch(`${origin}/api/strava/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      athlete_id: athleteId,
      activity_id: activityId,
    }),
    cache: 'no-store',
  });

  const result = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string }
    | null;

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.error ||
        `Failed to sync Strava activity. status=${response.status}`,
    );
  }

  return result;
}

async function deleteStravaActivity(
  origin: string,
  athleteId: number,
  activityId: number,
) {
  const response = await fetch(`${origin}/api/strava/sync`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      athlete_id: athleteId,
      activity_id: activityId,
    }),
    cache: 'no-store',
  });

  const result = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string }
    | null;

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.error ||
        `Failed to delete Strava activity. status=${response.status}`,
    );
  }

  return result;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableSyncError(error: unknown, activityId: number) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes(`path=/activities/${activityId}; status=404`) ||
    error.message.includes('status=429') ||
    error.message.includes('status=500') ||
    error.message.includes('status=502') ||
    error.message.includes('status=503') ||
    error.message.includes('status=504')
  );
}

async function syncStravaActivityWithRetry(
  origin: string,
  athleteId: number,
  activityId: number,
) {
  const retryDelaysMs = [1500, 4000, 8000];
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await syncStravaActivity(origin, athleteId, activityId);
    } catch (error) {
      lastError = error;
      if (
        attempt === retryDelaysMs.length ||
        !isRetryableSyncError(error, activityId)
      ) {
        throw error;
      }

      await wait(retryDelaysMs[attempt]);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to sync Strava activity after retries.');
}

async function processStravaWebhookEvent(
  origin: string,
  payload: StravaWebhookEvent,
) {
  const ownerId = payload.owner_id;
  const activityId = payload.object_id;

  if (!isInteger(ownerId)) {
    throw new Error('Missing owner_id.');
  }

  if (!isInteger(activityId)) {
    throw new Error('Missing object_id.');
  }

  if (payload.aspect_type === 'delete') {
    await deleteStravaActivity(origin, ownerId, activityId);
    return;
  }

  if (payload.aspect_type === 'create') {
    await syncStravaActivityWithRetry(origin, ownerId, activityId);
    await sendPushNotification(origin, ownerId, payload);
    return;
  }

  await syncStravaActivity(origin, ownerId, activityId);
}

export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get('hub.mode');
    const token = request.nextUrl.searchParams.get('hub.verify_token');
    const challenge = request.nextUrl.searchParams.get('hub.challenge');

    if (mode !== 'subscribe') {
      return NextResponse.json({ error: 'Invalid hub.mode.' }, { status: 400 });
    }

    if (token !== getVerifyToken()) {
      return NextResponse.json(
        { error: 'Invalid verify token.' },
        { status: 403 },
      );
    }

    const challengeValue = normalizeString(challenge);

    if (challengeValue === null) {
      return NextResponse.json(
        { error: 'Invalid hub.challenge.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ 'hub.challenge': challengeValue });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error while verifying Strava webhook.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let payload: StravaWebhookEvent | null = null;

  try {
    payload = (await request
      .json()
      .catch(() => null)) as StravaWebhookEvent | null;

    if (!payload) {
      return NextResponse.json(
        { received: false, error: 'Invalid JSON body.' },
        { status: 400 },
      );
    }

    console.log('Strava webhook payload', JSON.stringify(payload));

    const isActivityEvent = payload.object_type === 'activity';
    const isSupportedAspect =
      payload.aspect_type === 'create' ||
      payload.aspect_type === 'update' ||
      payload.aspect_type === 'delete';

    if (!isActivityEvent || !isSupportedAspect) {
      return NextResponse.json({
        received: true,
        skipped: true,
        reason: 'Unsupported Strava event.',
      });
    }

    if (!isInteger(payload.owner_id)) {
      return NextResponse.json(
        { received: false, error: 'Missing owner_id.' },
        { status: 400 },
      );
    }

    if (!isInteger(payload.object_id)) {
      return NextResponse.json(
        { received: false, error: 'Missing object_id.' },
        { status: 400 },
      );
    }

    const origin = request.nextUrl.origin;
    after(async () => {
      try {
        await processStravaWebhookEvent(origin, payload as StravaWebhookEvent);
      } catch (error) {
        console.error('Strava webhook background processing failed', {
          error,
          payload,
        });
      }
    });

    return NextResponse.json({
      received: true,
      scheduled: true,
    });
  } catch (error) {
    console.error('Strava webhook failed', {
      error,
      payload,
    });

    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error while processing Strava webhook.';

    return NextResponse.json(
      { received: false, error: message },
      { status: 500 },
    );
  }
}
