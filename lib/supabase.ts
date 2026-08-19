import { createClient } from '@supabase/supabase-js';

// The storefront must always use the production Louay Phone Supabase project.
// Environment variables are accepted only when they point to that project;
// this prevents an old Vercel environment from silently returning an empty store.
const PRODUCTION_SUPABASE_URL = 'https://gmpogiiqydoxoclxcvwh.supabase.co';
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yZkBPopPMl8KXnOH-fkZ6A_47kCV-fJ';

function isProductionProject(url: string | undefined) {
  return !!url && url.replace(/\/$/, '') === PRODUCTION_SUPABASE_URL;
}

export function getSupabase() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = isProductionProject(envUrl) ? envUrl! : PRODUCTION_SUPABASE_URL;

  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const key = isProductionProject(envUrl) && envKey ? envKey : PRODUCTION_SUPABASE_PUBLISHABLE_KEY;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'louay-phone-storefront' } },
  });
}
