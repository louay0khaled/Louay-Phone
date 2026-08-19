import { createClient } from '@supabase/supabase-js';

// Vercel environment variables take precedence. The publishable key is safe for
// public application code and is protected by Supabase RLS policies.
const DEFAULT_SUPABASE_URL = 'https://gmpogiiqydoxoclxcvwh.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yZkBPopPMl8KXnOH-fkZ6A_47kCV-fJ';

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return createClient(url, key, { auth: { persistSession: false } });
}
