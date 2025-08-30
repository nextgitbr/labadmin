/**
 * Utilitários para gerenciar dados do usuário no localStorage
 */

export interface UserData {
  _id?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Obtém os dados do usuário do localStorage
 */
export function getUserData(): UserData | null {
  try {
    const userDataStr = localStorage.getItem('labadmin_user');
    if (!userDataStr) {
      console.warn('⚠️ Dados do usuário não encontrados no localStorage');
      return null;
    }

    const userData = JSON.parse(userDataStr);
    console.log('📋 Dados do usuário carregados:', userData);
    return userData;
  } catch (error) {
    console.error('❌ Erro ao analisar dados do usuário:', error);
    return null;
  }
}

/**
 * Obtém o ID do usuário de forma robusta
 */
export function getUserId(): string | null {
  const userData = getUserData();
  if (!userData) {
    console.warn('⚠️ Dados do usuário não encontrados');
    return null;
  }

  console.log('🔍 Estrutura completa dos dados do usuário:', JSON.stringify(userData, null, 2));

  // Tenta diferentes campos que podem conter o ID
  const userId = userData._id || userData.id || userData.userId;
  
  if (!userId) {
    console.warn('⚠️ ID do usuário não encontrado nos dados. Campos disponíveis:', Object.keys(userData));
    console.warn('⚠️ Dados completos:', userData);
    
    // Tenta encontrar qualquer campo que pareça ser um ID
    const possibleIdFields = Object.keys(userData).filter(key => 
      key.toLowerCase().includes('id') || 
      (typeof userData[key] === 'string' && userData[key].length === 24) // ObjectId do MongoDB
    );
    
    if (possibleIdFields.length > 0) {
      console.log('🔍 Possíveis campos de ID encontrados:', possibleIdFields);
      const firstPossibleId = userData[possibleIdFields[0]];
      console.log('🆔 Usando campo alternativo:', possibleIdFields[0], '=', firstPossibleId);
      return firstPossibleId;
    }
    
    return null;
  }

  console.log('✅ ID do usuário obtido:', userId);
  return userId;
}

/**
 * Verifica se o usuário está autenticado
 */
export function isUserAuthenticated(): boolean {
  const token = localStorage.getItem('labadmin_token');
  const userData = getUserData();
  
  const isAuthenticated = !!(token && userData);
  console.log('🔐 Status de autenticação:', isAuthenticated);
  
  return isAuthenticated;
}

/**
 * Obtém o token de autenticação
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('labadmin_token');
}

/**
 * Obtém informações básicas do usuário para logs
 */
export function getUserInfo(): string {
  const userData = getUserData();
  if (!userData) return 'Usuário não identificado';
  
  const name = userData.firstName && userData.lastName 
    ? `${userData.firstName} ${userData.lastName}`
    : userData.email || 'Usuário';
    
  return `${name} (${userData.role || 'sem role'})`;
}

/**
 * Limpa dados do usuário (logout)
 */
export function clearUserData(): void {
  localStorage.removeItem('labadmin_user');
  localStorage.removeItem('labadmin_token');
  localStorage.removeItem('labadmin_permissions');
  console.log('🚪 Dados do usuário limpos (logout)');
}
