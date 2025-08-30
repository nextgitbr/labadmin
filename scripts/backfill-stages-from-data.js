#!/usr/bin/env node
/**
 * Promote fields from JSONB data to top-level columns in public.stages
 * - Ensures columns name (text), color (text), order (int) exist
 * - Copies values from data->>'name' / data->>'color' / data->>'order' when top-level is NULL
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
    console.log('Ensuring columns exist...');
    await pg.query(`
      alter table public.stages
      add column if not exists name text,
      add column if not exists color text,
      add column if not exists "order" integer;
    `);

    console.log('Promoting values from data JSONB to columns (if null)...');
    const res = await pg.query(`
      with src as (
        select 
          id,
          nullif(data->>'name','') as j_name,
          nullif(data->>'color','') as j_color,
          nullif(data->>'order','')::int as j_order
        from public.stages
      )
      update public.stages s
      set 
        name = coalesce(s.name, src.j_name),
        color = coalesce(s.color, src.j_color),
        "order" = coalesce(s."order", src.j_order),
        updated_at = now()
      from src
      where s.id = src.id
        and (s.name is null or s.color is null or s."order" is null);
    `);
    console.log(`Rows updated: ${res.rowCount}`);

    console.log('Done.');
  } catch (e) {
    console.error('Error promoting stages from data:', e);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
})();
