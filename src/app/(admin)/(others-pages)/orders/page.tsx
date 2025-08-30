'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import OdontogramaModal from '@/components/modals/OdontogramaModal';
import EyeIcon from "@/icons/EyeIcon";
import PencilIcon from "@/icons/PencilIcon";
import PrintIcon from "@/icons/PrintIcon";
import TrashIcon from "@/icons/TrashIcon";
import { OrderData } from "@/components/form/odontogram/types";
import apiClient from "@/lib/apiClient";

// Interface para os pedidos do banco
interface Order {
  _id: string;
  orderNumber: string;
  patientName: string;
  workType: string;
  selectedMaterial?: string;
  selectedVitaShade?: string;
  toothConstructions: { [key: string]: string };
  selectedTeeth: string[];
  uploadedFiles: any[];
  caseObservations?: string;
  status: string;
  priority: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  createdBy: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isActive: boolean;
}

interface Stage {
  id: string;
  name: string;
  color?: string; // legacy
  primaryColor?: string;
  backgroundColor?: string;
  stroke?: string;
}

export default function Pedidos() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageById, setStageById] = useState<Record<string, Stage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleNewOrder = () => {
    setIsModalOpen(true);
  };

  // Carregar estágios (para nomes/cores dinâmicos)
  const fetchStages = async () => {
    try {
      const list = await apiClient.get<Stage[]>('/api/stages');
      setStages(list);
      const map: Record<string, Stage> = {};
      list.forEach((s) => { map[s.id] = s; });
      setStageById(map);
    } catch (e) {
      console.error('Erro ao carregar estágios:', e);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Carregar pedidos do banco
  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Verifica existência de token antes de chamar a API
      const token = typeof window !== 'undefined' ? localStorage.getItem('labadmin_token') : null;
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        if (logout) logout();
        return;
      }
      
      // Para usuários doctor e laboratory, filtrar apenas seus pedidos
      const shouldFilterByUser = user.role === 'doctor' || user.role === 'laboratory';
      const url = shouldFilterByUser 
        ? `/api/orders?createdBy=${encodeURIComponent(user._id || user.email)}`
        : '/api/orders';
      
      console.log('🔍 Buscando pedidos:', { 
        userRole: user.role, 
        shouldFilter: shouldFilterByUser, 
        url 
      });
      
      const data = await apiClient.get<Order[]>(url);
      setOrders(data);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos:', err);
      if (err?.status === 401) {
        setError('Não autorizado. Faça login novamente.');
        if (logout) logout();
      } else {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao montar
  useEffect(() => {
    if (!authLoading && user) {
      fetchOrders();
      fetchStages();
    }
  }, [authLoading, user]);

  const handleSubmitOrder = async (orderData: OrderData) => {
    try {
      console.log('Novo pedido sendo criado:', orderData);
      
      // O formulário já envia para a API, então só precisamos recarregar a lista
      await fetchOrders();
      setIsModalOpen(false);
      
    } catch (error) {
      console.error('Erro ao processar pedido:', error);
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Nome do status a partir dos estágios (fallback para legado)
  const getStatusDisplay = (status: string) => {
    const s = stageById[status];
    if (s?.name) return s.name;
    const legacy: Record<string,string> = {
      pending: 'Criado',
      in_progress: 'Em processamento',
      completed: 'Finalizado',
      cancelled: 'Cancelado',
    };
    return legacy[status] || status;
  };

  // Estilo do status baseado nas cores dos estágios (fallback)
  const getStatusStyle = (status: string): React.CSSProperties => {
    const s = stageById[status];
    if (s) {
      return {
        backgroundColor: s.backgroundColor || '#eef2ff',
        color: s.primaryColor || '#1f2937',
        borderColor: s.stroke || '#e5e7eb',
        borderWidth: 1,
        borderStyle: 'solid',
      };
    }
    return {};
  };

  return (
    <AuthGuard requiredPermission="pedidos.visualizar">
      <div>
        <PageBreadcrumb pageTitle="Pedidos" />

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
          <div className="flex justify-end mb-2">
            <button 
              onClick={handleNewOrder}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[#e9e9e9] dark:text-[#e9decf] shadow-theme-xs bg-[#4158e7] hover:bg-[#2331a3] dark:bg-[#1c255d] dark:hover:bg-[#232d73] transition-colors"
            >
              <span className="text-lg leading-none">+ Novo Pedido</span>
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">ID</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Nome do Paciente</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Data Criação</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Data Estimada de Término</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-red-500">
                      Erro ao carregar pedidos: {error}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {user?.role === 'doctor' || user?.role === 'laboratory' 
                        ? 'Ainda não foi criado pedidos'
                        : 'Nenhum pedido encontrado. Clique em "+ Novo Pedido" para criar o primeiro.'
                      }
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id} className="bg-white even:bg-gray-50 dark:bg-white/[0.01] dark:even:bg-white/[0.03]">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-white/90">#{order.orderNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <Link 
                          href={`/orders/${order._id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {order.patientName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 border"
                          style={getStatusStyle(order.status)}
                        >
                          {getStatusDisplay(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-white/90">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-white/90">
                        {order.estimatedDelivery ? formatDate(order.estimatedDelivery) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                        <button title="Visualizar" aria-label="Visualizar item">
                          <EyeIcon className="w-5 h-5 opacity-90 hover:opacity-100" color={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#60a5fa' : '#3B82F6'} />
                        </button>
                        <button title="Editar" aria-label="Editar item">
                          <PencilIcon className="w-5 h-5 opacity-90 hover:opacity-100" color={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fde68a' : '#F59E0B'} />
                        </button>
                        <button title="Imprimir" aria-label="Imprimir item">
                          <PrintIcon className="w-5 h-5 opacity-90 hover:opacity-100" color={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#6ee7b7' : '#10B981'} />
                        </button>
                        <button title="Excluir" aria-label="Excluir item">
                          <TrashIcon className="w-5 h-5 opacity-90 hover:opacity-100" color={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fca5a5' : '#EF4444'} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal do Odontograma */}
        <OdontogramaModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitOrder}
        />
      </div>
    </AuthGuard>
  );
}
