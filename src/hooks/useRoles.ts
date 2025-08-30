import { useState, useEffect } from 'react';

interface Role {
  value: string;
  label: string;
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/roles');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar roles');
      }
      
      const data = await response.json();
      setRoles(data.roles || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar roles:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    roles,
    loading,
    error,
    refetch: fetchRoles
  };
}
