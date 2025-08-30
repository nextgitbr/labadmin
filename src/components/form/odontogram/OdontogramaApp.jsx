import React, { useState, useCallback } from 'react';
import Odontograma from './Odontograma';
import './Odontograma.css';

export default function OdontogramaApp({ onSubmit, showPatientField = true }) {
  const [selected, setSelected] = useState([]);
  const [patient, setPatient] = useState('');

  const toggleTooth = useCallback((tooth) => {
    setSelected((prev) => {
      const exists = prev.includes(tooth.label);
      if (exists) return prev.filter((t) => t !== tooth.label);
      return [...prev, tooth.label];
    });
  }, []);

  const handleSubmit = () => {
    const orderData = {
      patient,
      selectedTeeth: selected,
      date: new Date().toLocaleDateString('pt-BR'),
      time: new Date().toLocaleTimeString('pt-BR')
    };
    
    if (onSubmit) {
      onSubmit(orderData);
    }
  };

  const handleClear = () => {
    setSelected([]);
    setPatient('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Odontograma */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Odontograma
          </h3>
          <Odontograma
            width={300}
            height={500}
            viewBox="100 100 250 450"
            selectedTeeth={selected}
            onToothClick={toggleTooth}
          />
        </div>

        {/* Painel de controle */}
        <div>
          {showPatientField && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome do Paciente
              </label>
              <input
                type="text"
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Digite o nome do paciente"
              />
            </div>
          )}

          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Dentes Selecionados ({selected.length})
            </h4>
            <div className="min-h-[100px] p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
              {selected.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Clique nos dentes no odontograma para selecioná-los
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selected.map((tooth) => (
                    <span
                      key={tooth}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {tooth}
                      <button
                        onClick={() => toggleTooth({ label: tooth })}
                        className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={selected.length === 0 || (showPatientField && !patient.trim())}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              📋 Criar Pedido
            </button>
            
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium rounded-md transition-colors"
            >
              🗑️ Limpar
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <p>💡 Dica: Clique nos dentes para selecioná-los</p>
            <p>Atualmente implementados: 11, 12, 13, 21, 22</p>
          </div>
        </div>
      </div>
    </div>
  );
}
