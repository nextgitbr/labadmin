import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyPassword } from '@/lib/crypto';
import { requireSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PG pool
const PG_CONN =
  process.env.PG_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN || '') || /sslmode=require/i.test(PG_CONN || '')
    ? { rejectUnauthorized: false }
    : undefined,
});

function mapUserRow(row: any) {
  return {
    _id: String(row.id),
    id: row.id,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || '',
    company: row.company || '',
    permissions: row.permissions || {},
    country: row.country || '',
    city: row.city || '',
    zip: row.zip || '',
    vat: row.vat || '',
    avatar: row.avatar || '/images/avatars/01.png',
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!PG_CONN) {
      console.error('[LOGIN] Sem conexão de banco. Defina POSTGRES_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING ou DATABASE_URL/PG_URI');
      return NextResponse.json({ error: 'Configuração de banco ausente' }, { status: 500 });
    }
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    console.log('[LOGIN] Tentando autenticar', { email });
    let rows: any[] = [];
    try {
      const res = await pool.query(`select * from public.users where lower(email) = lower($1) limit 1`, [String(email).trim()]);
      rows = res.rows || [];
    } catch (e: any) {
      console.error('[LOGIN] Erro ao autenticar no Supabase:', e?.message || e);
      const hasUrl = !!process.env.SUPABASE_URL;
      const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
      const hint = !hasUrl || !hasKey ? 'Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ausentes' : 'Falha no provedor de autenticação';
      return NextResponse.json({ error: hint }, { status: 500 });
    }

    const user = rows[0] as { password: string | null } & Record<string, any>;
    if (!user.password || !verifyPassword(String(password), user.password)) {
      console.warn('[LOGIN] Senha inválida');
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Opcional: verificar se ativo
    if (user.active === false || user.is_active === false) {
      console.warn('[LOGIN] Usuário inativo');
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 });
    }

    const safeUser = mapUserRow(user);

    // Token dummy para teste
    let token: string | null = 'dummy-token';

    // Autenticar no Supabase para obter um access_token (Bearer)
    try {
      const supabase = requireSupabaseAdmin();

      // Tenta sign-in diretamente; se falhar por credenciais, cria e tenta novamente
      let { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({ email, password });
      if (sessionError || !sessionData?.session?.access_token) {
        console.warn('[LOGIN] Sign-in inicial falhou, tentando provisionar usuário e repetir login...', sessionError?.message);
        const { error: createErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: { app_user_id: safeUser.id },
        } as any);
        if (createErr) {
          // Se o erro for "User already registered" or similar, seguimos para tentar login novamente
          console.warn('[LOGIN] createUser retornou erro, possivelmente já existente:', createErr?.message);
        }
        // Tentar sign-in novamente
        const retry = await supabase.auth.signInWithPassword({ email, password });
        sessionData = retry.data;
        sessionError = retry.error;
      }

      if (sessionError || !sessionData?.session?.access_token) {
        console.error('[LOGIN] Falha ao obter token do Supabase após tentativa:', sessionError?.message);
        return NextResponse.json({ error: 'Falha de autenticação (token)' }, { status: 401 });
      }
      token = sessionData.session.access_token;
    } catch (e: any) {
      console.error('[LOGIN] Erro ao autenticar no Supabase:', e?.message || e);
      const hasUrl = !!process.env.SUPABASE_URL;
      const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
      const hint = !hasUrl || !hasKey ? 'Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ausentes' : 'Falha no provedor de autenticação';
      return NextResponse.json({ error: hint }, { status: 500 });
    }

    console.log('[LOGIN] Sucesso', { id: safeUser.id, email: safeUser.email });
    return NextResponse.json({ user: safeUser, token }, { status: 200 });
  } catch (error) {
    console.error('❌ Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
