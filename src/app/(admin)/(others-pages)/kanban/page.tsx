'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AuthGuard from '@/components/auth/AuthGuard';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppSettings } from '@/hooks/useAppSettings';
import OrderDetailsModal from '@/components/orders/OrderDetailsModal';
import { apiClient } from '@/lib/apiClient';

interface Order {
  _id: string;
  orderNumber: string;
  patientName: string;
  status: string;
  assignedTo?: string;
  estimatedDelivery?: string;
  createdAt: string;
  workType?: string;
  priority?: 'low' | 'medium' | 'high';
  createdBy?: string; // id ou email de quem criou o pedido
  createdByName?: string; // nome resolvido do criador
}

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  primaryColor?: string;
  backgroundColor?: string;
  stroke?: string;
  cardBgColor?: string;
}

const defaultStages: Stage[] = [
  { id: 'pending', name: 'Criado', color: '#3b82f6', order: 1 },
  { id: 'in_progress', name: 'Em Produção', color: '#f59e0b', order: 2 },
  { id: 'quality_check', name: 'Controle de Qualidade', color: '#8b5cf6', order: 3 },
  { id: 'completed', name: 'Finalizado', color: '#10b981', order: 4 }
];

export default function KanbanPage() {
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const { settings } = useAppSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stages, setStages] = useState<Stage[]>(defaultStages);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Buscar pedidos e etapas
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Order[]>('/api/orders');
      const enriched = await attachCreatorNames(data);
      setOrders(enriched);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Resolve nomes dos criadores a partir de createdBy (id ou email)
  const attachCreatorNames = async (list: Order[]): Promise<Order[]> => {
    // ids (prováveis ObjectId) para buscar na API de usuários
    const ids = Array.from(new Set(
      list
        .map(o => o.createdBy || '')
        .filter(id => id && !id.includes('@'))
    ));

    const idToName = new Map<string, string>();
    if (ids.length) {
      await Promise.all(ids.map(async (id) => {
        try {
          const u = await apiClient.get<any>(`/api/users/${id}`);
            const first = (u.firstName || '').toString().trim();
            const last = (u.lastName || '').toString().trim();
            const full = `${first} ${last}`.trim() || (u.name || '').toString().trim();
            if (full) idToName.set(id, full);
        } catch {}
      }));
    }

    const emailToName = (email: string) => {
      const nick = email.split('@')[0];
      const pretty = nick
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
      return pretty;
    };

    return list.map(o => {
      let name = o.createdByName;
      const cb = o.createdBy || '';
      if (!name && cb) {
        if (cb.includes('@')) name = emailToName(cb);
        else name = idToName.get(cb) || undefined;
      }
      return { ...o, createdByName: name };
    });
  };

  // Utilitário simples para exibir um nome a partir de createdBy (id/email)
  const formatCreator = (createdBy?: string) => {
    if (!createdBy) return 'Desconhecido';
    // Se for email, usa parte antes do @
    if (createdBy.includes('@')) {
      const nick = createdBy.split('@')[0];
      return nick.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    }
    // Caso seja um id, mostra encurtado
    return `Usuário ${createdBy.slice(0, 6)}...`;
  };

  const fetchStages = async () => {
    try {
      const data = await apiClient.get<Stage[]>('/api/stages');
      setStages(data);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStages();
    if (typeof document !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  // Escutar troca ao vivo de tema (class 'dark' no <html> e preferência do SO)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;

    const updateDark = () => setIsDark(html.classList.contains('dark'));

    // Observer para mudanças na classe do <html>
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          updateDark();
        }
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    // matchMedia para mudanças do SO
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const onMqChange = () => updateDark();
    if (mq) {
      try {
        mq.addEventListener?.('change', onMqChange);
      } catch {
        // Safari/antigos
        mq.addListener?.(onMqChange as any);
      }
    }

    return () => {
      observer.disconnect();
      if (mq) {
        try {
          mq.removeEventListener?.('change', onMqChange);
        } catch {
          mq.removeListener?.(onMqChange as any);
        }
      }
    };
  }, []);

  // Utilitários de cor derivados da cor da etapa (configurável na página de configurações)
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const bigint = parseInt(full, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };

  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

  const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;

  const mixWith = (hex: string, otherHex: string, ratio: number) => {
    const A = hexToRgb(hex);
    const B = hexToRgb(otherHex);
    const r = clamp(mix(A.r, B.r, ratio));
    const g = clamp(mix(A.g, B.g, ratio));
    const b = clamp(mix(A.b, B.b, ratio));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const lighten = (hex: string, ratio = 0.88) => mixWith(hex, '#ffffff', ratio);
  const darken = (hex: string, ratio = 0.25) => mixWith(hex, '#000000', ratio);

  const getReadableText = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    // luminância relativa aproximada
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#1f2937' : '#e5e7eb'; // cinza-800 no claro, cinza-200 no escuro
  };

  // Garantir contraste mínimo entre texto e fundo (Web Content Accessibility Guidelines aproximado)
  const relativeLuminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const srgb = [r, g, b].map(v => v / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };

  const contrastRatio = (hex1: string, hex2: string) => {
    const L1 = relativeLuminance(hex1);
    const L2 = relativeLuminance(hex2);
    const light = Math.max(L1, L2);
    const dark = Math.min(L1, L2);
    return (light + 0.05) / (dark + 0.05);
  };

  const ensureContrast = (bgHex: string, preferredTextHex: string, darkTheme: boolean) => {
    // Tenta usar a cor preferida; se contraste < 4.5, usa fallback adequado ao tema
    try {
      const ratio = contrastRatio(bgHex, preferredTextHex);
      if (ratio >= 4.5) return preferredTextHex;
    } catch {}
    // Fallbacks seguros por tema
    const fallback = darkTheme ? '#e5e7eb' /* gray-200 */ : '#111827' /* gray-900 */;
    // Se ainda assim contraste ficar baixo (bg muito claro/escuro), usa getReadableText
    try {
      const ratioFb = contrastRatio(bgHex, fallback);
      if (ratioFb >= 4.5) return fallback;
    } catch {}
    return getReadableText(bgHex);
  };

  // Agrupar pedidos por status, respeitando filtros e perfil do usuário
  const getOrdersByStatus = (status: string) => {
    let list = orders.filter(order => order.status === status);

    // Se o usuário for técnico, mostra apenas pedidos designados a ele
    const role = (user?.role || '').toLowerCase();
    const isTechnician = role === 'technician' || role === 'tecnico';
    const currentId = String((user as any)?._id || (user as any)?.email || '');
    if (isTechnician && currentId) {
      list = list.filter(o => String(o.assignedTo || '') === currentId);
      return list;
    }

    // Para outros perfis, respeitar filtro "Meus Pedidos"
    if (filter === 'assigned' && currentId) {
      list = list.filter(o => String(o.assignedTo || '') === currentId);
    }

    // Filtro "Urgentes" (opcional): prioriza pedidos de alta prioridade
    if (filter === 'urgent') {
      list = list.filter(o => o.priority === 'high');
    }

    return list;
  };

  // Atualizar status do pedido
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/api/orders?id=${encodeURIComponent(orderId)}`, { status: newStatus });
        // Atualizar estado local
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        ));

        // Criar notificação
        const order = orders.find(o => o._id === orderId);
        if (order && order.assignedTo && order.assignedTo !== user?._id) {
          await createNotification(
            order.assignedTo,
            'status_changed',
            'Status do Pedido Atualizado',
            `O pedido ${order.orderNumber} foi movido para "${stages.find(s => s.id === newStatus)?.name}"`,
            { orderId, orderNumber: order.orderNumber, newStatus }
          );
        }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  // Manipular drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId !== destination.droppableId) {
      updateOrderStatus(draggableId, destination.droppableId);
    }
  };

  // Obter cor da prioridade
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Calcular dias restantes
  const getDaysRemaining = (estimatedDelivery?: string) => {
    if (!estimatedDelivery) return null;
    const days = Math.ceil((new Date(estimatedDelivery).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Abrir modal de detalhes do pedido
  const handleOrderClick = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  };

  if (loading) {
    return (
      <AuthGuard requiredPermission="kanban">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredPermission="kanban">
      <PageBreadcrumb pageTitle="Kanban - Pedidos" />
      
      <div className="p-6">
        {/* Header (somente controles, título acima via PageBreadcrumb) */}
        <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6">
          <div className="flex gap-3 mt-0">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todos os Pedidos</option>
              <option value="assigned">Meus Pedidos</option>
              <option value="urgent">Urgentes</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stages.map(stage => {
            const stageOrders = getOrdersByStatus(stage.id);
            return (
              <div key={stage.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stage.name}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stageOrders.length}</p>
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stages.map(stage => {
              const primary = (stage as any).primaryColor || stage.color;
              const tinted = (stage as any).backgroundColor || lighten(primary, 0.9);
              const stroke = (stage as any).stroke || darken(primary, 0.25);
              // Tons claros no tema claro (ainda mais escuros para maior contraste)
              const lightColumn = lighten(primary, 0.86);
              const lightCardBase = (stage as any).cardBgColor || primary;
              const lightCard = lighten(lightCardBase, 0.90);
              const badgeBgLight = lighten(primary, 0.84);
              const badgeTextLight = getReadableText(badgeBgLight);
              const columnBg = isDark ? tinted : lightColumn;
              const columnBorder = isDark ? stroke : '#e5e7eb';
              const cardBg = isDark ? ((stage as any).cardBgColor || lighten(primary, 0.88)) : lightCard;
              const preferredText = settings?.kanbanTextColor || getReadableText(cardBg);
              const textColor = ensureContrast(cardBg, preferredText, isDark);
              return (
              <div
                key={stage.id}
                className={`rounded-xl p-4 border shadow-sm`}
                style={{
                  backgroundColor: columnBg,
                  borderColor: columnBorder,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className={`font-semibold flex items-center gap-2`}
                    style={{ color: primary }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: primary }}
                    ></div>
                    {stage.name}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border`}
                    style={{
                      backgroundColor: isDark ? ((stage as any).backgroundColor || lighten(primary, 0.85)) : badgeBgLight,
                      borderColor: isDark ? stroke : '#e5e7eb',
                      color: isDark ? primary : badgeTextLight,
                    }}
                  >
                    {getOrdersByStatus(stage.id).length}
                  </span>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] space-y-3 rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? 'opacity-95' : ''}`}
                      style={{
                        backgroundColor: snapshot.isDraggingOver ? (isDark ? lighten(primary, 0.82) : lighten(primary, 0.82)) : columnBg,
                      }}
                    >
                      {getOrdersByStatus(stage.id).map((order, index) => (
                        <Draggable key={order._id} draggableId={order._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                                snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                              }`}
                              style={{
                                ...(provided.draggableProps.style as any),
                                borderColor: isDark ? stroke : '#e5e7eb',
                                backgroundColor: cardBg,
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 
                                  className="font-medium text-sm cursor-pointer transition-colors"
                                  onClick={(e) => handleOrderClick(order._id, e)}
                                  style={{ color: textColor }}
                                >
                                  #{order.orderNumber}
                                </h4>
                                {order.priority && (
                                  <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(order.priority)}`}>
                                    {order.priority}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm mb-2" style={{ color: textColor }}>
                                {order.patientName}
                              </p>

                              {/* Criador do pedido: exibir apenas se houver nome resolvido ou email */}
                              {(() => {
                                const display = order.createdByName || (order.createdBy && order.createdBy.includes('@') ? formatCreator(order.createdBy) : '');
                                return display ? (
                                  <p className="text-xs mb-2" style={{ color: textColor }}>
                                    {display}
                                  </p>
                                ) : null;
                              })()}
                              
                              {order.workType && (
                                <p className="text-xs mb-2" style={{ color: textColor }}>
                                  {order.workType}
                                </p>
                              )}
                              
                              <div className="flex justify-between items-center text-xs">
                                <span style={{ color: textColor }}>
                                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                                {order.estimatedDelivery && (
                                  <span className={`${
                                    getDaysRemaining(order.estimatedDelivery)! < 0 
                                      ? 'text-red-600' 
                                      : getDaysRemaining(order.estimatedDelivery)! <= 2 
                                        ? 'text-yellow-600' 
                                        : 'text-green-600'
                                  }`}>
                                    {getDaysRemaining(order.estimatedDelivery)! < 0 
                                      ? `${Math.abs(getDaysRemaining(order.estimatedDelivery)!)}d atraso`
                                      : `${getDaysRemaining(order.estimatedDelivery)}d restantes`
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
              );
            })}
          </div>
        </DragDropContext>

        {/* Modal de Detalhes do Pedido */}
        {selectedOrderId && (
          <OrderDetailsModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            orderId={selectedOrderId}
          />
        )}
      </div>
    </AuthGuard>
  );
}
