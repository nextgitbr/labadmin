import { createClient } from '@supabase/supabase-js';
// Opcional: permitir ignorar validação TLS em ambientes com proxy/certificados self-signed
// Ative definindo SUPABASE_INSECURE_SSL=1 (NÃO recomendado em produção permanente)
try {
  if (process.env.SUPABASE_INSECURE_SSL === '1') {
    // undici está disponível no Node 18+ usado pela Vercel
    const undici = require('undici');
    if (undici?.setGlobalDispatcher && undici?.Agent) {
      const agent = new undici.Agent({ connect: { rejectUnauthorized: false } });
      undici.setGlobalDispatcher(agent);
      console.warn('[supabaseAdmin] TLS validation disabled via undici Agent (SUPABASE_INSECURE_SSL=1). Use apenas temporariamente.');
    }
    // Fallback adicional
    // @ts-ignore
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
} catch {}

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
