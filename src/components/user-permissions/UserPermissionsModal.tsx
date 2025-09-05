
export interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (userId: string, permissions: Permissions) => Promise<void>;
}

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Permissions, User, PedidosPermissions } from '@/types';
import { useAuth } from '@/hooks/useAuth';

function SimpleModal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-5 overflow-y-auto bg-gray-400/50 backdrop-blur-[32px]">
      <div className="relative w-full max-w-[600px] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 shadow-2xl border border-gray-200 dark:border-gray-800">
        <button aria-label="Fechar modal" onClick={onClose} className="absolute right-3 top-3 z-[999] flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6 sm:h-11 sm:w-11">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M6.043 16.541a1 1 0 0 0 1.414 1.415l4.542-4.542 4.542 4.542a1 1 0 0 0 1.415-1.415l-4.543-4.542 4.543-4.542a1 1 0 1 0-1.415-1.415l-4.542 4.543-4.542-4.543A1 1 0 1 0 6.043 7.457l4.541 4.542-4.54 4.542Z" fill="currentColor"/></svg>
        </button>
        <div className="text-center">
          <h4 className="mb-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Editar permissões
          </h4>
          <div className="mb-5 text-base font-medium text-gray-500 dark:text-gray-400">
            Selecione as permissões que o usuário terá acesso.
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function UserPermissionsModal({ isOpen, onClose, user, onSave }: UserPermissionsModalProps) {
  const [perms, setPerms] = useState<Permissions | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastUserId = useRef<string | null>(null);
  const { user: currentUser } = useAuth(false);

  useEffect(() => {
    if (isOpen && user?._id && lastUserId.current !== user._id) {
      const fetchPermissions = async () => {
        setLoading(true);
        try {
          console.log('🔍 Modal: Buscando permissões para usuário:', user._id);
          const response = await fetch(`/api/users/${user._id}`);
          if (!response.ok) throw new Error('Falha ao buscar permissões');
          const userData = await response.json();
          console.log('📥 Modal: Permissões recebidas do banco:', userData.permissions);
          if (userData?.permissions) {
            setPerms(structuredClone(userData.permissions));
            console.log('✅ Modal: Permissões carregadas no estado:', userData.permissions);
          } else {
            setPerms(null);
          }
          lastUserId.current = user._id;
        } catch (error) {
          console.error("❌ Modal: Erro ao buscar permissões:", error);
          toast.error("Não foi possível carregar as permissões.");
          setPerms(null);
        } finally {
          setLoading(false);
        }
      };
      fetchPermissions();
    } else if (!isOpen || !user?._id) {
      setPerms(null);
      lastUserId.current = null;
    }
  }, [isOpen, user?._id]);

  const toggle = (path: string, subpath?: keyof PedidosPermissions) => {
    console.log('🔄 Modal: Toggle chamado:', { path, subpath, currentValue: perms?.[path] });
    setPerms(currentPerms => {
      if (!currentPerms) return null;
      const newPerms = structuredClone(currentPerms);
      console.log('📝 Modal: Permissões antes do toggle:', currentPerms);
      
      if (subpath && typeof newPerms[path] === 'object') {
        (newPerms[path] as PedidosPermissions)[subpath] = !(newPerms[path] as PedidosPermissions)[subpath];
      } else if (!subpath) {
        (newPerms[path] as boolean) = !(newPerms[path] as boolean);
      }
      
      console.log('📝 Modal: Permissões depois do toggle:', newPerms);
      console.log('🎯 Modal: Valor específico alterado:', { path, newValue: newPerms[path] });
      return newPerms;
    });
  };

  const handleSave = async () => {
    if (!user || !perms) return;
    console.log('💾 Salvando permissões:', { userId: user._id, permissions: perms });
    setSaving(true);
    try {
      // Fazer chamada direta para a API ao invés de usar onSave
      const response = await fetch(`/api/users/${user._id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: perms }),
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Resposta da API:', result);

      toast.success('Permissões salvas com sucesso!');

      // Atualiza sessão APENAS se o usuário editado for o mesmo que está logado
      if (currentUser && result && result._id && currentUser._id === result._id) {
        try {
          localStorage.setItem('labadmin_user', JSON.stringify(result));
          // Recarregar para garantir que hooks e Sidebar apliquem as permissões atuais
          window.location.reload();
          return; // evita fechar modal após reload
        } catch (e) {
          console.warn('⚠️ Não foi possível atualizar o localStorage com o usuário atualizado.', e);
        }
      }

      // Se não for o usuário logado, apenas fecha modal sem mexer na sessão atual
      onClose();
    } catch (error) {
      console.error("❌ Erro ao salvar permissões:", error);
      toast.error('Não foi possível salvar as permissões.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !user) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-5 overflow-y-auto bg-gray-400/50 backdrop-blur-sm transition-opacity duration-300"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl rounded-xl bg-white p-6 dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h4 id="modal-title" className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Editar permissões de <span className='text-blue-light-500 dark:text-blue-light-400'>{user.name}</span>
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Selecione as permissões que o usuário terá acesso.
            </p>
          </div>
          <button 
            aria-label="Fechar modal" 
            onClick={onClose} 
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M6.043 16.541a1 1 0 0 0 1.414 1.415l4.542-4.542 4.542 4.542a1 1 0 0 0 1.415-1.415l-4.543-4.542 4.543-4.542a1 1 0 1 0-1.415-1.415l-4.542 4.543-4.542-4.543A1 1 0 1 0 6.043 7.457l4.541 4.542-4.54 4.542Z" fill="currentColor"/></svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500 dark:text-gray-400">Carregando permissões...</p>
          </div>
        ) : !perms ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-red-500">Não foi possível carregar as permissões para este usuário.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Dashboard */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!perms.dashboard} onChange={() => toggle('dashboard')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Dashboard</span>
            </label>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Task List */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!(perms as any).tasklist} onChange={() => toggle('tasklist' as any)} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Task List</span>
            </label>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Avisos */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!(perms as any).notice} onChange={() => toggle('notice' as any)} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Avisos</span>
            </label>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Pedidos */}
            <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-800 dark:text-gray-200">Pedidos</p>
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={!!perms.pedidos?.visualizar} onChange={() => toggle('pedidos', 'visualizar')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Visualizar</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={!!perms.pedidos?.criar} onChange={() => toggle('pedidos', 'criar')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Criar</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={!!perms.pedidos?.editar} onChange={() => toggle('pedidos', 'editar')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Editar</span>
              </label>
            </div>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Kanban */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!perms.kanban} onChange={() => {
                console.log('🟦 Modal: Checkbox Kanban clicado. Valor atual:', perms.kanban);
                toggle('kanban');
              }} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Kanban</span>
            </label>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Task: Permitir mover para trás */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!(perms as any).taskMoveBackward} onChange={() => toggle('taskMoveBackward' as any)} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Permitir mover tarefa para trás</span>
            </label>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Tabela de Preços */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!perms.tabelaPrecos} onChange={() => toggle('tabelaPrecos')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tabela de Preços</span>
            </label>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Calendar */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!perms.calendar} onChange={() => toggle('calendar')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Calendar</span>
            </label>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Usuários */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!perms.usuarios} onChange={() => toggle('usuarios')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Usuários</span>
            </label>

            <div className="flex justify-center my-4"><div className="h-[1.5px] w-full bg-gray-200 dark:bg-gray-700 rounded-full mx-0" /></div>

            {/* Configurações */}
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={!!perms.configuracoes} onChange={() => toggle('configuracoes')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Configurações</span>
            </label>

            {/* Configurações > Kanban */}
            <label className="flex items-center space-x-3 pl-6">
              <input type="checkbox" checked={!!perms.configuracoesKanban} onChange={() => toggle('configuracoesKanban')} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Configurações › Kanban</span>
            </label>

            {/* Configurações > Produção */}
            <label className="flex items-center space-x-3 pl-6">
              <input type="checkbox" checked={!!(perms as any).configuracoesProducao} onChange={() => toggle('configuracoesProducao' as any)} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Configurações › Produção</span>
            </label>

            {/* Configurações > Produtos */}
            <label className="flex items-center space-x-3 pl-6">
              <input type="checkbox" checked={!!(perms as any).configuracoesProdutos} onChange={() => toggle('configuracoesProdutos' as any)} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Configurações › Produtos</span>
            </label>

            {/* Configurações > Categorias */}
            <label className="flex items-center space-x-3 pl-6">
              <input type="checkbox" checked={!!(perms as any).configuracoesCategorias} onChange={() => toggle('configuracoesCategorias' as any)} className="h-5 w-5 text-blue-light-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-light-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Configurações › Categorias</span>
            </label>
          </div>
        )}

        <div className="flex items-center justify-center w-full gap-3 mt-7">
          <button type="button" onClick={handleSave} disabled={saving || loading || !perms} className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-blue-light-500 shadow-theme-xs hover:bg-blue-light-600 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={onClose} disabled={saving} className="flex justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 sm:w-auto transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}