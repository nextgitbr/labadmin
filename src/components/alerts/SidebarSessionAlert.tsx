"use client";
import React, { useEffect, useState } from 'react';
import { useSessionAlert } from '@/context/SessionAlertContext';
import { useSidebar } from '@/context/SidebarContext';

export default function SidebarSessionAlert() {
  const { config, showAlert, setShowAlert, timeRemaining } = useSessionAlert();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Determinar se o sidebar está expandido
  const sidebarExpanded = isExpanded || isHovered || isMobileOpen;

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
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [showAlert, config.enabled, isVisible]);

  if (!isVisible || !config.enabled) return null;

  const alertText = config.alertText.replace('{seconds}', timeRemaining.toString());
  
  const handleClose = () => {
    setShowAlert(false);
  };

  return (
    <>
      {/* Estilos CSS para animações */}
      <style jsx>{`
        @keyframes slideInUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOutDown {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      {/* Alerta no rodapé do sidebar */}
      <div 
        className={`
          mt-auto p-3 mx-3 mb-3 rounded-lg border-2 text-xs
          ${isAnimatingOut 
            ? 'animate-[slideOutDown_0.3s_ease-in-out]' 
            : 'animate-[slideInUp_0.3s_ease-in-out]'
          }
          ${!sidebarExpanded ? 'hidden' : ''}
        `}
        style={{
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          color: config.textColor
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start space-x-2">
            {/* Ícone de aviso compacto */}
            <div className="flex-shrink-0 mt-0.5">
              <svg 
                className="w-4 h-4" 
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
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs mb-1">
                Sessão Expirando
              </div>
              <p className="text-xs leading-tight break-words">
                {alertText}
              </p>
            </div>
          </div>
          
          {/* Botão de fechar compacto */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-1 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Fechar alerta"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        </div>
        
        {/* Barra de progresso compacta */}
        <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full transition-all duration-1000 ease-linear"
            style={{
              backgroundColor: config.textColor,
              width: `${Math.max(0, (timeRemaining / config.timeoutWarning) * 100)}%`
            }}
          />
        </div>
        
        {/* Contador de tempo grande */}
        <div className="text-center mt-2">
          <div 
            className="text-lg font-bold"
            style={{ color: config.textColor }}
          >
            {timeRemaining}s
          </div>
        </div>
      </div>
    </>
  );
}
