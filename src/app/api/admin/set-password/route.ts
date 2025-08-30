import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { hashPassword } from '@/lib/crypto';
import '@/lib/sslFix'; // Aplicar correção SSL global

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return NextResponse.json({ message: 'Email e password são obrigatórios' }, { status: 400 });
    }

    const { rowCount, rows } = await pool.query(
      `update public.users set password = $1, updated_at = now() where lower(email) = lower($2) returning id, email, role`,
      [hashPassword(String(password)), String(email).trim()]
    );
    if (!rowCount) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: rows[0] });
  } catch (e) {
    console.error('Erro ao definir senha:', e);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
