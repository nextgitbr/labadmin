import { createClient } from '@supabase/supabase-js';
// Correção para SSL na Vercel: forçar bypass de TLS para Supabase
// Detecta ambiente Vercel e aplica automaticamente
try {
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
  const forceInsecure = process.env.SUPABASE_INSECURE_SSL === '1';
  
  if (isVercel || forceInsecure) {
    // undici está disponível no Node 18+ usado pela Vercel
    const undici = require('undici');
    if (undici?.setGlobalDispatcher && undici?.Agent) {
      const agent = new undici.Agent({ connect: { rejectUnauthorized: false } });
      undici.setGlobalDispatcher(agent);
      console.warn('[supabaseAdmin] TLS validation disabled via undici Agent (Vercel environment detected).');
    }
    // Fallback adicional para Node.js
    // @ts-ignore
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
} catch (e) {
  console.warn('[supabaseAdmin] Falha ao configurar undici Agent:', e);
}

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
