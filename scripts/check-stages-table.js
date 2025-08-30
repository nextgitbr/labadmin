// Check existence and status of public.stages in Postgres
// Usage: node scripts/check-stages-table.js

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadPgUri() {
  if (process.env.PG_URI) return process.env.PG_URI;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const pick = (key) => {
      const re = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, 'm');
      const m2 = content.match(re);
      if (m2) {
        let v = m2[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) v = v.slice(1, -1);
        return v;
      }
      return null;
    };
    const fromEnv = pick('PG_URI') || pick('DATABASE_URL');
    if (fromEnv) return fromEnv;
  }
  return null;
}

(async () => {
  const pgUri = loadPgUri();
  if (!pgUri) {
    console.error('PG_URI not found. Set it in environment or .env.local');
    process.exit(1);
  }

  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  try {
    await pg.connect();

    const existsRes = await pg.query(
      `select 1 from information_schema.tables where table_schema='public' and table_name='stages' limit 1`
    );

    if (existsRes.rowCount === 0) {
      console.log('Table public.stages does NOT exist.');
      process.exit(0);
    }

    const schemaRes = await pg.query(`
      select column_name, data_type
      from information_schema.columns
      where table_schema='public' and table_name='stages'
      order by ordinal_position
    `);

    const countRes = await pg.query(`select count(*)::int as c from public.stages`);
    console.log('Table public.stages exists.');
    console.log('Columns:', schemaRes.rows);
    console.log('Row count:', countRes.rows[0]?.c ?? 0);

    // Sample first 5 rows
    const sampleRes = await pg.query(`select * from public.stages order by "order" asc nulls last limit 5`);
    console.log('Sample rows (up to 5):');
    console.dir(sampleRes.rows, { depth: null });
  } catch (e) {
    console.error('Error checking stages table:', e.message);
    process.exitCode = 1;
  } finally {
    try { await pg.end(); } catch {}
  }
})();
