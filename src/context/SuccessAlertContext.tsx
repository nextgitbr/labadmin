"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SuccessAlertConfig {
  enabled: boolean;
  duration: number; // duração em segundos
  message: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  animation: 'slide' | 'fade' | 'bounce';
}

interface SuccessAlertContextType {
  config: SuccessAlertConfig;
  updateConfig: (newConfig: Partial<SuccessAlertConfig>) => void;
  showAlert: (message?: string) => void;
  hideAlert: () => void;
  isVisible: boolean;
  currentMessage: string;
}

const defaultConfig: SuccessAlertConfig = {
  enabled: true,
  duration: 5, // 5 segundos
  message: 'Operação realizada com sucesso!',
  backgroundColor: '#10b981', // green-500
  textColor: '#ffffff',
  borderColor: '#059669', // green-600
  animation: 'slide'
};

const SuccessAlertContext = createContext<SuccessAlertContextType | undefined>(undefined);

export function SuccessAlertProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SuccessAlertConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('successAlertConfig');
      if (saved) {
        try {
          return { ...defaultConfig, ...JSON.parse(saved) };
        } catch (error) {
          console.warn('Erro ao carregar configuração de alerta de sucesso:', error);
        }
      }
    }
    return defaultConfig;
  });

  const [isVisible, setIsVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  const updateConfig = (newConfig: Partial<SuccessAlertConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('successAlertConfig', JSON.stringify(updatedConfig));
    }
  };

  const showAlert = (message?: string) => {
    if (!config.enabled) return;
    
    setCurrentMessage(message || config.message);
    setIsVisible(true);
    
    // Auto-hide após a duração configurada
    setTimeout(() => {
      setIsVisible(false);
    }, config.duration * 1000);
  };

  const hideAlert = () => {
    setIsVisible(false);
  };

  return (
    <SuccessAlertContext.Provider value={{
      config,
      updateConfig,
      showAlert,
      hideAlert,
      isVisible,
      currentMessage
    }}>
      {children}
    </SuccessAlertContext.Provider>
  );
}

export function useSuccessAlert() {
  const context = useContext(SuccessAlertContext);
  if (context === undefined) {
    throw new Error('useSuccessAlert must be used within a SuccessAlertProvider');
  }
  return context;
}
