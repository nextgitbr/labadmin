import { NextRequest, NextResponse } from 'next/server';
import { Client as PgClient } from 'pg';

// Fallbacks de conexão para Postgres
const PG_CONN =
  process.env.PG_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

// Função auxiliar para obter cliente Postgres
async function getPg() {
  if (!PG_CONN) {
    throw new Error('Sem conexão Postgres: defina PG_URI/DATABASE_URL/POSTGRES_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING');
  }
  const needsSsl = /supabase\.(co|com)/.test(PG_CONN) || /sslmode=require/i.test(PG_CONN);
  const client = new PgClient({ connectionString: PG_CONN, ssl: needsSsl ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  return client;
}
// GET: retorna o tempo de sessão global (em minutos)
export async function GET(req: NextRequest) {
  try {
    const pg = await getPg();
    try {
      // Garante que a tabela exista de forma segura
      await pg.query(`
        create table if not exists settings_session (
          key text primary key,
          timeout_minutes integer not null,
          updated_at timestamptz not null default now()
        );
      `);

      // Busca valor atual
      const res = await pg.query('select timeout_minutes from settings_session where key = $1 limit 1', ['sessionTimeout']);
      const timeoutMinutes = res.rowCount > 0 && typeof res.rows[0]?.timeout_minutes === 'number'
        ? res.rows[0].timeout_minutes
        : 30;

      return NextResponse.json({ timeoutMinutes });
    } finally {
      await pg.end();
    }
  } catch (e) {
    console.error('Erro ao buscar tempo de sessão:', e);
    return NextResponse.json({ error: 'Erro ao buscar tempo de sessão', details: String(e) }, { status: 500 });
  }
}

// PUT: atualiza o tempo de sessão global (em minutos)
export async function PUT(req: NextRequest) {
  try {
    const { timeoutMinutes } = await req.json();
    const minutesNum = Number(timeoutMinutes);
    if (!Number.isFinite(minutesNum) || minutesNum <= 0 || minutesNum > 24 * 60) {
      return NextResponse.json({ error: 'timeoutMinutes inválido' }, { status: 400 });
    }

    const pg = await getPg();
    try {
      // Garante que a tabela exista
      await pg.query(`
        create table if not exists settings_session (
          key text primary key,
          timeout_minutes integer not null,
          updated_at timestamptz not null default now()
        );
      `);

      // Insere ou atualiza
      await pg.query(`
        insert into settings_session (key, timeout_minutes, updated_at)
        values ($1, $2, now())
        on conflict (key) do update set
          timeout_minutes = excluded.timeout_minutes,
          updated_at = now()
      `, ['sessionTimeout', minutesNum]);

      return NextResponse.json({ success: true, timeoutMinutes: minutesNum });
    } finally {
      await pg.end();
    }
  } catch (e) {
    console.error('Erro ao atualizar tempo de sessão:', e);
    return NextResponse.json({ error: 'Erro ao atualizar tempo de sessão', details: String(e) }, { status: 500 });
  }
}

