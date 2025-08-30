"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { SessionTimeoutProvider, useSessionTimeout } from '@/context/SessionTimeoutContext';
import SessionTimeoutModal from '@/components/session/SessionTimeoutModal';
// import { useGlobalSessionTimeout } from '@/hooks/useGlobalSessionTimeout';
import { SessionAlertProvider } from '@/context/SessionAlertContext';
import { SuccessAlertProvider } from '@/context/SuccessAlertContext';
import { ErrorAlertProvider } from '@/context/ErrorAlertContext';
import SessionAlertManager from '@/components/alerts/SessionAlertManager';
import { Toaster } from 'react-hot-toast';
import SidebarSuccessAlert from '@/components/alerts/SidebarSuccessAlert';
import SidebarErrorAlert from '@/components/alerts/SidebarErrorAlert';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user, loading, logout } = useAuth(true);


  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }
  if (!user) {
    // O useAuth já redireciona, mas evita renderização do layout
    return null;
  }

  // Modal de sessão expirada
  function SessionTimeoutHandler() {
    const { isIdle } = useSessionTimeout();
    console.log('AdminLayout SessionTimeoutHandler: isIdle =', isIdle);
    return <SessionTimeoutModal open={isIdle} />;
  }

  return (
    <SessionAlertProvider>
      <SuccessAlertProvider>
        <ErrorAlertProvider>
        <SessionTimeoutProvider timeoutMinutes={30} onLogout={logout}>
          <Toaster position="top-right" />
          <SessionTimeoutHandler />
          <SessionAlertManager />
          <div className="min-h-screen xl:flex">
            {/* Sidebar and Backdrop */}
            <AppSidebar />
            <Backdrop />
            {/* Main Content Area */}
            <div
              className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
            >
              {/* Header */}
              <AppHeader />
              {/* Alert Dock (overlay, below topbar) */}
              <div className="relative px-4 md:px-6">
                <div className="absolute top-4 right-0 z-[60] max-w-sm w-full">
                  <SidebarSuccessAlert />
                  <SidebarErrorAlert />
                </div>
              </div>
              {/* Page Content */}
              <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
            </div>
          </div>
        </SessionTimeoutProvider>
        </ErrorAlertProvider>
      </SuccessAlertProvider>
    </SessionAlertProvider>
  );
}
