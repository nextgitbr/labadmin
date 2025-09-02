"use client";

import React, { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/apiClient";
import { Modal } from "@/components/ui/modal";
import SettingsSidebar from "@/components/settings/SettingsSidebar";

interface Category {
  id?: string;
  _id?: string;
  name?: string;
  nome?: string;
  categoria?: string; // api field
  tipo?: string; // normalized type
  productCount?: number; // api field
}

export default function CategoriesSettingsPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<{ id?: string; tipo: string; categoria: string }>({ tipo: "", categoria: "" });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((c) =>
      [c.name, c.nome, c.tipo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [q, items]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      // uses existing /api/product-categories GET
      const data = await apiClient.get<Category[]>("/api/product-categories");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openNew = () => {
    setMode("create");
    setForm({ tipo: "", categoria: "" });
    setIsOpen(true);
  };

  const openEdit = (c: Category) => {
    setMode("edit");
    setForm({ id: String(c.id || c._id || ""), tipo: c.tipo || "", categoria: String(c.nome || c.name || c.categoria || "") });
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (!form.tipo.trim() || !form.categoria.trim()) {
        toast.error("Preencha tipo e categoria");
        return;
      }
      if (mode === "create") {
        await apiClient.post("/api/product-categories", { tipo: form.tipo.trim(), categoria: form.categoria.trim() });
        toast.success("Categoria criada");
      } else {
        await apiClient.patch("/api/product-categories", { id: form.id, tipo: form.tipo.trim(), categoria: form.categoria.trim() });
        toast.success("Categoria atualizada");
      }
      close();
      fetchCategories();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: Category) => {
    const id = c.id || c._id;
    if (!id) return toast.error("ID inválido");
    if (!window.confirm("Excluir esta categoria? Esta ação não pode ser desfeita.")) return;
    try {
      await apiClient.delete(`/api/product-categories?id=${id}`);
      toast.success("Categoria excluída");
      fetchCategories();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao excluir");
    }
  };

  return (
    <AuthGuard requiredPermission="configuracoesCategorias">
      <PageBreadcrumb pageTitle="Configurações › Categorias" />
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <SettingsSidebar />
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
            <input
              placeholder="Pesquisar por nome ou tipo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="sm:ml-auto flex gap-2">
              <button onClick={openNew} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Nova categoria</button>
              <button onClick={fetchCategories} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">Recarregar</button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-500 dark:text-gray-400">Carregando...</div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400">{error}</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Produtos</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={(c._id || c.id || idx) as React.Key} className="border-t border-gray-100 dark:border-gray-700/60">
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{c.nome || c.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.tipo || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{typeof c.productCount === 'number' ? c.productCount : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(c)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Editar</button>
                          <button onClick={() => handleDelete(c)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">Nenhuma categoria encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={close}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{mode === 'create' ? 'Nova categoria' : 'Editar categoria'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-700 dark:text-gray-300">Tipo</span>
              <input
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ex.: Linha, Material"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-700 dark:text-gray-300">Categoria</span>
              <input
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nome da categoria"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancelar</button>
            <button disabled={submitting} type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60">{submitting ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </AuthGuard>
  );
}
