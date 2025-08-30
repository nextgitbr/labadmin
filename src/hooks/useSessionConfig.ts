import { useState, useEffect } from 'react';

export function useSessionConfig() {
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/session')
      .then(async (res) => {
        if (!res.ok) throw new Error('Erro ao buscar tempo de sessão');
        const data = await res.json();
        setTimeoutMinutes(data.timeoutMinutes);
      })
      .catch(() => setError('Erro ao buscar tempo de sessão'))
      .finally(() => setLoading(false));
  }, []);

  const saveTimeout = async (minutes: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeoutMinutes: minutes }),
      });
      if (!res.ok) throw new Error('Erro ao salvar tempo de sessão');
      setTimeoutMinutes(minutes);
    } catch {
      setError('Erro ao salvar tempo de sessão');
    } finally {
      setLoading(false);
    }
  };

  return { timeoutMinutes, loading, error, saveTimeout };
}
