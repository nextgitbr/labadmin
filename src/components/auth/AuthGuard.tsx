"use client";

import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { permissionsList } from "@/permissions/permissionsList";
import AccessDenied from "@/components/common/AccessDenied";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requiredPermission,
  redirectTo = "/" 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const { canAccess } = usePermissions(user?.role, permissionsList, user?.permissions);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debug logs
  console.log('🔐 AuthGuard Debug:', {
    user: user,
    userRole: user?.role,
    userPermissions: user?.permissions,
    requiredPermission,
    loading,
    isClient,
    hasKanbanPermission: user?.permissions?.kanban
  });

  // Calcule autorização diretamente na renderização
  const isAuthorized = !requiredPermission || canAccess(requiredPermission as keyof import('@/hooks/usePermissions').Permissions);
  
  console.log('🔐 Authorization check:', {
    requiredPermission,
    isAuthorized,
    canAccessResult: requiredPermission ? canAccess(requiredPermission as keyof import('@/hooks/usePermissions').Permissions) : 'N/A'
  });

  // Não precisa mais de useEffect/setIsAuthorized


  // Mostrar loading enquanto verifica autenticação
  if (loading || !isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Se não estiver autenticado ou não tiver permissão, mostra acesso negado
  if (!user || (requiredPermission && !isAuthorized)) {
    return <AccessDenied />;
  }

  // Renderiza o conteúdo protegido
  return <>{children}</>;
}

export default AuthGuard;
