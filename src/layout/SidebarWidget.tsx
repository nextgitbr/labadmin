import React from "react";
import { useNoticeSettings } from "@/hooks/useNoticeSettings";

export default function SidebarWidget() {
  const { settings } = useNoticeSettings();

  if (!settings?.enabled) return null;
  // hide if expired
  const expired = (settings as any).expiresAt
    ? new Date((settings as any).expiresAt as string).getTime() <= Date.now()
    : false;
  const active = typeof (settings as any).isActive === 'boolean' ? (settings as any).isActive : !expired;
  if (!active) return null;

  const title = settings.title || 'Lab Admin - Admin Panel';
  const desc = settings.description || 'Modern, customizable and complete admin panel for labs.';
  const label = settings.ctaLabel || 'Learn more';
  const url = settings.ctaUrl || '#';

  const boxStyle: React.CSSProperties = {
    backgroundColor: settings.bgColor || undefined,
    color: settings.textColor || undefined,
    borderColor: settings.borderColor || undefined,
    borderWidth: settings.borderColor ? 1 : undefined,
    borderStyle: settings.borderColor ? 'solid' : undefined,
  };

  const mapTokenToFont = (token?: string | null): string | undefined => {
    switch ((token || '').toLowerCase()) {
      case 'inter':
        return "var(--font-sans-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', sans-serif";
      case 'roboto':
        return "var(--font-sans-roboto), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', sans-serif";
      case 'playfair':
        return "var(--font-serif-playfair), Georgia, 'Times New Roman', Times, serif";
      case 'merriweather':
        return "var(--font-serif-merriweather), Georgia, 'Times New Roman', Times, serif";
      case 'georgia':
        return "Georgia, 'Times New Roman', Times, serif";
      case 'monospace':
        return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
      case 'system':
        return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif";
      default:
        return undefined; // usa o default do tema
    }
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: mapTokenToFont(settings.titleFontFamily),
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: mapTokenToFont(settings.bodyFontFamily),
  };

  const ctaStyle: React.CSSProperties = {
    backgroundColor: settings.ctaBgColor || undefined,
    color: settings.ctaTextColor || undefined,
  };

  return (
    <div
      className={`mx-auto mb-10 w-full max-w-60 rounded-2xl px-4 py-5 text-center bg-gray-50 dark:bg-white/[0.03]`}
      style={boxStyle}
    >
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white" style={titleStyle}>
        {title}
      </h3>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400" style={bodyStyle}>
        {desc}
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="nofollow noopener"
          className="flex items-center justify-center p-3 font-medium rounded-lg text-theme-sm bg-brand-500 text-white hover:bg-brand-600"
          style={ctaStyle}
        >
          {label}
        </a>
      ) : null}
    </div>
  );
}

