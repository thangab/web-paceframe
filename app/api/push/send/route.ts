import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type SendPushPayload = {
  garmin_user_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};

type PushTokenRow = {
  expo_push_token: string;
};

type ExpoPushTicket =
  | {
      status: 'ok';
      id: string;
    }
  | {
      status: 'error';
      message?: string;
      details?: {
        error?: string;
      };
    };

type ExpoSendResponse = {
  data?: ExpoPushTicket[];
  errors?: Array<{ message?: string }>;
};

type ExpoReceipt =
  | {
      status: 'ok';
    }
  | {
      status: 'error';
      message?: string;
      details?: {
        error?: string;
      };
    };

type ExpoReceiptsResponse = {
  data?: Record<string, ExpoReceipt>;
  errors?: Array<{ message?: string }>;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pushTokensTable =
    process.env.SUPABASE_PUSH_TOKENS_TABLE ?? 'push_tokens';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return { supabaseUrl, serviceRoleKey, pushTokensTable };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseBody(body: SendPushPayload | null) {
  const garminUserId = normalizeString(body?.garmin_user_id);
  const title = normalizeString(body?.title) ?? 'PaceFrame';
  const message = normalizeString(body?.body) ?? '';
  const data = body?.data && typeof body.data === 'object' ? body.data : {};

  if (!garminUserId) {
    throw new Error('Missing garmin_user_id.');
  }

  if (!message) {
    throw new Error('Missing body.');
  }

  return {
    garminUserId,
    title,
    body: message,
    data,
  };
}

function isExpoPushToken(token: string) {
  return /^ExponentPushToken\[[A-Za-z0-9\-_]+\]$/.test(token);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function loadPushTokens(garminUserId: string) {
  const { supabaseUrl, serviceRoleKey, pushTokensTable } = getSupabaseConfig();
  const url =
    `${supabaseUrl}/rest/v1/${pushTokensTable}` +
    `?select=expo_push_token` +
    `&garmin_user_id=eq.${encodeURIComponent(garminUserId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to load push tokens. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }

  const rows = (await response.json()) as PushTokenRow[];
  return rows
    .map((row) => row.expo_push_token?.trim())
    .filter((token): token is string => Boolean(token));
}

async function deletePushToken(expoPushToken: string) {
  const { supabaseUrl, serviceRoleKey, pushTokensTable } = getSupabaseConfig();
  const url =
    `${supabaseUrl}/rest/v1/${pushTokensTable}` +
    `?expo_push_token=eq.${encodeURIComponent(expoPushToken)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to delete invalid push token. status=${response.status}; body=${details.slice(0, 500)}`,
    );
  }
}

async function sendExpoPushChunk(messages: unknown[]) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
    cache: 'no-store',
  });

  const result = (await response
    .json()
    .catch(() => null)) as ExpoSendResponse | null;

  if (!response.ok) {
    throw new Error(
      `Expo push send failed. status=${response.status}; body=${JSON.stringify(result).slice(0, 1000)}`,
    );
  }

  return result;
}

async function getExpoReceipts(ids: string[]) {
  if (!ids.length) {
    return {} as Record<string, ExpoReceipt>;
  }

  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ ids }),
    cache: 'no-store',
  });

  const result = (await response
    .json()
    .catch(() => null)) as ExpoReceiptsResponse | null;

  if (!response.ok) {
    throw new Error(
      `Expo receipts fetch failed. status=${response.status}; body=${JSON.stringify(result).slice(0, 1000)}`,
    );
  }

  return result?.data ?? {};
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : 'Unexpected error while sending push notification.';

  const status = message.startsWith('Missing ') ? 400 : 500;

  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as SendPushPayload | null;
    const payload = parseBody(body);

    const allTokens = await loadPushTokens(payload.garminUserId);
    const validTokens = allTokens.filter(isExpoPushToken);
    const invalidFormatTokens = allTokens.filter(
      (token) => !isExpoPushToken(token),
    );

    if (!validTokens.length) {
      return NextResponse.json(
        {
          success: false,
          error: `No valid Expo push tokens found for Garmin user ${payload.garminUserId}.`,
          invalid_format_tokens: invalidFormatTokens,
        },
        { status: 404 },
      );
    }

    const tokenChunks = chunkArray(validTokens, 100);
    const ticketsByToken = new Map<string, ExpoPushTicket>();

    for (const chunk of tokenChunks) {
      const messages = chunk.map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: {
          garmin_user_id: payload.garminUserId,
          ...payload.data,
        },
        sound: 'default',
      }));

      const result = await sendExpoPushChunk(messages);
      const tickets = result?.data ?? [];

      tickets.forEach((ticket, index) => {
        const token = chunk[index];
        if (token) {
          ticketsByToken.set(token, ticket);
        }
      });
    }

    const receiptIds = [...ticketsByToken.values()]
      .filter(
        (ticket): ticket is Extract<ExpoPushTicket, { status: 'ok' }> =>
          ticket.status === 'ok',
      )
      .map((ticket) => ticket.id);

    const receipts = await getExpoReceipts(receiptIds);

    const tokensToDelete = new Set<string>();

    for (const [token, ticket] of ticketsByToken.entries()) {
      if (ticket.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          tokensToDelete.add(token);
        }
        continue;
      }

      const receipt = receipts[ticket.id];
      if (
        receipt?.status === 'error' &&
        receipt.details?.error === 'DeviceNotRegistered'
      ) {
        tokensToDelete.add(token);
      }
    }

    for (const token of tokensToDelete) {
      await deletePushToken(token);
    }

    return NextResponse.json({
      success: true,
      garmin_user_id: payload.garminUserId,
      tokens_total: allTokens.length,
      tokens_valid: validTokens.length,
      tokens_invalid_format: invalidFormatTokens,
      tokens_deleted: [...tokensToDelete],
      tickets: Object.fromEntries(ticketsByToken),
      receipts,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
