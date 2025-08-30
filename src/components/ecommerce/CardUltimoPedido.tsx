import React, { useEffect, useMemo, useState } from "react";

interface CardUltimoPedidoProps {
  pedido: {
    id: string; // usado como fallback
    paciente: string;
    status: string;
    dataCriacao: string;
    dataTermino: string;
    displayId?: string; // opcional: exibição amigável (ex: #CAD-ZIR001)
    linkHref?: string;   // opcional: rota de destino (ex: /orders/abc123)
  };
}

import Link from "next/link";

export default function CardUltimoPedido({ pedido }: CardUltimoPedidoProps) {
  // Buscar cores dos stages do Kanban
  interface StageCfg { id: string; name: string; color: string; primaryColor?: string; }
  const [stages, setStages] = useState<StageCfg[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/stages');
        if (res.ok) {
          const data = await res.json();
          if (mounted) setStages(Array.isArray(data) ? data : []);
        }
      } catch {/* silencioso */}
    })();
    return () => { mounted = false; };
  }, []);

  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

  // Possíveis aliases para casar com os nomes do Kanban
  const stageAliases: Record<string, string[]> = {
    'iniciado': ['iniciado', 'criado', 'pending'],
    'em producao': ['em producao', 'em produção', 'in progress', 'in_progress', 'em processamento'],
    'finalizado': ['finalizado', 'completed'],
    'cancelado': ['cancelado', 'canceled']
  };

  // Resolve o stage do pedido (por id, nome normalizado ou aliases)
  const stageMatch = useMemo(() => {
    const key = normalize(String(pedido.status));
    const allAliases = Object.values(stageAliases).flat();
    return stages.find(st => {
      const n = normalize(st.name);
      const idMatch = normalize(String(st.id)) === key;
      const nameMatch = n === key;
      const aliasMatch = allAliases.includes(key) && allAliases.includes(n);
      return idMatch || nameMatch || aliasMatch;
    });
  }, [pedido.status, stages]);

  // Determina a cor base e o nome a exibir
  const stageColor = stageMatch?.primaryColor || stageMatch?.color || undefined;
  const stageName = stageMatch?.name || pedido.status;

  // Estilos de card: usa uma leve "tinta" com a cor do stage, mantendo legibilidade
  const cardStyle: React.CSSProperties | undefined = stageColor
    ? {
        borderColor: stageColor,
        backgroundImage: `linear-gradient(0deg, ${hexWithAlpha(stageColor, 0.05)}, ${hexWithAlpha(stageColor, 0.05)})`
      }
    : undefined;

  const badgeStyle: React.CSSProperties | undefined = stageColor
    ? {
        backgroundColor: hexWithAlpha(stageColor, 0.12),
        color: stageColor,
        borderColor: hexWithAlpha(stageColor, 0.4)
      }
    : undefined;

  function hexWithAlpha(hex: string, alpha: number) {
    // Suporta #rgb, #rrggbb
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const r = parseInt(full.substring(0,2), 16);
    const g = parseInt(full.substring(2,4), 16);
    const b = parseInt(full.substring(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const href = pedido.linkHref || `/admin/orders/${pedido.id}`;
  const shownId = pedido.displayId || pedido.id;

  return (
    <Link
      href={href}
      className={`focus:outline-none transition-shadow rounded-xl border shadow-sm p-4 flex flex-col gap-2 cursor-pointer hover:shadow-lg`}
      style={cardStyle}
      aria-label={`Ver detalhes do pedido ${pedido.id}`}
    >
      <span className="text-xs font-medium text-gray-400">Pedido</span>
      <span className="font-semibold text-lg text-gray-800 dark:text-white">{shownId}</span>
      <span className="text-sm text-gray-500 dark:text-gray-200">Paciente: <span className="font-medium">{pedido.paciente}</span></span>
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold leading-5 w-fit border`}
        style={badgeStyle}
      >
        {stageName}
      </span>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Criado: {pedido.dataCriacao}</span>
        <span>Entrega: {pedido.dataTermino}</span>
      </div>
    </Link>
  );
}
