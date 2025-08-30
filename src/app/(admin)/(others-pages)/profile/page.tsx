"use client";
"use client";
import UserProfileForm from "@/components/user-profile/UserProfileForm";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserAddressCard from "@/components/user-profile/UserAddressCard";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import React, { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";

export default function Profile() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Usuário não encontrado.</div>;
  }

  return (
    <AuthGuard requiredPermission="dashboard">
      <div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
            Perfil do Usuário
          </h3>
          <div className="space-y-6">
            <UserMetaCard user={user} onEdit={() => setOpen(true)} />
            <UserInfoCard user={user} />
            <UserAddressCard user={user} />
            <Modal isOpen={open} onClose={() => setOpen(false)} className="w-1/3 mx-auto">
              <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">Meu perfil</h2>
                <UserProfileForm
                  user={user}
                  onSave={(data) => {
                    console.log(' Perfil salvo com sucesso:', {
                      hasPasswordChange: data.passwordChanged,
                      profileData: Object.keys(data)
                    });
                    setOpen(false);
                  }}
                />
              </div>
            </Modal>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
