// Correção global de SSL para Vercel - aplicar em todas as rotas da API
// Detecta ambiente Vercel e desabilita validação TLS automaticamente

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const forceInsecure = process.env.SUPABASE_INSECURE_SSL === '1';

if (isVercel || forceInsecure) {
  // Desabilitar validação TLS globalmente para Node.js
  // @ts-ignore
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('[SSL] TLS validation disabled globally (Vercel environment detected).');
}

export const SSL_FIX_APPLIED = true;
