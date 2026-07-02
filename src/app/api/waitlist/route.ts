import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/huru/supabase";

// Public waitlist signup. Open CORS (no auth, only collects an email).
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  let email = "";
  let source = "waitlist";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    if (body?.source) source = String(body.source).slice(0, 60);
  } catch {
    try {
      const form = await req.formData();
      email = String(form.get("email") ?? "").trim().toLowerCase();
    } catch {
      // ignore
    }
  }

  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400, headers: CORS });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503, headers: CORS });
  }

  // upsert so repeat signups are a no-op success (not an error)
  const { error } = await supabase
    .from("waitlist")
    .upsert({ email, source }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
