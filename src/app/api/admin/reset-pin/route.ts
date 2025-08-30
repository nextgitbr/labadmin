import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { encrypt } from '@/lib/crypto';

const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: string = (body.email || 'admin@labadmin.com').toString();
    const newPin: string = (body.pin || '1234').toString();

    // valida PIN
    if (!/^\d{4,6}$/.test(newPin)) {
      return NextResponse.json({ message: 'PIN deve ter 4-6 dígitos numéricos' }, { status: 400 });
    }

    const encrypted = encrypt(newPin);

    const { rowCount, rows } = await pool.query(
      `update public.users
         set security_pin = $1, updated_at = now()
       where lower(email) = lower($2)
       returning id, email, role`,
      [encrypted, email]
    );

    if (!rowCount) {
      return NextResponse.json({ message: 'Usuário admin não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'PIN redefinido com sucesso',
      user: { id: rows[0].id, email: rows[0].email, role: rows[0].role },
      pin: '1234',
    });
  } catch (err) {
    console.error('Erro ao resetar PIN do admin:', err);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
