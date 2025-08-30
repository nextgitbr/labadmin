const { Pool } = require('pg');
require('dotenv').config({ path: './.env.local' });

console.log('POSTGRES_URL:', process.env.POSTGRES_URL);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('POSTGRES_PRISMA_URL:', process.env.POSTGRES_PRISMA_URL);

const PG_CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

console.log('PG_CONN usado:', PG_CONN);
console.log('SSL condition:', /supabase\.(co|com)/.test(PG_CONN), /sslmode=require/i.test(PG_CONN));
console.log('SSL option:', /supabase\.(co|com)/.test(PG_CONN) || /sslmode=require/i.test(PG_CONN) ? { rejectUnauthorized: false } : undefined);

const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN) || /sslmode=require/i.test(PG_CONN) ? { rejectUnauthorized: false } : undefined,
});

pool.query('select id, email, first_name, last_name, role, is_active from public.users order by id')
  .then(res => {
    console.log('Usuários no banco:');
    console.table(res.rows);
    pool.end();
  })
  .catch(err => {
    console.error('Erro:', err);
    pool.end();
  });
