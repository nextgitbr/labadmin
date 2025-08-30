import { useState, useEffect } from 'react';

export interface UserProfile {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  company?: string;
  country: string;
  city: string;
  zip: string;
  vat: string;
  avatar: string;
}

export interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loadProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, profileData: Partial<UserProfile>, passwordData?: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<boolean>;
  clearError: () => void;
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const loadProfile = async (userId: string) => {
    if (!userId) {
      setError('ID do usuário é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/profile?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao carregar perfil');
      }

      if (data.success) {
        setProfile(data.user);
      } else {
        throw new Error(data.message || 'Erro ao carregar perfil');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (
    userId: string, 
    profileData: Partial<UserProfile>,
    passwordData?: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }
  ): Promise<boolean> => {
    if (!userId) {
      setError('ID do usuário é obrigatório');
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      const requestBody = {
        userId,
        ...profileData,
        ...(passwordData && {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar perfil');
      }

      if (data.success) {
        setProfile(data.user);
        return true;
      } else {
        throw new Error(data.message || 'Erro ao atualizar perfil');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao atualizar perfil:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    loading,
    saving,
    error,
    loadProfile,
    updateProfile,
    clearError,
  };
}
