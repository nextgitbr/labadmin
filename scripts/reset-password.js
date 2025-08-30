const { Pool } = require('pg');
require('dotenv').config({ path: './.env.local' });
const crypto = require('crypto');

const PG_CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN) || /sslmode=require/i.test(PG_CONN) ? { rejectUnauthorized: false } : undefined,
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const newPassword = 'admin@';
const hashed = hashPassword(newPassword);

pool.query('update public.users set password = $1 where email = $2', [hashed, 'admin@labadmin.com'])
  .then(res => {
    console.log('Senha resetada para admin@labadmin.com:', res.rowCount, 'linha(s) afetada(s)');
    pool.end();
  })
  .catch(err => {
    console.error('Erro:', err);
    pool.end();
  });
