const { Pool } = require('pg');
require('dotenv').config({ path: './.env.local' });
const bcrypt = require('bcryptjs');

const PG_CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN) || /sslmode=require/i.test(PG_CONN) ? { rejectUnauthorized: false } : undefined,
});

pool.query('select email, password from public.users where email = $1', ['admin@labadmin.com'])
  .then(res => {
    if (res.rows.length) {
      const user = res.rows[0];
      console.log('Email:', user.email);
      console.log('Hash no banco:', user.password);
      
      // Testar senhas
      const senhas = ['admin123', 'admin@', 'admin'];
      senhas.forEach(senha => {
        const match = bcrypt.compareSync(senha, user.password);
        console.log(`Senha "${senha}":`, match ? 'VÁLIDA' : 'inválida');
      });
    } else {
      console.log('Usuário não encontrado');
    }
    pool.end();
  })
  .catch(err => {
    console.error('Erro:', err);
    pool.end();
  });
