'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserWithId, Permissions } from '@/types';
import { useAuth } from '@/hooks/useAuth';
// Card não encontrado, usando <div> como fallback
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Select from '@/components/form/Select';
import Switch from '@/components/form/switch/Switch';
// Checkbox não encontrado, criando stub temporário:
const Checkbox = () => null;
// Se lucide-react não estiver instalado, crie um stub temporário para os ícones:
// import { Loader2, PlusCircle, Search, Trash2, Edit, Key, Eye, EyeOff } from '@/components/ui/icons';
import { AuthGuard } from '@/components/auth/AuthGuard';
import NewUserModal from '@/components/user-management/NewUserModal';
import { UserPermissionsModal } from '@/components/user-permissions/UserPermissionsModal';
// DeleteUserModal não encontrado, criar stub temporário:
const DeleteUserModal = () => null;
import apiClient from '@/lib/apiClient';

// Modal de alteração de senha
function PasswordChangeModal({ isOpen, onClose, userId, userEmail }: { 
  isOpen: boolean; 
  onClose: () => void; 
  userId?: string;
  userEmail?: string;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Função para gerar senha segura
  const generateSecurePassword = () => {
    const length = Math.floor(Math.random() * 3) + 8; // 8-10 caracteres
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%&*';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Garantir pelo menos um caractere de cada tipo
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Preencher o resto aleatoriamente
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Embaralhar a senha
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = () => {
    const generatedPassword = generateSecurePassword();
    setNewPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Todos os campos são obrigatórios");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A nova senha e confirmação não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/api/admin/set-password", {
        email: userEmail,
        password: newPassword,
      });

      if (response.success) {
        alert("Senha alterada com sucesso!");
        onClose();
        setNewPassword("");
        setConfirmPassword("");
        setShowPassword(false);
      } else {
        setError(response.message || "Erro ao alterar senha");
      }
    } catch (err: any) {
      console.error("Erro ao alterar senha:", err);
      setError(err.message || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Alterar Senha
        </h3>
        {userEmail && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Usuário: {userEmail}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Nova Senha</Label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Gerar Senha
              </button>
            </div>
            <div className="relative">
              <InputField
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <Label>Confirmar Nova Senha</Label>
            <InputField
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme a nova senha"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700"
              disabled={loading}
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Alterando..." : "Alterar Senha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type BreadcrumbItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

interface UserFilters {
  search: string;
  status: 'all' | 'isActive' | 'inisActive';
  role: string;
}

const UsersPage = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  // State management
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPermModal, setShowPermModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<UserWithId | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [userForPasswordChange, setUserForPasswordChange] = useState<UserWithId | null>(null);

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Usuários', href: '/users', isActive: true }
  ];

  // Check permissions
  const canEditUsers = currentUser?.permissions?.users?.edit || currentUser?.role === 'administrator';
  const canDeleteUsers = currentUser?.permissions?.users?.delete || currentUser?.role === 'administrator';

  // Fetch users
  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar usuários');
      }
      
      const data: UserWithId[] = await response.json();
      setUsers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro ao carregar os usuários';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle user deletion
  const handleDeleteUser = useCallback(async (): Promise<void> => {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir usuário');
      }

      setUsers(prevUsers => prevUsers.filter(u => u._id !== userToDelete._id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro ao excluir o usuário';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userToDelete]);

  // Handle permissions save
  const handleSavePermissions = useCallback(async (userId: string, permissions: Permissions): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT', // Corrigido de PATCH para PUT
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        // Se houver corpo, tenta ler como JSON, senão lança erro genérico
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error('Falha ao salvar permissões');
        }
        throw new Error(errorData?.message || 'Falha ao salvar permissões');
      }

      setUsers(prevUsers =>
        prevUsers.map(u =>
          u._id === userId ? { ...u, permissions } : u
        )
      );
      
      setShowPermModal(false);
      setSelectedUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro ao salvar as permissões';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle new user creation
  const handleUserCreated = useCallback((newUser: UserWithId): void => {
    setUsers(prevUsers => [newUser, ...prevUsers]);
    setShowNewUserModal(false);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  // Role options for filter
  const roleOptions = [
    { value: 'all', label: 'Todas as funções' },
    { value: 'administrator', label: 'Administrador' },
    { value: 'manager', label: 'Gerente' },
    { value: 'technician', label: 'Técnico' },
    { value: 'receptionist', label: 'Atendente' },
    { value: 'doctor', label: 'Médico' },
    { value: 'laboratory', label: 'Laboratório' }
  ];

  return (
    <AuthGuard requiredPermission="usuarios">
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Gerenciar Usuários</h1>
          <button 
            onClick={() => setShowNewUserModal(true)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-theme-xs bg-[#4158e7] hover:bg-[#2331a3] dark:bg-[#1c255d] dark:hover:bg-[#232d73] transition-colors"
          >
            <span className="text-lg leading-none">+ Novo Usuário</span>
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white pt-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-3 text-left sm:px-6">
                    <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Usuário</p>
                  </th>
                  <th className="px-5 py-3 text-left sm:px-6">
                    <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Email</p>
                  </th>
                  <th className="px-5 py-3 text-left sm:px-6">
                    <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Função</p>
                  </th>
                  <th className="px-5 py-3 text-left sm:px-6">
                    <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Status</p>
                  </th>
                  <th className="px-5 py-3 text-left sm:px-6">
                    <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Data Criação</p>
                  </th>
                  <th className="px-5 py-3 text-left sm:px-6">
                    <p className="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Ações</p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Carregando usuários...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="text-red-500 flex flex-col items-center space-y-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                        <button 
                          onClick={fetchUsers}
                          className="mt-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8">Nenhum usuário encontrado.</td></tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={`${user._id || user.email || user.firstName || 'user'}-${index}`} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {/* Avatar placeholder ou inicial */}
                            <span className="text-gray-500 dark:text-gray-300 font-bold text-lg">{user.firstName?.[0] || '?'}</span>
                          </div>
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{user.firstName}</span>
                            <span className="block text-gray-500 text-theme-xs dark:text-gray-400">{user.company}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <span className="text-gray-500 text-theme-sm dark:text-gray-400">{user.email}</span>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <span className="text-gray-500 text-theme-sm dark:text-gray-400">{user.role}</span>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <span className={`inline-block rounded-full px-2 py-0.5 font-medium text-theme-xs ${user.status === 'Ativo' ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500' : 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500'}`}>{user.status || 'Ativo'}</span>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <span className="text-gray-500 text-theme-sm dark:text-gray-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-4">
                          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Editar permissões" title="Editar permissões"
                              onClick={() => { setSelectedUser(user); setShowPermModal(true); }}>
                            <svg className="h-5 w-5 aspect-square" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5A4.5 4.5 0 0 0 7.5 7.5v3m9 0h-9m9 0v6.75A2.25 2.25 0 0 1 14.25 19.5h-4.5A2.25 2.25 0 0 1 7.5 17.25V10.5m3 3v6m3-6v6" />
                            </svg>
                          </button>
                          <button 
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center" 
                            aria-label="Editar" 
                            title="Alterar Senha"
                            onClick={() => {
                              setUserForPasswordChange(user);
                              setShowPasswordModal(true);
                            }}
                          >
                            <svg className="h-5 w-5 aspect-square" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.789l-4 1 1-4 13.362-13.302z" />
                            </svg>
                          </button>
                          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Visualizar" title="Visualizar">
                            <svg className="h-5 w-5 aspect-square" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12C3.5 7.5 7.5 4.5 12 4.5s8.5 3 9.75 7.5c-1.25 4.5-5.25 7.5-9.75 7.5S3.5 16.5 2.25 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button 
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center" 
                            aria-label="Excluir" 
                            title="Excluir"
                            onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteModal(true);
                            }}
                          >
                            <svg className="h-5 w-5 aspect-square" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V6.75A2.25 2.25 0 0 1 8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75V7.5m-12 0h12m-1.5 0v10.5A2.25 2.25 0 0 1 14.25 20.25h-4.5A2.25 2.25 0 0 1 7.5 17.25V7.5m3 3v6m3-6v6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <UserPermissionsModal
        isOpen={showPermModal}
        onClose={() => setShowPermModal(false)}
        user={selectedUser}
        onSave={handleSavePermissions}
      />
      <NewUserModal
        open={showNewUserModal}
        onClose={() => setShowNewUserModal(false)}
        onUserCreated={handleUserCreated}
      />
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Confirmar exclusão</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Tem certeza que deseja excluir o usuário <span className="font-semibold">{userToDelete.name}</span>? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Excluir
              </button>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  onClick={handleDeleteUser}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de alteração de senha */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setUserForPasswordChange(null);
        }}
        userId={userForPasswordChange?._id}
        userEmail={userForPasswordChange?.email}
      />
    </AuthGuard>
  );
};

export default UsersPage;
