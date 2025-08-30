'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import OdontogramViewer from '@/components/form/odontogram/OdontogramViewer';
import { apiClient } from '@/lib/apiClient';

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
  createdByName?: string;
  createdByCompany?: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  comments?: Comment[];
}

interface Stage {
  id: string;
  name: string;
  color?: string; // legacy
  primaryColor?: string;
  backgroundColor?: string;
  stroke?: string;
}

interface Comment {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  createdAt: Date;
  isInternal?: boolean;
  attachments?: { name: string; size: number; type: string; url?: string }[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stageById, setStageById] = useState<Record<string, Stage>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orderId = params.id as string;

  // Carregar dados do pedido
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/orders?id=${orderId}`);
      setOrder(data);
      setNewStatus(data.status);
      setAssignedTo(data.assignedTo || '');
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar pedido:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar estágios do Kanban para nomes e cores dinâmicos
  const fetchStages = async () => {
    try {
      const list: Stage[] = await apiClient.get('/api/stages');
      // Deduplicar por id para evitar chaves repetidas (ex.: 'pending')
      const seen = new Set<string>();
      const unique: Stage[] = [];
      for (const s of list) {
        const id = String(s.id);
        if (!seen.has(id)) {
          seen.add(id);
          unique.push(s);
        }
      }
      setStages(unique);
      const map: Record<string, Stage> = {};
      unique.forEach((s) => { map[s.id] = s; });
      setStageById(map);
    } catch (e) {
      console.error('Erro ao carregar estágios:', e);
    }
  };

  // Carregar técnicos (suporta roles 'technician' e 'tecnico')
  const fetchTechnicians = async () => {
    try {
      const settled = await Promise.allSettled([
        apiClient.get<any[]>('/api/users?role=technician'),
        apiClient.get<any[]>('/api/users?role=tecnico'),
      ]);

      const lists: any[][] = [];
      for (const res of settled) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          lists.push(res.value);
        }
      }

      // Fallback: buscar todos e filtrar por role se nada retornou
      let merged: any[] = lists.flat();
      if (merged.length === 0) {
        try {
          const all = await apiClient.get<any[]>('/api/users');
          merged = Array.isArray(all) ? all : [];
        } catch {}
      }

      // Filtrar por roles de técnico e remover duplicatas por _id ou email
      const roleSet = new Set(['technician', 'tecnico']);
      const byKey = new Map<string, any>();
      merged
        .filter((u: any) => roleSet.has((u.role || '').toLowerCase()))
        .forEach((u: any) => {
          const key = String(u._id || u.email || u.name || Math.random());
          if (!byKey.has(key)) byKey.set(key, u);
        });

      setTechnicians(Array.from(byKey.values()));
    } catch (err) {
      console.error('Erro ao carregar técnicos:', err);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      fetchTechnicians();
      fetchStages();
    }
  }, [orderId]);

  // Funções para gerenciar arquivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Adicionar comentário
  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !order) return;

    try {
      setSubmittingComment(true);
      
      const formData = new FormData();
      formData.append('message', newComment);
      formData.append('userName', user.name || user.email);
      formData.append('userRole', user.role);
      
      // Adicionar arquivos ao FormData
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const data = await apiClient.post(`/api/orders/${orderId}/comments`, undefined, { body: formData });
      if (data && data._id && data.orderNumber) {
        // Parece o objeto de pedido completo
        setOrder(data);
      } else if (data && data.success && data.comment) {
        // Apenas o comentário foi retornado; anexar localmente
        setOrder((prev) => {
          if (!prev) return prev;
          const comments = Array.isArray(prev.comments) ? prev.comments : [];
          return { ...prev, comments: [...comments, data.comment] } as Order;
        });
      }
      setNewComment('');
      setSelectedFiles([]);
      
      // Limpar input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notificação de sucesso removida para evitar erro de tipo

      // Criar notificações para outros usuários
      if (user.role !== 'admin') {
        // Notificar todos os admins
        try {
          const admins = await apiClient.get<any[]>('/api/users?role=admin');
          if (Array.isArray(admins)) {
            const notificationPromises = admins.map((admin: any) => 
              createNotification(
                admin._id || admin.email,
                'comment_added',
                'Novo Comentário no Pedido',
                `${user.name || user.email} adicionou um comentário no pedido ${order.orderNumber}`,
                { orderId, orderNumber: order.orderNumber }
              )
            );
            await Promise.all(notificationPromises);
          }
        } catch (notificationError) {
          console.error('Erro ao criar notificações para admins:', notificationError);
        }
      } else {
        // Se admin comentou, notificar o criador do pedido
        if (order.createdBy !== (user._id || user.email)) {
          await createNotification(
            order.createdBy,
            'comment_added',
            'Novo Comentário no Pedido',
            `${user.name || user.email} adicionou um comentário no pedido ${order.orderNumber}`,
            { orderId, orderNumber: order.orderNumber }
          );
        }
      }
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Atualizar status
  const handleStatusUpdate = async () => {
    if (!order || newStatus === order.status) return;

    try {
      setUpdatingStatus(true);
      
      await apiClient.patch(`/api/orders?id=${orderId}`, { status: newStatus });

      // Criar notificações sobre mudança de status
      const currentUserId = user._id || user.email;
      
      // Notificar o criador do pedido (se não for o próprio usuário)
      if (order.createdBy !== currentUserId) {
        await createNotification(
          order.createdBy,
          'status_changed',
          'Status do Pedido Alterado',
          `O status do pedido ${order.orderNumber} foi alterado para ${getStatusDisplay(newStatus)}`,
          { orderId, orderNumber: order.orderNumber, newStatus }
        );
      }
      
      // Se não for admin, notificar todos os admins também
      if (user.role !== 'admin') {
        try {
          const admins = await apiClient.get<any[]>('/api/users?role=admin');
          if (Array.isArray(admins)) {
            const notificationPromises = admins.map((admin: any) => 
              createNotification(
                admin._id || admin.email,
                'status_changed',
                'Status do Pedido Alterado',
                `${user.name || user.email} alterou o status do pedido ${order.orderNumber} para ${getStatusDisplay(newStatus)}`,
                { orderId, orderNumber: order.orderNumber, newStatus }
              )
            );
            await Promise.all(notificationPromises);
          }
        } catch (notificationError) {
          console.error('Erro ao criar notificações para admins:', notificationError);
        }
      }

      fetchOrder(); // Recarregar dados
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Atualizar designação de técnico
  const handleAssignmentUpdate = async () => {
    if (!order || assignedTo === (order.assignedTo || '')) return;

    try {
      setUpdatingAssignment(true);
      
      await apiClient.patch(`/api/orders?id=${orderId}`, { assignedTo });

      // Criar notificação para o técnico designado
      if (assignedTo) {
        const assignedTechnician = technicians.find(tech => tech._id === assignedTo || tech.email === assignedTo);
        await createNotification(
          assignedTo,
          'order_assigned',
          'Pedido Designado',
          `O pedido ${order.orderNumber} foi designado para você`,
          { orderId, orderNumber: order.orderNumber }
        );

        // Notificar o criador do pedido
        if (order.createdBy !== (user._id || user.email)) {
          await createNotification(
            order.createdBy,
            'order_assigned',
            'Técnico Designado ao Pedido',
            `O técnico ${assignedTechnician?.name || assignedTo} foi designado ao pedido ${order.orderNumber}`,
            { orderId, orderNumber: order.orderNumber, assignedTo }
          );
        }
      }

      fetchOrder(); // Recarregar dados
    } catch (err) {
      console.error('Erro ao atualizar designação:', err);
      alert('Erro ao atualizar designação');
    } finally {
      setUpdatingAssignment(false);
    }
  };

  // Nome do status com base nos estágios do banco (fallback para mapa legado)
  const getStatusDisplay = (status: string) => {
    const stage = stageById[status];
    if (stage?.name) return stage.name;
    const legacy: Record<string,string> = {
      pending: 'Criado',
      in_progress: 'Em processamento',
      completed: 'Finalizado',
      cancelled: 'Cancelado',
    };
    return legacy[status] || status;
  };

  // Estilos de status baseados nas cores do estágio (fallback para classes antigas)
  const getStatusStyle = (status: string): React.CSSProperties => {
    const stage = stageById[status];
    if (stage) {
      const bg = stage.backgroundColor || '#e5e7eb';
      const text = stage.primaryColor || '#1f2937';
      const border = stage.stroke || '#d1d5db';
      return { backgroundColor: bg, color: text, borderColor: border, borderWidth: 1, borderStyle: 'solid' };
    }
    return {};
  };

  // Formatar data
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  // Helpers para metadados e download
  const getFileUrl = (f: any): string | null => {
    if (!f) return null;
    return f.url || f.publicUrl || f.public_url || f.href || f.link || null;
  };

  const getFileName = (f: any, fallback: string): string => {
    if (!f) return fallback;
    const extractBase = (s: string): string => {
      if (!s) return '';
      try {
        const u = new URL(s);
        s = u.pathname; // usa caminho da URL, ignora domínio e query
      } catch {}
      // remove query/fragment se ainda houver
      s = s.split('?')[0].split('#')[0];
      const parts = s.split('/');
      return parts[parts.length - 1] || '';
    };

    // 1) Tenta pelo caminho do storage
    const pathLike = f.path || f.filePath || f.filepath;
    const fromPath = extractBase(String(pathLike || ''));
    if (fromPath) return fromPath;

    // 2) Tenta pelo href/url público
    const url = getFileUrl(f);
    const fromUrl = extractBase(String(url || ''));
    if (fromUrl) return fromUrl;

    // 3) Fallback para campos de nome
    return f.name || f.filename || f.fileName || fallback;
  };

  const getFileSizeKB = (f: any): string => {
    if (!f) return '';
    const size = f.size || f.file_size || f.bytes;
    return size ? `${Math.round(Number(size) / 1024)} KB` : '';
  };

  const isImage = (f: any): boolean => {
    const t = (f?.type || f?.mimeType || '').toLowerCase();
    if (t && t.startsWith('image/')) return true;
    const n = (getFileName(f, '') || '').toLowerCase();
    return /(\.png|\.jpg|\.jpeg|\.gif|\.bmp|\.webp|\.svg|\.tiff|\.tif|\.heic|\.heif)$/.test(n);
  };

  const buildDownloadUrl = (url: string, filename: string): string => {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}download=${encodeURIComponent(filename || 'file')}`;
  };

  if (loading) {
    return (
      <AuthGuard requiredPermission="pedidos.visualizar">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando pedido...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !order) {
    return (
      <AuthGuard requiredPermission="pedidos.visualizar">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Pedido não encontrado
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'O pedido solicitado não existe ou você não tem permissão para visualizá-lo.'}
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voltar
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredPermission="pedidos.visualizar">
      <div>
        <PageBreadcrumb 
          pageTitle={`Pedido ${order.orderNumber}`} 
        />

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
          {/* Header com informações principais */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  Pedido #{order.orderNumber}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Paciente: <span className="font-medium">{order.patientName}</span>
                </p>
                {/* Criado por e Empresa */}
                {(order.createdByName || (typeof order.createdBy === 'string' && order.createdBy.includes('@'))) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span className="font-medium">Criado por:</span> {order.createdByName || (order.createdBy.split('@')[0].replace(/\./g,' ').replace(/_/g,' ').replace(/\b\w/g, (m) => m.toUpperCase()))}
                  </p>
                )}
                {order.createdByCompany && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Empresa:</span> {order.createdByCompany}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span
                  className="inline-flex px-3 py-1 rounded-full text-sm font-medium border"
                  style={getStatusStyle(order.status)}
                >
                  {getStatusDisplay(order.status)}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Criado em {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            {/* Detalhes do pedido */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de Trabalho</h3>
                <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{order.workType}</p>
              </div>
              {order.selectedMaterial && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Material</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{order.selectedMaterial}</p>
                </div>
              )}
              {order.selectedVitaShade && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cor Vita</h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{order.selectedVitaShade}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dentes</h3>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {Object.keys(order.toothConstructions).length} selecionados
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna principal - Conversação */}
            <div className="lg:col-span-2 space-y-6">
              {/* Construções dentais com odontograma visual */}
              <OdontogramViewer 
                toothConstructions={order.toothConstructions}
                title="Construções Dentais"
              />

              {/* Observações */}
              {order.caseObservations && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Observações do Caso
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {order.caseObservations}
                  </p>
                </div>
              )}


              {/* Comentários */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Conversação
                </h2>
                
                {/* Lista de comentários */}
                <div className="space-y-4 mb-6">
                  {order.comments && order.comments.length > 0 ? (
                    order.comments.map((comment, index) => (
                      <div key={index} className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {comment.userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {comment.userName}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {comment.userRole}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {comment.message}
                          </div>
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {comment.attachments.map((att, i) => (
                                att.url ? (
                                  <a
                                    key={i}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 text-xs text-gray-700 dark:text-gray-200"
                                  >
                                    <svg className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{att.name}</p>
                                      <p className="text-[11px] opacity-70">{Math.round(att.size / 1024)} KB • {att.type || 'arquivo'}</p>
                                    </div>
                                  </a>
                                ) : (
                                  <div key={i} className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 text-xs text-gray-700 dark:text-gray-200">
                                    <svg className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{att.name}</p>
                                      <p className="text-[11px] opacity-70">{Math.round(att.size / 1024)} KB • {att.type || 'arquivo'}</p>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhum comentário ainda
                    </p>
                  )}
                </div>

                {/* Adicionar comentário */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicione um comentário..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  />
                  
                  {/* Upload de arquivos */}
                  <div className="mt-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      accept="image/*,video/*,.stl,.obj,.ply"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Anexar Arquivos
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Suporte para imagens, vídeos, STL, OBJ e PLY
                    </p>
                  </div>

                  {/* Preview dos arquivos selecionados */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Arquivos selecionados:
                      </h4>
                      <div className="space-y-2">
                        {selectedFiles.map((file: File, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm text-gray-900 dark:text-white truncate">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                ({Math.round(file.size / 1024)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingComment ? 'Enviando...' : 'Responder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Detalhes */}
            <div className="space-y-6">
              {/* Status do Pedido - Apenas para Admin e Gerentes */}
              {(user && ['admin','administrador','administrator','gerente','manager'].includes(user.role)) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Status do Pedido
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status Atual
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {stages && stages.length > 0 ? (
                          stages.map((s, idx) => (
                            <option key={`${s.id}-${idx}`} value={s.id}>
                              {s.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="pending">Criado</option>
                            <option value="in_progress">Em processamento</option>
                            <option value="completed">Finalizado</option>
                            <option value="cancelled">Cancelado</option>
                          </>
                        )}
                      </select>
                    </div>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={updatingStatus || newStatus === order.status}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {updatingStatus ? 'Atualizando...' : 'Atualizar Status'}
                    </button>
                  </div>
                </div>
              )}

              {/* Designação de Técnico - Apenas para Admin e Gerentes */}
              {(user && ['admin','administrador','administrator','gerente','manager'].includes(user.role)) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Designação de Técnico
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Técnico Responsável
                      </label>
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecionar técnico...</option>
                        {technicians.map((tech, idx) => {
                          const value = String(tech._id || tech.email || tech.name || idx);
                          const label = String(tech.name || tech.firstName || tech.email || 'Técnico');
                          const key = `${value}-${idx}`;
                          return (
                            <option key={key} value={value}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button
                      onClick={handleAssignmentUpdate}
                      disabled={updatingAssignment || assignedTo === (order.assignedTo || '')}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {updatingAssignment ? 'Atualizando...' : 'Designar Técnico'}
                    </button>
                    {order.assignedTo && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Atual: </span>
                        {(() => {
                          const current = technicians.find(t => String(t._id || t.email) === String(order.assignedTo));
                          return current?.name || current?.firstName || order.assignedTo;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prazo de Entrega */}
              {order.estimatedDelivery && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Prazo de Entrega
                  </h3>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {new Date(order.estimatedDelivery).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {(() => {
                        const days = Math.ceil((new Date(order.estimatedDelivery).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (days < 0) return `${Math.abs(days)} dias em atraso`;
                        if (days === 0) return 'Vence hoje';
                        return `${days} dias restantes`;
                      })()}
                    </div>
                  </div>
                </div>
              )}
              {/* Detalhes do pedido */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Detalhes do Pedido
                </h3>
                <div className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">ID do Pedido</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">#{order.orderNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Paciente</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{order.patientName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Criado em</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(order.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Última atualização</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(order.updatedAt)}</dd>
                  </div>
                  {order.estimatedDelivery && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Entrega estimada</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(order.estimatedDelivery)}</dd>
                    </div>
                  )}
                </div>
                
                {/* Construções por tipo */}
                {Object.keys(order.toothConstructions).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      Construções por Tipo
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const groupedConstructions: { [key: string]: string[] } = {};
                        Object.entries(order.toothConstructions).forEach(([tooth, type]) => {
                          if (!groupedConstructions[type]) {
                            groupedConstructions[type] = [];
                          }
                          groupedConstructions[type].push(tooth);
                        });

                        return Object.entries(groupedConstructions).map(([type, teeth]) => (
                          <div key={type} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{type}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {teeth.join(', ')}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Arquivos do Caso */}
                {(() => {
                  // Coletar todos os arquivos: do pedido inicial + dos comentários
                  const orderFiles = order.uploadedFiles || [];
                  const commentFiles = order.comments?.reduce((acc: any[], comment: any) => {
                    if (comment.attachments && comment.attachments.length > 0) {
                      const filesWithSource = comment.attachments.map((file: any) => ({
                        ...file,
                        source: 'comment',
                        commentAuthor: comment.userName,
                        commentDate: comment.createdAt
                      }));
                      return [...acc, ...filesWithSource];
                    }
                    return acc;
                  }, []) || [];
                  
                  const allFiles = [
                    ...orderFiles.map((file: any) => ({ ...file, source: 'order' })),
                    ...commentFiles
                  ];

                  if (allFiles.length === 0) return null;

                  return (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        Arquivos do Caso
                      </h4>
                      <div className="space-y-3">
                        {/* Arquivos do pedido inicial */}
                        {orderFiles.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Pedido Inicial
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {orderFiles.map((file: any, index: number) => (
                                (() => {
                                  const name = getFileName(file, `Arquivo ${index + 1}`);
                                  const url = getFileUrl(file);
                                  const forceDownload = isImage(file);
                                  const finalHref = url ? (forceDownload ? buildDownloadUrl(url, name) : url) : null;
                                  const CardInner = (
                                    <>
                                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{getFileSizeKB(file)}</p>
                                      </div>
                                    </>
                                  );
                                  return finalHref ? (
                                    <a
                                      key={`order-${index}`}
                                      href={finalHref}
                                      {...(forceDownload ? { download: name } : { target: '_blank', rel: 'noopener noreferrer' })}
                                      className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    >
                                      {CardInner}
                                    </a>
                                  ) : (
                                    <div key={`order-${index}`} className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                      {CardInner}
                                    </div>
                                  );
                                })()
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Arquivos dos comentários */}
                        {commentFiles.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Conversação
                            </h5>
                            <div className="space-y-1">
                              {commentFiles.map((file: any, index: number) => (
                                (() => {
                                  const name = getFileName(file, `Arquivo ${index + 1}`);
                                  const url = getFileUrl(file);
                                  const forceDownload = isImage(file);
                                  const finalHref = url ? (forceDownload ? buildDownloadUrl(url, name) : url) : null;
                                  const CardInner = (
                                    <>
                                      <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{getFileSizeKB(file)} • {file.commentAuthor}</p>
                                      </div>
                                    </>
                                  );
                                  return finalHref ? (
                                    <a
                                      key={`comment-${index}`}
                                      href={finalHref}
                                      {...(forceDownload ? { download: name } : { target: '_blank', rel: 'noopener noreferrer' })}
                                      className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
                                    >
                                      {CardInner}
                                    </a>
                                  ) : (
                                    <div key={`comment-${index}`} className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                      {CardInner}
                                    </div>
                                  );
                                })()
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
