"use client";
import React, { useEffect, useState } from "react";
import { useNoticeSettings } from "@/hooks/useNoticeSettings";

export default function NoticeSettings() {
  const { settings, save, saving, error, loading } = useNoticeSettings();
  
  // Log para depuração
  console.log('NoticeSettings - settings:', settings);
  console.log('NoticeSettings - loading:', loading);
  console.log('NoticeSettings - error:', error);

  const [enabled, setEnabled] = useState<boolean>(settings.enabled ?? true);
  const [title, setTitle] = useState<string>(settings.title || "");
  const [description, setDescription] = useState<string>(settings.description || "");
  const [ctaLabel, setCtaLabel] = useState<string>(settings.ctaLabel || "");
  const [ctaUrl, setCtaUrl] = useState<string>(settings.ctaUrl || "");

  const [bgColor, setBgColor] = useState<string>(settings.bgColor || "");
  const [textColor, setTextColor] = useState<string>(settings.textColor || "");
  const [borderColor, setBorderColor] = useState<string>(settings.borderColor || "");
  const [ctaBgColor, setCtaBgColor] = useState<string>(settings.ctaBgColor || "");
  const [ctaTextColor, setCtaTextColor] = useState<string>(settings.ctaTextColor || "");
  const [titleFontFamily, setTitleFontFamily] = useState<string>(settings.titleFontFamily || "");
  const [bodyFontFamily, setBodyFontFamily] = useState<string>(settings.bodyFontFamily || "");

  // availability / expiry
  const [expiresAt, setExpiresAt] = useState<string | null>((settings as any).expiresAt || null);
  const [activeDays, setActiveDays] = useState<number | "">("");

  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    setEnabled(settings.enabled ?? true);
    setTitle(settings.title || "");
    setDescription(settings.description || "");
    setCtaLabel(settings.ctaLabel || "");
    setCtaUrl(settings.ctaUrl || "");

    setBgColor(settings.bgColor || "");
    setTextColor(settings.textColor || "");
    setBorderColor(settings.borderColor || "");
    setCtaBgColor(settings.ctaBgColor || "");
    setCtaTextColor(settings.ctaTextColor || "");
    setTitleFontFamily(settings.titleFontFamily || "");
    setBodyFontFamily(settings.bodyFontFamily || "");
    setExpiresAt((settings as any).expiresAt || null);
    setActiveDays("");
  }, [settings]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await save({
      enabled,
      title,
      description,
      ctaLabel,
      ctaUrl,
      bgColor: bgColor || null,
      textColor: textColor || null,
      borderColor: borderColor || null,
      ctaBgColor: ctaBgColor || null,
      ctaTextColor: ctaTextColor || null,
      titleFontFamily: titleFontFamily || null,
      bodyFontFamily: bodyFontFamily || null,
      // send ISO or null
      ...(expiresAt !== undefined ? { expiresAt } : {}),
    });
    setMsg(ok ? "Salvo com sucesso" : "Falha ao salvar");
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Avisos (Notice)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Configure o card de aviso exibido na barra lateral, com campos em inglês e opções de estilo.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 max-w-3xl">
        <div className="flex items-center gap-3">
          <input id="noticeEnabled" type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-brand-500" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} />
          <label htmlFor="noticeEnabled" className="text-sm text-gray-800 dark:text-gray-200">Exibir notice na barra lateral</label>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Disponibilidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Ativo por (dias)</label>
              <input
                type="number"
                min={1}
                value={activeDays === "" ? "" : String(activeDays)}
                onChange={(e)=>{
                  const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                  setActiveDays(val as any);
                  if (val === '') return;
                  const ms = Number(val) * 24 * 60 * 60 * 1000;
                  const iso = new Date(Date.now() + ms).toISOString();
                  setExpiresAt(iso);
                }}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
                placeholder="Ex.: 7"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Expira em</label>
              <input
                readOnly
                value={expiresAt ? new Date(expiresAt).toLocaleString() : ''}
                placeholder="Sem expiração"
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
              />
            </div>
            <div className="md:pt-0">
              <label className="block mb-1 text-sm text-transparent">&nbsp;</label>
              <button
                type="button"
                onClick={()=>{ setExpiresAt(null); setActiveDays(""); }}
                className="h-10 w-full md:w-auto px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
              >Limpar</button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">Deixa vazio para não expirar automaticamente.</p>
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Title</label>
          <input
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
            placeholder="Lab Admin - Admin Panel"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
            placeholder="Notice text"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">CTA Label</label>
            <input
              value={ctaLabel}
              onChange={(e)=>setCtaLabel(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
              placeholder="e.g. Learn more"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">CTA URL</label>
            <input
              value={ctaUrl}
              onChange={(e)=>setCtaUrl(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Estilos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Background color</label>
              <input type="color" value={bgColor || "#ffffff"} onChange={(e)=>setBgColor(e.target.value)} className="h-10 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Text color</label>
              <input type="color" value={textColor || "#111827"} onChange={(e)=>setTextColor(e.target.value)} className="h-10 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Border color</label>
              <input type="color" value={borderColor || "#e5e7eb"} onChange={(e)=>setBorderColor(e.target.value)} className="h-10 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">CTA background</label>
              <input type="color" value={ctaBgColor || "#2563eb"} onChange={(e)=>setCtaBgColor(e.target.value)} className="h-10 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">CTA text color</label>
              <input type="color" value={ctaTextColor || "#ffffff"} onChange={(e)=>setCtaTextColor(e.target.value)} className="h-10 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Title font-family</label>
              <select
                value={titleFontFamily || ""}
                onChange={(e)=>setTitleFontFamily(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
              >
                <option value="">Default (theme)</option>
                <option value="system">Sans-serif (System)</option>
                <option value="inter">Inter (sans-serif)</option>
                <option value="roboto">Roboto (sans-serif)</option>
                <option value="georgia">Georgia (serif)</option>
                <option value="playfair">Playfair Display (serif)</option>
                <option value="merriweather">Merriweather (serif)</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Body font-family</label>
              <select
                value={bodyFontFamily || ""}
                onChange={(e)=>setBodyFontFamily(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent"
              >
                <option value="">Default (theme)</option>
                <option value="system">Sans-serif (System)</option>
                <option value="inter">Inter (sans-serif)</option>
                <option value="roboto">Roboto (sans-serif)</option>
                <option value="georgia">Georgia (serif)</option>
                <option value="merriweather">Merriweather (serif)</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
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
