import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { encrypt, decrypt, hashPassword, verifyPassword } from '@/lib/crypto';
import '@/lib/sslFix'; // Aplicar correção SSL global

// PG pool com fallbacks e SSL condicional
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

// Utilidades de criptografia para VAT (compatível com dados legados)
function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

function safeDecrypt(value: string): string {
  if (!value) return '';
  if (!isEncrypted(value)) return value;
  try { return decrypt(value); } catch { return value; }
}

function mapUserRow(row: any) {
  return {
    _id: String(row.id),
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || '',
    company: row.company || '',
    country: row.country || '',
    city: row.city || '',
    zip: row.zip || '',
    vat: safeDecrypt(row.vat || ''),
    avatar: row.avatar || 'https://ygzagzsnpomuukjaraid.supabase.co/storage/v1/object/public/uploads/general/202508/default.svg',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNumberId(id: any): number | null {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

// GET - Buscar perfil do usuário (Postgres)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const idNum = toNumberId(userId);
    if (!idNum) {
      return NextResponse.json({ success: false, message: 'ID do usuário é obrigatório e deve ser numérico' }, { status: 400 });
    }

    const { rows } = await pool.query(`select * from public.users where id = $1 limit 1`, [idNum]);
    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 });
    }

    const user = mapUserRow(rows[0]);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Erro ao buscar perfil (PG):', error);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar perfil do usuário (Postgres)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      firstName,
      lastName,
      email,
      phone,
      role,
      company,
      country,
      city,
      zip,
      vat,
      currentPassword,
      newPassword,
      confirmPassword,
    } = body || {};

    const idNum = toNumberId(userId);
    if (!idNum) {
      return NextResponse.json({ success: false, message: 'ID do usuário é obrigatório e deve ser numérico' }, { status: 400 });
    }

    // Carregar usuário atual para validar senha se necessário
    const current = await pool.query(`select * from public.users where id = $1 limit 1`, [idNum]);
    if (!current.rows.length) {
      return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 });
    }

    // Montar SET dinâmico
    const sets: string[] = [];
    const vals: any[] = [];
    const push = (col: string, val: any) => { sets.push(`${col} = $${sets.length + 1}`); vals.push(val); };

    if (firstName !== undefined) push('first_name', firstName);
    if (lastName !== undefined) push('last_name', lastName);
    if (email !== undefined) push('email', email);
    if (phone !== undefined) push('phone', phone ?? '');
    if (role !== undefined) push('role', role ?? '');
    if (company !== undefined) push('company', company ?? '');
    if (country !== undefined) push('country', country ?? '');
    if (city !== undefined) push('city', city ?? '');
    if (zip !== undefined) push('zip', zip ?? '');
    if (vat !== undefined) push('vat', typeof vat === 'string' ? encrypt(vat) : '');

    // Troca de senha opcional
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json({ success: false, message: 'Para alterar a senha envie currentPassword, newPassword e confirmPassword' }, { status: 400 });
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ success: false, message: 'Nova senha e confirmação não coincidem' }, { status: 400 });
      }
      if (String(newPassword).length < 6) {
        return NextResponse.json({ success: false, message: 'Nova senha deve ter pelo menos 6 caracteres' }, { status: 400 });
      }
      const cur = current.rows[0];
      if (cur.password && !verifyPassword(currentPassword, cur.password)) {
        return NextResponse.json({ success: false, message: 'Senha atual incorreta' }, { status: 400 });
      }
      push('password', hashPassword(newPassword));
    }

    // updated_at
    push('updated_at', new Date().toISOString());

    if (!sets.length) {
      return NextResponse.json({ success: false, message: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const sql = `update public.users set ${sets.join(', ')} where id = $${sets.length + 1} returning *`;
    vals.push(idNum);
    const { rows } = await pool.query(sql, vals);
    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Perfil atualizado com sucesso', user: mapUserRow(rows[0]) });
  } catch (error) {
    console.error('Erro ao atualizar perfil (PG):', error);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}
