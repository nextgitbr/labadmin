import React, { useState, useCallback, useRef } from 'react';
import './OdontogramaSystem.css';

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
  'Veneer': '#210033',
  'Crown': '#FF8800',
  'Pontic': '#1C2078',
  'Provisional crown': '#E615E3',
  'BiteSplint': '#4E93CF',
  'Bar': '#2D2D0B',
  'Waxup': '#3B7235',
  'Model': '#C2C87D'
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

// Componente Odontograma SVG
const Odontograma = ({ selected, onToothClick, toothConstructions, width = 400, height = 620 }) => {
  return (
    <div className="odontograma-container">
      <svg width={width} height={height} viewBox="0 0 439.50711 686.71893">
        {/* Arcada Superior */}
        <g className="upper-arch">
          {/* Dente 18 */}
          <g className={`tooth ${selected.includes('18') ? 'selected' : ''} ${toothConstructions['18'] ? 'has-construction' : ''}`} 
             data-label="18" onClick={(e) => onToothClick({label: '18'}, e)}>
            <title>18</title>
            <path d="m 94.488281,59.267578 c -4.882812,0 -8.839844,3.957032 -8.839844,8.839844 v 17.679688 c 0,4.882812 3.957032,8.839844 8.839844,8.839844 h 17.679687 c 4.882813,0 8.839844,-3.957032 8.839844,-8.839844 V 68.107422 c 0,-4.882812 -3.957031,-8.839844 -8.839844,-8.839844 z" 
                  style={{fill: toothConstructions['18'] ? CONSTRUCTION_TYPES[toothConstructions['18']] : 'transparent'}} />
          </g>
          
          {/* Dente 17 */}
          <g className={`tooth ${selected.includes('17') ? 'selected' : ''} ${toothConstructions['17'] ? 'has-construction' : ''}`} 
             data-label="17" onClick={(e) => onToothClick({label: '17'}, e)}>
            <title>17</title>
            <path d="m 124.48828,59.267578 c -4.88281,0 -8.83984,3.957032 -8.83984,8.839844 v 17.679688 c 0,4.882812 3.95703,8.839844 8.83984,8.839844 h 17.67969 c 4.88281,0 8.83984,-3.957032 8.83984,-8.839844 V 68.107422 c 0,-4.882812 -3.95703,-8.839844 -8.83984,-8.839844 z" 
                  style={{fill: toothConstructions['17'] ? CONSTRUCTION_TYPES[toothConstructions['17']] : 'transparent'}} />
          </g>
          
          {/* Dente 16 */}
          <g className={`tooth ${selected.includes('16') ? 'selected' : ''} ${toothConstructions['16'] ? 'has-construction' : ''}`} 
             data-label="16" onClick={(e) => onToothClick({label: '16'}, e)}>
            <title>16</title>
            <path d="m 154.48828,59.267578 c -4.88281,0 -8.83984,3.957032 -8.83984,8.839844 v 17.679688 c 0,4.882812 3.95703,8.839844 8.83984,8.839844 h 17.67969 c 4.88281,0 8.83984,-3.957032 8.83984,-8.839844 V 68.107422 c 0,-4.882812 -3.95703,-8.839844 -8.83984,-8.839844 z" 
                  style={{fill: toothConstructions['16'] ? CONSTRUCTION_TYPES[toothConstructions['16']] : 'transparent'}} />
          </g>
          
          {/* Dente 15 */}
          <g className={`tooth ${selected.includes('15') ? 'selected' : ''} ${toothConstructions['15'] ? 'has-construction' : ''}`} 
             data-label="15" onClick={(e) => onToothClick({label: '15'}, e)}>
            <title>15</title>
            <path d="m 184.48828,59.267578 c -4.88281,0 -8.83984,3.957032 -8.83984,8.839844 v 17.679688 c 0,4.882812 3.95703,8.839844 8.83984,8.839844 h 17.67969 c 4.88281,0 8.83984,-3.957032 8.83984,-8.839844 V 68.107422 c 0,-4.882812 -3.95703,-8.839844 -8.83984,-8.839844 z" 
                  style={{fill: toothConstructions['15'] ? CONSTRUCTION_TYPES[toothConstructions['15']] : 'transparent'}} />
          </g>
          
          {/* Dente 14 */}
          <g className={`tooth ${selected.includes('14') ? 'selected' : ''} ${toothConstructions['14'] ? 'has-construction' : ''}`} 
             data-label="14" onClick={(e) => onToothClick({label: '14'}, e)}>
            <title>14</title>
            <path d="m 214.48828,59.267578 c -4.88281,0 -8.83984,3.957032 -8.83984,8.839844 v 17.679688 c 0,4.882812 3.95703,8.839844 8.83984,8.839844 h 17.67969 c 4.88281,0 8.83984,-3.957032 8.83984,-8.839844 V 68.107422 c 0,-4.882812 -3.95703,-8.839844 -8.83984,-8.839844 z" 
                  style={{fill: toothConstructions['14'] ? CONSTRUCTION_TYPES[toothConstructions['14']] : 'transparent'}} />
          </g>
          
          {/* Dente 13 */}
          <g className={`tooth ${selected.includes('13') ? 'selected' : ''} ${toothConstructions['13'] ? 'has-construction' : ''}`} 
             data-label="13" onClick={(e) => onToothClick({label: '13'}, e)}>
            <title>13</title>
            <path d="m 244.48828,59.267578 c -4.88281,0 -8.83984,3.957032 -8.83984,8.839844 v 17.679688 c 0,4.882812 3.95703,8.839844 8.83984,8.839844 h 17.67969 c 4.88281,0 8.83984,-3.957032 8.83984,-8.839844 V 68.107422 c 0,-4.882812 -3.95703,-8.839844 -8.83984,-8.839844 z" 
                  style={{fill: toothConstructions['13'] ? CONSTRUCTION_TYPES[toothConstructions['13']] : 'transparent'}} />
          </g>
          
          {/* Dente 12 */}
          <g className={`tooth ${selected.includes('12') ? 'selected' : ''} ${toothConstructions['12'] ? 'has-construction' : ''}`} 
             data-label="12" onClick={(e) => onToothClick({label: '12'}, e)}>
            <title>12</title>
            <path d="m 274.48828,59.267578 c -4.88281,0 -8.83984,3.957032 -8.83984,8.839844 v 17.679688 c 0,4.882812 3.95703,8.839844 8.83984,8.839844 h 17.67969 c 4.88281,0 8.83984,-3.957032 8.83984,-8.839844 V 68.107422 c 0,-4.882812 -3.95703,-8.839844 -8.83984,-8.839844 z" 
                  style={{fill: toothConstructions['12'] ? CONSTRUCTION_TYPES[toothConstructions['12']] : 'transparent'}} />
          </g>
          
          {/* Dente 11 */}
          <g className={`tooth ${selected.includes('11') ? 'selected' : ''} ${toothConstructions['11'] ? 'has-construction' : ''}`} 
             data-label="11" onClick={(e) => onToothClick({label: '11'}, e)}>
            <title>11</title>
            <path d="m 304.48828,59.267578 c -4.88281,0 -8.83984,3.957032 -8.83984,8.839844 v 17.679688 c 0,4.882812 3.95703,8.839844 8.83984,8.839844 h 17.67969 c 4.88281,0 8.83984,-3.957032 8.83984,-8.839844 V 68.107422 c 0,-4.882812 -3.95703,-8.839844 -8.83984,-8.839844 z" 
                  style={{fill: toothConstructions['11'] ? CONSTRUCTION_TYPES[toothConstructions['11']] : 'transparent'}} />
          </g>
        </g>
        
        {/* Arcada Inferior */}
        <g className="lower-arch">
          {/* Dente 41 */}
          <g className={`tooth ${selected.includes('41') ? 'selected' : ''} ${toothConstructions['41'] ? 'has-construction' : ''}`} 
             data-label="41" onClick={(e) => onToothClick({label: '41'}, e)}>
            <title>41</title>
            <path d="m 304.48828,600.267578 c -4.88281,0 -8.83984,3.957032 -8.83984,8.839844 v 17.679688 c 0,4.882812 3.95703,8.839844 8.83984,8.839844 h 17.67969 c 4.88281,0 8.83984,-3.957032 8.83984,-8.839844 v -17.679688 c 0,-4.882812 -3.95703,-8.839844 -8.83984,-8.839844 z" 
                  style={{fill: toothConstructions['41'] ? CONSTRUCTION_TYPES[toothConstructions['41']] : 'transparent'}} />
          </g>
        </g>
      </svg>
    </div>
  );
};

// Componente Principal do Sistema
export default function OdontogramaSystem({ 
  onSubmit, 
  initialData = {},
  showPatientField = true,
  showFileUpload = true,
  customTitle = "Sistema de Odontograma Laboratorial"
}) {
  const [selected, setSelected] = useState([]);
  const [toothConstructions, setToothConstructions] = useState(initialData.constructions || {});
  const [currentConstructionType, setCurrentConstructionType] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState(initialData.files || []);
  const [showInstructions, setShowInstructions] = useState(true);
  const [patientName, setPatientName] = useState(initialData.patient || '');
  const [selectedVitaShade, setSelectedVitaShade] = useState(initialData.vitaShade || '');
  const lastSelectedRef = useRef(null);

  const toggleTooth = useCallback((tooth, event) => {
    setSelected((prev) => {
      // Shift+clique para seleção em cadeia
      if (event?.shiftKey && lastSelectedRef.current) {
        const startArch = getToothArch(lastSelectedRef.current);
        const endArch = getToothArch(tooth.label);
        
        if (startArch && endArch && startArch === endArch) {
          const toothOrder = startArch === 'upper' ? UPPER_TEETH : LOWER_TEETH;
          const startIndex = toothOrder.indexOf(lastSelectedRef.current);
          const endIndex = toothOrder.indexOf(tooth.label);
          
          const minIndex = Math.min(startIndex, endIndex);
          const maxIndex = Math.max(startIndex, endIndex);
          const rangeTeeth = toothOrder.slice(minIndex, maxIndex + 1);
          
          return [...new Set([...prev, ...rangeTeeth])];
        }
      }
      
      // Ctrl+clique para seleção múltipla
      if (event?.ctrlKey || event?.metaKey) {
        lastSelectedRef.current = tooth.label;
        return prev.includes(tooth.label) 
          ? prev.filter(t => t !== tooth.label)
          : [...prev, tooth.label];
      }
      
      // Clique simples
      lastSelectedRef.current = tooth.label;
      return prev.includes(tooth.label) ? [] : [tooth.label];
    });
  }, []);

  const applyConstructionType = useCallback((type) => {
    if (selected.length === 0) {
      alert('Selecione pelo menos um dente primeiro.');
      return;
    }
    
    setToothConstructions(prev => {
      const updated = { ...prev };
      selected.forEach(tooth => {
        updated[tooth] = type;
      });
      return updated;
    });
    
    setSelected([]);
    setCurrentConstructionType('');
  }, [selected]);

  const removeConstructionType = useCallback((tooth) => {
    setToothConstructions(prev => {
      const updated = { ...prev };
      delete updated[tooth];
      return updated;
    });
  }, []);

  const handleFileUpload = useCallback((event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toLocaleDateString('pt-BR'),
      file: file
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    event.target.value = '';
  }, []);

  const removeFile = useCallback((fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const handleSubmitOrder = useCallback(() => {
    if (showPatientField && !patientName.trim()) {
      alert('Por favor, preencha o nome do paciente.');
      return;
    }
    
    if (Object.keys(toothConstructions).length === 0) {
      alert('Por favor, adicione pelo menos uma construção dental.');
      return;
    }

    const orderData = {
      patient: patientName,
      constructions: toothConstructions,
      vitaShade: selectedVitaShade,
      files: uploadedFiles,
      date: new Date().toLocaleDateString('pt-BR'),
      time: new Date().toLocaleTimeString('pt-BR')
    };

    if (onSubmit) {
      onSubmit(orderData);
    } else {
      console.log('Pedido enviado:', orderData);
      alert(`Pedido enviado com sucesso!\n\nPaciente: ${patientName}\nConstruções: ${Object.keys(toothConstructions).length} dentes\nArquivos: ${uploadedFiles.length}`);
    }
  }, [patientName, toothConstructions, uploadedFiles, onSubmit, showPatientField]);

  const handleClearForm = useCallback(() => {
    if (confirm('Tem certeza que deseja limpar todo o formulário?')) {
      setPatientName('');
      setSelected([]);
      setCurrentConstructionType('');
      setToothConstructions({});
      setUploadedFiles([]);
      setSelectedVitaShade('');
    }
  }, []);

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
    <div className="odontograma-system">
      <h1>{customTitle}</h1>

      {/* Modal de Instruções */}
      {showInstructions && (
        <div className="instructions-modal">
          <div className="instructions-content">
            <button
              onClick={() => setShowInstructions(false)}
              className="close-button"
            >
              ×
            </button>
            
            <h3>📋 Instruções de Uso</h3>
            
            <div className="instructions-grid">
              <div>
                <h4>🦷 Seleção de Dentes</h4>
                <ul>
                  <li>Clique nos dentes para selecioná-los</li>
                  <li>Use Shift+clique para seleção em sequência</li>
                  <li>Use Ctrl+clique para seleção múltipla</li>
                </ul>
              </div>
              
              <div>
                <h4>🔧 Tipos de Construção</h4>
                <ul>
                  <li>Selecione um tipo clicando no botão colorido</li>
                  <li>Clique em "Apply" para aplicar aos dentes selecionados</li>
                  <li>Cada tipo tem uma cor específica</li>
                </ul>
              </div>
              
              {showFileUpload && (
                <div>
                  <h4>📁 Upload de Arquivos</h4>
                  <ul>
                    <li>Suporte para fotos (JPG, PNG, GIF)</li>
                    <li>Vídeos (MP4, AVI, MOV)</li>
                    <li>Modelos 3D (STL, OBJ, PLY)</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campo Nome do Paciente */}
      {showPatientField && (
        <div className="patient-field">
          <label>Nome do Paciente:</label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Digite o nome do paciente..."
          />
        </div>
      )}

      {/* Grid Principal */}
      <div className="main-grid">
        {/* Odontograma */}
        <div className="odontograma-section">
          <h2>Odontograma</h2>
          <Odontograma
            selected={selected}
            onToothClick={toggleTooth}
            toothConstructions={toothConstructions}
          />
        </div>

        {/* Tipos de Construção */}
        <div className="construction-section">
          <h3>Tipos de Construção</h3>
          <p>Tipo atual: {currentConstructionType || 'Nenhum'}</p>
          
          <div className="construction-buttons">
            {Object.entries(CONSTRUCTION_TYPES).map(([type, color]) => (
              <button
                key={type}
                onClick={() => {
                  setCurrentConstructionType(type);
                  applyConstructionType(type);
                }}
                style={{
                  backgroundColor: color,
                  color: 'white',
                  border: currentConstructionType === type ? '2px solid #073b4c' : '2px solid transparent'
                }}
                className="construction-btn"
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
              className="clear-btn"
            >
              Clear All
            </button>
          </div>
          
          {/* Escala de Cores Vita */}
          <div className="vita-section">
            <h4>Escala Vita</h4>
            <p>Cor selecionada: {selectedVitaShade || 'Nenhuma'}</p>
            
            <div className="vita-grid">
              {VITA_SHADES.map(shade => (
                <button
                  key={shade.code}
                  onClick={() => setSelectedVitaShade(shade.code)}
                  className={`vita-btn ${selectedVitaShade === shade.code ? 'selected' : ''}`}
                  style={{backgroundColor: shade.color}}
                >
                  {shade.code}
                </button>
              ))}
            </div>
            
            {selectedVitaShade && (
              <button
                onClick={() => setSelectedVitaShade('')}
                className="clear-vita-btn"
              >
                Limpar Cor
              </button>
            )}
          </div>
        </div>

        {/* Lista de Construções */}
        <div className="constructions-list">
          <h3>Dentes com Construções</h3>
          <div className="constructions-items">
            {Object.entries(toothConstructions).length === 0 ? (
              <p>Nenhum dente com construção</p>
            ) : (
              Object.entries(toothConstructions).map(([tooth, type]) => (
                <div key={tooth} className="construction-item" style={{backgroundColor: CONSTRUCTION_TYPES[type]}}>
                  <span>Dente {tooth}: {type}</span>
                  <button onClick={() => removeConstructionType(tooth)}>×</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upload de Arquivos */}
        {showFileUpload && (
          <div className="files-section">
            <h3>Arquivos</h3>
            <div className="file-upload">
              <label htmlFor="file-upload" className="file-upload-label">
                📁 Selecionar Arquivos
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.stl,.obj,.ply"
                onChange={handleFileUpload}
                style={{display: 'none'}}
              />
            </div>
            
            <div className="files-list">
              {uploadedFiles.length === 0 ? (
                <p>Nenhum arquivo carregado</p>
              ) : (
                uploadedFiles.map(file => (
                  <div key={file.id} className="file-item">
                    <div>
                      <div>{getFileIcon(file.name)} {file.name}</div>
                      <div className="file-info">
                        {(file.size / 1024).toFixed(1)} KB • {file.uploadDate}
                      </div>
                    </div>
                    <button onClick={() => removeFile(file.id)}>×</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Botões de Ação */}
      <div className="action-buttons">
        <button onClick={handleSubmitOrder} className="submit-btn">
          📋 Enviar Pedido
        </button>
        
        <button onClick={handleClearForm} className="clear-form-btn">
          🗑️ Limpar Formulário
        </button>
      </div>
    </div>
  );
}
