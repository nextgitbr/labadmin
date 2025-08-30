import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { encrypt, decrypt } from '@/lib/crypto';

const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

function tryDecrypt(value: string): string {
  if (!value || typeof value !== 'string') return '';
  const parts = value.split(':');
  if (parts.length === 3 && parts.every(Boolean)) {
    try { return decrypt(value); } catch { return value; }
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, currentPin, newPin, email } = await request.json();

    // validações
    const hasId = userId !== undefined && userId !== null && userId !== '';
    const id = hasId ? Number(userId) : NaN;
    if (!currentPin || !newPin) {
      return NextResponse.json({ message: 'PIN atual e novo PIN são obrigatórios' }, { status: 400 });
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      return NextResponse.json({ message: 'PIN deve ter entre 4 e 6 dígitos' }, { status: 400 });
    }
    if (currentPin === newPin) {
      return NextResponse.json({ message: 'O novo PIN deve ser diferente do atual' }, { status: 400 });
    }

    // Busca usuário por id (numérico) ou por email (fallback)
    let rows;
    if (Number.isFinite(id)) {
      ({ rows } = await pool.query(`select id, security_pin from public.users where id = $1 limit 1`, [id]));
    } else if (typeof email === 'string' && email.trim()) {
      ({ rows } = await pool.query(`select id, security_pin from public.users where lower(email) = lower($1) limit 1`, [email.trim()]));
    } else {
      return NextResponse.json({ message: 'ID do usuário inválido e email não fornecido' }, { status: 400 });
    }
    if (!rows.length) return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });

    const stored: string | null = rows[0].security_pin ?? null;
    if (!stored) return NextResponse.json({ message: 'PIN não configurado' }, { status: 401 });

    const storedPlain = tryDecrypt(stored);
    if (storedPlain !== currentPin) {
      return NextResponse.json({ message: 'PIN atual incorreto' }, { status: 401 });
    }

    // Atualiza com novo PIN criptografado
    const encryptedNewPin = encrypt(newPin);
    await pool.query(`update public.users set security_pin = $1, updated_at = now() where id = $2`, [encryptedNewPin, id]);

    return NextResponse.json({ message: 'PIN alterado com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao alterar PIN (PG):', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
