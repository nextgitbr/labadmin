/*
  Alter notice_settings to add expires_at column if not exists.
  Env: PG_URI or DATABASE_URL
*/
const { Client } = require('pg');

async function main() {
  const pgUri = process.env.PG_URI || process.env.DATABASE_URL;
  if (!pgUri) {
    console.error('PG_URI/DATABASE_URL not set');
    process.exit(1);
  }
  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  try {
    await pg.query('begin');
    const exists = await pg.query(`
      select 1 from information_schema.columns
      where table_schema='public' and table_name='notice_settings' and column_name='expires_at'
    `);
    if (exists.rowCount === 0) {
      await pg.query(`alter table public.notice_settings add column expires_at timestamptz null`);
      await pg.query(`create index if not exists idx_notice_expires_at on public.notice_settings(expires_at)`);
      console.log('Added expires_at to notice_settings');
    } else {
      console.log('expires_at already exists');
    }
    await pg.query('commit');
  } catch (e) {
    await pg.query('rollback');
    console.error('Alter failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main();
