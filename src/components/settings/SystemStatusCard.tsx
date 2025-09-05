"use client";
import React from "react";
import { apiClient } from "@/lib/apiClient";

type BuildInfo = { version: string; commit?: string | null; builtAt?: string | null; nodeEnv?: string };
type ErrorsInfo = { errors: Array<{ id: string; message: string; level?: string; createdAt?: string }> };

export default function SystemStatusCard() {
  const [build, setBuild] = React.useState<BuildInfo | null>(null);
  const [activeUsers, setActiveUsers] = React.useState<number | null>(null);
  const [errors, setErrors] = React.useState<ErrorsInfo["errors"]>([]);
  const [loading, setLoading] = React.useState(true);
  const [windowMinutes, setWindowMinutes] = React.useState<number>(15);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [b, a, e] = await Promise.all([
          apiClient.get<BuildInfo>("/api/system/build").catch(() => ({ version: "-" } as BuildInfo)),
          apiClient.get<{ activeUsers: number }>(`/api/system/active-users?windowMinutes=${windowMinutes}`).catch(() => ({ activeUsers: 0 })),
          apiClient.get<ErrorsInfo>("/api/system/errors?limit=5").catch(() => ({ errors: [] })),
        ]);
        if (!mounted) return;
        setBuild(b);
        setActiveUsers(a?.activeUsers ?? 0);
        setErrors(e?.errors ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [windowMinutes]);

  const builtAtFmt = build?.builtAt ? new Date(build.builtAt).toLocaleString() : "—";
  const version = build?.version || "—";
  const commit = build?.commit ? build.commit.slice(0, 7) : null;
  const env = build?.nodeEnv || process.env.NODE_ENV || "-";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Erros em execução */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/10 dark:border-red-900/30">
        <span className="font-semibold text-red-600 dark:text-red-400">Erros em execução</span>
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="text-sm text-red-700 dark:text-red-300">Carregando...</div>
          ) : errors.length === 0 ? (
            <div className="text-sm text-red-700 dark:text-red-300">Nenhum erro no momento.</div>
          ) : (
            <ul className="text-sm text-red-700 dark:text-red-300 list-disc pl-5">
              {errors.map(err => (
                <li key={err.id} className="break-words">
                  <span className="font-medium">{err.createdAt ? new Date(err.createdAt).toLocaleString() + ": " : ""}</span>
                  {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Status da Build / Usuários / Última Atualização */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-gray-900/10 dark:border-gray-900/30">
        <div className="flex flex-col gap-2">
          <span className="font-medium text-gray-700 dark:text-gray-200">Versão da Build</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Carregando..." : version}
            {commit ? ` (${commit})` : ""}
          </span>

          <div className="flex items-center gap-2 mt-2">
            <span className="font-medium text-gray-700 dark:text-gray-200">Usuários logados</span>
            <select
              className="ml-auto rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs px-2 py-1 text-gray-700 dark:text-gray-200"
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(parseInt(e.target.value, 10))}
              aria-label="Intervalo em minutos"
            >
              <option value={5}>últimos 5 min</option>
              <option value={15}>últimos 15 min</option>
              <option value={60}>últimos 60 min</option>
            </select>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{loading || activeUsers === null ? "Carregando..." : activeUsers}</span>

          <span className="font-medium text-gray-700 dark:text-gray-200 mt-2">Última Atualização</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{loading ? "Carregando..." : builtAtFmt}</span>

          <span className="font-medium text-gray-700 dark:text-gray-200 mt-2">Ambiente</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{env}</span>
        </div>
      </div>
    </div>
  );
}
