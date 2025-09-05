import { NextRequest } from 'next/server';
import { requireSupabaseAdmin } from './supabaseAdmin';
import { Client } from 'pg';

export type AuthUser = {
  id: string;
  email?: string | null;
  role?: string;
  permissions?: Record<string, boolean>;
};

import { verifyToken } from './jwt';

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw Object.assign(new Error('Missing or invalid Authorization header'), { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw Object.assign(new Error('No token provided'), { status: 401 });
  }

  try {
    // Primeiro tenta validar como JWT
    const jwtPayload = verifyToken(token);
    if (jwtPayload) {
      console.log('✅ Autenticação JWT válida para usuário:', jwtPayload.userId);
      const user: AuthUser = {
        id: jwtPayload.userId,
        email: jwtPayload.email,
        role: jwtPayload.role,
        permissions: jwtPayload.permissions,
      };
      await upsertSessionActivity(req, user);
      return user;
    }

    // Se não for JWT válido, tenta como token do Supabase
    console.log('🔍 Token não é JWT válido, tentando autenticação Supabase...');
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      console.error('❌ Falha na autenticação Supabase:', error?.message || 'Usuário não encontrado');
      throw Object.assign(new Error('Credenciais inválidas ou expiradas'), { status: 401 });
    }

    console.log('✅ Autenticação Supabase válida para usuário:', data.user.email);
    const user: AuthUser = { id: data.user.id, email: data.user.email };
    await upsertSessionActivity(req, user);
    return user;
  } catch (error: any) {
    console.error('❌ Erro na autenticação:', error.message);
    throw Object.assign(new Error('Falha na autenticação'), { 
      status: error.status || 401,
      cause: error 
    });
  }
}

// Função para sincronizar usuário do Postgres para Supabase Auth
async function syncUserToSupabaseAuth(email: string, password: string) {
  try {
    console.log('🔄 Tentando sincronizar usuário para Supabase Auth:', email);
    const supabase = requireSupabaseAdmin();
    
    // Tenta fazer signup do usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          synced_from_postgres: true,
        }
      }
    });

    if (error) {
      console.error('❌ Erro ao sincronizar usuário no Supabase Auth:', error.message);
      return null;
    }

    if (data.user && !data.user.email_confirmed_at) {
      console.log('⚠️ Usuário criado no Supabase Auth, mas email não confirmado');
      // Para desenvolvimento, podemos confirmar automaticamente
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        data.user.id,
        { email_confirm: true }
      );
      if (confirmError) {
        console.error('❌ Erro ao confirmar email:', confirmError.message);
      } else {
        console.log('✅ Email confirmado automaticamente');
      }
    }

    return data.user;
  } catch (error: any) {
    console.error('❌ Erro ao sincronizar usuário:', error.message);
    return null;
  }
}

export function assertRole(userRole: string | null | undefined, allowed: string[]) {
  const role = (userRole || '').toLowerCase();
  const ok = allowed.map(r => r.toLowerCase()).includes(role);
  if (!ok) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
}

export async function getUserRole(user: AuthUser): Promise<string | null> {
  if (!user?.email && !user?.id) return null;
  const conn =
    (process.env.PG_URI as string | undefined) ||
    (process.env.DATABASE_URL as string | undefined) ||
    (process.env.POSTGRES_URL as string | undefined) ||
    (process.env.POSTGRES_PRISMA_URL as string | undefined) ||
    (process.env.POSTGRES_URL_NON_POOLING as string | undefined);
  if (!conn) return null;
  const needsSsl = /supabase\.(co|com)/.test(conn) || /sslmode=require/i.test(conn);
  const ssl = needsSsl ? { rejectUnauthorized: false } : undefined;
  const pg = new Client({ connectionString: conn, ssl });
  await pg.connect();
  try {
    // tenta por id, depois por email
    let res = null as any;
    if (user.id) {
      res = await pg.query('select role from public.users where auth_user_id = $1 limit 1', [user.id]);
      if (res?.rows?.length) return String(res.rows[0].role || '').toLowerCase() || null;
    }
    if (user.email) {
      res = await pg.query('select role from public.users where email = $1 limit 1', [user.email]);
      if (res?.rows?.length) return String(res.rows[0].role || '').toLowerCase() || null;
    }
    return null;
  } finally {
    await pg.end();
  }
}

export async function requireRole(req: NextRequest, allowed: string[]): Promise<{ user: AuthUser; role: string | null; }> {
  const user = await requireAuth(req);
  const role = await getUserRole(user);
  assertRole(role, allowed);
  return { user, role };
}

// Upsert de atividade de sessão do usuário autenticado
async function upsertSessionActivity(req: NextRequest, user: AuthUser) {
  try {
    const conn =
      (process.env.PG_URI as string | undefined) ||
      (process.env.DATABASE_URL as string | undefined) ||
      (process.env.POSTGRES_URL as string | undefined) ||
      (process.env.POSTGRES_PRISMA_URL as string | undefined) ||
      (process.env.POSTGRES_URL_NON_POOLING as string | undefined);
    if (!conn) return;
    const needsSsl = /supabase\.(co|com)/.test(conn) || /sslmode=require/i.test(conn);
    const ssl = needsSsl ? { rejectUnauthorized: false } : undefined;
    const pg = new Client({ connectionString: conn, ssl });
    await pg.connect();
    try {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || (req as any).ip || null;
      const ua = req.headers.get('user-agent') || '';
      await pg.query(
        `insert into public.sessions (user_id, email, last_ip, user_agent, created_at, updated_at)
         values ($1,$2,$3,$4, now(), now())
         on conflict (user_id)
         do update set email=excluded.email, last_ip=excluded.last_ip, user_agent=excluded.user_agent, updated_at=now()`,
        [user.id, user.email || null, ip, ua]
      );
    } finally {
      await pg.end();
    }
  } catch (e) {
    console.warn('⚠️ Falha ao registrar atividade de sessão:', (e as any)?.message);
  }
}
