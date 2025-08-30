import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string | undefined;

if (!SUPABASE_URL) {
  console.warn('[supabaseAdmin] SUPABASE_URL não configurado. Defina no .env.local');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY não configurado. Defina no .env.local');
}

export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client não configurado: verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabaseAdmin;
}
