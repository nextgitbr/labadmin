#!/usr/bin/env node
/**
 * Promote fields from JSONB data to top-level columns in public.users
 * - Ensures user columns exist
 * - Copies values from data->>... when top-level is NULL
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
    console.log('Ensuring columns exist on public.users...');
    await pg.query(`
      alter table public.users
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

    console.log('Promoting values from data JSONB to columns (if null)...');
    const res = await pg.query(`
      with src as (
        select id,
          nullif(data->>'firstName','') as j_first_name,
          nullif(data->>'lastName','') as j_last_name,
          nullif(data->>'email','') as j_email,
          nullif(data->>'phone','') as j_phone,
          nullif(data->>'country','') as j_country,
          nullif(data->>'city','') as j_city,
          nullif(data->>'zip','') as j_zip,
          nullif(data->>'vat','') as j_vat,
          nullif(data->>'role','') as j_role,
          data->'permissions' as j_permissions,
          nullif(data->>'company','') as j_company,
          nullif(data->>'avatar','') as j_avatar,
          nullif(data->>'password','') as j_password,
          nullif(data->>'securityPin','') as j_security_pin,
          coalesce((data->>'isActive')::boolean, true) as j_is_active,
          -- 'active' pode não existir em data; não forçamos se ausente
          (data->>'active')::boolean as j_active,
          coalesce((data->>'createdAt')::timestamptz, now()) as j_created_at,
          coalesce((data->>'updatedAt')::timestamptz, now()) as j_updated_at
        from public.users
        where data is not null
      )
      update public.users u
      set
        first_name = coalesce(u.first_name, src.j_first_name),
        last_name = coalesce(u.last_name, src.j_last_name),
        email = coalesce(u.email, src.j_email),
        phone = coalesce(u.phone, src.j_phone),
        country = coalesce(u.country, src.j_country),
        city = coalesce(u.city, src.j_city),
        zip = coalesce(u.zip, src.j_zip),
        vat = coalesce(u.vat, src.j_vat),
        role = coalesce(u.role, src.j_role),
        permissions = coalesce(u.permissions, src.j_permissions),
        company = coalesce(u.company, src.j_company),
        avatar = coalesce(u.avatar, src.j_avatar),
        password = coalesce(u.password, src.j_password),
        security_pin = coalesce(u.security_pin, src.j_security_pin),
        is_active = coalesce(u.is_active, src.j_is_active),
        active = coalesce(u.active, src.j_active),
        created_at = coalesce(u.created_at, src.j_created_at),
        updated_at = greatest(u.updated_at, src.j_updated_at)
      from src
      where u.id = src.id
        and (
          u.first_name is null or u.last_name is null or u.email is null or u.role is null
          or u.permissions is null or u.avatar is null or u.is_active is null
        );
    `);
    console.log(`Rows updated: ${res.rowCount}`);

    console.log('Done.');
  } catch (e) {
    console.error('Error promoting users from data:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
