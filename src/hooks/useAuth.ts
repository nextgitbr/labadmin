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
      
      // Se só tem email ou não tem _id, buscar dados completos na API
      if (parsed && (!parsed._id || Object.keys(parsed).length <= 2)) {
        console.log('📡 Buscando dados completos do usuário via API...');
        
        apiClient.get(`/api/users?email=${encodeURIComponent(parsed.email)}`)
          .then((fullUser: any) => {
            console.log('📊 Dados completos recebidos:', fullUser);
            
            if (fullUser && !fullUser.error && fullUser._id) {
              console.log('✅ Salvando dados completos no localStorage');
              
              // Garantir que administrador tenha permissões mínimas
              if (fullUser.role === 'administrator') {
                console.log('🔧 Forçando permissões mínimas para administrador (kanban, configuracoes, configuracoesKanban, tasklist, notice)');
                fullUser.permissions = fullUser.permissions || {};
                fullUser.permissions.kanban = true;
                fullUser.permissions.configuracoes = true;
                fullUser.permissions.configuracoesKanban = true;
                fullUser.permissions.tasklist = true;
                fullUser.permissions.notice = true;
              }
              
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
        
        // Garantir que administrador tenha permissões mínimas mesmo nos dados do localStorage
        if (parsed.role === 'administrator') {
          console.log('🔧 Forçando permissões mínimas para administrador no localStorage');
          parsed.permissions = parsed.permissions || {};
          parsed.permissions.kanban = true;
          parsed.permissions.configuracoes = true;
          parsed.permissions.configuracoesKanban = true;
          parsed.permissions.tasklist = true;
          parsed.permissions.notice = true;
          localStorage.setItem("labadmin_user", JSON.stringify(parsed));
        }
        
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
