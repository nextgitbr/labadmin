"use client";

import React, { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/apiClient";
import { Modal } from "@/components/ui/modal";
import SettingsSidebar from "@/components/settings/SettingsSidebar";

interface Product {
  id?: string;
  _id?: string;
  codigo?: string;
  nome?: string;
  name?: string;
  categoria?: string;
  category?: string;
  tipo?: string;
  type?: string;
  preco?: number;
  price?: number;
  iva?: number;
  isActive?: boolean;
}

export default function ProductsSettingsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{
    id?: string;
    codigo?: string;
    nome: string;
    tipo: string;
    categoria: string;
    precoBaseNumber?: number | '';
    iva?: number | '';
    isActive?: boolean;
  }>({ nome: "", tipo: "", categoria: "", precoBaseNumber: '', iva: '', isActive: true });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((p) =>
      [p.nome, p.name, p.categoria, p.category, p.tipo, p.type]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [q, items]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      // /api/products already exists
      const data = await apiClient.get<Product[]>("/api/products");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openNew = () => {
    setMode("create");
    setForm({ nome: "", tipo: "", categoria: "", precoBaseNumber: '', iva: '', isActive: true });
    setIsOpen(true);
  };

  const openEdit = (p: Product) => {
    setMode("edit");
    setForm({
      id: String(p.id || p._id || ''),
      codigo: p.codigo,
      nome: String(p.nome || p.name || ''),
      tipo: String(p.tipo || p.type || ''),
      categoria: String(p.categoria || p.category || ''),
      precoBaseNumber: typeof p.preco === 'number' ? p.preco : (typeof p.price === 'number' ? p.price : ''),
      iva: typeof p.iva === 'number' ? p.iva : '',
      isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
    });
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (!form.nome.trim()) return toast.error('Informe o nome');
      const payload: any = {
        codigo: form.codigo,
        nome: form.nome.trim(),
        tipo: form.tipo?.trim() || undefined,
        categoria: form.categoria?.trim() || undefined,
        precoBaseNumber: form.precoBaseNumber === '' ? undefined : Number(form.precoBaseNumber),
        iva: form.iva === '' ? undefined : Number(form.iva),
        isActive: form.isActive,
      };
      if (mode === 'create') {
        await apiClient.post('/api/products', payload);
        toast.success('Produto criado');
      } else {
        await apiClient.patch('/api/products', { ...payload, id: form.id || undefined, codigo: form.codigo || undefined });
        toast.success('Produto atualizado');
      }
      close();
      fetchProducts();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: Product) => {
    const id = p.id || p._id;
    const codigo = p.codigo;
    if (!window.confirm('Excluir este produto? Esta ação não pode ser desfeita.')) return;
    try {
      const qs = id ? `id=${id}` : (codigo ? `codigo=${encodeURIComponent(codigo)}` : '');
      if (!qs) return toast.error('Identificador ausente');
      await apiClient.delete(`/api/products?${qs}`);
      toast.success('Produto excluído');
      fetchProducts();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao excluir');
    }
  };

  return (
    <AuthGuard requiredPermission="configuracoesProdutos">
      <PageBreadcrumb pageTitle="Configurações › Produtos" />
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <SettingsSidebar />
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
            <input
              placeholder="Pesquisar por nome, tipo ou categoria..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="sm:ml-auto flex gap-2">
              <button onClick={openNew} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Novo produto</button>
              <button onClick={fetchProducts} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">Recarregar</button>
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
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-left">Preço</th>
                    <th className="px-4 py-3 text-left">IVA</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => (
                    <tr key={(p._id || p.id || idx) as React.Key} className="border-t border-gray-100 dark:border-gray-700/60">
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{p.nome || p.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.tipo || p.type || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.categoria || p.category || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{typeof p.preco === 'number' ? p.preco.toFixed(2) : typeof p.price === 'number' ? p.price.toFixed(2) : "—"}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{typeof p.iva === 'number' ? `${p.iva}%` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(p)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Editar</button>
                          <button onClick={() => handleDelete(p)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">Nenhum produto encontrado.</td>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{mode === 'create' ? 'Novo produto' : 'Editar produto'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-700 dark:text-gray-300">Nome</span>
              <input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nome do produto"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-700 dark:text-gray-300">Tipo</span>
              <input
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ex.: Serviço, Peça"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-700 dark:text-gray-300">Categoria</span>
              <input
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Categoria"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-700 dark:text-gray-300">Preço base</span>
              <input
                type="number"
                step="0.01"
                value={form.precoBaseNumber === '' ? '' : form.precoBaseNumber}
                onChange={(e) => setForm((f) => ({ ...f, precoBaseNumber: e.target.value === '' ? '' : Number(e.target.value) }))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-gray-700 dark:text-gray-300">IVA %</span>
              <input
                type="number"
                step="1"
                value={form.iva === '' ? '' : form.iva}
                onChange={(e) => setForm((f) => ({ ...f, iva: e.target.value === '' ? '' : Number(e.target.value) }))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ex.: 23"
              />
            </label>
            <label className="flex items-center gap-2 text-sm pt-6">
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span className="text-gray-700 dark:text-gray-300">Ativo</span>
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
