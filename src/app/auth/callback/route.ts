import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = `${url.origin}/dashboard`;

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

    if (supabaseUrl && supabaseAnonKey) {
      const response = NextResponse.redirect(redirectTo);

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

      await supabase.auth.exchangeCodeForSession(code);
      return response;
    }
  }

  return NextResponse.redirect(redirectTo);
}
