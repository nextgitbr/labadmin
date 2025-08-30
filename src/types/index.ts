// Tipagem para as permissões de Pedidos
export interface PedidosPermissions {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
}

// Tipagem principal de Permissões
export interface Permissions {
  dashboard: boolean;
  pedidos: PedidosPermissions;
  // chaves usadas pela UI
  kanban?: boolean;
  tasklist?: boolean;
  notice?: boolean;
  tabelaPrecos: boolean;
  calendar: boolean;
  usuarios: boolean;
  configuracoes: boolean;
  configuracoesKanban?: boolean;
  // Permite mover tarefas "para trás" no fluxo Kanban/Task List
  taskMoveBackward?: boolean;
  [key: string]: boolean | PedidosPermissions | undefined;
}

// Tipagem para o Usuário
export interface User {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  company?: string;
  phone?: string;
  country?: string;
  cityState?: string;
  postalCode?: string;
  vatId?: string;
  pin?: string;
  permissions: Permissions;
  createdAt: string; 
  updatedAt: string;
  isActive?: boolean;
  status?: string;
}

// UserWithId garante que _id sempre estará presente
export type UserWithId = User & { _id: string };
