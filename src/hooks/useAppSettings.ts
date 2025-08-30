import { useCallback, useEffect, useState } from 'react';

interface AppSettings {
  appName: string;
  showWelcome: boolean;
  welcomeMessage: string;
  advantages: { destaque: string; complemento: string; active?: boolean }[];
  showAdvantages: boolean;
  advantagesRotationMs: number;
  kanbanTextColor?: string; // nova configuração opcional para cor do texto no Kanban
  // Avisos/Promo Widget
  promoEnabled?: boolean;
  promoTitle?: string;
  promoDescription?: string;
  promoCtaLabel?: string;
  promoCtaUrl?: string;
}

const DEFAULTS: AppSettings = {
  appName: 'LabAdmin',
  showWelcome: true,
  welcomeMessage:
    'Estamos prontos para impulsionar sua experiência com uma gestão simplificada, eficiente e elegante. Explore, gerencie e transforme seus projetos com facilidade! 🚀',
  advantages: [
    { destaque: 'Crie restaurações perfeitas', complemento: 'com a precisão do CAD/CAM!', active: true },
    { destaque: 'Reduza o tempo de consulta', complemento: 'com designs rápidos e personalizados.', active: true },
  ],
  showAdvantages: true,
  advantagesRotationMs: 8000,
  kanbanTextColor: '#e5e7eb', // cinza-200 para bom contraste sobre cards coloridos
  // Defaults do aviso
  promoEnabled: true,
  promoTitle: 'Lab Admin - Painel Administrativo',
  promoDescription: 'Painel administrativo moderno, personalizável e completo para laboratórios.',
  promoCtaLabel: 'Upgrade To Pro',
  promoCtaUrl: 'https://tailadmin.com/pricing',
};
const LS_KEY = 'labadmin_app_settings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const loadLocal = (): AppSettings | null => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const saveLocal = (s: AppSettings) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  };

  const fetchRemote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/app', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const next: AppSettings = {
          appName: data.appName ?? DEFAULTS.appName,
          showWelcome: data.showWelcome ?? DEFAULTS.showWelcome,
          welcomeMessage: data.welcomeMessage ?? DEFAULTS.welcomeMessage,
          advantages: Array.isArray(data.advantages) && data.advantages.length > 0 ? data.advantages : DEFAULTS.advantages,
          showAdvantages: typeof data.showAdvantages === 'boolean' ? data.showAdvantages : DEFAULTS.showAdvantages,
          advantagesRotationMs: typeof data.advantagesRotationMs === 'number' ? data.advantagesRotationMs : DEFAULTS.advantagesRotationMs,
          kanbanTextColor: typeof data.kanbanTextColor === 'string' && data.kanbanTextColor ? data.kanbanTextColor : DEFAULTS.kanbanTextColor,
          // Avisos
          promoEnabled: typeof data.promoEnabled === 'boolean' ? data.promoEnabled : DEFAULTS.promoEnabled,
          promoTitle: typeof data.promoTitle === 'string' && data.promoTitle ? data.promoTitle : DEFAULTS.promoTitle,
          promoDescription: typeof data.promoDescription === 'string' && data.promoDescription ? data.promoDescription : DEFAULTS.promoDescription,
          promoCtaLabel: typeof data.promoCtaLabel === 'string' && data.promoCtaLabel ? data.promoCtaLabel : DEFAULTS.promoCtaLabel,
          promoCtaUrl: typeof data.promoCtaUrl === 'string' && data.promoCtaUrl ? data.promoCtaUrl : DEFAULTS.promoCtaUrl,
        };
        setSettings(next);
        saveLocal(next);
      } else {
        throw new Error('Falha ao carregar configurações');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar configurações');
      const local = loadLocal();
      if (local) setSettings(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const local = loadLocal();
    if (local) setSettings(local);
    fetchRemote();
  }, [fetchRemote]);

  const save = useCallback(async (partial: Partial<AppSettings>) => {
    setSaving(true);
    setError(null);
    try {
      const next = { ...settings, ...partial } as AppSettings;
      const res = await fetch('/api/settings/app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: next.appName,
          showWelcome: next.showWelcome,
          welcomeMessage: next.welcomeMessage,
          advantages: next.advantages,
          showAdvantages: next.showAdvantages,
          advantagesRotationMs: next.advantagesRotationMs,
          kanbanTextColor: next.kanbanTextColor,
          // Avisos
          promoEnabled: next.promoEnabled,
          promoTitle: next.promoTitle,
          promoDescription: next.promoDescription,
          promoCtaLabel: next.promoCtaLabel,
          promoCtaUrl: next.promoCtaUrl,
        }),
      });
      if (!res.ok) throw new Error('Não foi possível salvar');
      setSettings(next);
      saveLocal(next);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return { settings, loading, error, saving, refresh: fetchRemote, save };
}
