"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const nav = [
  { href: "/settings", label: "Visão geral" },
  { href: "/settings/produtos", label: "Produtos" },
  { href: "/settings/categorias", label: "Categorias" },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
        {nav.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-1 last:mb-0 transition-colors
                ${active
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60"}
              `}
            >
              <span>{item.label}</span>
              {active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Ativo</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default SettingsSidebar;
