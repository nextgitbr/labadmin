import React from 'react';

// Dentes por arcada (FDI)
const UPPER_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

// Tipos de construção dental com suas cores
const CONSTRUCTION_TYPES = {
  'Inlay': '#7F0066',
  'Onlay': '#5D5DBC', 
  'Veneer': '#6F2B94',
  'Crown': '#FF8800',
  'Pontic': '#1C2078',
  'Provisional crown': '#E615E3',
  'BiteSplint': '#4E93CF',
  'Bar': '#2D2D0B',
  'Waxup': '#3B7235',
  'Model': '#C2C87D',
  'Hybrid Protocol': '#B24141',
  'Total Prosthesis': '#B2418B'
};

// Componente de dente individual com formato anatômico (somente visualização)
const ToothShape = ({ toothNumber, construction }) => {
  const isUpperTooth = UPPER_TEETH.includes(toothNumber);
  const toothIndex = isUpperTooth ? UPPER_TEETH.indexOf(toothNumber) : LOWER_TEETH.indexOf(toothNumber);
  
  // Determinar tipo de dente baseado na posição
  const getToothType = (index) => {
    if (index >= 5 && index <= 10) return 'anterior'; // Caninos e incisivos
    if (index >= 3 && index <= 4) return 'premolar';
    if (index >= 11 && index <= 12) return 'premolar';
    return 'molar'; // Molares
  };
  
  const toothType = getToothType(toothIndex);
  const fillColor = construction ? CONSTRUCTION_TYPES[construction] || '#e5e7eb' : '#e5e7eb';
  const strokeColor = construction ? '#1e40af' : '#9ca3af';

  // SVG paths para diferentes tipos de dentes
  const getToothPath = () => {
    switch (toothType) {
      case 'anterior':
        return isUpperTooth 
          ? "M15 5 C20 5, 25 8, 25 15 L25 35 C25 40, 20 45, 15 45 L10 45 C5 45, 0 40, 0 35 L0 15 C0 8, 5 5, 10 5 Z"
          : "M15 0 C20 0, 25 5, 25 10 L25 30 C25 38, 20 45, 15 45 C12 42, 8 42, 5 45 C0 38, 0 30, 0 10 C0 5, 5 0, 10 0 Z";
      
      case 'premolar':
        return isUpperTooth
          ? "M15 5 C22 5, 28 10, 28 18 L28 32 C28 38, 22 45, 15 45 L10 45 C3 45, -2 38, -2 32 L-2 18 C-2 10, 3 5, 10 5 Z"
          : "M15 0 C22 0, 28 7, 28 15 L28 28 C28 38, 22 45, 15 45 C12 42, 8 42, 5 45 C-2 38, -2 28, -2 15 C-2 7, 3 0, 10 0 Z";
      
      default: // molar
        return isUpperTooth
          ? "M18 5 C25 5, 32 10, 32 18 L32 32 C32 38, 25 45, 18 45 L7 45 C0 45, -5 38, -5 32 L-5 18 C-5 10, 0 5, 7 5 Z"
          : "M18 0 C25 0, 32 7, 32 15 L32 28 C32 38, 25 45, 18 45 C15 42, 10 42, 7 45 C0 38, -5 28, -5 15 C-5 7, 0 0, 7 0 Z";
    }
  };

  const getViewBox = () => {
    switch (toothType) {
      case 'anterior': return "-2 0 30 50";
      case 'premolar': return "-5 0 35 50";
      default: return "-8 0 42 50";
    }
  };

  return (
    <div className="flex flex-col items-center">
      <svg 
        width="32" 
        height="40" 
        viewBox={getViewBox()}
      >
        <path
          d={getToothPath()}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      </svg>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
        {toothNumber}
      </span>
    </div>
  );
};

export default function OdontogramViewer({ toothConstructions, title = "Construções Dentais" }) {
  if (!toothConstructions || Object.keys(toothConstructions).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          {title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Nenhuma construção dental definida
        </p>
      </div>
    );
  }

  // Agrupar construções por tipo
  const constructionsByType = {};
  Object.entries(toothConstructions).forEach(([tooth, construction]) => {
    if (!constructionsByType[construction]) {
      constructionsByType[construction] = [];
    }
    constructionsByType[construction].push(tooth);
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
        {title}
      </h2>
      
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        {/* Arcada Superior */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 text-center">
            Arcada Superior
          </h4>
          <div className="flex justify-center items-end gap-1">
            {UPPER_TEETH.map(tooth => (
              <ToothShape
                key={tooth}
                toothNumber={tooth}
                construction={toothConstructions[tooth]}
              />
            ))}
          </div>
        </div>

        {/* Arcada Inferior */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 text-center">
            Arcada Inferior
          </h4>
          <div className="flex justify-center items-start gap-1">
            {LOWER_TEETH.map(tooth => (
              <ToothShape
                key={tooth}
                toothNumber={tooth}
                construction={toothConstructions[tooth]}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
