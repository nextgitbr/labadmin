"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Entrar no sistema
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Informe seu e-mail e senha para acessar o Lab Admin.
            </p>
          </div>
          <div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setError(null);
                const form = e.target as HTMLFormElement & { elements: any };
                const email = form.elements[0].value as string;
                const password = form.elements[1].value as string;
                if (!email || !password) {
                  setError("Preencha e-mail e senha!");
                  return;
                }
                try {
                  setSubmitting(true);
                  const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                  });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    setError(data?.error || 'Credenciais inválidas');
                    return;
                  }
                  const payload = await res.json();
                  const user = payload?.user || payload; // compatibilidade legado
                  const token = payload?.token;
                  if (token) {
                    localStorage.setItem('labadmin_token', token);
                  }
                  localStorage.setItem('labadmin_user', JSON.stringify(user));
                  window.location.href = '/';
                } catch (err) {
                  console.error('Erro no login:', err);
                  setError('Erro ao conectar. Tente novamente.');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div className="space-y-6">
                {error && (
                  <div className="text-error-500 text-sm">{error}</div>
                )}
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input placeholder="info@email.com" type="email" />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua Senha"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Manter conectado
                    </span>
                  </div>
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={submitting}>
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
