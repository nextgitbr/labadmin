"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

interface SessionTimeoutContextProps {
  resetTimeout: () => void;
  remaining: number;
  isIdle: boolean;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextProps | undefined>(undefined);

const DEFAULT_TIMEOUT_MINUTES = 0.17; // 10 segundos para teste (0.17 minutos)

export function SessionTimeoutProvider({ children, timeoutMinutes = DEFAULT_TIMEOUT_MINUTES, onLogout }: { children: React.ReactNode; timeoutMinutes?: number; onLogout?: () => void }) {
  const [remaining, setRemaining] = useState(timeoutMinutes * 60);
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reseta o timer
  const resetTimeout = () => {
    setRemaining(timeoutMinutes * 60);
    setIsIdle(false);
  };

  // Listener para eventos de atividade
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => resetTimeout();
    events.forEach((event) => window.addEventListener(event, handleActivity));
    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [timeoutMinutes]);

  // Timer countdown
  useEffect(() => {
    console.log('SessionTimeout: Iniciando timer com', timeoutMinutes, 'minutos');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        console.log('SessionTimeout: Remaining seconds:', prev);
        if (prev <= 1) {
          console.log('SessionTimeout: Sessão expirada! Definindo isIdle = true');
          setIsIdle(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeoutMinutes]);

  // Quando ficar idle, apenas marca como inativo (modal será controlado externamente)
  useEffect(() => {
    console.log('SessionTimeout: isIdle mudou para:', isIdle);
    if (isIdle && onLogout) {
      console.log('SessionTimeout: Executando logout automático');
      // Executa logout automático imediatamente (limpeza de dados)
      onLogout();
    }
  }, [isIdle, onLogout]);

  return (
    <SessionTimeoutContext.Provider value={{ resetTimeout, remaining, isIdle }}>
      {children}
    </SessionTimeoutContext.Provider>
  );
}

export function useSessionTimeout() {
  const ctx = useContext(SessionTimeoutContext);
  if (!ctx) throw new Error("useSessionTimeout deve ser usado dentro do SessionTimeoutProvider");
  return ctx;
}
