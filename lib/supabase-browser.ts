import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_yZkBPopPMl8KXnOH-fkZ6A_47kCV-fJ';

export const supabaseBrowser = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
