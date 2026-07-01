import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAuthConfig } from "@/lib/huru/supabase-auth";

function dashboardRedirect(origin: string, params?: Record<string, string>) {
  const url = new URL("/dashboard", origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error") ||
    "";

  if (oauthError) {
    return dashboardRedirect(url.origin, {
      auth: "error",
      message: oauthError,
    });
  }

  if (!code) {
    return dashboardRedirect(url.origin, {
      auth: "error",
      message: "Google did not return an authorization code.",
    });
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseAuthConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    return dashboardRedirect(url.origin, {
      auth: "error",
      message: "Supabase auth is not configured.",
    });
  }

  const response = dashboardRedirect(url.origin, { auth: "success" });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") ?? "";
        return cookieHeader.split(";").filter(Boolean).map((c) => {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return dashboardRedirect(url.origin, {
      auth: "error",
      message: error.message,
    });
  }

  return response;
}
