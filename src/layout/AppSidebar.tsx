"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  ListIcon,
  TableIcon,
  UserCircleIcon,
  FileIcon,
} from "../icons/index";
import SettingsGearIcon from "../icons/SettingsGearIcon";
import SidebarWidget from "./SidebarWidget";
import { usePermissions } from "@/hooks/usePermissions";
import { permissionsList } from "@/permissions/permissionsList";
import SidebarSessionAlert from '@/components/alerts/SidebarSessionAlert';
import SidebarSuccessAlert from '@/components/alerts/SidebarSuccessAlert';
import { useAuth } from "@/hooks/useAuth";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

// Simple dropdown item for submenu (e.g., Configurações)
function SidebarDropdownItem({
  item,
  pathname,
  showText,
  defaultOpen = false,
}: {
  item: NavItem;
  pathname: string | null;
  showText: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`menu-item group ${open ? "menu-item-active" : "menu-item-inactive"} cursor-pointer ${
          showText ? "lg:justify-start" : "lg:justify-center"
        }`}
      >
        <span className={`${open ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>{item.icon}</span>
        {showText && <span className="menu-item-text">{item.name}</span>}
        {showText && (
          <ChevronDownIcon
            className={`ml-auto w-5 h-5 transition-transform duration-200 ${open ? "rotate-180 text-brand-500" : ""}`}
          />
        )}
      </button>

      {showText && (
        <div
          className={`overflow-hidden transition-all duration-300 ${open ? "max-h-96" : "max-h-0"}`}
        >
          <ul className="mt-2 space-y-1 ml-9">
            {(item.subItems || []).map((sub) => (
              <li key={sub.path}>
                <Link
                  href={sub.path}
                  className={`menu-dropdown-item ${
                    pathname === sub.path ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
                  }`}
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const AppSidebar: React.FC = () => {
  // Client logs for visibility
  console.log("📚 AppSidebar mounted");

  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth();
  const { canAccess } = usePermissions(user?.role, permissionsList, user?.permissions);

  // Build nav items according to permissions (simplified render)
  const navItems: NavItem[] = useMemo(() => {
    const items: (NavItem | false)[] = [
      canAccess("dashboard") && { icon: <GridIcon />, name: "Dashboard", path: "/" },
      canAccess("pedidos") && { icon: <TableIcon />, name: "Pedidos", path: "/orders" },
      canAccess("kanban") && { icon: <BoxCubeIcon />, name: "Kanban - Pedidos", path: "/kanban" },
      canAccess("tasklist") && { icon: <ListIcon />, name: "Task List", path: "/task-list" },
      canAccess("tabelaPrecos") && { icon: <FileIcon />, name: "Tabela de Preços", path: "/tables-pricing" },
      canAccess("calendar") && { icon: <CalenderIcon />, name: "Calendar", path: "/calendar" },
      canAccess("usuarios") && { icon: <UserCircleIcon />, name: "Usuários", path: "/users" },
      // Configurações: mostrar se tiver a permissão pai OU qualquer sub-permissão
      (() => {
        const canSeeSettings =
          canAccess("configuracoes") ||
          canAccess("configuracoesKanban") ||
          canAccess("notice") ||
          canAccess("configuracoesProducao") ||
          (canAccess as any)("configuracoesProdutos") ||
          (canAccess as any)("configuracoesCategorias");
        if (!canSeeSettings) return false;
        const subItems: { name: string; path: string }[] = [];
        // Acesso à página geral de settings somente se 'configuracoes' estiver permitido
        if (canAccess("configuracoes")) subItems.push({ name: "Geral", path: "/settings" });
        if (canAccess("configuracoesProducao")) subItems.push({ name: "Produção", path: "/settings/production" });
        if (canAccess("configuracoesKanban")) subItems.push({ name: "Kanban", path: "/settings/kanban" });
        if (canAccess("notice")) subItems.push({ name: "Avisos", path: "/settings/avisos" });
        if ((canAccess as any)("configuracoesProdutos")) subItems.push({ name: "Produtos", path: "/settings/produtos" });
        if ((canAccess as any)("configuracoesCategorias")) subItems.push({ name: "Categorias", path: "/settings/categorias" });
        return {
          icon: <SettingsGearIcon />, name: "Configurações",
          subItems,
        } as NavItem;
      })(),
    ];
    return items.filter(Boolean) as NavItem[];
  }, [canAccess]);

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  const showText = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/">
          {showText ? (
            <>
              <Image
                className="dark:hidden"
                src="https://ygzagzsnpomuukjaraid.supabase.co/storage/v1/object/public/uploads/general/202508/logo-dentallab.svg"
                alt="Logo Dentallab"
                width={150}
                height={40}
                priority
              />
              <Image
                className="hidden dark:block"
                src="https://ygzagzsnpomuukjaraid.supabase.co/storage/v1/object/public/uploads/general/202508/logo-dentallab.svg"
                alt="Logo Dentallab"
                width={150}
                height={40}
                priority
              />
            </>
          ) : (
            <Image
              src="https://ygzagzsnpomuukjaraid.supabase.co/storage/v1/object/public/uploads/general/202508/logo-dentallab.svg"
              alt="Logo Dentallab"
              width={32}
              height={32}
              priority
            />
          )}
        </Link>
      </div>

      <div className="flex flex-col h-full overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <ul className="flex flex-col gap-4">
            {navItems.map((item) => {
              const hasSub = item.subItems && item.subItems.length > 0;
              // local state per-item is tricky; for now handle only for settings (single submenu)
              const isSettings = item.name === "Configurações";
              return (
                <li key={item.name}>
                  {hasSub ? (
                    <SidebarDropdownItem
                      item={item}
                      pathname={pathname}
                      showText={showText}
                      defaultOpen={pathname?.startsWith('/settings')}
                    />
                  ) : item.path ? (
                    <Link
                      href={item.path}
                      className={`menu-item group ${pathname === item.path ? "menu-item-active" : "menu-item-inactive"}`}
                    >
                      <span className={`${pathname === item.path ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                        {item.icon}
                      </span>
                      {showText && <span className="menu-item-text">{item.name}</span>}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        {showText ? <SidebarWidget /> : null}

        {/* Alerts */}
        <SidebarSessionAlert />
        <div className="mt-2">
          <SidebarSuccessAlert />
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
