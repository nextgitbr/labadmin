import React from 'react';
import teeth from './toothData';
import './Odontograma.css';

// Função para converter CSS string para objeto React style
function parseStyle(style) {
  if (!style || typeof style !== 'string') return undefined;
  try {
    const obj = {};
    style
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((rule) => {
        const idx = rule.indexOf(':');
        if (idx === -1) return;
        const rawKey = rule.slice(0, idx).trim();
        const value = rule.slice(idx + 1).trim();
        const camelKey = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        // Converter números quando apropriado
        const num = Number(value);
        obj[camelKey] = Number.isNaN(num) ? value : num;
      });
    return obj;
  } catch (e) {
    return undefined;
  }
}

/**
 * Componente Odontograma
 * - Renderiza o SVG com os dentes exatamente nas posições do original.
 * - Props:
 *   - width, height: dimensões externas do SVG (default 350x550)
 *   - viewBox: mantenha igual ao SVG original para preservar posições
 *   - selectedTeeth: array de labels FDI selecionados (ex.: ["13", "12"]) 
 *   - toothConstructions: objeto com tipos de construção por dente
 *   - onToothClick: callback(tooth, event) quando um dente é clicado
 */
export default function Odontograma({
  width = 400,
  height = 600,
  viewBox = "0 0 400 600",
  selectedTeeth = [],
  toothConstructions = {},
  onToothClick,
}) {
  const isSelected = (label) => Array.isArray(selectedTeeth) && selectedTeeth.includes(label);
  const hasConstruction = (label) => toothConstructions[label];

  // Tipos de construção com suas cores
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

  return (
    <div className="odontograma-root">
      <svg
        id="odontograma"
        width={width}
        height={height}
        viewBox={viewBox}
        role="img"
        aria-label="Odontograma"
      >
        {teeth.map((tooth) => {
          const construction = hasConstruction(tooth.label);
          const constructionColor = construction ? CONSTRUCTION_TYPES[construction] : null;
          
          return (
            <g
              key={tooth.id || tooth.label}
              id={tooth.id}
              data-label={tooth.label}
              className={`tooth ${isSelected(tooth.label) ? 'selected' : ''} ${construction ? 'has-construction' : ''}`}
              transform={tooth.transform || undefined}
              onClick={onToothClick ? (e) => onToothClick(tooth, e) : undefined}
              style={constructionColor ? { '--construction-color': constructionColor } : undefined}
            >
              <title>{tooth.label}</title>
              {(tooth.paths || []).map((p, idx) => (
                <path 
                  key={p.id || idx} 
                  id={p.id} 
                  d={p.d} 
                  style={parseStyle(p.style)}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
