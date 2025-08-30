"use client";
import React from 'react';
import { useSuccessAlert } from '@/context/SuccessAlertContext';

export default function SidebarSuccessAlert() {
  const { isVisible, currentMessage, config, hideAlert } = useSuccessAlert();

  if (!isVisible || !config.enabled) {
    return null;
  }

  const getAnimationClass = () => {
    switch (config.animation) {
      case 'fade':
        return 'animate-fade-in';
      case 'bounce':
        return 'animate-bounce-in';
      case 'slide':
      default:
        return 'animate-slide-in-right';
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg border-l-4 shadow-sm ${getAnimationClass()}`}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        borderLeftColor: config.borderColor,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg 
            className="w-5 h-5 flex-shrink-0" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
              clipRule="evenodd" 
            />
          </svg>
          <span className="text-sm font-medium">
            {currentMessage}
          </span>
        </div>
        <button
          onClick={hideAlert}
          className="ml-2 flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
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
    </div>
  );
}
