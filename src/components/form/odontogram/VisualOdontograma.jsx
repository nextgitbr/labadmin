import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

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

// Escala de cores Vita
const VITA_SHADES = [
  { code: 'A1', color: '#F2E2D2' }, { code: 'A2', color: '#E8D0B8' }, 
  { code: 'A3', color: '#D7B690' }, { code: 'A4', color: '#C49A70' },
  { code: 'B1', color: '#F3E8DA' }, { code: 'B2', color: '#E9D7BF' }, 
  { code: 'B3', color: '#D8BE99' }, { code: 'B4', color: '#C7A679' },
  { code: 'C1', color: '#E7DFD8' }, { code: 'C2', color: '#D9C8B8' }, 
  { code: 'C3', color: '#C6AD93' }, { code: 'C4', color: '#B29173' },
  { code: 'D2', color: '#E4D9CC' }, { code: 'D3', color: '#D3BEA3' }, 
  { code: 'D4', color: '#C1A284' }, { code: 'D5', color: '#AD8A6A' }
];

// Componente de dente individual com formato anatômico
const ToothShape = ({ toothNumber, isSelected, constructionColor, onClick }) => {
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
  const fillColor = isSelected && constructionColor ? constructionColor : (isSelected ? '#3b82f6' : '#e5e7eb');
  const strokeColor = isSelected ? '#1e40af' : '#9ca3af';

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
    <div className="flex flex-col items-center cursor-pointer" onClick={onClick}>
      <svg 
        width="32" 
        height="40" 
        viewBox={getViewBox()}
        className="transition-all duration-200 hover:scale-110"
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

export default function VisualOdontograma({ onSubmit, showPatientField = true }) {
  const { user } = useAuth();
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [constructionType, setConstructionType] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [selectedVitaShade, setSelectedVitaShade] = useState('');
  const [workType, setWorkType] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [caseObservations, setCaseObservations] = useState('');

  // Materiais CAD-CAM
  const cadCamMaterials = [
    'Zircônia',
    'Dissilicato de Lítio',
    'Cerâmica Feldspática',
    'Resina Composta',
    'PMMA'
  ];

  const toggleTooth = (toothNumber) => {
    setSelectedTeeth(prev => {
      if (prev.includes(toothNumber)) {
        return prev.filter(t => t !== toothNumber);
      } else {
        return [...prev, toothNumber];
      }
    });
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearForm = () => {
    setSelectedTeeth([]);
    setConstructionType('');
    setUploadedFiles([]);
    setPatientName('');
    setSelectedVitaShade('');
    setWorkType('');
    setSelectedMaterial('');
    setCaseObservations('');
  };

  const handleSubmit = () => {
    // Validações
    if (showPatientField && !patientName.trim()) {
      alert('Por favor, insira o nome do paciente.');
      return;
    }

    if (!workType) {
      alert('Por favor, selecione o tipo de trabalho.');
      return;
    }

    if (selectedTeeth.length === 0) {
      alert('Por favor, selecione pelo menos um dente.');
      return;
    }

    if (!constructionType) {
      alert('Por favor, selecione o tipo de construção.');
      return;
    }

    // Criar objeto de construções dentais
    const toothConstructions = {};
    selectedTeeth.forEach(tooth => {
      toothConstructions[tooth] = constructionType;
    });

    const orderData = {
      patientName: patientName.trim(),
      workType,
      selectedMaterial: workType === 'cadcam' ? selectedMaterial : undefined,
      selectedVitaShade,
      toothConstructions,
      selectedTeeth,
      uploadedFiles,
      caseObservations: caseObservations.trim(),
      createdBy: user?._id || user?.email
    };

    if (onSubmit) {
      onSubmit(orderData);
    }

    clearForm();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        Novo Pedido - Odontograma
      </h2>

      {/* Campo do paciente */}
      {showPatientField && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nome do Paciente *
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Digite o nome do paciente"
          />
        </div>
      )}

      {/* Tipo de trabalho */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tipo de Trabalho *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="acrilico"
              checked={workType === 'acrilico'}
              onChange={(e) => setWorkType(e.target.value)}
              className="mr-2"
            />
            <span className="text-gray-700 dark:text-gray-300">Acrílico</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="cadcam"
              checked={workType === 'cadcam'}
              onChange={(e) => setWorkType(e.target.value)}
              className="mr-2"
            />
            <span className="text-gray-700 dark:text-gray-300">CAD-CAM</span>
          </label>
        </div>
      </div>

      {/* Material CAD-CAM */}
      {workType === 'cadcam' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Material CAD-CAM *
          </label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">Selecione o material</option>
            {cadCamMaterials.map(material => (
              <option key={material} value={material}>{material}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tipo de construção */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tipo de Construção *
        </label>
        <select
          value={constructionType}
          onChange={(e) => setConstructionType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="">Selecione o tipo de construção</option>
          {Object.keys(CONSTRUCTION_TYPES).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Odontograma visual */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Selecione os Dentes *
        </label>
        
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
                  isSelected={selectedTeeth.includes(tooth)}
                  constructionColor={constructionType ? CONSTRUCTION_TYPES[constructionType] : null}
                  onClick={() => toggleTooth(tooth)}
                />
              ))}
            </div>
          </div>

          {/* Arcada Inferior */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 text-center">
              Arcada Inferior
            </h4>
            <div className="flex justify-center items-start gap-1">
              {LOWER_TEETH.map(tooth => (
                <ToothShape
                  key={tooth}
                  toothNumber={tooth}
                  isSelected={selectedTeeth.includes(tooth)}
                  constructionColor={constructionType ? CONSTRUCTION_TYPES[constructionType] : null}
                  onClick={() => toggleTooth(tooth)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Legenda da cor selecionada */}
        {constructionType && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: CONSTRUCTION_TYPES[constructionType] }}
              ></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {constructionType}
              </span>
              {selectedTeeth.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({selectedTeeth.length} dente{selectedTeeth.length > 1 ? 's' : ''} selecionado{selectedTeeth.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cor Vita */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cor Vita
        </label>
        <div className="grid grid-cols-8 gap-2">
          {VITA_SHADES.map(shade => (
            <button
              key={shade.code}
              onClick={() => setSelectedVitaShade(shade.code)}
              className={`p-2 rounded border-2 text-xs font-medium transition-all ${
                selectedVitaShade === shade.code 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: shade.color }}
            >
              {shade.code}
            </button>
          ))}
        </div>
      </div>

      {/* Upload de arquivos */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Arquivos (Imagens, Vídeos, Modelos 3D)
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          accept="image/*,video/*,.stl,.obj,.ply"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
        {uploadedFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observações */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Observações do Caso
        </label>
        <textarea
          value={caseObservations}
          onChange={(e) => setCaseObservations(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
          placeholder="Descreva detalhes importantes sobre o caso..."
        />
      </div>

      {/* Botões */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={clearForm}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Limpar
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Criar Pedido
        </button>
      </div>
    </div>
  );
}
