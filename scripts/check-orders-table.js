/* Lista estrutura e amostra de public.orders no Postgres (Supabase) */
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

(async () => {
  const PG_URI = process.env.PG_URI || process.env.DATABASE_URL;
  if (!PG_URI) {
    console.error('PG_URI/DATABASE_URL não definido no ambiente. Verifique .env.local');
    process.exit(1);
  }
  const pg = new Client({ connectionString: PG_URI, ssl: { rejectUnauthorized: false } });
  try {
    await pg.connect();

    const table = 'orders';
    console.log(`\n--- Checking public.${table} ---`);
    const exists = await pg.query(
      "select 1 from information_schema.tables where table_schema='public' and table_name=$1",
      [table]
    );
    console.log('Table exists:', exists.rowCount > 0);
    if (exists.rowCount === 0) {
      await pg.end();
      process.exit(0);
    }

    const cols = await pg.query(
      "select column_name, data_type from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",
      [table]
    );
    console.log('Columns:', cols.rows);

    const countRes = await pg.query(`select count(*)::int as c from public.${table}`);
    console.log('Row count:', countRes.rows[0].c);

    const sample = await pg.query(`select id, external_id, order_number, patient_name, work_type, status, estimated_delivery, is_active, created_at from public.${table} order by created_at desc nulls last limit 10`);
    console.log('Sample rows:', sample.rows);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
  }
})();
