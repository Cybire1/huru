import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

let browserSupabase: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public env vars are missing.");
  }

  if (!browserSupabase) {
    browserSupabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserSupabase;
}
