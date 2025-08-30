"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

interface SessionAlertConfig {
  timeoutWarning: number; // segundos antes do logout para mostrar alerta
  alertText: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  animationIn: string;
  animationOut: string;
  enabled: boolean;
}

interface SessionAlertContextType {
  config: SessionAlertConfig;
  updateConfig: (newConfig: Partial<SessionAlertConfig>) => void;
  showAlert: boolean;
  setShowAlert: (show: boolean) => void;
  timeRemaining: number;
  setTimeRemaining: (time: number) => void;
}

const defaultConfig: SessionAlertConfig = {
  timeoutWarning: 60, // 1 minuto antes
  alertText: "Sua sessão expirará em {seconds} segundos",
  textColor: "#dc2626", // red-600
  backgroundColor: "#fef2f2", // red-50
  borderColor: "#fecaca", // red-200
  animationIn: "slideInDown",
  animationOut: "slideOutUp",
  enabled: true
};

const SessionAlertContext = createContext<SessionAlertContextType | undefined>(undefined);

export function SessionAlertProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SessionAlertConfig>(defaultConfig);
  const [showAlert, setShowAlert] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Carregar configurações do localStorage na inicialização
  useEffect(() => {
    const savedConfig = localStorage.getItem('sessionAlertConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsed });
      } catch (error) {
        console.warn('Erro ao carregar configurações de alerta:', error);
      }
    }
  }, []);

  const updateConfig = (newConfig: Partial<SessionAlertConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    
    // Salvar no localStorage
    localStorage.setItem('sessionAlertConfig', JSON.stringify(updatedConfig));
  };

  return (
    <SessionAlertContext.Provider value={{
      config,
      updateConfig,
      showAlert,
      setShowAlert,
      timeRemaining,
      setTimeRemaining
    }}>
      {children}
    </SessionAlertContext.Provider>
  );
}

export function useSessionAlert() {
  const context = useContext(SessionAlertContext);
  if (!context) {
    throw new Error('useSessionAlert deve ser usado dentro de SessionAlertProvider');
  }
  return context;
}
