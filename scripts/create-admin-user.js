const { Pool } = require('pg');
require('dotenv').config({ path: './.env.local' });
const bcrypt = require('bcryptjs');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const PG_CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN) || /sslmode=require/i.test(PG_CONN) ? { rejectUnauthorized: false } : undefined,
});

async function createAdminUser(email, password = '12345678') {
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const name = email.split('@')[0];
    
    // Verificar se o usuário já existe
    const userExists = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
    
    if (userExists.rows.length > 0) {
      // Atualizar usuário existente para admin
      await pool.query(
        `UPDATE public.users 
         SET password = $1, 
             first_name = $2, 
             last_name = 'Admin', 
             role = 'administrator', 
             is_active = true 
         WHERE email = $3`,
        [hashedPassword, name, email]
      );
      console.log(`\n✅ Usuário ${email} atualizado como administrador.`);
    } else {
      // Criar novo usuário admin
      const result = await pool.query(
        `INSERT INTO public.users 
         (email, password, first_name, last_name, role, is_active) 
         VALUES ($1, $2, $3, 'Admin', 'administrator', true) 
         RETURNING id`,
        [email, hashedPassword, name]
      );
      console.log(`\n✅ Usuário administrador criado com sucesso!`);
      console.log(`ID: ${result.rows[0].id}`);
    }
    
    console.log(`👤 Email: ${email}`);
    console.log(`🔑 Senha: ${password}`);
    console.log('\n⚠️ Lembre-se de alterar a senha após o primeiro login!');
    
  } catch (error) {
    console.error('\n❌ Erro ao criar usuário:', error.message);
  } finally {
    pool.end();
    process.exit();
  }
}

// Se o email for fornecido como argumento
const emailArg = process.argv[2];
if (emailArg && emailArg.includes('@')) {
  createAdminUser(emailArg);
} else {
  readline.question('Digite o email do novo administrador: ', (email) => {
    readline.question('Digite a senha (deixe em branco para usar 12345678): ', (password) => {
      createAdminUser(email, password || '12345678');
      readline.close();
    });
  });
}
