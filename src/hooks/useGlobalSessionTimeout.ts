import { useEffect, useState, useCallback } from 'react';

interface SessionTimeoutHook {
  timeoutMinutes: number;
  timeRemaining: number;
  isWarningActive: boolean;
  resetTimer: () => void;
}

export function useGlobalSessionTimeout(): SessionTimeoutHook {
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(30);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isWarningActive, setIsWarningActive] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Resetar timer de atividade
  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setIsWarningActive(false);
  }, []);

  // Buscar configurações de timeout
  useEffect(() => {
    const fetchTimeout = async () => {
      try {
        const res = await fetch('/api/settings/session');
        if (res.ok) {
          const data = await res.json();
          setTimeoutMinutes(data.timeoutMinutes);
        }
      } catch {}
    };
    fetchTimeout();
  }, []);

  // Monitorar atividade do usuário
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetActivityTimer = () => {
      resetTimer();
    };

    // Adicionar listeners de atividade
    events.forEach(event => {
      document.addEventListener(event, resetActivityTimer, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivityTimer, true);
      });
    };
  }, [resetTimer]);

  // Timer principal para calcular tempo restante
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastActivity) / 1000); // segundos
      const totalTimeout = timeoutMinutes * 60; // converter para segundos
      const remaining = Math.max(0, totalTimeout - elapsed);
      
      setTimeRemaining(remaining);
      
      // Ativar aviso quando restam 60 segundos ou menos (configurável)
      const warningThreshold = 60; // segundos
      setIsWarningActive(remaining <= warningThreshold && remaining > 0);
      
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, timeoutMinutes]);

  return {
    timeoutMinutes,
    timeRemaining,
    isWarningActive,
    resetTimer
  };
}
