import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runtimeConfig } from "@/lib/huru/config";

let supabaseAdmin: SupabaseClient | null = null;

export function hasSupabaseAdminConfig() {
  return Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabaseServiceRoleKey);
}

export function getSupabaseAdmin() {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      runtimeConfig.supabaseUrl,
      runtimeConfig.supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return supabaseAdmin;
}
