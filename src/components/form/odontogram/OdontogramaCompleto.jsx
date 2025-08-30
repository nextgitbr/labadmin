import React, { useState, useCallback, useRef } from 'react';
import Odontograma from './Odontograma';
import './Odontograma.css';
import './OdontogramaSystem.css';
import { useAuth } from '@/hooks/useAuth';

// Ordem dos dentes por arcada para seleção em cadeia (FDI)
const UPPER_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

const getToothArch = (toothLabel) => {
  if (UPPER_TEETH.includes(toothLabel)) return 'upper';
  if (LOWER_TEETH.includes(toothLabel)) return 'lower';
  return null;
};

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

export default function OdontogramaCompleto({ onSubmit, showPatientField = true }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [toothConstructions, setToothConstructions] = useState({});
  const [currentConstructionType, setCurrentConstructionType] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [selectedVitaShade, setSelectedVitaShade] = useState('');
  const [workType, setWorkType] = useState(''); // 'acrilico' ou 'cadcam'
  const [selectedMaterial, setSelectedMaterial] = useState(''); // Para CAD-CAM
  const [caseObservations, setCaseObservations] = useState(''); // Observações do caso
  const lastSelectedRef = useRef(null);

  const toggleTooth = useCallback((tooth, event) => {
    setSelected((prev) => {
      // Shift+clique para seleção em cadeia
      if (event?.shiftKey && lastSelectedRef.current) {
        const startArch = getToothArch(lastSelectedRef.current);
        const endArch = getToothArch(tooth.label);
        
        // Só permite seleção em cadeia dentro da mesma arcada
        if (startArch && endArch && startArch === endArch) {
          const toothOrder = startArch === 'upper' ? UPPER_TEETH : LOWER_TEETH;
          const startIndex = toothOrder.indexOf(lastSelectedRef.current);
          const endIndex = toothOrder.indexOf(tooth.label);
          
          if (startIndex !== -1 && endIndex !== -1) {
            const minIndex = Math.min(startIndex, endIndex);
            const maxIndex = Math.max(startIndex, endIndex);
            const rangeTeeth = toothOrder.slice(minIndex, maxIndex + 1);
            
            // Adiciona todos os dentes do intervalo
            const newSelected = [...prev];
            rangeTeeth.forEach(toothLabel => {
              if (!newSelected.includes(toothLabel)) {
                newSelected.push(toothLabel);
              }
            });
            return newSelected;
          }
        }
        
        // Se arcadas diferentes, apenas seleciona o dente clicado
        if (startArch !== endArch) {
          lastSelectedRef.current = tooth.label;
          return prev.includes(tooth.label) 
            ? prev.filter((t) => t !== tooth.label)
            : [...prev, tooth.label];
        }
      }
      
      // Clique normal - toggle individual
      const exists = prev.includes(tooth.label);
      if (exists) {
        return prev.filter((t) => t !== tooth.label);
      } else {
        lastSelectedRef.current = tooth.label;
        return [...prev, tooth.label];
      }
    });
  }, []);

  // Função para aplicar tipo de construção aos dentes selecionados
  const applyConstructionType = useCallback((constructionType) => {
    if (!constructionType || selected.length === 0) return;
    
    setToothConstructions(prev => {
      const updated = { ...prev };
      selected.forEach(toothLabel => {
        updated[toothLabel] = constructionType;
      });
      return updated;
    });
    
    setCurrentConstructionType(constructionType);
    setSelected([]); // Limpar seleção após aplicar tipo
  }, [selected]);

  // Função para remover tipo de construção
  const removeConstructionType = useCallback((toothLabel) => {
    setToothConstructions(prev => {
      const updated = { ...prev };
      delete updated[toothLabel];
      return updated;
    });
  }, []);

  // Função para upload de arquivos
  const handleFileUpload = useCallback((event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploadDate: new Date().toLocaleString()
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    event.target.value = ''; // Reset input
  }, []);

  // Função para remover arquivo
  const removeFile = useCallback((fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    if (showPatientField && !patientName.trim()) {
      alert('Por favor, preencha o nome do paciente.');
      return;
    }
    
    if (!workType) {
      alert('Por favor, selecione o tipo de trabalho.');
      return;
    }
    
    if (Object.keys(toothConstructions).length === 0) {
      alert('Por favor, adicione pelo menos uma construção dental.');
      return;
    }

    // 1) Subir arquivos para /api/upload e coletar metadados
    let uploadedMeta = [];
    if (uploadedFiles.length > 0) {
      try {
        uploadedMeta = await Promise.all(
          uploadedFiles.map(async (uf) => {
            const fd = new FormData();
            fd.append('file', uf.file);
            // Sem orderId pois ainda não existe; backend usará 'general'
            fd.append('userId', String(user?._id || user?.email || 'unknown_user'));
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) {
              throw new Error('Falha ao enviar arquivo: ' + (uf.name || uf.file?.name));
            }
            return await res.json(); // { bucket, path, url, name, size, type, ... }
          })
        );
      } catch (e) {
        console.error('Erro no upload de arquivos do pedido:', e);
        alert('Falha ao enviar arquivos. Tente novamente.');
        return;
      }
    }

    const orderData = {
      patientName: patientName,
      workType: workType,
      selectedMaterial: selectedMaterial,
      selectedVitaShade: selectedVitaShade,
      toothConstructions: toothConstructions,
      selectedTeeth: selected,
      uploadedFiles: uploadedMeta, // salvar URLs reais
      caseObservations: caseObservations,
      createdBy: user?._id || user?.email || 'unknown_user'
    };

    try {
      console.log('📤 Enviando pedido para API...', orderData);
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar pedido');
      }

      const newOrder = await response.json();
      console.log('✅ Pedido criado com sucesso:', newOrder);

      alert(`Pedido criado com sucesso!\n\nNúmero: ${newOrder.orderNumber}\nPaciente: ${patientName}\nConstruções: ${Object.keys(toothConstructions).length} dentes\nCor Vita: ${selectedVitaShade || 'Não selecionada'}\nArquivos: ${uploadedFiles.length}`);

      // Limpar formulário após sucesso
      handleClearForm();

      // Callback opcional para o componente pai
      if (onSubmit) {
        onSubmit(newOrder);
      }

    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      alert(`Erro ao criar pedido: ${error.message}`);
    }
  }, [patientName, workType, selectedMaterial, selectedVitaShade, toothConstructions, selected, uploadedFiles, caseObservations, onSubmit, showPatientField]);

  const handleClearForm = useCallback(() => {
    if (confirm('Tem certeza que deseja limpar todo o formulário?')) {
      setPatientName('');
      setSelected([]);
      setCurrentConstructionType('');
      setToothConstructions({});
      setUploadedFiles([]);
      setSelectedVitaShade('');
      setWorkType('');
      setSelectedMaterial('');
      setCaseObservations('');
      lastSelectedRef.current = null;
    }
  }, []);

  // Função para obter ícone do tipo de arquivo
  const getFileIcon = useCallback((fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return '🎥';
      case 'stl':
      case 'obj':
      case 'ply':
        return '🧊';
      default:
        return '📄';
    }
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
      {/* Campo Nome do Paciente */}
      {showPatientField && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          </h3>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Digite o nome do paciente..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Passo 2: Tipo de Trabalho e Cores */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        </h3>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda: Tipo de Trabalho e Material */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tipo de Trabalho
              </h4>
              <div className="work-type-buttons flex gap-2 mb-3">
                <button
                  onClick={() => {
                    setWorkType('acrilico');
                    setSelectedMaterial('');
                  }}
                  className="work-type-btn flex-1 px-3 py-2 text-sm font-medium rounded transition-colors"
                  style={{
                    backgroundColor: workType === 'acrilico' ? '#E86B6B' : '#D25151',
                    color: 'white'
                  }}
                >
                  Acrílico
                </button>
                <button
                  onClick={() => setWorkType('cadcam')}
                  className="work-type-btn flex-1 px-3 py-2 text-sm font-medium rounded transition-colors"
                  style={{
                    backgroundColor: workType === 'cadcam' ? '#6BA8E8' : '#5194D2',
                    color: 'white'
                  }}
                >
                  CAD-CAM
                </button>
              </div>
              
              {/* Materiais CAD-CAM */}
              {workType === 'cadcam' && (
                <div className="material-section">
                  <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Material
                  </h5>
                  <div className="material-buttons grid grid-cols-5 gap-1">
                    {[
                      { name: 'Zirconia', color: '#748F68' },
                      { name: 'Dissilicato', color: '#904ABE' },
                      { name: 'PMMA', color: '#CDB06B' },
                      { name: 'Metal', color: '#87F0F7' },
                      { name: 'Impressão', color: '#FF6B6B' }
                    ].map(material => (
                      <button
                        key={material.name}
                        onClick={() => setSelectedMaterial(material.name)}
                        className="material-btn px-2 py-1 text-xs font-medium rounded transition-colors"
                        style={{
                          backgroundColor: selectedMaterial === material.name 
                            ? `${material.color}CC` 
                            : material.color,
                          color: 'white'
                        }}
                      >
                        {material.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Direita: Escala de Cores Vita */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Escala Vita
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Cor selecionada: {selectedVitaShade || 'Nenhuma'}
              </p>
              
              <div className="flex items-start gap-2">
                <div className="grid grid-cols-8 gap-0.5 flex-1">
                  {VITA_SHADES.map(shade => (
                    <button
                      key={shade.code}
                      onClick={() => setSelectedVitaShade(shade.code)}
                      className="w-9 h-9 text-xs font-bold text-gray-800 rounded transition-all"
                      style={{
                        backgroundColor: shade.color,
                        border: selectedVitaShade === shade.code ? '2px solid #073b4c' : '1px solid #ccc',
                        textShadow: '1px 1px 1px rgba(255,255,255,0.8)'
                      }}
                    >
                      {shade.code}
                    </button>
                  ))}
                </div>
                
                {selectedVitaShade && (
                  <button
                    onClick={() => setSelectedVitaShade('')}
                    className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Passo 3: Odontograma */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          </h3>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <Odontograma
              width={350}
              height={550}
              viewBox="0 0 439.50711 686.71893"
              selectedTeeth={selected}
              toothConstructions={toothConstructions}
              onToothClick={toggleTooth}
            />
          </div>
        </div>

        {/* Tipos de Construção */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          </h3>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Tipos
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(CONSTRUCTION_TYPES).map(([type, color]) => (
                <button
                  key={type}
                  onClick={() => {
                    setCurrentConstructionType(type);
                    if (selected.length > 0) {
                      applyConstructionType(type);
                    }
                  }}
                  className="p-2 text-white text-xs font-medium rounded transition-all"
                  style={{
                    backgroundColor: color,
                    border: currentConstructionType === type ? '2px solid white' : '2px solid transparent',
                    boxShadow: currentConstructionType === type ? '0 0 0 1px #073b4c' : 'none'
                  }}
                >
                  {type}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelected([]);
                  setCurrentConstructionType('');
                  setToothConstructions({});
                }}
                className="col-span-2 p-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors"
              >
                Clear All
              </button>
            </div>
            
            {/* Construções Aplicadas */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Lista de Construções
              </h4>
              <div className="constructions-items">
                {Object.entries(toothConstructions).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-xs italic">
                    Nenhum dente com construção
                  </p>
                ) : (
                  (() => {
                    // Agrupar dentes por tipo de construção
                    const groupedConstructions = {};
                    Object.entries(toothConstructions).forEach(([tooth, type]) => {
                      if (!groupedConstructions[type]) {
                        groupedConstructions[type] = [];
                      }
                      groupedConstructions[type].push(tooth);
                    });

                    return Object.entries(groupedConstructions).map(([type, teeth]) => (
                      <div 
                        key={type} 
                        className="construction-item flex items-center justify-between p-2 mb-2 rounded text-xs"
                        style={{backgroundColor: CONSTRUCTION_TYPES[type]}}
                      >
                        <span className="text-white font-medium">
                          {type}:
                        </span>
                        <div className="flex gap-1">
                          {teeth.map(tooth => (
                            <button 
                              key={tooth}
                              onClick={() => removeConstructionType(tooth)}
                              className="bg-red-500 hover:bg-red-600 text-white px-1 py-0.5 rounded text-xs transition-colors"
                              title={`Remover dente ${tooth}`}
                            >
                              {tooth}
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Arquivos */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            
            {/* Passo 4: Upload de Arquivos */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              </h3>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <label 
                  htmlFor="file-upload"
                  className="inline-block mb-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  📁 Upload Arquivos
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.avi,.mov,.wmv,.stl,.obj,.ply"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <strong>Tipos suportados:</strong><br/>
                  🖼️ Fotos: JPG, PNG, GIF, WEBP<br/>
                  🎥 Vídeos: MP4, AVI, MOV, WMV<br/>
                  🧊 Modelos 3D: STL, OBJ, PLY
                </div>

                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Arquivos Carregados ({uploadedFiles.length})
                </h4>
                <div className="max-h-64 overflow-y-auto">
                  {uploadedFiles.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                      Nenhum arquivo carregado
                    </p>
                  ) : (
                    uploadedFiles.map(file => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 mb-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white mb-1">
                            {getFileIcon(file.name)} {file.name}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB • {file.uploadDate}
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="ml-2 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            
              {/* Passo 5: Observações do Caso */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Observações do Caso
                </h4>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <textarea
                    value={caseObservations}
                    onChange={(e) => setCaseObservations(e.target.value)}
                    placeholder="Digite observações adicionais sobre o caso (opcional)..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Espaço para observações do médico ou laboratório sobre o caso
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Passo 6: Botões de Ação */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={handleSubmitOrder}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow transition-colors"
        >
          📋 6. Enviar Pedido
        </button>
        
        <button
          onClick={handleClearForm}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow transition-colors"
        >
          🗑️ Limpar Formulário
        </button>
      </div>
    </div>
  );
}
