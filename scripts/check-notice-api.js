// Script para verificar a API de configurações de aviso
const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');

// Lê as variáveis de ambiente do arquivo .env.vercel
require('dotenv').config({ path: '.env.vercel' });

const API_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const TOKEN = process.env.NEXTAUTH_SECRET; // Em produção, use um token JWT válido

console.log(`🔍 Verificando API em: ${API_URL}/api/settings/notice`);

// Função para fazer requisição HTTPS
function checkNoticeAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(API_URL).hostname,
      port: 443,
      path: '/api/settings/notice',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            error: 'Erro ao fazer parse da resposta',
            raw: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        error: 'Erro na requisição',
        details: error.message
      });
    });

    req.end();
  });
}

// Executa a verificação
async function run() {
  try {
    console.log('🔍 Verificando a API de configurações de aviso...');
    const result = await checkNoticeAPI();
    
    console.log('✅ Resposta da API:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.status !== 200) {
      console.error(`❌ Erro na API: Status ${result.status}`);
      if (result.error) console.error('Detalhes:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar a API:', error);
    process.exit(1);
  }
}

run();
