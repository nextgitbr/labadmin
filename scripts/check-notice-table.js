const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.vercel') });

async function checkNoticeSettings() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    // Verificar estrutura da tabela notice_settings
    console.log('\n📋 Verificando estrutura da tabela notice_settings...');
    const structureQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM
        information_schema.columns
      WHERE
        table_schema = 'public'
        AND table_name = 'notice_settings'
      ORDER BY
        ordinal_position;
    `;

    const structureResult = await client.query(structureQuery);
    console.log('Estrutura da tabela:');
    console.table(structureResult.rows);

    // Verificar registros na tabela
    console.log('\n📊 Verificando registros na tabela notice_settings...');
    const countQuery = 'SELECT COUNT(*) as total FROM notice_settings';
    const countResult = await client.query(countQuery);
    console.log(`Total de registros: ${countResult.rows[0].total}`);

    if (parseInt(countResult.rows[0].total) > 0) {
      const dataQuery = `
        SELECT
          id,
          app_key,
          app_id,
          enabled,
          title,
          description,
          cta_label,
          cta_url,
          expires_at,
          created_at,
          updated_at
        FROM notice_settings
        LIMIT 5
      `;
      const dataResult = await client.query(dataQuery);
      console.log('\nPrimeiros registros:');
      console.table(dataResult.rows);
    }

    console.log('\n✅ Verificação concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao verificar a tabela notice_settings:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkNoticeSettings();
