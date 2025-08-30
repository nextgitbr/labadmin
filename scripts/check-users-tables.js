#!/usr/bin/env node
/**
 * Inspect users tables in Supabase Postgres:
 * - public.users (if exists)
 * - auth.users (Supabase auth schema)
 * Prints: existence, columns, row counts, and up to 5 sample rows.
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

async function tableInfo(pg, schema, table) {
  const existsRes = await pg.query(
    `select exists (
       select 1 from information_schema.tables
       where table_schema=$1 and table_name=$2
     ) as exists`, [schema, table]
  );
  const exists = existsRes.rows[0]?.exists === true;
  console.log(`Table ${schema}.${table} exists: ${exists}`);
  if (!exists) return;

  const cols = await pg.query(
    `select column_name, data_type
     from information_schema.columns
     where table_schema=$1 and table_name=$2
     order by ordinal_position`, [schema, table]
  );
  console.log('Columns:', cols.rows);

  const count = await pg.query(`select count(*)::int as c from ${schema}.${table}`);
  console.log('Row count:', count.rows[0]?.c);

  // Sample rows: avoid leaking sensitive fields; select a safe subset if table is auth.users
  let sampleSql = `select * from ${schema}.${table} limit 5`;
  if (schema === 'auth' && table === 'users') {
    sampleSql = `select id, email, raw_user_meta_data, created_at, updated_at, last_sign_in_at
                 from auth.users order by created_at desc limit 5`;
  }
  const sample = await pg.query(sampleSql);
  console.log('Sample rows (up to 5):');
  console.log(sample.rows);
}

(async () => {
  const pg = getPg();
  await pg.connect();
  try {
    console.log('--- Checking public.users ---');
    await tableInfo(pg, 'public', 'users');
    console.log('\n--- Checking auth.users ---');
    await tableInfo(pg, 'auth', 'users');
  } catch (e) {
    console.error('Error checking users tables:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
