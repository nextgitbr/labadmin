import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { hashPassword, verifyPassword } from '@/lib/crypto';

// Postgres pool (Supabase/PG)
const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

function isFiniteNumberId(val: any): val is number {
  const n = Number(val);
  return Number.isFinite(n) && String(val).trim() !== '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, currentPassword, newPassword, confirmPassword } = body || {};

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ success: false, message: 'Todos os campos são obrigatórios' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, message: 'Nova senha e confirmação não coincidem' }, { status: 400 });
    }
    if (String(newPassword).length < 6) {
      return NextResponse.json({ success: false, message: 'Nova senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Buscar usuário por id numérico ou email (fallback)
    let rows;
    if (isFiniteNumberId(userId)) {
      ({ rows } = await pool.query(`select id, email, password from public.users where id = $1 limit 1`, [Number(userId)]));
    } else if (typeof email === 'string' && email.trim()) {
      ({ rows } = await pool.query(`select id, email, password from public.users where lower(email) = lower($1) limit 1`, [email.trim()]));
    } else {
      return NextResponse.json({ success: false, message: 'ID do usuário inválido e email não fornecido' }, { status: 400 });
    }

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 });
    }

    const user = rows[0] as { id: number; email: string; password: string | null };
    if (!user.password) {
      return NextResponse.json({ success: false, message: 'Usuário não possui senha definida' }, { status: 400 });
    }

    // Verificar senha atual
    const isCurrentPasswordValid = verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ success: false, message: 'Senha atual incorreta' }, { status: 400 });
    }

    // Atualizar senha (hash) e updated_at
    const newHash = hashPassword(newPassword);
    await pool.query(`update public.users set password = $1, updated_at = now() where id = $2`, [newHash, user.id]);

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha (PG):', error);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}
