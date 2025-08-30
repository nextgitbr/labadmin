"use client";

import React, { useEffect, useMemo, useState } from "react";
import CardUltimoPedido from "@/components/ecommerce/CardUltimoPedido";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";

interface Order {
  _id: string;
  orderNumber: string;
  patientName: string;
  status: string;
  estimatedDelivery?: string | Date;
  createdAt: string | Date;
  createdBy: string;
}

export default function LatestOrdersSection() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const shouldFilterByUser = useMemo(
    () => (user?.role === "doctor" || user?.role === "laboratory"),
    [user?.role]
  );

  const formatDate = (d: string | Date) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR");
  };

  useEffect(() => {
    const fetchLatest = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const idOrEmail = (user as any)?._id || user.email;
        const base = "/api/orders";
        const params: string[] = ["limit=4", "sort=-createdAt"]; // se suportado pelo backend
        if (shouldFilterByUser && idOrEmail) params.push(`createdBy=${encodeURIComponent(idOrEmail)}`);
        const url = params.length ? `${base}?${params.join("&")}` : base;
        const data = await apiClient.get<Order[]>(url);
        setOrders(Array.isArray(data) ? data.slice(0, 4) : []);
      } catch (e: any) {
        if (e?.status === 401) {
          console.error("Não autorizado ao buscar últimos pedidos (401). Faça login novamente.");
        } else {
          console.error("Erro buscando últimos pedidos:", e);
        }
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && user) fetchLatest();
  }, [authLoading, user, shouldFilterByUser]);

  if (authLoading || loading) {
    return null; // não ocupar espaço enquanto carrega
  }

  // Ocultar toda a seção quando não houver pedidos reais
  if (!orders.length) return null;

  return (
    <div className="col-span-12">
      <h1 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Últimos Pedidos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {orders.map((o) => (
          <CardUltimoPedido
            key={o._id}
            pedido={{
              id: o._id,
              displayId: `#${o.orderNumber}`,
              paciente: o.patientName,
              status: o.status,
              dataCriacao: formatDate(o.createdAt),
              dataTermino: o.estimatedDelivery ? formatDate(o.estimatedDelivery) : "-",
              linkHref: `/admin/orders/${o._id}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
