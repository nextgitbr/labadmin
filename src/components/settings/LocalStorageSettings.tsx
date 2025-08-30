"use client";
import React, { useState, useEffect } from 'react';
import { performFullCleanup, auditLocalStorage, cleanLocalStorage, optimizeConfigs } from '@/utils/localStorageManager';

interface StorageItem {
  key: string;
  size: number;
  essential: boolean;
  value: string;
}

export default function LocalStorageSettings() {
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const ESSENTIAL_KEYS = [
    'labadmin_token',
    'labadmin_user', 
    'labadmin_permissions',
    'theme'
  ];

  const loadStorageData = () => {
    const items: StorageItem[] = [];
    let total = 0;

    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        const size = value.length + key.length;
        const essential = ESSENTIAL_KEYS.includes(key);
        
        items.push({ key, size, essential, value });
        total += size;
      }
    }

    // Ordenar por tamanho (maior primeiro)
    items.sort((a, b) => b.size - a.size);
    
    setStorageItems(items);
    setTotalSize(total);
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFullCleanup = async () => {
    setIsLoading(true);
    try {
      performFullCleanup();
      loadStorageData();
      alert('Limpeza completa realizada com sucesso!');
    } catch (error) {
      console.error('Erro na limpeza:', error);
      alert('Erro durante a limpeza do localStorage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickClean = async () => {
    setIsLoading(true);
    try {
      cleanLocalStorage();
      loadStorageData();
      alert('Limpeza rápida realizada com sucesso!');
    } catch (error) {
      console.error('Erro na limpeza rápida:', error);
      alert('Erro durante a limpeza rápida');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizeConfigs = async () => {
    setIsLoading(true);
    try {
      optimizeConfigs();
      loadStorageData();
      alert('Configurações otimizadas com sucesso!');
    } catch (error) {
      console.error('Erro na otimização:', error);
      alert('Erro durante a otimização');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = (key: string) => {
    if (ESSENTIAL_KEYS.includes(key)) {
      alert('Este item é essencial e não pode ser removido!');
      return;
    }

    if (confirm(`Tem certeza que deseja remover "${key}"?`)) {
      localStorage.removeItem(key);
      loadStorageData();
    }
  };

  const handleAudit = () => {
    auditLocalStorage();
    alert('Auditoria realizada! Verifique o console para detalhes.');
  };

  const handleDebugUser = () => {
    console.log('🔍 === DEBUG DOS DADOS DO USUÁRIO ===');
    
    const userDataStr = localStorage.getItem('labadmin_user');
    console.log('📋 Raw labadmin_user:', userDataStr);
    
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        console.log('📊 Dados parseados:', userData);
        console.log('🔑 Chaves disponíveis:', Object.keys(userData));
        console.log('🆔 Campo _id:', userData._id);
        console.log('🆔 Campo id:', userData.id);
        console.log('🆔 Campo userId:', userData.userId);
        
        // Procura por qualquer campo que pareça ser um ID
        Object.keys(userData).forEach(key => {
          const value = userData[key];
          if (typeof value === 'string' && (key.toLowerCase().includes('id') || value.length === 24)) {
            console.log(`🔍 Possível ID encontrado - ${key}:`, value);
          }
        });
      } catch (error) {
        console.error('❌ Erro ao parsear dados do usuário:', error);
      }
    } else {
      console.warn('⚠️ Nenhum dado de usuário encontrado no localStorage');
    }
    
    console.log('🔍 === FIM DO DEBUG ===');
    alert('Debug realizado! Verifique o console para detalhes dos dados do usuário.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: <span className="font-medium">{formatBytes(totalSize)}</span>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <button
          onClick={handleFullCleanup}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
        >
          {isLoading ? 'Processando...' : 'Limpeza Completa'}
        </button>
        
        <button
          onClick={handleQuickClean}
          disabled={isLoading}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm"
        >
          Limpeza Rápida
        </button>
        
        <button
          onClick={handleOptimizeConfigs}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm"
        >
          Otimizar Configs
        </button>
        
        <button
          onClick={handleAudit}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
        >
          Auditoria
        </button>
        
        <button
          onClick={handleDebugUser}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
        >
          Debug Usuário
        </button>
      </div>

      {/* Lista de itens */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Itens no localStorage ({storageItems.length})
          </h4>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {storageItems.map((item) => (
            <div
              key={item.key}
              className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    item.essential 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {item.key}
                  </span>
                  {item.essential && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Essencial
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatBytes(item.size)} • {item.value.length > 50 ? `${item.value.substring(0, 50)}...` : item.value}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatBytes(item.size)}
                </span>
                {!item.essential && (
                  <button
                    onClick={() => handleRemoveItem(item.key)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                    title="Remover item"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Informações */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-2">ℹ️ Informações sobre a limpeza:</p>
          <ul className="space-y-1 text-xs">
            <li><strong>Limpeza Completa:</strong> Remove itens desnecessários, otimiza configurações e reduz appSettings</li>
            <li><strong>Limpeza Rápida:</strong> Remove apenas itens temporários e de desenvolvimento</li>
            <li><strong>Otimizar Configs:</strong> Simplifica configurações de alertas mantendo apenas o essencial</li>
            <li><strong>Itens Essenciais:</strong> Token, usuário, permissões e tema não podem ser removidos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
