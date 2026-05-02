import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

let browserSupabase: ReturnType<typeof createClient> | null = null;

export function getBrowserSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public env vars are missing.");
  }

  if (!browserSupabase) {
    browserSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserSupabase;
}
