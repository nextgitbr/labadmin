#!/usr/bin/env node
/*
  Cleanup script for public.users:
  - Backup JSONB data column into a separate table
  - Drop the data column from public.users

  Safety:
  - Runs inside a transaction
  - Creates backup table public.users_data_backup (id bigint primary key, data jsonb, backed_up_at timestamptz)
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
    console.log('Starting cleanup of public.users.data ...');
    await pg.query('begin');

    // 1) Create backup table if not exists
    await pg.query(`
      create table if not exists public.users_data_backup (
        id bigint primary key,
        data jsonb,
        backed_up_at timestamptz default now()
      );
    `);

    // 2) Upsert current data values into backup (only rows with non-null data)
    const upsertSql = `
      insert into public.users_data_backup (id, data)
      select id, data from public.users where data is not null
      on conflict (id) do update set data = excluded.data, backed_up_at = now();
    `;
    const upsertRes = await pg.query(upsertSql);
    console.log(`Backup upsert complete. Row changes: ${upsertRes.rowCount}`);

    // 3) Drop the data column from public.users
    await pg.query(`
      alter table public.users drop column if exists data;
    `);
    console.log('Dropped column public.users.data');

    await pg.query('commit');
    console.log('Cleanup done.');
  } catch (e) {
    await pg.query('rollback');
    console.error('Cleanup failed, rolled back:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
