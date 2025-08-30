import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { encrypt, hashPassword } from '@/lib/crypto';
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

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando criação do usuário administrador (PG)...');

    // Limpar usuários (opcional e perigoso; usar somente em dev)
    const { clearUsers } = await request.json().catch(() => ({ clearUsers: false }));
    if (clearUsers) {
      await pool.query('delete from public.users');
      console.log('✅ Usuários removidos com sucesso (public.users)');
    }

    // Verificar se já existe admin
    const existing = await pool.query(
      `select id, email, role from public.users where lower(role) = 'admin' or lower(email) = 'admin@labadmin.com' limit 1`
    );
    if (existing.rows.length && !clearUsers) {
      return NextResponse.json({ success: false, message: 'Já existe um usuário administrador no sistema' }, { status: 400 });
    }

    // Dados do administrador (apenas VAT criptografado)
    const admin = {
      first_name: 'Admin',
      last_name: 'Sistema',
      email: 'admin@labadmin.com',
      phone: '+351 123 456 789',
      country: 'Portugal',
      city: 'Lisboa',
      zip: '1000-001',
      vat: encrypt('123456789'),
      role: 'admin',
      avatar: '/images/avatars/default.svg',
      password: hashPassword('admin123'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    // Detectar colunas existentes para inserir apenas o que existe
    const { rows: cols } = await pool.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name='users'`
    );
    const colset = new Set((cols as Array<{ column_name: string }>).map((c) => c.column_name));

    const columns: string[] = [];
    const values: any[] = [];
    const placeholders: string[] = [];
    for (const [k, v] of Object.entries(admin)) {
      if (colset.has(k)) {
        columns.push(k);
        values.push(v);
        placeholders.push(`$${values.length}`);
      }
    }

    if (!columns.length) {
      return NextResponse.json({ success: false, message: 'Nenhuma coluna compatível encontrada em public.users' }, { status: 500 });
    }

    const insertSql = `insert into public.users (${columns.join(',')}) values (${placeholders.join(',')}) returning id, email, role`;
    const inserted = await pool.query(insertSql, values);

    console.log('✅ Usuário administrador criado com sucesso:', inserted.rows[0].id);

    return NextResponse.json({
      success: true,
      message: 'Usuário administrador criado com sucesso',
      admin: {
        id: inserted.rows[0].id,
        email: inserted.rows[0].email,
        role: inserted.rows[0].role,
        defaultPassword: 'admin123',
      }
    });
  } catch (error) {
    console.error('❌ Erro ao criar administrador (PG):', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// GET - Verificar status do sistema
export async function GET() {
  try {
    const total = await pool.query(`select count(*)::int as c from public.users`);
    const admins = await pool.query(`select count(*)::int as c from public.users where lower(role) = 'admin'`);
    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: total.rows[0]?.c ?? 0,
        adminUsers: admins.rows[0]?.c ?? 0,
        hasAdmin: (admins.rows[0]?.c ?? 0) > 0,
      }
    });
  } catch (error) {
    console.error('❌ Erro ao verificar status (PG):', error);
    return NextResponse.json({ success: false, message: 'Erro ao verificar status do sistema' }, { status: 500 });
  }
}
