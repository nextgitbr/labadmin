import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { decrypt } from '@/lib/crypto';

// Postgres pool
const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

// Helper: tenta descriptografar valor no formato iv:authTag:cipher
function tryDecrypt(value: string): string {
  if (!value || typeof value !== 'string') return '';
  const parts = value.split(':');
  if (parts.length === 3 && parts.every(Boolean)) {
    try {
      return decrypt(value);
    } catch {
      return value; // segue com valor original
    }
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const { pin, userId, email } = await request.json();

    // Valida PIN
    if (!pin) return NextResponse.json({ message: 'PIN é obrigatório' }, { status: 400 });
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(pin)) return NextResponse.json({ message: 'PIN deve ter entre 4 e 6 dígitos' }, { status: 400 });

    // Tenta usar ID numérico, senão usa email (fallback para sessões antigas do Mongo)
    let rows;
    const hasId = userId !== undefined && userId !== null && userId !== '';
    const numericId = hasId ? Number(userId) : NaN;
    if (Number.isFinite(numericId)) {
      ({ rows } = await pool.query(`select id, security_pin from public.users where id = $1 limit 1`, [numericId]));
    } else if (typeof email === 'string' && email.trim()) {
      ({ rows } = await pool.query(`select id, security_pin from public.users where lower(email) = lower($1) limit 1`, [email.trim()]));
    } else {
      return NextResponse.json({ message: 'ID do usuário inválido e email não fornecido' }, { status: 400 });
    }
    if (!rows.length) return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });

    const stored: string | null = rows[0].security_pin ?? null;
    if (!stored) return NextResponse.json({ message: 'PIN não configurado' }, { status: 401 });

    const storedPlain = tryDecrypt(stored);
    const isValid = storedPlain === pin;

    if (isValid) return NextResponse.json({ message: 'PIN válido', valid: true }, { status: 200 });
    return NextResponse.json({ message: 'PIN incorreto', valid: false }, { status: 401 });
  } catch (error) {
    console.error('Erro ao validar PIN (PG):', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

