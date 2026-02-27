import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewsletterBody = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as NewsletterBody | null;
  const rawEmail = body?.email?.trim().toLowerCase();

  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    return NextResponse.json(
      { message: "Invalid email address." },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_NEWSLETTER_TABLE ?? "newsletter_subscribers";

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        message:
          "Server configuration is incomplete. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      email: rawEmail,
      source: "website",
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    return NextResponse.json(
      {
        message:
          "Unable to save your email right now. Please try again later.",
        details: errorPayload,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Perfect, you'll be notified at launch.",
  });
}
