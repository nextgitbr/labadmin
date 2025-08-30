'use client';

import React, { useState, useEffect } from 'react';

interface OdontogramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

export default function OdontogramaModal({ isOpen, onClose, onSubmit }: OdontogramaModalProps) {
  const [OdontogramaCompleto, setOdontogramaCompleto] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      
      // Carregamento dinâmico do componente original completo
      import('../form/odontogram/OdontogramaCompleto')
        .then((module) => {
          setOdontogramaCompleto(() => module.default);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Erro ao carregar OdontogramaCompleto:', err);
          setError('Erro ao carregar o componente do odontograma');
          setLoading(false);
        });
    }
  }, [isOpen]);

  const handleSubmit = (orderData: any) => {
    if (onSubmit) {
      onSubmit(orderData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-5 overflow-y-auto bg-gray-400/50 backdrop-blur-[32px]">
      <div className="relative w-full max-w-[95vw] h-[95vh] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        <button 
          aria-label="Fechar modal" 
          onClick={onClose} 
          className="absolute right-3 top-3 z-[999] flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6 sm:h-11 sm:w-11"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M6.043 16.541a1 1 0 0 0 1.414 1.415l4.542-4.542 4.542 4.542a1 1 0 0 0 1.415-1.415l-4.543-4.542 4.543-4.542a1 1 0 1 0-1.415-1.415l-4.542 4.543-4.542-4.543A1 1 0 1 0 6.043 7.457l4.541 4.542-4.54 4.542Z" fill="currentColor"/>
          </svg>
        </button>
        
        <div className="text-center mb-2">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Novo Pedido
          </h4>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-light-500"></div>
              <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">
                Carregando odontograma...
              </span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Erro
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!loading && !error && OdontogramaCompleto && (
            <div className="px-6 pb-6">
              <OdontogramaCompleto onSubmit={handleSubmit} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
