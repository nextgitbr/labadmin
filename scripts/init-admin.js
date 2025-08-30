// Script para inicializar o banco com usuário administrador
// Execute: node scripts/init-admin.js

const fetch = require('node-fetch');

async function initializeAdmin() {
  try {
    console.log('🚀 Inicializando usuário administrador...');
    console.log('📡 Servidor deve estar rodando em http://localhost:3000');
    
    // Verificar status atual
    console.log('\n📊 Verificando status atual do banco...');
    const statusResponse = await fetch('http://localhost:3000/api/admin/init');
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log(`👥 Total de usuários: ${statusData.stats.totalUsers}`);
      console.log(`👑 Administradores: ${statusData.stats.adminUsers}`);
      console.log(`✅ Tem admin: ${statusData.stats.hasAdmin ? 'Sim' : 'Não'}`);
    }
    
    // Criar administrador (limpar usuários existentes)
    console.log('\n🗑️ Limpando usuários existentes e criando novo administrador...');
    const response = await fetch('http://localhost:3000/api/admin/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clearUsers: true
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('\n✅ SUCESSO! Usuário administrador criado:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 Email: ${data.admin.email}`);
      console.log(`🔑 Senha: ${data.admin.defaultPassword}`);
      console.log(`📱 PIN: ${data.admin.defaultPin}`);
      console.log(`👤 Função: ${data.admin.role}`);
      console.log(`🆔 ID: ${data.admin.id}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🎯 Agora você pode fazer login no sistema!');
      console.log('🔒 Todos os dados estão criptografados no banco de dados.');
    } else {
      console.error('❌ ERRO:', data.message);
      if (data.error) {
        console.error('💥 Detalhes:', data.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar com a API:', error.message);
    console.log('\n💡 Certifique-se de que:');
    console.log('   1. O servidor Next.js está rodando (npm run dev)');
    console.log('   2. O MongoDB está conectado');
    console.log('   3. As variáveis de ambiente estão configuradas');
  }
}

// Executar script
initializeAdmin();
