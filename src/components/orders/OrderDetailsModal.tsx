'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  caseObservations?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string;
  uploadedFiles?: any[];
  comments?: any[];
  createdBy?: string;
  estimatedDelivery?: string;
}

interface Comment {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  createdAt: Date;
  isInternal?: boolean;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

function OrderDetailsModal({ isOpen, onClose, orderId }: OrderDetailsModalProps) {
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newStatus, setNewStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder();
      fetchTechnicians();
    }
  }, [isOpen, orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiClient.get(`/api/orders?id=${orderId}`);
      setOrder(data);
      setNewStatus(data.status);
      setAssignedTo(data.assignedTo || '');
    } catch (err) {
      console.error('Erro ao carregar pedido:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar técnicos
  const fetchTechnicians = async () => {
    try {
      const data = await apiClient.get<any[]>('/api/users?role=tecnico');
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar técnicos:', err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setCommentFiles(prev => [...prev, ...files]);
  };

  const removeCommentFile = (index: number) => {
    setCommentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Atualizar status
  const handleStatusUpdate = async () => {
    if (!order || newStatus === order.status) return;

    try {
      setUpdatingStatus(true);
      await apiClient.patch(`/api/orders?id=${orderId}`, { status: newStatus });

      const currentUserId = user?._id || user?.email || '';
      if (order.createdBy && order.createdBy !== currentUserId) {
        await createNotification(
          order.createdBy,
          'status_changed',
          'Status do Pedido Alterado',
          `O status do pedido ${order.orderNumber} foi alterado para ${getStatusDisplay(newStatus)}`,
          { orderId, orderNumber: order.orderNumber, newStatus }
        );
      }

      if (user?.role !== 'admin') {
        try {
          const admins = await apiClient.get<any[]>('/api/users?role=admin');
          if (Array.isArray(admins)) {
            const notificationPromises = admins.map((admin: any) => 
              createNotification(
                admin._id || admin.email,
                'status_changed',
                'Status do Pedido Alterado',
                `${user?.name || user?.email} alterou o status do pedido ${order.orderNumber} para ${getStatusDisplay(newStatus)}`,
                { orderId, orderNumber: order.orderNumber, newStatus }
              )
            );
            await Promise.all(notificationPromises);
          }
        } catch (notificationError) {
          console.error('Erro ao criar notificações para admins:', notificationError);
        }
      }

      fetchOrder();
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

      if (assignedTo) {
        const assignedTechnician = technicians.find(tech => tech._id === assignedTo || tech.email === assignedTo);
        await createNotification(
          assignedTo,
          'order_assigned',
          'Pedido Designado',
          `O pedido ${order.orderNumber} foi designado para você`,
          { orderId, orderNumber: order.orderNumber }
        );

        if (order.createdBy && order.createdBy !== (user?._id || user?.email)) {
          await createNotification(
            order.createdBy,
            'order_assigned',
            'Técnico Designado ao Pedido',
            `O técnico ${assignedTechnician?.name || assignedTo} foi designado ao pedido ${order.orderNumber}`,
            { orderId, orderNumber: order.orderNumber, assignedTo }
          );
        }
      }

      fetchOrder();
    } catch (err) {
      console.error('Erro ao atualizar designação:', err);
      alert('Erro ao atualizar designação');
    } finally {
      setUpdatingAssignment(false);
    }
  };

  // Adicionar comentário (com upload prévio ao Supabase)
  const handleAddComment = async () => {
    if (!newComment.trim() && commentFiles.length === 0) return;

    try {
      setSubmittingComment(true);

      // 1) Enviar arquivos para /api/upload e coletar metadados
      let uploadedMeta: any[] = [];
      if (commentFiles.length > 0) {
        uploadedMeta = await Promise.all(
          commentFiles.map(async (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('orderId', String(order?.orderNumber || orderId));
            fd.append('userId', String(user?._id || user?.email || 'unknown_user'));
            const res = await apiClient.post('/api/upload', undefined, { body: fd });
            return res;
          })
        );
      }

      // 2) Enviar comentário com campo 'uploaded' contendo os metadados das URLs
      const formData = new FormData();
      formData.append('message', newComment);
      formData.append('userName', user?.name || 'Usuário');
      formData.append('userRole', user?.role || 'user');
      if (uploadedMeta.length > 0) {
        formData.append('uploaded', JSON.stringify(uploadedMeta));
      }

      await apiClient.post(`/api/orders/${orderId}/comments`, undefined, { body: formData });

      // Recarregar o pedido para mostrar o novo comentário
      await fetchOrder();
      setNewComment('');
      setCommentFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      createNotification(user?._id || user?.email || '', 'system', 'Sucesso', 'Comentário adicionado com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      createNotification(user?._id || user?.email || '', 'system', 'Erro', 'Erro ao adicionar comentário');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Criado',
      'in_progress': 'Em processamento',
      'completed': 'Finalizado',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status: string) => {
    const displayStatus = getStatusDisplay(status);
    
    switch (displayStatus) {
      case 'Criado':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Em processamento':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
      case 'Finalizado':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
      case 'Cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  // Helpers para metadados de arquivos (aceita variações de chaves)
  const getFileUrl = (f: any): string | null => {
    if (!f) return null;
    return (
      f.url ||
      f.publicUrl ||
      f.public_url ||
      f.href ||
      f.link ||
      null
    );
  };

  const getFileName = (f: any, fallback: string): string => {
    if (!f) return fallback;
    const extractBase = (s: string): string => {
      if (!s) return '';
      try {
        const u = new URL(s);
        s = u.pathname;
      } catch {}
      s = s.split('?')[0].split('#')[0];
      const parts = s.split('/');
      return parts[parts.length - 1] || '';
    };

    // 1) Do caminho salvo do storage, se houver
    const pathLike = (f as any).path || (f as any).filePath || (f as any).filepath;
    const fromPath = extractBase(String(pathLike || ''));
    if (fromPath) return fromPath;

    // 2) Da URL pública
    const href = getFileUrl(f);
    const fromUrl = extractBase(String(href || ''));
    if (fromUrl) return fromUrl;

    // 3) Fallback dos campos de nome
    return (
      f.name ||
      f.filename ||
      f.fileName ||
      fallback
    );
  };

  const getFileSizeKB = (f: any): string => {
    if (!f) return '';
    const size = f.size || f.file_size || f.bytes;
    return size ? `${Math.round(Number(size) / 1024)} KB` : '';
  };

  // Helpers para tipo e URL de download
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


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {loading ? 'Carregando...' : order ? `Pedido #${order.orderNumber}` : 'Erro'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {order && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna principal - Conversação */}
              <div className="lg:col-span-2 space-y-6">
                {/* Header com informações principais */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        Pedido #{order.orderNumber}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Paciente: <span className="font-medium">{order.patientName}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(order.status)}`}>
                        {getStatusDisplay(order.status)}
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Criado em {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes do pedido */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                        {(Object.keys(order.toothConstructions || {})).sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>

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

                            {/* Anexos do comentário */}
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {comment.attachments.map((file: any, fileIndex: number) => {
                                  const href = getFileUrl(file);
                                  const name = getFileName(file, `Arquivo ${fileIndex + 1}`);
                                  const sizeKB = getFileSizeKB(file);
                                  const forceDownload = isImage(file);
                                  const finalHref = href ? (forceDownload ? buildDownloadUrl(href, name) : href) : null;
                                  return finalHref ? (
                                    <a
                                      key={fileIndex}
                                      href={finalHref}
                                      {...(forceDownload ? { download: name } : { target: '_blank', rel: 'noopener noreferrer' })}
                                      className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
                                    >
                                      <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{sizeKB}</p>
                                      </div>
                                    </a>
                                  ) : (
                                    <div key={fileIndex} className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                      <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{sizeKB}</p>
                                      </div>
                                    </div>
                                  );
                                })}
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
                    {commentFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Arquivos selecionados:
                        </h4>
                        <div className="space-y-2">
                          {commentFiles.map((file: File, index: number) => (
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
                                onClick={() => removeCommentFile(index)}
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
                        disabled={!(newComment.trim() || commentFiles.length > 0) || submittingComment}
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
                {(user?.role === 'admin' || user?.role === 'administrador' || user?.role === 'gerente') && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Status do Pedido</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status Atual</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="pending">Criado</option>
                          <option value="in_progress">Em processamento</option>
                          <option value="completed">Finalizado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </div>
                      <button
                        onClick={handleStatusUpdate}
                        disabled={updatingStatus || (order ? newStatus === order.status : true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        {updatingStatus ? 'Atualizando...' : 'Atualizar Status'}
                      </button>
                    </div>
                  </div>
                )}
                {/* Designação de Técnico - Apenas para Admin e Gerentes */}
                {(user?.role === 'admin' || user?.role === 'administrador' || user?.role === 'gerente') && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Designação de Técnico</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Técnico Responsável</label>
                        <select
                          value={assignedTo}
                          onChange={(e) => setAssignedTo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Selecionar técnico...</option>
                          {technicians.map((tech) => (
                            <option key={tech._id} value={tech._id}>{tech.name || tech.email}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAssignmentUpdate}
                        disabled={updatingAssignment || (order ? assignedTo === (order.assignedTo || '') : true)}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        {updatingAssignment ? 'Atualizando...' : 'Designar Técnico'}
                      </button>
                      {order?.assignedTo && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Atual: </span>
                          {technicians.find(t => t._id === order.assignedTo)?.name || order.assignedTo}
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
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{order.updatedAt ? formatDate(order.updatedAt) : 'Não disponível'}</dd>
                    </div>
                    {order.estimatedDelivery && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Entrega estimada</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">{order.estimatedDelivery ? formatDate(order.estimatedDelivery) : 'Não definida'}</dd>
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
                          const constructionsByType: { [key: string]: string[] } = {};
                          Object.entries(order.toothConstructions).forEach(([tooth, construction]) => {
                            if (!constructionsByType[construction]) {
                              constructionsByType[construction] = [];
                            }
                            constructionsByType[construction].push(tooth);
                          });

                          return Object.entries(constructionsByType).map(([construction, teeth]) => (
                            <div key={construction} className="text-sm">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {construction}:
                              </span>
                              <span className="ml-2 text-gray-600 dark:text-gray-400">
                                {(teeth as string[]).sort((a: string, b: string) => parseInt(a) - parseInt(b)).join(', ')}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Arquivos do Caso */}
                  {(() => {
                    const initialFiles = order.uploadedFiles || [];
                    const commentAttachedFiles = order.comments?.reduce((acc: any[], c: any) => {
                      if (c.attachments && c.attachments.length) {
                        acc.push(
                          ...c.attachments.map((f: any) => ({
                            ...f,
                            commentAuthor: c.userName,
                            commentDate: c.createdAt,
                          }))
                        );
                      }
                      return acc;
                    }, []) || [];

                    if (initialFiles.length === 0 && commentAttachedFiles.length === 0) return null;

                    return (
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Arquivos do Caso</h4>
                        <div className="space-y-3">
                          {initialFiles.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Pedido Inicial</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {initialFiles.map((file: any, idx: number) => {
                                  const href = getFileUrl(file);
                                  const name = getFileName(file, `Arquivo ${idx + 1}`);
                                  const sizeKB = getFileSizeKB(file);
                                  const forceDownload = isImage(file);
                                  const finalHref = href ? (forceDownload ? buildDownloadUrl(href, name) : href) : null;
                                  return finalHref ? (
                                    <a
                                      key={`order-file-${idx}`}
                                      href={finalHref}
                                      {...(forceDownload ? { download: name } : { target: '_blank', rel: 'noopener noreferrer' })}
                                      className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    >
                                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{sizeKB}</p>
                                      </div>
                                    </a>
                                  ) : (
                                    <div key={`order-file-${idx}`} className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{sizeKB}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {commentAttachedFiles.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Conversação</h5>
                              <div className="space-y-1">
                                {commentAttachedFiles.map((file: any, idx: number) => {
                                  const href = getFileUrl(file);
                                  const name = getFileName(file, `Arquivo ${idx + 1}`);
                                  const sizeKB = getFileSizeKB(file);
                                  const forceDownload = isImage(file);
                                  const finalHref = href ? (forceDownload ? buildDownloadUrl(href, name) : href) : null;
                                  return finalHref ? (
                                    <a
                                      key={`comment-file-${idx}`}
                                      href={finalHref}
                                      {...(forceDownload ? { download: name } : { target: '_blank', rel: 'noopener noreferrer' })}
                                      className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
                                    >
                                      <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{sizeKB} • {file.commentAuthor}</p>
                                      </div>
                                    </a>
                                  ) : (
                                    <div key={`comment-file-${idx}`} className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                      <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{sizeKB} • {file.commentAuthor}</p>
                                      </div>
                                    </div>
                                  );
                                })}
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Fechar
          </button>
          {order && (
            <a
              href={`/orders/${order._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver Detalhes Completos
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
