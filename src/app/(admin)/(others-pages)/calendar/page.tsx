'use client';

import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React, { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";

export default function CalendarPage() {
  const [pedidosEventos, setPedidosEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mapeia pedidos para eventos do calendário
  const statusColors: Record<string, string> = {
    "pending": "#3b82f6",
    "in_progress": "#facc15", 
    "completed": "#22c55e",
    "cancelled": "#ef4444"
  };

  const statusLabels: Record<string, string> = {
    "pending": "Criado",
    "in_progress": "Em processamento",
    "completed": "Finalizado", 
    "cancelled": "Cancelado"
  };

  // Buscar pedidos com prazo de entrega
  const fetchOrdersWithDeadlines = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar pedidos');
      }
      
      const orders = await response.json();
      
      // Verificar se a resposta é um array
      if (!Array.isArray(orders)) {
        throw new Error('Resposta inválida da API');
      }
      
      // Filtrar apenas pedidos com prazo de entrega
      const ordersWithDeadlines = orders.filter((order: any) => order.estimatedDelivery);
      
      // Converter pedidos para eventos do calendário
      const eventos = ordersWithDeadlines.map((order: any) => ({
        id: order._id,
        title: `${order.orderNumber} - ${order.patientName}`,
        start: order.estimatedDelivery.split('T')[0], // Apenas a data
        allDay: true,
        backgroundColor: statusColors[order.status] || "#6b7280",
        borderColor: statusColors[order.status] || "#6b7280",
        extendedProps: { 
          calendar: "Pedidos", 
          status: statusLabels[order.status] || order.status,
          orderNumber: order.orderNumber,
          patientName: order.patientName,
          orderId: order._id,
          assignedTo: order.assignedTo
        },
      }));
      
      setPedidosEventos(eventos);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setPedidosEventos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersWithDeadlines();
  }, []);

  return (
    <AuthGuard requiredPermission="calendar">
      <PageBreadcrumb pageTitle="Calendar" />
      <div className="p-6 sm:p-10 border-t border-gray-100 dark:border-gray-800">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white pt-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <Calendar events={pedidosEventos} />
        </div>
      </div>
    </AuthGuard>
  );
}
