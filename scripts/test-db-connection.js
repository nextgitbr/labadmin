const { Client } = require('pg');
require('dotenv').config({ path: '.env.vercel' });

async function testConnection() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados com sucesso!');
    
    // Verificar se a tabela notice_settings existe
    const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'notice_settings'
      );
    `);
    
    console.log('Tabela notice_settings existe?', res.rows[0].exists);
    
    if (res.rows[0].exists) {
      // Contar registros na tabela
      const countRes = await client.query('SELECT COUNT(*) FROM notice_settings');
      console.log(`Total de registros em notice_settings: ${countRes.rows[0].count}`);
      
      // Mostrar alguns registros
      const dataRes = await client.query('SELECT * FROM notice_settings LIMIT 5');
      console.log('Primeiros registros:', dataRes.rows);
    }
    
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err);
  } finally {
    await client.end();
  }
}

testConnection();
