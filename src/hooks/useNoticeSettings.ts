import { useCallback, useEffect, useState } from 'react';

export interface NoticeSettings {
  enabled: boolean;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  // style
  bgColor?: string | null;
  textColor?: string | null;
  borderColor?: string | null;
  ctaBgColor?: string | null;
  ctaTextColor?: string | null;
  titleFontFamily?: string | null;
  bodyFontFamily?: string | null;
  // expiry
  expiresAt?: string | null;
  isActive?: boolean;
}

const DEFAULTS: NoticeSettings = {
  enabled: true,
  title: 'Lab Admin - Admin Panel',
  description: 'Modern, customizable and complete admin panel for labs.',
  ctaLabel: 'Upgrade To Pro',
  ctaUrl: 'https://tailadmin.com/pricing',
  bgColor: null,
  textColor: null,
  borderColor: null,
  ctaBgColor: null,
  ctaTextColor: null,
  titleFontFamily: null,
  bodyFontFamily: null,
  expiresAt: null,
  isActive: true,
};

const LS_KEY = 'labadmin_notice_settings';

export function useNoticeSettings() {
  const [settings, setSettings] = useState<NoticeSettings>(DEFAULTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocal = (): NoticeSettings | null => {
    try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const saveLocal = (s: NoticeSettings) => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} };

  const fetchRemote = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/settings/notice', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load notice settings');
      const data = await res.json();
      const next: NoticeSettings = {
        enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULTS.enabled,
        title: typeof data.title === 'string' ? data.title : DEFAULTS.title,
        description: typeof data.description === 'string' ? data.description : DEFAULTS.description,
        ctaLabel: typeof data.ctaLabel === 'string' ? data.ctaLabel : DEFAULTS.ctaLabel,
        ctaUrl: typeof data.ctaUrl === 'string' ? data.ctaUrl : DEFAULTS.ctaUrl,
        bgColor: data.bgColor ?? null,
        textColor: data.textColor ?? null,
        borderColor: data.borderColor ?? null,
        ctaBgColor: data.ctaBgColor ?? null,
        ctaTextColor: data.ctaTextColor ?? null,
        titleFontFamily: data.titleFontFamily ?? null,
        bodyFontFamily: data.bodyFontFamily ?? null,
        expiresAt: data.expiresAt ?? null,
        isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
      };
      setSettings(next);
      saveLocal(next);
    } catch (e: any) {
      setError(e?.message || 'Error loading notice settings');
      const local = loadLocal(); if (local) setSettings(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const local = loadLocal(); if (local) setSettings(local);
    fetchRemote();
  }, [fetchRemote]);

  const save = useCallback(async (partial: Partial<NoticeSettings>) => {
    setSaving(true); setError(null);
    try {
      const next = { ...settings, ...partial } as NoticeSettings;
      const res = await fetch('/api/settings/notice', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: next.enabled,
          title: next.title,
          description: next.description,
          ctaLabel: next.ctaLabel,
          ctaUrl: next.ctaUrl,
          bgColor: next.bgColor ?? null,
          textColor: next.textColor ?? null,
          borderColor: next.borderColor ?? null,
          ctaBgColor: next.ctaBgColor ?? null,
          ctaTextColor: next.ctaTextColor ?? null,
          titleFontFamily: next.titleFontFamily ?? null,
          bodyFontFamily: next.bodyFontFamily ?? null,
          expiresAt: typeof next.expiresAt === 'string' || next.expiresAt === null ? next.expiresAt : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save notice settings');
      setSettings(next);
      saveLocal(next);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Error saving notice settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return { settings, loading, saving, error, refresh: fetchRemote, save };
}
