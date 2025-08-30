'use client';

import React, { useState } from 'react';
import { OrderData } from '../form/odontogram/types';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: OrderData) => void;
}

const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (orderData: OrderData) => {
    setIsLoading(true);
    try {
      await onSubmit(orderData);
      onClose();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Novo Pedido - Sistema de Odontograma
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {/* Aqui será carregado dinamicamente o componente OdontogramaSystem */}
            <div id="odontograma-container">
              <p className="text-center text-gray-500 dark:text-gray-400">
                Carregando sistema de odontograma...
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrderModal;
