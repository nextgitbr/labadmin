#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const arg = process.argv[2] || 'public.orders';
  const [schema, table] = arg.includes('.') ? arg.split('.') : ['public', arg];

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
      select c.column_name,
             c.data_type,
             c.is_nullable,
             c.character_maximum_length,
             c.numeric_precision,
             c.numeric_scale,
             c.column_default
      from information_schema.columns c
      where c.table_schema = $1 and c.table_name = $2
      order by c.ordinal_position
    `;
    const { rows } = await pool.query(sql, [schema, table]);
    if (!rows.length) {
      console.log('Tabela não encontrada');
      return;
    }
    rows.forEach(r => {
      const len = r.character_maximum_length ? `(${r.character_maximum_length})` : '';
      const num = r.numeric_precision ? `(${r.numeric_precision}${r.numeric_scale != null ? ','+r.numeric_scale : ''})` : '';
      const type = r.data_type.includes('character') ? `${r.data_type}${len}` : (r.data_type.includes('numeric') ? `numeric${num}` : r.data_type);
      console.log(`${r.column_name}\t${type}\tnullable=${r.is_nullable}\tdefault=${r.column_default || ''}`);
    });
  } catch (e) {
    console.error('Erro:', e.message || e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
