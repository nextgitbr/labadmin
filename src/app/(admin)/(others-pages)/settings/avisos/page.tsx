"use client";

import React from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import NoticeSettings from "@/components/settings/NoticeSettings";

export default function AvisosSettingsPage() {
  return (
    <AuthGuard requiredPermission="notice">
      <PageBreadcrumb pageTitle="Configurações de Avisos" />
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <NoticeSettings />
        </div>
      </div>
    </AuthGuard>
  );
}
