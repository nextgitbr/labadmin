#!/usr/bin/env node
/**
 * Create/alter public.users schema to match MongoDB users collection.
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
    console.log('Altering/creating public.users table...');
    await pg.query('begin');

    await pg.query(`
      create table if not exists public.users (
        id bigserial primary key,
        external_id text unique,
        first_name text,
        last_name text,
        email text not null,
        phone text,
        country text,
        city text,
        zip text,
        vat text,
        role text,
        permissions jsonb,
        company text,
        avatar text,
        password text,
        security_pin text,
        is_active boolean default true,
        active boolean,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
    `);

    // Ensure columns exist in case table is older
    await pg.query(`
      alter table public.users
        add column if not exists external_id text,
        add column if not exists first_name text,
        add column if not exists last_name text,
        add column if not exists email text,
        add column if not exists phone text,
        add column if not exists country text,
        add column if not exists city text,
        add column if not exists zip text,
        add column if not exists vat text,
        add column if not exists role text,
        add column if not exists permissions jsonb,
        add column if not exists company text,
        add column if not exists avatar text,
        add column if not exists password text,
        add column if not exists security_pin text,
        add column if not exists is_active boolean default true,
        add column if not exists active boolean,
        add column if not exists created_at timestamptz default now(),
        add column if not exists updated_at timestamptz default now();
    `);

    // Constraints and indexes
    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_indexes where schemaname='public' and indexname='users_email_unique'
        ) then
          create unique index users_email_unique on public.users (lower(email));
        end if;
      end $$;
    `);

    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_indexes where schemaname='public' and indexname='users_role_idx'
        ) then
          create index users_role_idx on public.users (role);
        end if;
      end $$;
    `);

    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_indexes where schemaname='public' and indexname='users_is_active_idx'
        ) then
          create index users_is_active_idx on public.users (is_active);
        end if;
      end $$;
    `);

    // Add unique constraint on external_id if not null
    await pg.query(`
      do $$ begin
        if not exists (
          select 1 from pg_constraint where conname='users_external_id_unique'
        ) then
          alter table public.users add constraint users_external_id_unique unique (external_id);
        end if;
      end $$;
    `);

    await pg.query('commit');
    console.log('public.users ready.');
  } catch (e) {
    await pg.query('rollback');
    console.error('Erro ao preparar public.users:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
