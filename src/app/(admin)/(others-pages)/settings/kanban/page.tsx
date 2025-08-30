"use client";

import React, { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/apiClient";

interface Stage {
  _id?: string;
  id: string;
  name: string;
  color: string;
  stroke?: string;
  backgroundColor?: string;
  primaryColor?: string;
  order: number;
  cardBgColor?: string;
}

export default function KanbanSettingsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#3b82f6", stroke: "", backgroundColor: "", primaryColor: "", cardBgColor: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", color: "#3b82f6", stroke: "", backgroundColor: "", primaryColor: "", cardBgColor: "" });
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmStage, setConfirmStage] = useState<Stage | null>(null);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [stages]
  );

  const fetchStages = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Stage[]>("/api/stages");
      setStages(data);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar etapas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await apiClient.post<Stage>("/api/stages", {
        name: form.name.trim(),
        color: (form.primaryColor || form.color),
        primaryColor: form.primaryColor || undefined,
        backgroundColor: form.backgroundColor || undefined,
        stroke: form.stroke || undefined,
        cardBgColor: form.cardBgColor || undefined,
      });
      setStages(prev => [...prev, data]);
      setForm({ name: "", color: "#3b82f6", stroke: "", backgroundColor: "", primaryColor: "", cardBgColor: "" });
    } catch (e: any) {
      setError(e?.message || "Erro ao criar etapa");
    }
  };

  const startEdit = (stage: Stage) => {
    setEditingId(stage.id);
    setEditForm({
      name: stage.name,
      color: stage.color,
      stroke: stage.stroke || "",
      backgroundColor: stage.backgroundColor || "",
      primaryColor: stage.primaryColor || stage.color || "",
      cardBgColor: stage.cardBgColor || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (stage: Stage) => {
    try {
      setSavingOrder(true);
      // Persistir atualização de nome/cor via PATCH /api/stages
      const data = await apiClient.patch<Stage>("/api/stages", {
        id: stage.id,
        name: editForm.name.trim(),
        color: editForm.color,
        stroke: editForm.stroke || undefined,
        backgroundColor: editForm.backgroundColor || undefined,
        primaryColor: editForm.primaryColor || undefined,
        cardBgColor: editForm.cardBgColor || undefined,
      });
      // Atualizar estado local
      setStages(prev => prev.map(s => (s.id === stage.id ? { ...s, name: data.name, color: data.color, stroke: data.stroke, backgroundColor: data.backgroundColor, primaryColor: data.primaryColor, cardBgColor: data.cardBgColor } : s)));
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message || "Erro ao salvar edição");
    } finally {
      setSavingOrder(false);
    }
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const arr = [...sortedStages];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= arr.length) return;
    const temp = arr[index];
    arr[index] = arr[newIndex];
    arr[newIndex] = temp;
    // Re-atribuir order sequencial
    const reord = arr.map((s, i) => ({ ...s, order: i + 1 }));
    setStages(reord);
  };

  const saveOrder = async () => {
    try {
      setSavingOrder(true);
      await apiClient.put("/api/stages", { stages: sortedStages.map((s, i) => ({ id: s.id, order: i + 1 })) });
    } catch (e: any) {
      setError(e?.message || "Erro ao salvar ordem");
    } finally {
      setSavingOrder(false);
    }
  };

  const removeStage = async (stage: Stage) => {
    try {
      // abrir modal de confirmação visual
      setConfirmStage(stage);
    } catch (e: any) {
      setError(e?.message || "Erro ao preparar remoção");
    }
  };

  const confirmRemove = async () => {
    if (!confirmStage) return;
    const stage = confirmStage;
    try {
      setRemovingId(stage.id);
      setError(null);
      await apiClient.delete(`/api/stages?id=${encodeURIComponent(stage.id)}`);
      setStages(prev => prev.filter(s => s.id !== stage.id));
      toast.success("Etapa removida com sucesso");
    } catch (e: any) {
      setError(e?.message || "Erro ao remover etapa");
      // erro já foi mostrado em toast
    } finally {
      setRemovingId(null);
      setConfirmStage(null);
    }
  };

  return (
    <AuthGuard requiredPermission="configuracoesKanban">
      <PageBreadcrumb pageTitle="Configurações do Kanban" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Etapas do Kanban</h2>
                <button
                  onClick={saveOrder}
                  disabled={savingOrder}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {savingOrder ? "Salvando..." : "Salvar ordem"}
                </button>
              </div>

              {loading ? (
                <div className="text-gray-500 dark:text-gray-400">Carregando...</div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedStages.map((stage, idx) => (
                    <li key={stage.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" title="Primária" style={{ backgroundColor: stage.primaryColor || stage.color }} />
                          <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0 border" title="Background" style={{ backgroundColor: stage.backgroundColor || "transparent", borderColor: stage.stroke || "#d1d5db" }} />
                          <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" title="Stroke" style={{ backgroundColor: stage.stroke || "#6b7280" }} />
                          <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0 border" title="BG do Card" style={{ backgroundColor: stage.cardBgColor || "transparent", borderColor: stage.stroke || "#d1d5db" }} />
                        </div>
                        {editingId === stage.id ? (
                          <div className="flex items-center gap-3">
                            <input
                              value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-start">
                                <label className="text-xs text-gray-500 dark:text-gray-400">Cor primária</label>
                                <input type="color" value={editForm.primaryColor || editForm.color}
                                  onChange={e => setEditForm(f => ({ ...f, primaryColor: e.target.value }))}
                                  className="w-10 h-10 p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent" />
                              </div>
                              <div className="flex flex-col items-start">
                                <label className="text-xs text-gray-500 dark:text-gray-400">Background</label>
                                <input type="color" value={editForm.backgroundColor || "#ffffff"}
                                  onChange={e => setEditForm(f => ({ ...f, backgroundColor: e.target.value }))}
                                  className="w-10 h-10 p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent" />
                              </div>
                              <div className="flex flex-col items-start">
                                <label className="text-xs text-gray-500 dark:text-gray-400">BG do Card</label>
                                <input type="color" value={editForm.cardBgColor || "#ffffff"}
                                  onChange={e => setEditForm(f => ({ ...f, cardBgColor: e.target.value }))}
                                  className="w-10 h-10 p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent" />
                              </div>
                              <div className="flex flex-col items-start">
                                <label className="text-xs text-gray-500 dark:text-gray-400">Stroke</label>
                                <input type="color" value={editForm.stroke || "#000000"}
                                  onChange={e => setEditForm(f => ({ ...f, stroke: e.target.value }))}
                                  className="w-10 h-10 p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{stage.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ID: {stage.id}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveStage(idx, -1)}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            aria-label="Mover para cima"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveStage(idx, 1)}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            aria-label="Mover para baixo"
                          >
                            ↓
                          </button>
                        </div>

                        {editingId === stage.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(stage)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(stage)}
                              className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => removeStage(stage)}
                              type="button"
                              disabled={removingId === stage.id}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg"
                            >
                              {removingId === stage.id ? "Removendo..." : "Remover"}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <div className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adicionar nova etapa</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor primária</label>
                    <input
                      type="color"
                      value={form.primaryColor || form.color}
                      onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value, color: e.target.value }))}
                      className="w-12 h-12 p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Background</label>
                    <input
                      type="color"
                      value={form.backgroundColor || "#ffffff"}
                      onChange={e => setForm(f => ({ ...f, backgroundColor: e.target.value }))}
                      className="w-12 h-12 p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">BG do Card</label>
                    <input
                      type="color"
                      value={form.cardBgColor || "#ffffff"}
                      onChange={e => setForm(f => ({ ...f, cardBgColor: e.target.value }))}
                      className="w-12 h-12 p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stroke</label>
                    <input
                      type="color"
                      value={form.stroke || "#000000"}
                      onChange={e => setForm(f => ({ ...f, stroke: e.target.value }))}
                      className="w-12 h-12 p-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Adicionar etapa
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Modal de confirmação de remoção */}
      {confirmStage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmStage(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirmar remoção</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Tem certeza que deseja remover a etapa "{confirmStage.name}" (ID: {confirmStage.id})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmStage(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={removingId === confirmStage.id}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white"
              >
                {removingId === confirmStage.id ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
