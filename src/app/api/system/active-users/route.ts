import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import '@/lib/sslFix';
import { logAppError } from '@/lib/logError';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url!);
    const windowMinutes = Math.max(1, Math.min(120, parseInt(searchParams.get('windowMinutes') || '15', 10)));

    // Strategias em cascata para detectar usuários "ativos":
    // 1) Tabela public.sessions (se existir) com last_seen/updated_at
    // 2) Campo users.updated_at como atividade recente
    // 3) Fallback 0

    try {
      const res = await pool.query(
        `select count(1)::int as c
         from public.sessions
         where coalesce(updated_at, created_at, now()) > (now() - ($1 || ' minutes')::interval)`,
        [String(windowMinutes)]
      );
      return NextResponse.json({ activeUsers: res.rows?.[0]?.c ?? 0, windowMinutes });
    } catch (_) {
      // tenta heurística via users.updated_at
      try {
        const res2 = await pool.query(
          `select count(1)::int as c
           from public.users
           where coalesce(is_active, true) = true
             and coalesce(updated_at, created_at, now()) > (now() - ($1 || ' minutes')::interval)`,
          [String(windowMinutes)]
        );
        return NextResponse.json({ activeUsers: res2.rows?.[0]?.c ?? 0, windowMinutes });
      } catch (e2) {
        console.warn('[active-users] fallback returning 0:', (e2 as Error)?.message);
        return NextResponse.json({ activeUsers: 0, windowMinutes });
      }
    }
  } catch (error) {
    console.error('❌ active-users error:', error);
    await logAppError('active-users endpoint failed', 'error', { message: (error as any)?.message });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
