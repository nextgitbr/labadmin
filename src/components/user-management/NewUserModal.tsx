"use client";
import React, { useState } from 'react';
import { useRoles } from '@/hooks/useRoles';
import rolesPtBr from '@/locales/roles-ptBR';

function SimpleModal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-5 overflow-y-auto bg-gray-400/50 backdrop-blur-[32px]">
      <div className="relative w-full max-w-[600px] rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10 shadow-2xl border border-gray-200 dark:border-gray-800">
        <button aria-label="Fechar modal" onClick={onClose} className="absolute right-3 top-3 z-[999] flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6 sm:h-11 sm:w-11">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M6.043 16.541a1 1 0 0 0 1.414 1.415l4.542-4.542 4.542 4.542a1 1 0 0 0 1.415-1.415l-4.543-4.542 4.543-4.542a1 1 0 1 0-1.415-1.415l-4.542 4.543-4.542-4.543A1 1 0 1 0 6.043 7.457l4.541 4.542-4.54 4.542Z" fill="currentColor"/></svg>
        </button>
        <div className="text-center">
          <div className="relative flex items-center justify-center z-1 mb-7">
            <svg className="fill-blue-light-50 dark:fill-blue-light-500/15" width="90" height="90" viewBox="0 0 90 90" fill="none"><path d="M34.364 6.85C38.62-2.28 51.38-2.28 55.636 6.85c2.377 5.1 7.924 7.821 13.32 6.534 9.663-2.304 17.618 7.858 13.262 16.944-2.433 5.073-1.063 11.188 3.289 14.683 7.794 6.26 4.955 18.933-4.733 21.128-5.41 1.226-9.248 6.13-9.218 11.776.055 10.11-11.44 15.75-19.165 9.402-4.314-3.545-10.47-3.545-14.784 0-7.725 6.348-19.22.708-19.165-9.403.03-5.646-3.808-10.55-9.218-11.776C-0.463 63.945-3.302 51.273 4.492 45.012c4.352-3.495 5.722-9.61 3.29-14.683C3.426 21.243 11.38 11.08 21.044 13.385c5.396 1.287 10.943-1.434 13.32-6.534Z" fill="" /></svg>
            <span className="absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
              <svg className="fill-blue-light-500 dark:fill-blue-light-500" width="38" height="38" viewBox="0 0 38 38" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M19 2.375C9.477 2.375 1.75 10.102 1.75 19.625s7.727 17.25 17.25 17.25 17.25-7.727 17.25-17.25S28.523 2.375 19 2.375ZM19 8.125c-1.036 0-1.875.839-1.875 1.875v7.5c0 1.036.839 1.875 1.875 1.875s1.875-.839 1.875-1.875v-7.5c0-1.036-.839-1.875-1.875-1.875Zm0 15c-1.036 0-1.875.839-1.875 1.875v1.25c0 1.036.839 1.875 1.875 1.875s1.875-.839 1.875-1.875V25c0-1.036-.839-1.875-1.875-1.875Z" fill="" /></svg>
            </span>
          </div>
          <h4 className="mb-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h4>
          <div className="mb-5 text-base font-medium text-gray-500 dark:text-gray-400">
            Preencha os dados do novo usuário
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

interface NewUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserCreated: (user: any) => void;
}

interface FormData {
  name: string;
  email: string;
  role: string;
  phone: string;
  address: string;
  nif: string;
  password: string;
  confirmPassword: string;
}

export default function NewUserModal({ open, onClose, onUserCreated }: NewUserModalProps) {
  const { roles, loading: rolesLoading } = useRoles();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: '',
    phone: '',
    address: '',
    nif: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(''); // Limpar erro ao digitar
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, role: e.target.value }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email é obrigatório');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Email deve ser válido');
      return false;
    }
    if (!formData.role) {
      setError('Função é obrigatória');
      return false;
    }
    if (!formData.password) {
      setError('Senha é obrigatória');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Senhas não coincidem');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.name.split(' ')[0] || '',
          lastName: formData.name.split(' ').slice(1).join(' ') || '',
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          country: '',
          city: formData.address || '',
          zip: '',
          vat: formData.nif || '',
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Usuário criado com sucesso!');
        onUserCreated({ ...result.user, formName: formData.name });
        
        // Resetar formulário
        setFormData({
          name: '',
          email: '',
          role: '',
          phone: '',
          address: '',
          nif: '',
          password: '',
          confirmPassword: ''
        });
        
        // Fechar modal após 1 segundo
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1000);
      } else {
        setError(result.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      setError('Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      role: '',
      phone: '',
      address: '',
      nif: '',
      password: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <SimpleModal open={open} onClose={handleClose} title="Criar Novo Usuário">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Nome completo"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="email@exemplo.com"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Função */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função *</label>
            <select
              id="role"
              value={formData.role}
              onChange={handleRoleChange}
              disabled={loading || rolesLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="" key="empty-role">Selecione uma função</option>
              {roles.map((role: any, index: number) => (
                <option key={role.value || `role-${index}`} value={role.value}>
                  {rolesPtBr[role.value] || role.label || role.value || `Função ${index + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Telefone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              placeholder="(11) 99999-9999"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Endereço */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
            <input
              id="address"
              type="text"
              value={formData.address}
              onChange={handleInputChange('address')}
              placeholder="Endereço completo"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* NIF */}
          <div>
            <label htmlFor="nif" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIF</label>
            <input
              id="nif"
              type="text"
              value={formData.nif}
              onChange={handleInputChange('nif')}
              placeholder="123456789"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha *</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Confirmar Senha */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Senha *</label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder="Confirme a senha"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-light-500 focus:border-blue-light-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-light-500 border border-transparent rounded-lg hover:bg-blue-light-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-light-500 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Usuário'}
          </button>
        </div>
      </form>
    </SimpleModal>
  );
}
