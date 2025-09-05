"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

export function useAuth(redirectToLogin = true) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simples: busca usuário do localStorage
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("labadmin_user") : null;
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      
      console.log('🔍 Dados do usuário no localStorage:', parsed);
      console.log('🔍 Role do usuário:', parsed.role);
      console.log('🔍 Permissões do usuário:', parsed.permissions);
      
      // Se objeto é parcial ou inconsistente, buscar dados completos na API
      const isPartial = parsed && (Object.keys(parsed).length <= 2 || (!parsed._id && !parsed.email));
      if (parsed && (isPartial || !parsed._id || !parsed.email)) {
        console.log('📡 Buscando dados completos do usuário via API...');

        const fetchById = parsed?._id ? apiClient.get(`/api/users/${encodeURIComponent(parsed._id)}`) : null;
        const fetchByEmail = !parsed?._id && parsed?.email ? apiClient.get(`/api/users?email=${encodeURIComponent(parsed.email)}`) : null;

        (fetchById || fetchByEmail || Promise.reject(new Error('Missing identifier')))
          .then((fullUser: any) => {
            console.log('📊 Dados completos recebidos:', fullUser);
            
            if (fullUser && !fullUser.error && fullUser._id) {
              console.log('✅ Salvando dados completos no localStorage');
              
              localStorage.setItem("labadmin_user", JSON.stringify(fullUser));
              setUser(fullUser);
            } else {
              console.warn('⚠️ Usuário não encontrado/ inválido. Limpando sessão.');
              localStorage.removeItem('labadmin_user');
              setUser(null);
              if (redirectToLogin) router.replace('/signin');
            }
            setLoading(false);
          })
          .catch((error: any) => {
            console.error('❌ Erro ao buscar dados do usuário:', error);
            if (error?.status === 401) {
              console.warn('🔒 Não autorizado. Redirecionando para login.');
            }
            localStorage.removeItem('labadmin_user');
            localStorage.removeItem('labadmin_token');
            setUser(null);
            if (redirectToLogin) router.replace('/signin');
            setLoading(false);
          });
      } else {
        console.log('✅ Dados completos já disponíveis no localStorage');
        
        // Não forçar permissões de administrador: refletir exatamente o que está no banco
        setUser(parsed);
        setLoading(false);
      }
    } else {
      console.log('❌ Nenhum usuário encontrado no localStorage');
      setUser(null);
      setLoading(false);
      if (redirectToLogin) {
        router.replace("/signin");
      }
    }
  }, [router, redirectToLogin]);

  function login(userData: any) {
    localStorage.setItem("labadmin_user", JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("labadmin_user");
    localStorage.removeItem("labadmin_token");
    setUser(null);
    router.replace("/signin");
  }

  return { user, loading, login, logout };
}
