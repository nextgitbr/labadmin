"use client";
import React, { useState, useEffect } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function PromoSettings() {
  const { settings, save, saving } = useAppSettings();
  const [enabled, setEnabled] = useState<boolean>(settings.promoEnabled ?? true);
  const [title, setTitle] = useState<string>(settings.promoTitle || "");
  const [description, setDescription] = useState<string>(settings.promoDescription || "");
  const [ctaLabel, setCtaLabel] = useState<string>(settings.promoCtaLabel || "");
  const [ctaUrl, setCtaUrl] = useState<string>(settings.promoCtaUrl || "");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    setEnabled(settings.promoEnabled ?? true);
    setTitle(settings.promoTitle || "");
    setDescription(settings.promoDescription || "");
    setCtaLabel(settings.promoCtaLabel || "");
    setCtaUrl(settings.promoCtaUrl || "");
  }, [settings]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await save({
      promoEnabled: enabled,
      promoTitle: title,
      promoDescription: description,
      promoCtaLabel: ctaLabel,
      promoCtaUrl: ctaUrl,
    });
    setMsg(ok ? "Salvo com sucesso" : "Falha ao salvar");
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Avisos</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Configure o card de aviso exibido na barra lateral.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <input id="promoEnabled" type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-brand-500" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} />
          <label htmlFor="promoEnabled" className="text-sm text-gray-800 dark:text-gray-200">Exibir aviso na barra lateral</label>
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Título</label>
          <input
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
            placeholder="Lab Admin - Painel Administrativo"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Descrição</label>
          <textarea
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
            placeholder="Texto do aviso"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Rótulo do botão</label>
            <input
              value={ctaLabel}
              onChange={(e)=>setCtaLabel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
              placeholder="Ex.: Saiba mais"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">URL do botão</label>
            <input
              value={ctaUrl}
              onChange={(e)=>setCtaUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500/60">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          {msg && <span className="text-sm text-gray-700 dark:text-gray-200">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
