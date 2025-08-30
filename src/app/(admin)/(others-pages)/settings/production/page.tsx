"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AuthGuard from "@/components/auth/AuthGuard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { apiClient } from "@/lib/apiClient";

interface ProductionStage {
  id: string;
  name: string;
  order: number;
  color?: string | null;
  primaryColor?: string | null;
  cardBgColor?: string | null;
  isBackwardAllowed?: boolean;
  isActive?: boolean;
  materials: string[];
}

function StageFormModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ProductionStage> | null;
  onSave: (payload: ProductionStage) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductionStage>({
    id: "",
    name: "",
    order: 0,
    color: "#3b82f6",
    primaryColor: "",
    cardBgColor: "",
    isBackwardAllowed: false,
    isActive: true,
    materials: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        id: initial?.id || "",
        name: initial?.name || "",
        order: typeof initial?.order === "number" ? initial!.order : 0,
        color: initial?.color || "#3b82f6",
        primaryColor: initial?.primaryColor || "",
        cardBgColor: initial?.cardBgColor || "",
        isBackwardAllowed: initial?.isBackwardAllowed ?? false,
        isActive: initial?.isActive ?? true,
        materials: Array.isArray(initial?.materials) ? initial!.materials : [],
      }));
    }
  }, [open, initial]);

  const materialsStr = useMemo(() => form.materials.join(", "), [form.materials]);

  const handleSave = async () => {
    if (!form.id.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        primaryColor: form.primaryColor || null,
        cardBgColor: form.cardBgColor || null,
        color: form.color || undefined,
      } as ProductionStage);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-5 overflow-y-auto bg-gray-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl bg-white p-6 dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{initial?.id ? "Editar Etapa" : "Nova Etapa"}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">✕</button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">ID</label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
                disabled={!!initial?.id}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="ex: modelagem"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Ex: Modelagem"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Cor</label>
              <input
                type="color"
                value={form.color || "#3b82f6"}
                onChange={(e) => setForm((s) => ({ ...s, color: e.target.value }))}
                className="w-full h-10 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Primária</label>
              <input
                type="color"
                value={form.primaryColor || "#3b82f6"}
                onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                className="w-full h-10 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">BG do Card</label>
              <input
                type="color"
                value={form.cardBgColor || "#eff6ff"}
                onChange={(e) => setForm((s) => ({ ...s, cardBgColor: e.target.value }))}
                className="w-full h-10 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!form.isBackwardAllowed}
                onChange={(e) => setForm((s) => ({ ...s, isBackwardAllowed: e.target.checked }))}
              />
              Permitir mover tarefa para trás
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.isActive !== false}
                onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))}
              />
              Ativa
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Materiais (separados por vírgula)</label>
            <input
              type="text"
              value={materialsStr}
              onChange={(e) => setForm((s) => ({ ...s, materials: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Ex: Zircônia, Dissilicato"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.id || !form.name} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductionSettingsPage() {
  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionStage | null>(null);

  const fetchStages = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<ProductionStage[]>("/api/production/stages");
      setStages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const upsertStage = async (payload: ProductionStage) => {
    const saved = await apiClient.post<ProductionStage>("/api/production/stages", payload);
    setStages((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      if (exists) return prev.map((s) => (s.id === saved.id ? saved : s)).sort((a, b) => a.order - b.order);
      return [...prev, saved].sort((a, b) => a.order - b.order);
    });
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const copy = Array.from(stages);
    const [moved] = copy.splice(result.source.index, 1);
    copy.splice(result.destination.index, 0, moved);

    // normalizar ordem localmente
    const normalized = copy.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStages(normalized);

    // persistir chamando POST por item movido (upsert com nova order)
    try {
      for (const s of normalized) {
        await apiClient.post("/api/production/stages", { ...s, order: s.order });
      }
    } catch (e) {
      console.error("Erro ao reordenar etapas", e);
      fetchStages();
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredPermission="configuracoesProducao">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredPermission="configuracoesProducao">
      <PageBreadcrumb pageTitle="Configurar Produção" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produção</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie as etapas do tasklist de produção e materiais.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nova Etapa
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Etapas de Produção</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Arraste e solte para reordenar as etapas. Clique para editar.</p>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="production-stages">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {stages.map((stage, index) => (
                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${snapshot.isDragging ? "shadow-lg" : ""} border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 dark:text-gray-400 text-sm">{index + 1}.</span>
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: stage.color || "#3b82f6" }} />
                            <button
                              onClick={() => { setEditing(stage); setModalOpen(true); }}
                              className="font-medium text-gray-900 dark:text-white hover:underline"
                              title="Editar"
                            >
                              {stage.name}
                            </button>
                          </div>

                          <div className="flex items-center flex-wrap gap-3">
                            <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={!!stage.isBackwardAllowed}
                                onChange={async (e) => {
                                  const updated = { ...stage, isBackwardAllowed: e.target.checked };
                                  setStages((prev) => prev.map((s) => (s.id === stage.id ? updated : s)));
                                  try {
                                    await apiClient.post("/api/production/stages", updated);
                                  } catch (err) { console.error(err); }
                                }}
                              />
                              Permitir voltar
                            </label>

                            <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={stage.isActive !== false}
                                onChange={async (e) => {
                                  const updated = { ...stage, isActive: e.target.checked };
                                  setStages((prev) => prev.map((s) => (s.id === stage.id ? updated : s)));
                                  try {
                                    await apiClient.post("/api/production/stages", updated);
                                  } catch (err) { console.error(err); }
                                }}
                              />
                              Ativa
                            </label>

                            <span className="text-xs text-gray-500 dark:text-gray-400">Materiais: {stage.materials?.length ? stage.materials.join(", ") : "—"}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">ID: {stage.id}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      <StageFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing || undefined}
        onSave={async (payload) => {
          // defina ordem ao criar, posicionando no final
          if (!editing) {
            const maxOrder = stages.reduce((m, s) => Math.max(m, s.order || 0), 0);
            payload.order = maxOrder + 1;
          }
          await upsertStage(payload);
        }}
      />
    </AuthGuard>
  );
}
