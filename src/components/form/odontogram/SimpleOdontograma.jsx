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

export default function SimpleOdontograma({ onSubmit, showPatientField = true }) {
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

  const getToothColor = (toothNumber) => {
    if (selectedTeeth.includes(toothNumber) && constructionType) {
      return CONSTRUCTION_TYPES[constructionType] || '#e5e7eb';
    }
    return selectedTeeth.includes(toothNumber) ? '#3b82f6' : '#e5e7eb';
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
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg">
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

      {/* Odontograma simplificado */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Selecione os Dentes *
        </label>
        
        {/* Arcada Superior */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Arcada Superior</h4>
          <div className="flex flex-wrap gap-1 justify-center">
            {UPPER_TEETH.map(tooth => (
              <button
                key={tooth}
                onClick={() => toggleTooth(tooth)}
                className="w-12 h-12 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-xs font-medium transition-all hover:border-blue-500"
                style={{ 
                  backgroundColor: getToothColor(tooth),
                  color: selectedTeeth.includes(tooth) ? 'white' : '#374151'
                }}
              >
                {tooth}
              </button>
            ))}
          </div>
        </div>

        {/* Arcada Inferior */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Arcada Inferior</h4>
          <div className="flex flex-wrap gap-1 justify-center">
            {LOWER_TEETH.map(tooth => (
              <button
                key={tooth}
                onClick={() => toggleTooth(tooth)}
                className="w-12 h-12 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-xs font-medium transition-all hover:border-blue-500"
                style={{ 
                  backgroundColor: getToothColor(tooth),
                  color: selectedTeeth.includes(tooth) ? 'white' : '#374151'
                }}
              >
                {tooth}
              </button>
            ))}
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
