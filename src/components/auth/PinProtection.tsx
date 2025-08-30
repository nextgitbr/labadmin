"use client";
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import { getUserId, getUserData } from '@/utils/userUtils';

interface PinProtectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  sessionDuration?: number; // Duração da sessão em minutos (padrão: 30 min)
  onUnlock?: () => void;
  onLock?: () => void;
}

const PIN_SESSION_KEY = 'pin_protection_session';

export default function PinProtection({
  children,
  title = "Área Protegida",
  description = "Esta área requer verificação de PIN para acesso.",
  sessionDuration = 30,
  onUnlock,
  onLock
}: PinProtectionProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);

  // Verifica se há uma sessão ativa ao montar o componente
  useEffect(() => {
    checkExistingSession();
  }, []);

  // Timer para bloquear tentativas excessivas
  useEffect(() => {
    if (isBlocked && blockTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setBlockTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isBlocked && blockTimeRemaining === 0) {
      setIsBlocked(false);
      setAttempts(0);
    }
  }, [isBlocked, blockTimeRemaining]);

  // Verifica se existe uma sessão ativa válida
  const checkExistingSession = () => {
    try {
      const sessionData = localStorage.getItem(PIN_SESSION_KEY);
      if (sessionData) {
        const { timestamp, duration } = JSON.parse(sessionData);
        const now = Date.now();
        const sessionAge = (now - timestamp) / (1000 * 60); // em minutos
        
        if (sessionAge < duration) {
          setIsUnlocked(true);
          onUnlock?.();
        } else {
          localStorage.removeItem(PIN_SESSION_KEY);
        }
      }
    } catch (error) {
      localStorage.removeItem(PIN_SESSION_KEY);
    }
  };

  // Cria uma nova sessão
  const createSession = () => {
    const sessionData = {
      timestamp: Date.now(),
      duration: sessionDuration
    };
    localStorage.setItem(PIN_SESSION_KEY, JSON.stringify(sessionData));
  };

  // Valida o PIN
  const validatePin = async (inputPin: string): Promise<boolean> => {
    try {
      const userId = getUserId();
      const email = getUserData()?.email;
      const response = await fetch('/api/user/validate-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: inputPin, userId, email }),
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao validar PIN:', error);
      return false;
    }
  };

  // Manipula o envio do PIN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) return;
    if (!pin || pin.length < 4) {
      setError('PIN deve ter pelo menos 4 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await validatePin(pin);
      
      if (isValid) {
        setIsUnlocked(true);
        createSession();
        setPin('');
        setAttempts(0);
        onUnlock?.();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(`PIN incorreto. Tentativa ${newAttempts} de 3.`);
        
        // Bloqueia após 3 tentativas
        if (newAttempts >= 3) {
          setIsBlocked(true);
          setBlockTimeRemaining(300); // 5 minutos
          setError('Muitas tentativas incorretas. Aguarde 5 minutos.');
        }
        
        setPin('');
      }
    } catch (error) {
      setError('Erro ao verificar PIN. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Manipula mudanças no campo PIN
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    setError('');
  };

  // Força o bloqueio (logout da sessão PIN)
  const lockAccess = () => {
    setIsUnlocked(false);
    localStorage.removeItem(PIN_SESSION_KEY);
    setPin('');
    setError('');
    onLock?.();
  };

  // Formata o tempo de bloqueio
  const formatBlockTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Se desbloqueado, mostra o conteúdo protegido
  if (isUnlocked) {
    return (
      <div className="relative">
        {/* Botão de bloqueio no canto superior direito */}
        <div className="absolute top-0 right-0 z-10">
          <Button
            onClick={lockAccess}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            🔒 Bloquear
          </Button>
        </div>
        {children}
      </div>
    );
  }

  // Tela de verificação de PIN
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          {/* Ícone e título */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {description}
            </p>
          </div>

          {/* Formulário de PIN */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Digite seu PIN de segurança
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={handlePinChange}
                placeholder="••••••"
                maxLength={6}
                disabled={loading || isBlocked}
                className="w-full px-4 py-3 text-center text-lg tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                autoComplete="off"
              />
            </div>

            {/* Mensagens de erro */}
            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            {/* Tempo de bloqueio */}
            {isBlocked && (
              <div className="text-orange-500 text-sm text-center">
                Bloqueado por: {formatBlockTime(blockTimeRemaining)}
              </div>
            )}

            {/* Botão de envio */}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              disabled={loading || isBlocked || pin.length < 4}
            >
              {loading ? 'Verificando...' : 'Desbloquear'}
            </button>
          </form>

          {/* Informações adicionais */}
          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>• Máximo 3 tentativas</p>
            <p>• Sessão válida por {sessionDuration} minutos</p>
            <p>• Apenas números são aceitos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
