import { useState, useCallback } from 'react';
import { getUserId, isUserAuthenticated, getUserInfo, getUserData } from '@/utils/userUtils';

interface PinChangeData {
  currentPin: string;
  newPin: string;
  confirmNewPin: string;
}

interface PinValidationResult {
  isValid: boolean;
  errors: string[];
}

export function usePinManager() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastChangeTime, setLastChangeTime] = useState<number | null>(null);

  // Valida o PIN (deve ter 4-6 dígitos)
  const validatePin = useCallback((pin: string): boolean => {
    return /^\d{4,6}$/.test(pin);
  }, []);

  // Verifica se pode alterar o PIN (limite de 2 minutos)
  const canChangePin = useCallback((): boolean => {
    if (!lastChangeTime) return true;
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000; // 2 minutos em ms
    return (now - lastChangeTime) >= twoMinutes;
  }, [lastChangeTime]);

  // Obtém o tempo restante para próxima alteração
  const getTimeUntilNextChange = useCallback((): number => {
    if (!lastChangeTime) return 0;
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;
    const elapsed = now - lastChangeTime;
    return Math.max(0, twoMinutes - elapsed);
  }, [lastChangeTime]);

  // Valida os dados do formulário
  const validatePinChangeData = useCallback((data: PinChangeData): PinValidationResult => {
    const errors: string[] = [];

    if (!data.currentPin) {
      errors.push('PIN atual é obrigatório');
    }

    if (!data.newPin) {
      errors.push('Novo PIN é obrigatório');
    } else if (!validatePin(data.newPin)) {
      errors.push('Novo PIN deve ter entre 4 e 6 dígitos');
    }

    if (!data.confirmNewPin) {
      errors.push('Confirmação do PIN é obrigatória');
    } else if (data.newPin !== data.confirmNewPin) {
      errors.push('Novo PIN e confirmação não coincidem');
    }

    if (data.currentPin === data.newPin) {
      errors.push('O novo PIN deve ser diferente do atual');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [validatePin]);

  // Altera o PIN
  const changePin = useCallback(async (data: PinChangeData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Verifica se pode alterar
      if (!canChangePin()) {
        const timeLeft = Math.ceil(getTimeUntilNextChange() / 1000);
        throw new Error(`Aguarde ${timeLeft} segundos para alterar o PIN novamente`);
      }

      // Valida os dados
      const validation = validatePinChangeData(data);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Verificar autenticação e obter userId
      if (!isUserAuthenticated()) {
        throw new Error('Usuário não autenticado');
      }
      
      const userId = getUserId();
      if (!userId) {
        throw new Error('ID do usuário não encontrado');
      }
      
      console.log('🔐 Alterando PIN para usuário:', getUserInfo());

      // Chamada para API com userId e fallback por email
      const response = await fetch('/api/user/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: getUserData()?.email,
          currentPin: data.currentPin,
          newPin: data.newPin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao alterar PIN');
      }

      // Sucesso
      setLastChangeTime(Date.now());
      setSuccess('PIN alterado com sucesso!');
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [canChangePin, getTimeUntilNextChange, validatePinChangeData]);

  // Limpa mensagens
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    loading,
    error,
    success,
    canChangePin: canChangePin(),
    timeUntilNextChange: getTimeUntilNextChange(),
    changePin,
    clearMessages,
    validatePin,
  };
}
