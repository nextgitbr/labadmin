#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const filterOrder = process.argv[2] || '';
  const conn = process.env.PG_URI || process.env.DATABASE_URL;
  if (!conn) {
    console.error('PG_URI ou DATABASE_URL não definido no .env.local');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: conn,
    ssl: conn.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });
  try {
    if (filterOrder) {
      const { rows, rowCount } = await pool.query(
        `select created_by, created_by_user_id, pg_typeof(created_by) as created_by_type from public.orders where order_number = $1 limit 1`,
        [filterOrder]
      );
      if (!rowCount) {
        console.log(`[${filterOrder}] Sem resultados`);
      } else {
        const r = rows[0];
        console.log(`[${filterOrder}] created_by=${String(r.created_by)}`);
        if (r.created_by_type) {
          console.log(`[${filterOrder}] created_by_type=${r.created_by_type}`);
        }
        if (r.created_by_user_id != null) {
          console.log(`[${filterOrder}] created_by_user_id=${r.created_by_user_id}`);
        }
      }
      return;
    }

    // Listagem padrão (top 50)
    const { rows } = await pool.query(
      `select o.id, o.order_number, o.created_by, cast(o.created_by as text) as created_by_text, o.created_by_user_id
       from public.orders o
       order by o.created_at desc nulls last
       limit 50`
    );
    if (!rows.length) { console.log('Sem resultados'); return; }
    rows.forEach(r => console.log(`${r.order_number}\tcreated_by=${r.created_by}\t(created_by_text='${r.created_by_text}')\tcreated_by_user_id=${r.created_by_user_id}`));
  } catch (e) {
    console.error('Erro:', e.message || e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
