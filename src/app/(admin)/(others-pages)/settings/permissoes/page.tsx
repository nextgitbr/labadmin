"use client";
import PermissionsTable from "./PermissionsTable";

import AuthGuard from '@/components/auth/AuthGuard';

export default function PermissoesPage() {
  return (
    <AuthGuard requiredPermission="configuracoes">
      <main className="min-h-screen bg-white dark:bg-gray-950">
        <h1 className="text-2xl font-bold px-6 pt-8 pb-4 text-blue-light-500 dark:text-blue-light-400">Permissões dos Perfis</h1>
        <PermissionsTable />
      </main>
    </AuthGuard>
  );
}
