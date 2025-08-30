"use client";
import React, { useEffect, useState } from 'react';
import { useSessionAlert } from '@/context/SessionAlertContext';

const animationClasses = {
  fadeIn: 'animate-[fadeIn_0.3s_ease-in-out]',
  slideInUp: 'animate-[slideInUp_0.3s_ease-in-out]',
  slideInDown: 'animate-[slideInDown_0.3s_ease-in-out]',
  zoomIn: 'animate-[zoomIn_0.3s_ease-in-out]',
  fadeOut: 'animate-[fadeOut_0.3s_ease-in-out]',
  slideOutDown: 'animate-[slideOutDown_0.3s_ease-in-out]',
  slideOutUp: 'animate-[slideOutUp_0.3s_ease-in-out]',
  zoomOut: 'animate-[zoomOut_0.3s_ease-in-out]',
  none: ''
};

export default function SessionExpirationAlert() {
  const { config, showAlert, setShowAlert, timeRemaining } = useSessionAlert();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (showAlert && config.enabled) {
      setIsVisible(true);
      setIsAnimatingOut(false);
    } else if (isVisible) {
      // Iniciar animação de saída
      setIsAnimatingOut(true);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
      }, 300); // Duração da animação
      return () => clearTimeout(timeout);
    }
  }, [showAlert, config.enabled, isVisible]);

  if (!isVisible || !config.enabled) return null;

  const alertText = config.alertText.replace('{seconds}', timeRemaining.toString());
  
  const animationClass = isAnimatingOut 
    ? animationClasses[config.animationOut as keyof typeof animationClasses] || ''
    : animationClasses[config.animationIn as keyof typeof animationClasses] || '';

  const handleClose = () => {
    setShowAlert(false);
  };

  return (
    <>
      {/* Estilos CSS para animações customizadas */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideInDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOutUp {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes slideInUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOutDown {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes zoomOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.8); opacity: 0; }
        }
      `}</style>

      {/* Alerta fixo no topo direito */}
      <div 
        className={`fixed top-4 right-4 z-[9999] max-w-sm w-full shadow-lg rounded-lg border-2 p-4 ${animationClass}`}
        style={{
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          color: config.textColor
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {/* Ícone de aviso */}
            <div className="flex-shrink-0">
              <svg 
                className="w-6 h-6" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            
            {/* Conteúdo do alerta */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1">
                Aviso de Sessão
              </h3>
              <p className="text-sm">
                {alertText}
              </p>
            </div>
          </div>
          
          {/* Botão de fechar */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Fechar alerta"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        </div>
        
        {/* Barra de progresso */}
        <div className="mt-3">
          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{
                backgroundColor: config.textColor,
                width: `${Math.max(0, (timeRemaining / config.timeoutWarning) * 100)}%`
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
