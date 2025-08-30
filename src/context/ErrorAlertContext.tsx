"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ErrorAlertConfig {
  enabled: boolean;
  duration: number; // duração em segundos
  message: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  animation: 'slide' | 'fade' | 'bounce';
}

interface ErrorAlertContextType {
  config: ErrorAlertConfig;
  updateConfig: (newConfig: Partial<ErrorAlertConfig>) => void;
  showAlert: (message?: string) => void;
  hideAlert: () => void;
  isVisible: boolean;
  currentMessage: string;
}

const defaultConfig: ErrorAlertConfig = {
  enabled: true,
  duration: 6,
  message: 'Ocorreu um erro.',
  backgroundColor: '#fef2f2', // red-50
  textColor: '#b91c1c',       // red-700
  borderColor: '#ef4444',     // red-500
  animation: 'slide'
};

const ErrorAlertContext = createContext<ErrorAlertContextType | undefined>(undefined);

export function ErrorAlertProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ErrorAlertConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('errorAlertConfig');
      if (saved) {
        try {
          return { ...defaultConfig, ...JSON.parse(saved) };
        } catch (error) {
          console.warn('Erro ao carregar configuração de alerta de erro:', error);
        }
      }
    }
    return defaultConfig;
  });

  const [isVisible, setIsVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  const updateConfig = (newConfig: Partial<ErrorAlertConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('errorAlertConfig', JSON.stringify(updatedConfig));
    }
  };

  const showAlert = (message?: string) => {
    if (!config.enabled) return;
    setCurrentMessage(message || config.message);
    setIsVisible(true);
    setTimeout(() => setIsVisible(false), config.duration * 1000);
  };

  const hideAlert = () => setIsVisible(false);

  return (
    <ErrorAlertContext.Provider value={{
      config,
      updateConfig,
      showAlert,
      hideAlert,
      isVisible,
      currentMessage,
    }}>
      {children}
    </ErrorAlertContext.Provider>
  );
}

export function useErrorAlert() {
  const context = useContext(ErrorAlertContext);
  if (context === undefined) {
    throw new Error('useErrorAlert must be used within an ErrorAlertProvider');
  }
  return context;
}
