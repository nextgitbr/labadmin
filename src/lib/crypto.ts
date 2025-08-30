import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'fallback-key-for-development';
const ALGORITHM = 'aes-256-gcm';

/**
 * Criptografa uma string usando AES-256-GCM
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Retorna: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Erro ao criptografar:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa uma string criptografada com AES-256-GCM
 */
export function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de dados criptografados inválido');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    throw new Error('Falha na descriptografia');
  }
}

/**
 * Hash de senha usando Node.js crypto nativo (para senhas)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifica senha com hash nativo
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
}

/**
 * Hash de PIN usando SHA-256 (para PINs de segurança)
 */
export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + ENCRYPTION_KEY).digest('hex');
}

/**
 * Verifica PIN com hash SHA-256
 */
export function verifyPin(pin: string, hash: string): boolean {
  const pinHash = hashPin(pin);
  return crypto.timingSafeEqual(Buffer.from(pinHash), Buffer.from(hash));
}
