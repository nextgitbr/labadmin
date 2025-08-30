/**
 * Gerenciador de localStorage para otimizar e limpar dados desnecessários
 */

// Chaves essenciais que devem ser mantidas
const ESSENTIAL_KEYS = [
  'labadmin_token',
  'labadmin_user', 
  'labadmin_permissions',
  'theme'
];

// Chaves de configuração que podem ser otimizadas
const CONFIG_KEYS = [
  'sessionAlertConfig',
  'successAlertConfig'
];

// Chaves que devem ser removidas (desenvolvimento/temporárias)
const REMOVABLE_KEYS = [
  '__nextjs-dev-tools-position',
  'ally-supports-cache',
  'nextauth.message',
  'userProfile', // Duplica labadmin_user
  'windsurfBrowserToolbarPosition'
];

// Configurações padrão simplificadas
const DEFAULT_CONFIGS = {
  sessionAlertConfig: {
    enabled: true,
    timeoutWarning: 60,
    alertText: "Sua sessão expirará em {seconds}s",
    textColor: "#ffffff",
    backgroundColor: "#f59e0b",
    borderColor: "#d97706"
  },
  successAlertConfig: {
    enabled: true,
    duration: 5,
    message: "Operação realizada com sucesso!",
    backgroundColor: "#10b981",
    textColor: "#ffffff",
    borderColor: "#059669",
    animation: "slide"
  }
};

/**
 * Limpa chaves desnecessárias do localStorage
 */
export function cleanLocalStorage(): void {
  console.log('🧹 Limpando localStorage...');
  
  let removedCount = 0;
  
  // Remove chaves desnecessárias
  REMOVABLE_KEYS.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      removedCount++;
      console.log(`❌ Removido: ${key}`);
    }
  });
  
  console.log(`✅ Limpeza concluída. ${removedCount} itens removidos.`);
}

/**
 * Otimiza configurações existentes, removendo propriedades desnecessárias
 */
export function optimizeConfigs(): void {
  console.log('⚡ Otimizando configurações...');
  
  CONFIG_KEYS.forEach(key => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const config = JSON.parse(stored);
        const defaultConfig = DEFAULT_CONFIGS[key as keyof typeof DEFAULT_CONFIGS];
        
        if (defaultConfig) {
          // Manter apenas propriedades essenciais
          const optimized: any = {};
          Object.keys(defaultConfig).forEach(prop => {
            optimized[prop] = config[prop] !== undefined ? config[prop] : (defaultConfig as any)[prop];
          });
          
          localStorage.setItem(key, JSON.stringify(optimized));
          console.log(`✅ Otimizado: ${key}`);
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao otimizar ${key}:`, error);
        // Usar configuração padrão em caso de erro
        const defaultConfig = DEFAULT_CONFIGS[key as keyof typeof DEFAULT_CONFIGS];
        if (defaultConfig) {
          localStorage.setItem(key, JSON.stringify(defaultConfig));
        }
      }
    }
  });
}

/**
 * Remove configuração appSettings excessivamente grande
 */
export function cleanAppSettings(): void {
  const appSettings = localStorage.getItem('appSettings');
  if (appSettings) {
    try {
      const settings = JSON.parse(appSettings);
      
      // Manter apenas configurações essenciais
      const essentialSettings = {
        theme: settings.theme || 'dark',
        sidebarCollapsed: settings.sidebarCollapsed || false,
        itemsPerPage: settings.itemsPerPage || 10,
        dateFormat: settings.dateFormat || 'dd/MM/yyyy',
        timeFormat: settings.timeFormat || 'HH:mm'
      };
      
      localStorage.setItem('appSettings', JSON.stringify(essentialSettings));
      console.log('✅ appSettings otimizado');
    } catch (error) {
      console.warn('⚠️ Erro ao otimizar appSettings:', error);
      localStorage.removeItem('appSettings');
    }
  }
}

/**
 * Executa limpeza completa do localStorage
 */
export function performFullCleanup(): void {
  console.log('🚀 Iniciando limpeza completa do localStorage...');
  
  const beforeSize = getLocalStorageSize();
  
  cleanLocalStorage();
  optimizeConfigs();
  cleanAppSettings();
  
  const afterSize = getLocalStorageSize();
  const savedSpace = beforeSize - afterSize;
  
  console.log(`📊 Limpeza concluída:`);
  console.log(`   Antes: ${formatBytes(beforeSize)}`);
  console.log(`   Depois: ${formatBytes(afterSize)}`);
  console.log(`   Economizado: ${formatBytes(savedSpace)}`);
}

/**
 * Calcula o tamanho total do localStorage em bytes
 */
function getLocalStorageSize(): number {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

/**
 * Formata bytes em formato legível
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Lista todas as chaves do localStorage com seus tamanhos
 */
export function auditLocalStorage(): void {
  console.log('🔍 Auditoria do localStorage:');
  
  const items: Array<{key: string, size: number, essential: boolean}> = [];
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = localStorage[key].length + key.length;
      const essential = ESSENTIAL_KEYS.includes(key);
      items.push({ key, size, essential });
    }
  }
  
  // Ordenar por tamanho (maior primeiro)
  items.sort((a, b) => b.size - a.size);
  
  items.forEach(item => {
    const status = item.essential ? '✅' : '⚠️';
    console.log(`${status} ${item.key}: ${formatBytes(item.size)}`);
  });
  
  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  console.log(`📊 Total: ${formatBytes(totalSize)}`);
}
