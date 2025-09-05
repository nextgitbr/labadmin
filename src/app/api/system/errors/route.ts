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
    const limit = Math.max(1, Math.min(20, parseInt(searchParams.get('limit') || '5', 10)));

    // Tentativas em cascata para obter erros recentes
    // 1) public.app_errors (id, message, level, created_at, meta)
    try {
      const { rows } = await pool.query(
        `select id, message, level, created_at, meta
         from public.app_errors
         order by created_at desc
         limit $1`,
        [limit]
      );
      return NextResponse.json({ errors: rows.map((r: any) => ({
        id: String(r.id),
        message: r.message || 'Unknown error',
        level: r.level || 'error',
        createdAt: r.created_at,
        meta: r.meta || null,
      })) });
    } catch {}

    // 2) public.errors (id, message, created_at)
    try {
      const { rows } = await pool.query(
        `select id, message, created_at
         from public.errors
         order by created_at desc
         limit $1`,
        [limit]
      );
      return NextResponse.json({ errors: rows.map((r: any) => ({
        id: String(r.id),
        message: r.message || 'Unknown error',
        level: 'error',
        createdAt: r.created_at,
        meta: null,
      })) });
    } catch {}

    // 3) Fallback: vazio
    return NextResponse.json({ errors: [] });
  } catch (error) {
    console.error('❌ errors endpoint failed:', error);
    await logAppError('errors endpoint failed', 'error', { message: (error as any)?.message });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
