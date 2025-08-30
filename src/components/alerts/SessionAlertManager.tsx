"use client";
import React, { useEffect } from 'react';
import { useSessionAlert } from '@/context/SessionAlertContext';
import { useGlobalSessionTimeout } from '@/hooks/useGlobalSessionTimeout';

export default function SessionAlertManager() {
  const { config, setShowAlert, setTimeRemaining } = useSessionAlert();
  const { isWarningActive, timeRemaining } = useGlobalSessionTimeout();

  useEffect(() => {
    if (config.enabled && isWarningActive && timeRemaining <= config.timeoutWarning) {
      setShowAlert(true);
      setTimeRemaining(timeRemaining);
    } else {
      setShowAlert(false);
    }
  }, [isWarningActive, timeRemaining, config.enabled, config.timeoutWarning, setShowAlert, setTimeRemaining]);

  return null; // Este componente não renderiza nada, apenas gerencia o estado
}
