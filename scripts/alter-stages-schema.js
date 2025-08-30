#!/usr/bin/env node
/*
  Ensure Supabase public.stages has all required columns
*/
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadConnFromEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const pick = (key) => {
    const re = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, 'm');
    const m = content.match(re);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) v = v.slice(1, -1);
      return v;
    }
    return null;
  };
  return pick('PG_URI') || pick('DATABASE_URL');
}

function getPg() {
  const conn = process.env.PG_URI || process.env.DATABASE_URL || loadConnFromEnvFile();
  if (!conn) throw new Error('PG_URI/DATABASE_URL não configurado no ambiente/.env.local');
  return new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
}

(async () => {
  const pg = getPg();
  await pg.connect();
  try {
    await pg.query('begin');
    await pg.query("alter table public.stages add column if not exists stroke text");
    await pg.query("alter table public.stages add column if not exists background_color text");
    await pg.query("alter table public.stages add column if not exists primary_color text");
    await pg.query("alter table public.stages add column if not exists card_bg_color text");

    await pg.query("alter table public.stages add column if not exists created_at timestamptz not null default now()");
    await pg.query("alter table public.stages add column if not exists updated_at timestamptz not null default now()");

    await pg.query("alter table public.stages add column if not exists \"order\" int");
    await pg.query("create index if not exists stages_order_idx on public.stages(\"order\")");
    await pg.query('commit');
    console.log('Schema de stages atualizado com sucesso.');
  } catch (e) {
    try { await pg.query('rollback'); } catch {}
    console.error('Erro ao atualizar schema:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
