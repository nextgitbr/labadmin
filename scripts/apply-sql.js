// Apply a SQL file to the configured Postgres connection
// Connection comes from PG_URI/DATABASE_URL/POSTGRES_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING

const { readFileSync } = require('fs');
const { Client } = require('pg');
const path = require('path');

// Some environments (e.g., Supabase, certain proxies) can trigger
// 'self-signed certificate in certificate chain'. We opt to disable
// TLS cert validation for this one-off migration script.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!PG_CONN) {
    console.error('No Postgres connection string found in environment. Set PG_URI or DATABASE_URL or POSTGRES_URL*');
    process.exit(1);
  }
  const sqlPath = process.argv[2] || path.join(process.cwd(), 'scripts', 'create-sessions-and-app_errors.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const needsSsl = /supabase\.(co|com)/.test(PG_CONN) || /sslmode=require/i.test(PG_CONN);
  const client = new Client({ connectionString: PG_CONN, ssl: needsSsl ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query(sql);
    console.log('SQL applied successfully:', path.basename(sqlPath));
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Failed to apply SQL:', err?.message || err);
  process.exit(1);
});
