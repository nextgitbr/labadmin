#!/usr/bin/env node
/*
  Prints indexes, constraints, and duplicate checks for public.orders
*/
const { Client } = require('pg');
const dotenv = require('dotenv');
try { dotenv.config({ path: '.env.local' }); } catch {}

async function main() {
  const conn = process.env.PG_URI || process.env.DATABASE_URL;
  if (!conn) {
    console.error('PG_URI/DATABASE_URL not set');
    process.exit(1);
  }
  const ssl = conn.includes('supabase.co') ? { rejectUnauthorized: false } : undefined;
  const pg = new Client({ connectionString: conn, ssl });
  await pg.connect();
  try {
    console.log('\n=== Indexes on public.orders ===');
    const idx = await pg.query(
      `select indexname, indexdef from pg_indexes where schemaname='public' and tablename='orders' order by indexname`);
    idx.rows.forEach(r => console.log('-', r.indexname, '\n ', r.indexdef));

    console.log('\n=== Constraints on public.orders ===');
    const cons = await pg.query(`
      select c.conname,
             c.contype,
             pg_get_constraintdef(c.oid) as def
      from pg_constraint c
      join pg_class t on c.conrelid = t.oid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = 'orders'
      order by c.conname;
    `);
    cons.rows.forEach(r => console.log('-', r.conname, `(${r.contype})\n `, r.def));

    console.log('\n=== Duplicate checks ===');
    const d1 = await pg.query(`select order_number, count(*) from public.orders where order_number is not null group by order_number having count(*)>1 limit 10`);
    console.log('Duplicate order_number:', d1.rowCount);
    if (d1.rowCount) d1.rows.forEach(r=>console.log(' ', r.order_number, r.count));
    const d2 = await pg.query(`select external_id, count(*) from public.orders where external_id is not null group by external_id having count(*)>1 limit 10`);
    console.log('Duplicate external_id:', d2.rowCount);
    if (d2.rowCount) d2.rows.forEach(r=>console.log(' ', r.external_id, r.count));
  } finally {
    await pg.end();
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
