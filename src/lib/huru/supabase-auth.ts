export function getSupabaseAuthConfig() {
  return {
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      process.env.SUPABASE_URL?.trim() ||
      "",
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim() ||
      "",
  };
}
