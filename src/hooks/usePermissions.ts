import { useMemo } from "react";

// Tipo para o objeto de permissões
export type PedidosPerm = {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
};

export type Permissions = {
  dashboard: boolean;
  pedidos: PedidosPerm;
  kanban: boolean;
  tasklist?: boolean;
  notice?: boolean;
  tabelaPrecos: boolean;
  calendar: boolean;
  usuarios: boolean;
  configuracoes: boolean;
  configuracoesKanban?: boolean;
  configuracoesProducao?: boolean;
  configuracoesProdutos?: boolean;
  configuracoesCategorias?: boolean;
  // Permite mover tarefas "para trás" no fluxo (ex.: Finalizado → Em produção)
  taskMoveBackward?: boolean;
};

export type RolePermissions = {
  role: string;
  permissions: Permissions;
};

// Função utilitária para buscar as permissões do role
function normalizeRole(role: string): string {
  const r = (role || '').toLowerCase();
  if (["admin", "administrator", "administrador"].includes(r)) return "administrator";
  if (["manager", "gerente"].includes(r)) return "manager";
  if (["technician", "tecnico"].includes(r)) return "technician";
  if (["doctor", "dentist", "medico"].includes(r)) return "doctor";
  if (["laboratory", "lab", "laboratorio"].includes(r)) return "laboratory";
  if (["attendant", "atendente"].includes(r)) return "attendant";
  return role;
}

function getPermissionsForRole(role: string, permissionsList: RolePermissions[]): Permissions | null {
  const norm = normalizeRole(role);
  const found = permissionsList.find((item) => item.role === norm);
  return found ? found.permissions : null;
}

// Helper para saber se há ao menos uma permissão true
function hasAnyPermissionTrue(permissions: Permissions | null): boolean {
  if (!permissions) return false;
  // Checa campos booleanos diretos
  const bools = [
    permissions.dashboard,
    permissions.kanban,
    Boolean(permissions.tasklist),
    Boolean(permissions.notice),
    permissions.tabelaPrecos,
    permissions.calendar,
    permissions.usuarios,
    permissions.configuracoes,
    Boolean(permissions.configuracoesKanban),
    Boolean((permissions as any).configuracoesProducao),
    Boolean((permissions as any).configuracoesProdutos),
    Boolean((permissions as any).configuracoesCategorias),
    Boolean((permissions as any).taskMoveBackward),
  ];
  // Checa granularidade de pedidos
  const pedidos = permissions.pedidos;
  if (typeof pedidos === 'object') {
    bools.push(pedidos.visualizar, pedidos.criar, pedidos.editar);
  }
  return bools.some(Boolean);
}

// Hook React para uso de permissões
export function usePermissions(
  role: string,
  permissionsList: RolePermissions[],
  userPermissions?: Permissions | null
) {
  // Debug logs
  console.log('🔍 usePermissions Debug:', {
    role,
    userPermissions,
    permissionsList: permissionsList.length,
    hasUserPermissions: !!userPermissions,
    hasAnyTrue: userPermissions ? hasAnyPermissionTrue(userPermissions) : false
  });

  // Fallback inteligente: usa permissions do usuário se houver ao menos uma true, senão usa do role
  const permissions = useMemo(() => {
    let finalPermissions = null;
    
    if (userPermissions && hasAnyPermissionTrue(userPermissions)) {
      console.log('✅ Usando permissões do usuário:', userPermissions);
      finalPermissions = { ...userPermissions };
    } else {
      const rolePerms = getPermissionsForRole(role, permissionsList);
      console.log('📋 Usando permissões do role:', rolePerms);
      finalPermissions = rolePerms ? { ...rolePerms } : null;
    }
    
    // Não force permissões por role; respeitar exatamente o que vem do usuário/DB
    
    return finalPermissions;
  }, [role, permissionsList, userPermissions]);

  // Helper para checar permissão simples ou aninhada (ex: 'pedidos.visualizar')
  function canAccess(key: string): boolean {
    console.log(`🔐 canAccess("${key}") chamado`);
    console.log('🔗 Permissions object:', permissions);
    
    if (!permissions) {
      console.log('❌ Sem permissões disponíveis');
      return false;
    }
    
    // Special handling for pedidos - check if at least one sub-permission is true
    if (key === 'pedidos') {
      const pedidosPerms = permissions.pedidos;
      console.log('📋 Pedidos permissions:', pedidosPerms);
      if (pedidosPerms && (pedidosPerms.visualizar || pedidosPerms.criar || pedidosPerms.editar)) {
        console.log('✅ Pedidos permitido (pelo menos uma sub-permissão é true)');
        return true;
      } else {
        console.log('❌ Pedidos negado (todas as sub-permissões são false)');
        return false;
      }
    }
    
    // Suporte a permissões aninhadas com ponto
    const parts = key.split('.');
    let current: any = permissions;
    
    for (const part of parts) {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        console.log('❌ Permissão não encontrada:', { part, current });
        return false;
      }
    }
    
    const result = Boolean(current);
    console.log(`🔐 Resultado canAccess("${key}"):`, { value: current, result });
    return result;
  }

  // Helper para checar permissão granular em pedidos
  function canPedidos(action: keyof PedidosPerm): boolean {
    if (!permissions) return false;
    return Boolean(permissions.pedidos?.[action]);
  }

  return {
    permissions,
    canAccess,
    canPedidos,
  };
}

// Exemplo de uso:
// const { canAccess, canPedidos } = usePermissions(user.role, permissionsList);
// if (canAccess('usuarios')) { ... }
// if (canPedidos('criar')) { ... }
