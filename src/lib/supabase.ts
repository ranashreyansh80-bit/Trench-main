import { createClient, SupabaseClient } from '@supabase/supabase-js';

// User Supabase Project Credentials
export const SUPABASE_PROJECT_ID = 'nedcyrdglahskrifquxh';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_Q0Rjmwx_6sE6_x0Zs3mEqw_jJMXlfYQ';

function normalizeSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return DEFAULT_SUPABASE_URL;
  const match = rawUrl.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
  return match ? match[0] : DEFAULT_SUPABASE_URL;
}

export const supabaseUrl: string = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);

export const supabaseAnonKey: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
