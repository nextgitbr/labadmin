// Tipos TypeScript para o sistema de odontograma
export interface ToothData {
  label: string;
}

export interface FileData {
  id: number;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  file: File;
}

export interface OrderData {
  patient: string;
  constructions: Record<string, string>;
  vitaShade: string;
  files: FileData[];
  date: string;
  time: string;
}

export interface OdontogramaSystemProps {
  onSubmit?: (orderData: OrderData) => void;
  initialData?: Partial<OrderData>;
  showPatientField?: boolean;
  showFileUpload?: boolean;
  customTitle?: string;
}

export interface OdontogramaProps {
  selected: string[];
  onToothClick: (tooth: ToothData, event: React.MouseEvent) => void;
  toothConstructions: Record<string, string>;
  width?: number;
  height?: number;
}

// Constantes
export const UPPER_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
export const LOWER_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

export const CONSTRUCTION_TYPES: Record<string, string> = {
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

export const VITA_SHADES = [
  { code: 'A1', color: '#F2E2D2' }, { code: 'A2', color: '#E8D0B8' }, 
  { code: 'A3', color: '#D7B690' }, { code: 'A4', color: '#C49A70' },
  { code: 'B1', color: '#F3E8DA' }, { code: 'B2', color: '#E9D7BF' }, 
  { code: 'B3', color: '#D8BE99' }, { code: 'B4', color: '#C7A679' },
  { code: 'C1', color: '#E7DFD8' }, { code: 'C2', color: '#D9C8B8' }, 
  { code: 'C3', color: '#C6AD93' }, { code: 'C4', color: '#B29173' },
  { code: 'D2', color: '#E4D9CC' }, { code: 'D3', color: '#D3BEA3' }, 
  { code: 'D4', color: '#C1A284' }, { code: 'D5', color: '#AD8A6A' }
];

export const getToothArch = (toothLabel: string): string | null => {
  if (UPPER_TEETH.includes(toothLabel)) return 'upper';
  if (LOWER_TEETH.includes(toothLabel)) return 'lower';
  return null;
};
