"use client";
import React, { useState } from 'react';
import Button from '@/components/ui/button/Button';

export default function AdminInitPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const initializeAdmin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Primeiro, verificar status atual
      const statusResponse = await fetch('/api/admin/init');
      const statusData = await statusResponse.json();
      
      console.log('📊 Status atual:', statusData);

      // Criar administrador (limpar usuários existentes)
      const response = await fetch('/api/admin/init', {
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
        setResult(data);
      } else {
        setError(data.message || 'Erro desconhecido');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com a API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🚀 Inicializar Sistema
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Criar usuário administrador com dados criptografados
            </p>
          </div>

          {!result && !error && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  ⚠️ Atenção
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Esta ação irá <strong>remover todos os usuários existentes</strong> e criar um novo usuário administrador com dados criptografados.
                </p>
              </div>

              <Button 
                onClick={initializeAdmin}
                disabled={loading}
                className="w-full"
              >
                {loading ? '🔄 Inicializando...' : '🚀 Inicializar Administrador'}
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">
                  ✅ Usuário Administrador Criado!
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">📧 Email:</span>
                    <span className="font-mono text-green-800 dark:text-green-200">
                      {result.admin.email}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">🔑 Senha:</span>
                    <span className="font-mono text-green-800 dark:text-green-200">
                      {result.admin.defaultPassword}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">📱 PIN:</span>
                    <span className="font-mono text-green-800 dark:text-green-200">
                      {result.admin.defaultPin}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">👤 Função:</span>
                    <span className="font-mono text-green-800 dark:text-green-200">
                      {result.admin.role}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">🆔 ID:</span>
                    <span className="font-mono text-green-800 dark:text-green-200 text-xs">
                      {result.admin.id}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    🔒 <strong>Todos os dados estão criptografados</strong> no banco de dados usando sua chave de segurança do .env
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                🚪 Ir para Login
              </Button>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  ❌ Erro
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>

              <Button 
                onClick={() => {
                  setError(null);
                  setResult(null);
                }}
                className="w-full"
              >
                🔄 Tentar Novamente
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 Certifique-se de que o MongoDB está conectado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
