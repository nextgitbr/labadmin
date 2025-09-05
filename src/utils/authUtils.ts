import { Permissions } from "@/hooks/usePermissions";

/**
 * Determines the first allowed page based on user permissions
 * Follows the same order as the sidebar navigation and uses the same logic as canAccess
 */
export function getFirstAllowedPage(permissions: Permissions | null): string {
  if (!permissions) return '/signin';

  // Order matches the sidebar: Dashboard, Pedidos, Kanban, Task List, Tabela de Preços, Calendar, Usuários, Configurações
  const pageOrder = [
    { key: 'dashboard', path: '/' },
    { key: 'pedidos', path: '/orders' },
    { key: 'kanban', path: '/kanban' },
    { key: 'tasklist', path: '/task-list' },
    { key: 'tabelaPrecos', path: '/tables-pricing' },
    { key: 'calendar', path: '/calendar' },
    { key: 'usuarios', path: '/users' },
    { key: 'configuracoes', path: '/settings' },
  ];

  for (const page of pageOrder) {
    // Special handling for pedidos - check if at least one sub-permission is true
    if (page.key === 'pedidos') {
      if (permissions.pedidos && (permissions.pedidos.visualizar || permissions.pedidos.criar || permissions.pedidos.editar)) {
        return page.path;
      }
    } else {
      // For other permissions, check if they exist and are truthy
      const permValue = (permissions as any)[page.key];
      if (permValue && Boolean(permValue)) {
        return page.path;
      }
    }
  }

  // If no pages are allowed, redirect to signin
  return '/signin';
}
