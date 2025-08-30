import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { encrypt, decrypt, hashPassword } from '@/lib/crypto';
import { permissionsList } from '@/permissions/permissionsList';

// Postgres pool (Supabase/PG) com fallbacks e SSL condicional
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

// Função para detectar se um valor está criptografado
function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

// Função segura para descriptografar
function safeDecrypt(value: string): string {
  if (!value) return '';
  if (!isEncrypted(value)) return value;
  
  try {
    return decrypt(value);
  } catch (error) {
    console.warn('⚠️ Erro ao descriptografar valor:', error);
    return value;
  }
}

// Helper para mapear linha do Postgres para objeto esperado pelo frontend
function mapUserRow(row: any) {
  return {
    _id: String(row.id),
    id: row.id,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || '',
    company: row.company || '',
    permissions: row.permissions || {},
    country: row.country || '',
    city: row.city || '',
    zip: row.zip || '',
    vat: safeDecrypt(row.vat || ''),
    avatar: row.avatar || '/images/avatars/01.png',
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/users - buscar usuário por email, por role ou listar todos (Postgres)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url!);
    const email = searchParams.get('email');
    const role = searchParams.get('role');

    if (email) {
      const { rows } = await pool.query(
        `select * from public.users where lower(email) = lower($1) limit 1`,
        [email]
      );
      if (!rows.length) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      // Ajuste de permissões para admin (compatibilidade com lógica antiga)
      const row = rows[0];
      if (email.toLowerCase() === 'admin@labadmin.com') {
        const perms = row.permissions || {};
        const normalizedPerms = { ...perms, kanban: true, tasklist: true, notice: true };
        if (row.role !== 'administrator' || JSON.stringify(perms) !== JSON.stringify(normalizedPerms)) {
          await pool.query(`update public.users set role = 'administrator', permissions = $1 where id = $2`, [
            normalizedPerms,
            row.id,
          ]);
          row.role = 'administrator';
          row.permissions = normalizedPerms;
        } else {
          row.role = 'administrator';
          row.permissions = normalizedPerms;
        }
      }
      return NextResponse.json(mapUserRow(row));
    }

    if (role) {
      const { rows } = await pool.query(
        `select * from public.users where role = $1 and coalesce(is_active, true) = true and coalesce(active::boolean, true) = true order by first_name nulls last, last_name nulls last`,
        [role]
      );
      return NextResponse.json(rows.map(mapUserRow));
    }

    const { rows } = await pool.query(
      `select * from public.users where coalesce(is_active, true) = true and coalesce(active::boolean, true) = true order by first_name nulls last, last_name nulls last`
    );
    return NextResponse.json(rows.map(mapUserRow));
  } catch (error) {
    console.error('❌ Erro na API users (GET):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/users - cria novo usuário com criptografia
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.firstName || !data.lastName || !data.email || !data.password) {
      return NextResponse.json({ message: 'Campos obrigatórios: firstName, lastName, email, password' }, { status: 400 });
    }

    // Unicidade de email
    const exists = await pool.query(`select 1 from public.users where lower(email) = lower($1) limit 1`, [data.email]);
    if (exists.rowCount) {
      return NextResponse.json({ message: 'Email já está em uso' }, { status: 400 });
    }

    const perms = (permissionsList.find((p: { role: string }) => p.role === data.role)?.permissions) || {};
    const insertSql = `
      insert into public.users (
        first_name, last_name, email, phone, country, city, zip, vat,
        role, permissions, company, avatar, password, security_pin,
        is_active
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,
        $15
      ) returning *;
    `;
    const params = [
      data.firstName,
      data.lastName,
      data.email,
      data.phone || '',
      data.country || '',
      data.city || '',
      data.zip || '',
      data.vat ? encrypt(data.vat) : '',
      data.role,
      JSON.stringify(perms),
      data.company || '',
      data.avatar || '/images/avatars/default.svg',
      hashPassword(data.password),
      encrypt('1234'),
      data.isActive !== undefined ? !!data.isActive : true,
    ];
    const { rows } = await pool.query(insertSql, params);
    return NextResponse.json(mapUserRow(rows[0]), { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar usuário (POST):', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/users?id=<id> - edita usuário
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const userId = Number(id);
    if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const data = await req.json();
    const sets: string[] = [];
    const vals: any[] = [];
    const push = (col: string, val: any) => { sets.push(`${col} = $${sets.length + 1}`); vals.push(val); };

    if (data.firstName !== undefined) push('first_name', data.firstName);
    if (data.lastName !== undefined) push('last_name', data.lastName);
    if (data.email !== undefined) push('email', data.email);
    if (data.phone !== undefined) push('phone', data.phone ?? '');
    if (data.country !== undefined) push('country', data.country ?? '');
    if (data.city !== undefined) push('city', data.city ?? '');
    if (data.zip !== undefined) push('zip', data.zip ?? '');
    if (data.vat !== undefined) push('vat', typeof data.vat === 'string' ? encrypt(data.vat) : '');
    if (data.role !== undefined) push('role', data.role ?? '');
    if (data.permissions !== undefined) push('permissions', JSON.stringify(data.permissions || {}));
    if (data.company !== undefined) push('company', data.company ?? '');
    if (data.avatar !== undefined) push('avatar', data.avatar ?? '/images/avatars/01.png');
    if (data.password !== undefined) push('password', typeof data.password === 'string' ? hashPassword(data.password) : null);
    if (data.securityPin !== undefined) push('security_pin', typeof data.securityPin === 'string' ? encrypt(data.securityPin) : null);
    if (data.isActive !== undefined) push('is_active', !!data.isActive);
    if (data.active !== undefined) push('active', data.active === null ? null : !!data.active);
    // updated_at
    push('updated_at', new Date().toISOString());

    if (!sets.length) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const sql = `update public.users set ${sets.join(', ')} where id = $${sets.length + 1} returning *`;
    vals.push(userId);
    const { rows } = await pool.query(sql, vals);
    if (!rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(mapUserRow(rows[0]));
  } catch (error) {
    console.error('❌ Erro ao editar usuário (PATCH):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/users?id=<id> - remove usuário
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url!);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const userId = Number(id);
    if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const { rowCount } = await pool.query(`delete from public.users where id = $1`, [userId]);
    if (rowCount === 1) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    console.error('❌ Erro ao deletar usuário (DELETE):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
