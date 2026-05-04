import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { signConsumerToken } from "@/lib/huru/consumer-token";
import { authenticateProject, resolveConsumer } from "@/lib/huru/store";

/**
 * POST: Preflight check — validates API key before starting OAuth flow.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    apiKey?: string;
  } | null;

  if (!body?.apiKey) {
    return NextResponse.json({ error: "Missing apiKey." }, { status: 400 });
  }

  const project = await authenticateProject(body.apiKey);
  if (!project) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET: Supabase OAuth callback — exchanges code for session,
 * resolves consumer, signs JWT, redirects to success page.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Decode state from URL params
  const rawState = url.searchParams.get("state") ?? "";
  let stateData: { apiKey?: string; origin?: string } = {};
  try {
    stateData = JSON.parse(atob(rawState));
  } catch {
    // state not parseable
  }

  const { apiKey, origin } = stateData;
  const errorRedirect = `${url.origin}/auth/consumer/success?error=auth_failed`;

  if (!code || !apiKey || !origin) {
    return NextResponse.redirect(errorRedirect);
  }

  // Validate API key
  const project = await authenticateProject(apiKey);
  if (!project) {
    return NextResponse.redirect(errorRedirect);
  }

  // Exchange OAuth code for Supabase session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(errorRedirect);
  }

  const response = NextResponse.redirect(
    `${url.origin}/auth/consumer/success?pending=1`,
  );

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") ?? "";
        return cookieHeader
          .split(";")
          .filter(Boolean)
          .map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          });
      },
      setAll(cookies) {
        for (const cookie of cookies) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData?.user?.email) {
    return NextResponse.redirect(errorRedirect);
  }

  const userEmail = sessionData.user.email;
  const userName =
    sessionData.user.user_metadata?.full_name ??
    sessionData.user.user_metadata?.name ??
    undefined;
  const providerUserId = sessionData.user.id;

  // Resolve or create consumer
  const consumer = await resolveConsumer(
    project,
    userEmail,
    userName,
    "google",
    providerUserId,
  );

  // Sign consumer JWT
  const token = await signConsumerToken({
    sub: consumer.id,
    pid: project.publicId,
    ppid: project.storageId ?? "",
    email: consumer.email,
  });

  // Redirect to success page with token
  const successUrl = new URL("/auth/consumer/success", url.origin);
  successUrl.searchParams.set("token", token);
  successUrl.searchParams.set("origin", origin);

  return NextResponse.redirect(successUrl.toString());
}
