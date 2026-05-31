const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseUrl = rawSupabaseUrl.trim();
export const supabaseAnonKey = rawSupabaseAnonKey.trim();

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
