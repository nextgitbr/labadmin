#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const orderNumber = process.argv[2];
  if (!orderNumber) {
    console.error('Uso: node scripts/print-user-by-order.js <ORDER_NUMBER>');
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
      select u.*
      from public.orders o
      join public.users u on u.id = o.created_by
      where o.order_number = $1
      limit 1
    `;
    const { rows, rowCount } = await pool.query(sql, [orderNumber]);
    if (!rowCount) {
      console.log('Sem resultados');
      return;
    }
    const u = rows[0];
    // Imprime campos principais, evitando dados sensíveis
    const out = {
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      company: u.company,
      is_active: u.is_active,
      created_at: u.created_at,
      updated_at: u.updated_at,
    };
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error('Erro:', e.message || e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
