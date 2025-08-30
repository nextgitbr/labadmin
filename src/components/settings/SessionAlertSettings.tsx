"use client";
import React, { useState, useEffect } from 'react';
import { useSessionAlert } from '@/context/SessionAlertContext';

export default function SessionAlertSettings() {
  const { config, updateConfig } = useSessionAlert();
  const [formData, setFormData] = useState({
    timeoutWarning: config.timeoutWarning.toString(),
    alertText: config.alertText,
    textColor: config.textColor,
    backgroundColor: config.backgroundColor,
    borderColor: config.borderColor,
    animationIn: config.animationIn,
    animationOut: config.animationOut,
    enabled: config.enabled
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Sincronizar com o contexto quando as configurações mudarem
  useEffect(() => {
    setFormData({
      timeoutWarning: config.timeoutWarning.toString(),
      alertText: config.alertText,
      textColor: config.textColor,
      backgroundColor: config.backgroundColor,
      borderColor: config.borderColor,
      animationIn: config.animationIn,
      animationOut: config.animationOut,
      enabled: config.enabled
    });
  }, [config]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSelectChange = (field: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      enabled: e.target.checked
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      // Validar dados
      const timeoutWarning = parseInt(formData.timeoutWarning);
      if (isNaN(timeoutWarning) || timeoutWarning < 10 || timeoutWarning > 300) {
        throw new Error('Tempo de aviso deve estar entre 10 e 300 segundos');
      }

      if (!formData.alertText.trim()) {
        throw new Error('Texto do alerta é obrigatório');
      }

      // Atualizar configurações
      updateConfig({
        timeoutWarning,
        alertText: formData.alertText,
        textColor: formData.textColor,
        backgroundColor: formData.backgroundColor,
        borderColor: formData.borderColor,
        animationIn: formData.animationIn,
        animationOut: formData.animationOut,
        enabled: formData.enabled
      });

      setMessage('Configurações salvas com sucesso!');
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMessage(''), 3000);

    } catch (error: any) {
      setMessage(error.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Alerta de término de sessão</div>
        
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.includes('sucesso') 
              ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
              : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
          }`}>
            {message}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Ativar/Desativar alerta */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="enableAlert"
              checked={formData.enabled}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500"
            />
            <label htmlFor="enableAlert" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Ativar alertas de expiração de sessão
            </label>
          </div>

          {/* Tempo de aviso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Tempo de aviso antes do logout (segundos)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={formData.timeoutWarning}
              onChange={handleInputChange('timeoutWarning')}
              placeholder="60"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Entre 10 e 300 segundos
            </p>
          </div>

          {/* Texto do alerta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Texto do alerta (use {'{seconds}'} para mostrar o tempo)
            </label>
            <input
              type="text"
              value={formData.alertText}
              onChange={handleInputChange('alertText')}
              placeholder="Sua sessão expirará em {seconds} segundos"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Cores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cor da fonte</label>
              <input
                type="color"
                value={formData.textColor}
                onChange={handleInputChange('textColor')}
                className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cor de fundo</label>
              <input
                type="color"
                value={formData.backgroundColor}
                onChange={handleInputChange('backgroundColor')}
                className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cor da borda</label>
              <input
                type="color"
                value={formData.borderColor}
                onChange={handleInputChange('borderColor')}
                className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
              />
            </div>
          </div>

          {/* Animações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Animação de entrada</label>
              <select
                value={formData.animationIn}
                onChange={(e) => handleSelectChange('animationIn')(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="fadeIn">Fade In</option>
                <option value="slideInUp">Slide In Up</option>
                <option value="slideInDown">Slide In Down</option>
                <option value="zoomIn">Zoom In</option>
                <option value="none">Nenhuma</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Animação de saída</label>
              <select
                value={formData.animationOut}
                onChange={(e) => handleSelectChange('animationOut')(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="fadeOut">Fade Out</option>
                <option value="slideOutDown">Slide Out Down</option>
                <option value="slideOutUp">Slide Out Up</option>
                <option value="zoomOut">Zoom Out</option>
                <option value="none">Nenhuma</option>
              </select>
            </div>
          </div>

          {/* Botão salvar */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-light-500 border border-transparent rounded-lg hover:bg-blue-light-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-light-500 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
