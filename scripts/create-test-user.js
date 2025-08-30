const { Pool } = require('pg');
require('dotenv').config({ path: './.env.local' });
const bcrypt = require('bcryptjs');

const PG_CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN) || /sslmode=require/i.test(PG_CONN) ? { rejectUnauthorized: false } : undefined,
});

// Criar usuário teste com senha simples
const testUser = {
  email: 'test@labadmin.com',
  password: bcrypt.hashSync('123', 10),
  first_name: 'Test',
  last_name: 'Admin',
  role: 'administrator',
  is_active: true
};

pool.query('delete from public.users where email = $1', [testUser.email])
  .then(() => {
    return pool.query(
      'insert into public.users (email, password, first_name, last_name, role, is_active) values ($1, $2, $3, $4, $5, $6) returning id',
      [testUser.email, testUser.password, testUser.first_name, testUser.last_name, testUser.role, testUser.is_active]
    );
  })
  .then(res => {
    console.log('Usuário teste criado:', testUser.email, 'senha: 123');
    console.log('ID:', res.rows[0].id);
    pool.end();
  })
  .catch(err => {
    console.error('Erro:', err);
    pool.end();
  });
