"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '@/lib/apiClient';

export type NotificationType = 'order_created' | 'order_updated' | 'status_changed' | 'comment_added' | 'order_assigned' | 'system';

interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar notificações do usuário
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!user?._id && !user?.email) return;

    try {
      setLoading(true);
      setError(null);

      const userId = user._id || user.email;
      const params = new URLSearchParams({
        userId,
        ...(unreadOnly && { unreadOnly: 'true' }),
        limit: '20'
      });

      const response = await fetch(`/api/notifications?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar notificações');
      }

      const data: NotificationsResponse = await response.json();
      
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);

    } catch (err) {
      console.error('❌ Erro ao buscar notificações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });

      if (!response.ok) {
        throw new Error('Erro ao marcar notificação como lida');
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (err) {
      console.error('❌ Erro ao marcar como lida:', err);
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!user?._id && !user?.email) return;

    try {
      const userId = user._id || user.email;
      const response = await fetch(`/api/notifications?userId=${userId}&markAllAsRead=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Erro ao marcar todas como lidas');
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);

    } catch (err) {
      console.error('❌ Erro ao marcar todas como lidas:', err);
    }
  }, [user]);

  // Remover notificação
  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      await apiClient.delete(`/api/notifications?id=${notificationId}`);

      // Atualizar estado local como sucesso
      const notificationToRemove = notifications.find(n => n._id === notificationId);

      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      if (notificationToRemove && !notificationToRemove.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

    } catch (err: any) {
      // Se já não existe no servidor (404), tratar como sucesso local
      if (err?.status === 404) {
        const notificationToRemove = notifications.find(n => n._id === notificationId);
        setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
        if (notificationToRemove && !notificationToRemove.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return;
      }
      console.error('❌ Erro ao remover notificação:', err);
    }
  }, [notifications]);

  // Criar nova notificação (para uso interno do sistema)
  const createNotification = useCallback(async (
    targetUserId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: any
  ) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          type,
          title,
          message,
          data
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar notificação');
      }

      const newNotification = await response.json();
      
      // Se a notificação é para o usuário atual, atualizar estado
      if (targetUserId === (user?._id || user?.email)) {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }

      return newNotification;

    } catch (err) {
      console.error('❌ Erro ao criar notificação:', err);
      throw err;
    }
  }, [user]);

  // Buscar notificações ao montar o componente
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Polling para buscar novas notificações (a cada 30 segundos)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Função para formatar tempo relativo
  const getRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    createNotification,
    getRelativeTime
  };
}
