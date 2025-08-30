const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.vercel') });

const host = process.env.POSTGRES_HOST; // ex: db.<ref>.supabase.co
const user = process.env.POSTGRES_USER || 'postgres';
const password = process.env.POSTGRES_PASSWORD;
const database = process.env.POSTGRES_DATABASE || 'postgres';
const port = 5432;

async function run() {
  const client = new Client({
    host,
    user,
    password,
    database,
    port,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando direto:', { host, database, user, port });
    await client.connect();
    console.log('✅ Conectado!');

    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='notice_settings'
      ORDER BY ordinal_position`);
    console.table(structure.rows);

    const count = await client.query('SELECT COUNT(*)::int AS total FROM public.notice_settings');
    console.log('Total de registros:', count.rows[0].total);

    if (count.rows[0].total > 0) {
      const rows = await client.query(`
        SELECT id, app_key, app_id, enabled, title, expires_at, created_at, updated_at
        FROM public.notice_settings
        ORDER BY id ASC
        LIMIT 5`);
      console.table(rows.rows);
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
