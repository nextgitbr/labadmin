"use client";
import React, { useState } from 'react';
import { useSuccessAlert } from '@/context/SuccessAlertContext';

export default function SuccessAlertSettings() {
  const { config, updateConfig, showAlert } = useSuccessAlert();
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    updateConfig(localConfig);
    showAlert('Configurações de alerta de sucesso salvas!');
  };

  const handleTest = () => {
    showAlert('Este é um teste do alerta de sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Configurações de Alertas de Sucesso
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleTest}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Testar
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ativar/Desativar */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={localConfig.enabled}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ativar alertas de sucesso
            </span>
          </label>
        </div>

        {/* Duração */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Duração (segundos)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={localConfig.duration}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 5 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Mensagem padrão */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mensagem padrão
          </label>
          <input
            type="text"
            value={localConfig.message}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, message: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Digite a mensagem padrão"
          />
        </div>

        {/* Cor de fundo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cor de fundo
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={localConfig.backgroundColor}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={localConfig.backgroundColor}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Cor do texto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cor do texto
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={localConfig.textColor}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, textColor: e.target.value }))}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={localConfig.textColor}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, textColor: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Cor da borda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cor da borda
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={localConfig.borderColor}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, borderColor: e.target.value }))}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={localConfig.borderColor}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, borderColor: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Animação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Animação
          </label>
          <select
            value={localConfig.animation}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, animation: e.target.value as 'slide' | 'fade' | 'bounce' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="slide">Deslizar</option>
            <option value="fade">Desvanecer</option>
            <option value="bounce">Saltar</option>
          </select>
        </div>
      </div>
    </div>
  );
}
