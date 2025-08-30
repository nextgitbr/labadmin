import React from "react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-2">Acesso Negado</h2>
      <p className="text-gray-700 dark:text-gray-300 mb-4">Você não tem permissão para acessar esta página.</p>
      <a href="/" className="text-blue-500 hover:underline">Voltar para o início</a>
    </div>
  );
}
