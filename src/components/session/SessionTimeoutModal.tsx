"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function SessionTimeoutModal({ open }: { open: boolean }) {
  const router = useRouter();

  if (process.env.NODE_ENV !== 'production') console.log('SessionTimeoutModal: open =', open);

  const handleRedirectToLogin = () => {
    if (process.env.NODE_ENV !== 'production') console.log('SessionTimeoutModal: Redirecionando para login');
    router.replace("/signin");
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Se clicou no backdrop (fora do modal), redireciona para login
    if (e.target === e.currentTarget) {
      if (process.env.NODE_ENV !== 'production') console.log('SessionTimeoutModal: Clique no backdrop detectado');
      handleRedirectToLogin();
    }
  };

  if (!open) {
    if (process.env.NODE_ENV !== 'production') console.log('SessionTimeoutModal: Modal fechado, não renderizando');
    return null;
  }

  if (process.env.NODE_ENV !== 'production') console.log('SessionTimeoutModal: Renderizando modal');
  
  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Sessão expirada</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">Por segurança, sua sessão foi encerrada por inatividade.</p>
        <button
          onClick={handleRedirectToLogin}
          className="px-6 py-2 rounded-lg bg-blue-light-500 text-white font-semibold hover:bg-blue-light-600 transition-colors"
        >
          Fazer login novamente
        </button>
      </div>
    </div>
  );
}
