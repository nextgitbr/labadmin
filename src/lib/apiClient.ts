"use client";

// Cliente HTTP centralizado com injeção automática de Authorization Bearer
// Usa localStorage("labadmin_token") quando disponível

export type ApiOptions = RequestInit & { json?: any };

// Evitar múltiplos redirecionamentos simultâneos em cascata
let _redirecting401 = false;

function buildHeaders(options?: ApiOptions): HeadersInit {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options?.headers as any || {}),
  };
  
  // Content-Type JSON quando enviando body json
  if (options?.json !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Adicionar token JWT se disponível
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('labadmin_token');
      if (token) {
        // Verificar se já existe um header Authorization
        const hasAuthHeader = Object.keys(headers).some(
          k => k.toLowerCase() === 'authorization'
        );
        
        if (!hasAuthHeader) {
          console.log('🔑 Adicionando token JWT ao cabeçalho da requisição');
          headers['Authorization'] = `Bearer ${token}`;
        }
      } else {
        console.warn('⚠️ Nenhum token JWT encontrado no localStorage');
      }
    } catch (error) {
      console.error('❌ Erro ao acessar localStorage:', error);
    }
  }
  
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  if (!res.ok) {
    // Tratamento global de 401 Unauthorized
    if (res.status === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('labadmin_token');
        localStorage.removeItem('labadmin_user');
      } catch (_) {}
      if (!_redirecting401) {
        _redirecting401 = true;
        // usar replace para não voltar para página protegida ao pressionar back
        window.location.replace('/signin?reason=expired');
      }
      const unauthorized: any = new Error('Unauthorized');
      unauthorized.status = 401;
      unauthorized.payload = undefined;
      throw unauthorized;
    }
    const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);
    const err: any = new Error(typeof payload === 'string' ? payload : (payload?.error || res.statusText || 'Request failed'));
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return (isJson ? await res.json() : (await res.text())) as any as T;
}

async function request<T>(url: string, options?: ApiOptions): Promise<T> {
  const init: RequestInit = {
    ...options,
    headers: buildHeaders(options),
    body: options?.json !== undefined ? JSON.stringify(options.json) : options?.body,
  };
  const res = await fetch(url, init);
  return handleResponse<T>(res);
}

export const apiClient = {
  get<T = any>(url: string, options?: ApiOptions) {
    return request<T>(url, { ...options, method: 'GET' });
  },
  post<T = any>(url: string, json?: any, options?: ApiOptions) {
    return request<T>(url, { ...options, method: 'POST', json });
  },
  patch<T = any>(url: string, json?: any, options?: ApiOptions) {
    return request<T>(url, { ...options, method: 'PATCH', json });
  },
  put<T = any>(url: string, json?: any, options?: ApiOptions) {
    return request<T>(url, { ...options, method: 'PUT', json });
  },
  delete<T = any>(url: string, options?: ApiOptions) {
    return request<T>(url, { ...options, method: 'DELETE' });
  },
};

export default apiClient;
