"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { permissionsList } from "@/permissions/permissionsList";
import { useErrorAlert } from "@/context/ErrorAlertContext";
import apiClient from "@/lib/apiClient";

// Agora cada coluna representa exatamente um stageId vindo de /api/production/stages
type ColumnId = string; // stageId

interface TaskItem {
  id: string;
  title: string;
  orderNumber?: string;
  subtitle?: string;
  tag?: string; // rótulo de exibição (ex.: CAD/CAM, Acrílico)
  workType?: string; // valor bruto vindo do banco (ex.: cadcam, acrilico)
  due?: string; // data amigável (ex: Hoje, Amanhã, 12 Jan 2027)
  comments?: number;
  attachments?: number;
  status: ColumnId; // stageId atual do job
  assigneeInitials?: string; // para avatar simples
  operadorId?: string;
  operadorName?: string;
}

// Utilitários simples de cor
const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

// Normalização de strings para comparação (ids/nomes de estágios)
const normalize = (s: string) => s
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .trim();

// Etapas de produção (API /api/production/stages)
interface StageCfg {
  id: string;
  name: string;
  color: string; // cor principal
  primaryColor?: string;
  backgroundColor?: string;
  stroke?: string;
  cardBgColor?: string;
}

// Sem dados mockados: o board renderiza apenas dados reais vindos da API de produção

function Column({ title, count, children, colorHex, columnId, itemIds }: { title: string; count: number; children: React.ReactNode; colorHex?: string; columnId: ColumnId; itemIds: string[] }) {
  const { setNodeRef } = useDroppable({ id: columnId });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: colorHex || "#64748b" }}
          />
          <span className="text-sm font-semibold text-gray-800 dark:text-white" style={{ color: colorHex || undefined }}>{title}</span>
          <span
            className="inline-flex h-5 items-center justify-center rounded-full border px-2 text-[11px] font-medium"
            style={{ borderColor: colorHex || undefined, color: colorHex || undefined }}
          >
            {count}
          </span>
        </div>
        <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06]" aria-label="Column menu">
          {/* kebab */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>
      <SortableContext id={columnId} items={itemIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className="space-y-3 min-h-[12px]">
          {React.Children.map(children, (child) =>
            React.isValidElement(child) ? React.cloneElement(child as any, { colorHex }) : child
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function TaskCard({ task, colorHex }: { task: TaskItem; colorHex?: string }) {
  // Sortable config
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const styleDrag = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab"
  } as React.CSSProperties;

  const rgb = colorHex ? hexToRgb(colorHex) : null;
  const tint = rgb ? `linear-gradient(0deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03))` : undefined;
  return (
    <div
      ref={setNodeRef}
      className="rounded-xl bg-white p-4 shadow-sm hover:shadow transition-shadow dark:bg-white/[0.03]"
      style={rgb ? {
        backgroundImage: `${tint}`,
        backgroundSize: 'auto',
        backgroundPosition: '0 0'
      } as React.CSSProperties : undefined}
      {...attributes}
      {...listeners}
    >
      {/* drag styles */}
      <div style={styleDrag}>
      {/* Linha principal do card */}
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <div className="shrink-0 text-gray-400 dark:text-gray-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/></svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-800 dark:text-white truncate">{task.title}</div>
          {task.subtitle && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{task.subtitle}</div>
          )}
        </div>

        {/* Tag (pill), data e contadores à direita */}
        {task.tag && (
          <span className="hidden sm:inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium text-gray-700 bg-white border-gray-200 dark:text-white dark:bg-white/[0.01] dark:border-white/10">
            {task.tag}
          </span>
        )}
        {task.due && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 7H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z"/></svg>
            {task.due}
          </span>
        )}
        {typeof task.comments === "number" && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4C2.897 2 2 2.897 2 4V18C2 19.103 2.897 20 4 20H18L22 24V4C22 2.897 21.103 2 20 2Z"/></svg>
            {task.comments}
          </span>
        )}
        {typeof task.attachments === "number" && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 7H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z"/></svg>
            {task.attachments}
          </span>
        )}
        {/* Avatar */}
        <div className="hidden sm:flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
          {task.assigneeInitials || 'NA'}
        </div>

        {/* Kebab por card */}
        <button className="ml-1 h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06]" aria-label="Card menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>
      </div>
    </div>
  );
}

export default function TaskListBoard() {
  const { user } = useAuth(false);
  const { showAlert } = useErrorAlert();
  const { permissions, canAccess } = usePermissions(
    user?.role || "",
    permissionsList,
    user?.permissions || null
  );
  const canMoveBackward = Boolean(canAccess && canAccess("taskMoveBackward"));
  const [stageCfgs, setStageCfgs] = useState<StageCfg[]>([]);
  // Estado de colunas com itens, chaveadas por stageId
  const [columns, setColumns] = useState<Record<ColumnId, TaskItem[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  // Filtros rápidos
  const [techFilter, setTechFilter] = useState<string>('');
  const [orderIdFilter, setOrderIdFilter] = useState<string>('');
  const [techOptions, setTechOptions] = useState<Array<{ id: string; name: string }>>([]);
  // Armazenar tasks brutas para re-filtrar sem novo fetch
  const [allTasksData, setAllTasksData] = useState<TaskItem[]>([]);
  // Filtro por tipo de trabalho (cadcam | acrilico)
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('');

  // Inicializa workTypeFilter do query string (?workType=cadcam|acrilico)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const wt = (url.searchParams.get('workType') || '').toLowerCase();
      if (wt === 'cadcam' || wt === 'acrilico') setWorkTypeFilter(wt);
    } catch {/* noop */}
  }, []);
  // Sincroniza o query param com o estado usando o router do Next
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Evita chamadas durante SSR ou ausência de hooks
    if (!router || !pathname) return;
    const current = (searchParams?.get('workType') || '').toLowerCase();
    const desired = (workTypeFilter || '').toLowerCase();
    // Se já está sincronizado, não faz nada
    if (current === desired) return;
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (desired) params.set('workType', desired);
    else params.delete('workType');
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    // Atualiza a URL sem recarregar nem alterar o scroll
    router.replace(url, { scroll: false });
  }, [workTypeFilter, router, pathname, searchParams]);

  const toggleWorkType = (type: 'cadcam' | 'acrilico') => {
    setWorkTypeFilter(prev => prev === type ? '' : type);
  };

  const allTasks = useMemo(() => Object.values(columns).flat(), [columns]);
  const cadcamCount = useMemo(() => allTasks.filter((t) => (t.workType || '').toLowerCase() === 'cadcam').length, [allTasks]);
  const acrilicoCount = useMemo(() => allTasks.filter((t) => (t.workType || '').toLowerCase() === 'acrilico').length, [allTasks]);

  // Buscar estágios de PRODUÇÃO (cores e ordem)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiClient.get<any[]>('/api/production/stages');
        if (mounted) setStageCfgs(Array.isArray(data) ? data : []);
      } catch (e) {
        // silencioso; manter cores default
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Índices dos estágios por id para validar movimento para trás
  const stageIndexById = useMemo(() => {
    const map = new Map<string, number>();
    stageCfgs.forEach((s, idx) => map.set(normalize(String(s.id)), idx));
    return map;
  }, [stageCfgs]);


  // Sem aliases nem títulos fixos: os nomes e cores vêm de stageCfgs

  // Rótulo amigável para workType do banco
  const workTypeLabel = (wt?: string): string | undefined => {
    if (!wt) return undefined;
    const key = normalize(String(wt));
    if (key === 'cadcam') return 'CAD/CAM';
    if (key === 'acrilico' || key === 'acrílico') return 'Acrílico';
    return String(wt);
  };

  // Mapear status do pedido -> stageId exato; fallback para primeiro estágio
  const resolveTaskStatus = (statusVal: any): ColumnId => {
    const key = normalize(String(statusVal || ''));
    // match direto por id
    const hasId = stageCfgs.some(s => normalize(String(s.id)) === key);
    if (hasId) return String(stageCfgs.find(s => normalize(String(s.id)) === key)!.id);
    // match por nome
    const byName = stageCfgs.find(s => normalize(s.name) === key);
    if (byName) return String(byName.id);
    // fallback: primeiro estágio se existir
    return stageCfgs.length ? String(stageCfgs[0].id) : key;
  };

  // Formatar data curta
  const fmtDate = (d?: string | null) => {
    if (!d) return undefined;
    try {
      return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return undefined; }
  };

  // Buscar JOBS de PRODUÇÃO reais e preencher colunas por stageId
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const jobs = await apiClient.get<any[]>('/api/production');
        if (!Array.isArray(jobs)) return;

        // Precisamos de alguns dados de order para título/subtítulo
        // Opcional: buscar /api/orders?id= para cada orderId — por ora, mostrar ID e material
        const mappedAll: Record<string, TaskItem[]> = {};
        const tempTasks: TaskItem[] = [];
        const techMap = new Map<string, string>();
        for (const p of jobs) {
          // Só exibir após designar um técnico
          if (!p.operadorId) continue;
          const status: ColumnId = resolveTaskStatus(p.stageId);
          const task: TaskItem = {
            id: String(p.id),
            // Mostrar preferencialmente o order_number (fallback para #orderId)
            title: p.orderNumber ? String(p.orderNumber) : `#${p.orderId}`,
            orderNumber: p.orderNumber ? String(p.orderNumber) : undefined,
            subtitle: [p.material ? `Material: ${p.material}` : null, p.operadorName ? `Técnico: ${p.operadorName}` : null].filter(Boolean).join(' • '),
            workType: p.workType ? String(p.workType).toLowerCase() : undefined,
            tag: workTypeLabel(p.workType),
            due: fmtDate(p.estimatedDelivery),
            comments: undefined,
            attachments: (Array.isArray(p.camFiles) ? p.camFiles.length : 0) + (Array.isArray(p.cadFiles) ? p.cadFiles.length : 0) || undefined,
            status,
            assigneeInitials: p.operadorName ? String(p.operadorName).slice(0,2).toUpperCase() : undefined,
            operadorId: String(p.operadorId),
            operadorName: p.operadorName ? String(p.operadorName) : undefined,
          };
          if (!mappedAll[status]) mappedAll[status] = [];
          mappedAll[status].push(task);
          tempTasks.push({ ...task, id: String(task.id) });
          if (p.operadorId) techMap.set(String(p.operadorId), String(p.operadorName || p.operadorId));
        }
        if (mounted) {
          setAllTasksData(tempTasks);
          setTechOptions(Array.from(techMap.entries()).map(([id, name]) => ({ id, name })));
          // Aplicar filtros iniciais (nenhum) -> setColumns por stageId
          setColumns(mappedAll);
        }
      } catch (e) {
        // Em caso de erro, manter vazio e logar
        console.warn('Falha ao buscar produção para TaskList.', e);
      }
    })();
    return () => { mounted = false; };
  // Atualiza sempre que os stages carregarem (para melhor mapeamento de status)
  }, [stageCfgs]);

  // Reaplicar filtros quando techFilter / orderIdFilter mudarem
  useEffect(() => {
    if (!allTasksData.length) return;
    const filterTech = techFilter.trim();
    const filterOrder = orderIdFilter.trim();
    const matches = (t: TaskItem): boolean => {
      let ok = true;
      if (filterTech) {
        ok = ok && t.operadorId === filterTech;
      }
      if (filterOrder) {
        const needle = filterOrder.toLowerCase();
        const hay1 = (t.orderNumber || '').toLowerCase();
        const hay2 = t.title.toLowerCase();
        ok = ok && (hay1.includes(needle) || hay2.includes(needle));
      }
      if (workTypeFilter) {
        ok = ok && (t.workType || '') === workTypeFilter;
      }
      return ok;
    };
    const nextCols: Record<string, TaskItem[]> = {};
    allTasksData.filter(matches).forEach(t => {
      if (!nextCols[t.status]) nextCols[t.status] = [];
      nextCols[t.status].push(t)
    });
    setColumns(nextCols);
  }, [techFilter, orderIdFilter, workTypeFilter, allTasksData]);

  const getTaskById = (id: string | null): TaskItem | null => {
    if (!id) return null;
    for (const list of Object.values(columns)) {
      const found = list.find(t => t.id === id);
      if (found) return found;
    }
    return null;
  };

  const getColorByTask = (task: TaskItem | null) => {
    if (!task) return undefined;
    const st = stageCfgs.find(s => String(s.id) === String(task.status));
    return (st as any)?.primaryColor || st?.color || undefined;
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const findContainerOfItem = (id: string): ColumnId | null => {
    for (const [colId, list] of Object.entries(columns)) {
      if (list.some(t => t.id === id)) return colId;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const fromCol = findContainerOfItem(activeId);
    // Se largou em um container vazio, overId será o id do container
    const containerIds: string[] = Object.keys(columns);
    const toCol: ColumnId | null = containerIds.includes(overId) ? overId : findContainerOfItem(overId);
    if (!fromCol || !toCol) return;

    // Verificar movimento para trás usando índice dos stages
    const fromIdx = stageIndexById.get(normalize(fromCol));
    const toIdx = stageIndexById.get(normalize(toCol));
    const isBackwardMove = (fromIdx ?? 0) > (toIdx ?? 0);
    if (isBackwardMove && !canMoveBackward) {
      showAlert("Você não tem permissão para mover tarefas para trás no fluxo.");
      setActiveId(null);
      return;
    }

    if (fromCol === toCol) {
      // Reordenação dentro da mesma coluna
      const fromItems = columns[fromCol];
      const oldIndex = fromItems.findIndex(i => i.id === activeId);
      const newIndex = (containerIds as string[]).includes(overId)
        ? fromItems.length - 1
        : fromItems.findIndex(i => i.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const newItems = arrayMove(fromItems, oldIndex, newIndex);
      setColumns(prev => ({ ...prev, [fromCol]: newItems }));
    } else {
      // Mover entre colunas
      const fromItems = columns[fromCol] || [];
      const toItems = columns[toCol] || [];
      const moving = fromItems.find(i => i.id === activeId);
      if (!moving) return;
      const overIndex = containerIds.includes(overId)
        ? toItems.length
        : Math.max(0, toItems.findIndex(i => i.id === overId));
      const nextFrom = fromItems.filter(i => i.id !== activeId);
      const updatedMoving: TaskItem = { ...moving, status: toCol };
      const nextTo = [...toItems];
      nextTo.splice(overIndex === -1 ? toItems.length : overIndex, 0, updatedMoving);
      setColumns(prev => ({ ...prev, [fromCol]: nextFrom, [toCol]: nextTo }));

      // Persistir mudança de estágio no backend
      const newStageId = toCol;
      // Dispara PATCH de forma otimista; em caso de erro, apenas exibe alerta
      apiClient.patch(`/api/production?id=${encodeURIComponent(updatedMoving.id)}`, { stageId: newStageId })
        .catch(() => {
          showAlert('Não foi possível salvar a mudança de etapa.');
        });
    }
    setActiveId(null);
  };

  const findStageColor = (stageId: string, fallback: string) => {
    const st = stageCfgs.find(s => String(s.id) === String(stageId));
    return ((st as any)?.primaryColor || st?.color || fallback);
  };

  return (
    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      {/* Linha de ações à direita: botões CAD/CAM & Acrílico + filtros */}
      <div className="mb-6 flex items-center justify-end gap-2">
        {/* Botões de filtro por tipo de trabalho */}
        <button
          type="button"
          aria-pressed={workTypeFilter === 'cadcam'}
          onClick={() => toggleWorkType('cadcam')}
          className={`px-3 py-1 rounded-md text-xs border transition-colors ${workTypeFilter === 'cadcam' ? 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-white/10 dark:text-gray-100 dark:border-white/10' : 'text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:border-white/10 dark:hover:bg-white/5'}`}
        >
          {workTypeLabel('cadcam')} <span className="ml-1 inline-flex h-5 items-center justify-center rounded-full bg-gray-100 px-2 text-[11px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">{cadcamCount}</span>
        </button>
        <button
          type="button"
          aria-pressed={workTypeFilter === 'acrilico'}
          onClick={() => toggleWorkType('acrilico')}
          className={`px-3 py-1 rounded-md text-xs border transition-colors ${workTypeFilter === 'acrilico' ? 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-white/10 dark:text-gray-100 dark:border-white/10' : 'text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:border-white/10 dark:hover:bg-white/5'}`}
        >
          {workTypeLabel('acrilico')} <span className="ml-1 inline-flex h-5 items-center justify-center rounded-full bg-gray-100 px-2 text-[11px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">{acrilicoCount}</span>
        </button>
        {/* Filtros rápidos */}
        <div className="flex items-center gap-2">
          <input
            value={orderIdFilter}
            onChange={(e) => setOrderIdFilter(e.target.value)}
            placeholder="Filtrar por #ID do pedido"
            className="h-8 w-44 rounded-lg border border-gray-200 px-2 text-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-200"
          />
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="h-8 w-48 rounded-lg border border-gray-200 px-2 text-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-200"
          >
            <option value="">Todos os técnicos</option>
            {techOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { setTechFilter(''); setOrderIdFilter(''); setWorkTypeFilter(''); }}
            className="h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
            title="Limpar filtros"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-8">
          {stageCfgs.map((st) => {
            const colId = String(st.id);
            const list = columns[colId] || [];
            const color = (st as any)?.primaryColor || st.color;
            return (
              <Column
                key={colId}
                title={st.name}
                count={list.length}
                colorHex={color}
                columnId={colId}
                itemIds={list.map(t => t.id)}
              >
                {list.map((t) => (<TaskCard key={t.id} task={t} />))}
              </Column>
            );
          })}
        </div>

        {/* Preview flutuante enquanto arrasta */}
        <DragOverlay>
          {(() => {
            const task = getTaskById(activeId);
            if (!task) return null;
            const color = getColorByTask(task);
            return <TaskCard task={task} colorHex={color} />;
          })()}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
