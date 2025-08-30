#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const orderNumber = process.argv[2];
  if (!orderNumber) {
    console.error('Uso: node scripts/print-order-creator.js <ORDER_NUMBER>');
    process.exit(1);
  }

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
    const sql = `
      select u.first_name, u.last_name
      from public.orders o
      left join public.users u on u.id = o.created_by
      where o.order_number = $1
      limit 1
    `;
    const { rows, rowCount } = await pool.query(sql, [orderNumber]);
    if (!rowCount) {
      console.log('Pedido não encontrado');
      return;
    }
    const fn = rows[0].first_name || '';
    const ln = rows[0].last_name || '';
    const full = `${fn} ${ln}`.trim();
    console.log(full || '(nome vazio)');
  } catch (e) {
    console.error('Erro:', e.message || e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
