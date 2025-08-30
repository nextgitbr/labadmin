/*
  Create tables for app settings in Postgres and ensure initial row exists.
  - public.settings_app
  - public.settings_advantages (linked by app_key)
  - public.settings_welcome_messages (linked by app_key)

  Env:
    PG_URI or DATABASE_URL (required)

  This script auto-loads .env.local if present.
*/

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load .env.local if present
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('Loaded .env.local');
  }
} catch {}

const PG_URI = process.env.PG_URI || process.env.DATABASE_URL;
if (!PG_URI) {
  console.error('PG_URI/DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const pg = new Client({ connectionString: PG_URI, ssl: PG_URI.includes('supabase.co') ? { rejectUnauthorized: false } : undefined });
  await pg.connect();
  try {
    await pg.query('begin');

    // settings_app
    await pg.query(`
      create table if not exists public.settings_app (
        id bigserial primary key,
        key text unique,
        app_name text not null default 'LabAdmin',
        show_welcome boolean not null default true,
        show_advantages boolean not null default true,
        advantages_rotation_ms integer not null default 8000,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    // settings_advantages linked by app_key (text)
    await pg.query(`
      create table if not exists public.settings_advantages (
        id bigserial primary key,
        app_key text not null,
        position integer not null,
        destaque text not null,
        complemento text not null,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (app_key, position)
      );
    `);

    // settings_welcome_messages linked by app_key (text)
    await pg.query(`
      create table if not exists public.settings_welcome_messages (
        id bigserial primary key,
        app_key text not null,
        locale text not null,
        message text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (app_key, locale)
      );
    `);

    // Ensure the base app row exists with key='app'
    await pg.query(`
      insert into public.settings_app (key, app_name, show_welcome, show_advantages, advantages_rotation_ms)
      values ('app', 'LabAdmin', true, true, 8000)
      on conflict (key) do update set updated_at = now();
    `);

    await pg.query('commit');
    console.log('App settings tables are ready.');
  } catch (e) {
    await pg.query('rollback').catch(() => {});
    console.error('Failed to create app settings tables:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main();
