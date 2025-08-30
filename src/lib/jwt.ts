import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: Record<string, boolean>;
  [key: string]: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7 dias

// Garantir que temos uma chave secreta
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET não está definido. Usando valor padrão.');
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    console.error('❌ Erro ao verificar token:', error);
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // Tenta pegar do header Authorization
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  // Tenta pegar do cookie
  const cookie = req.cookies.get('auth_token');
  if (cookie?.value) {
    return cookie.value;
  }
  
  return null;
}

export function authenticateToken(token: string): JwtPayload | null {
  return verifyToken(token);
}

export function clearAuthCookie(): string {
  return 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax' + 
    (process.env.NODE_ENV === 'production' ? '; Secure' : '');
}
