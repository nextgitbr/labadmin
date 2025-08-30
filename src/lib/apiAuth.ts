import { NextRequest } from 'next/server';
import { requireSupabaseAdmin } from './supabaseAdmin';
import { Client } from 'pg';

export type AuthUser = {
  id: string;
  email?: string | null;
};

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });

  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  return { id: data.user.id, email: data.user.email };
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
