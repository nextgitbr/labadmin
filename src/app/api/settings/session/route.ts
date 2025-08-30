import { NextRequest, NextResponse } from 'next/server';
import { Client as PgClient } from 'pg';

// GET: retorna o tempo de sessão global (em minutos)
export async function GET(req: NextRequest) {
  try {
    const conn = process.env.PG_URI || process.env.DATABASE_URL;
    if (!conn) {
      return NextResponse.json({ error: 'PG_URI/DATABASE_URL não configurado' }, { status: 500 });
    }

    const pg = new PgClient({ connectionString: conn, ssl: { rejectUnauthorized: false } });
    await pg.connect();
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

    const conn = process.env.PG_URI || process.env.DATABASE_URL;
    if (!conn) {
      return NextResponse.json({ error: 'PG_URI/DATABASE_URL não configurado' }, { status: 500 });
    }

    const pg = new PgClient({ connectionString: conn, ssl: { rejectUnauthorized: false } });
    await pg.connect();
    try {
      await pg.query('begin');
      await pg.query(`
        create table if not exists settings_session (
          key text primary key,
          timeout_minutes integer not null,
          updated_at timestamptz not null default now()
        );
      `);
      await pg.query(
        `insert into settings_session (key, timeout_minutes)
         values ($1, $2)
         on conflict (key) do update set timeout_minutes = excluded.timeout_minutes, updated_at = now()`,
        ['sessionTimeout', minutesNum]
      );
      await pg.query('commit');
      return NextResponse.json({ ok: true });
    } catch (err) {
      await pg.query('rollback');
      throw err;
    } finally {
      await pg.end();
    }
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar tempo de sessão' }, { status: 500 });
  }
}

