"use client";
import React, { useRef, useState } from "react";

import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Image from "next/image";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";


type UserMetaCardProps = {
  user: {
    avatar?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    city?: string;
    country?: string;
    email?: string;
    company?: string;
    phone?: string;
  };
  onEdit: () => void;
};

export default function UserMetaCard({ user, onEdit }: UserMetaCardProps) {
  const fallback = "https://ygzagzsnpomuukjaraid.supabase.co/storage/v1/object/public/uploads/general/202508/default.svg";
  const [imgSrc, setImgSrc] = useState<string>(user.avatar || fallback);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user: authUser, login } = useAuth(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file || !authUser?._id) return;
      const form = new FormData();
      form.append('file', file);
      form.append('userId', String(authUser._id));
      const res: any = await apiClient.post('/api/user/avatar', { body: form });
      if (res?.success && res.avatarUrl) {
        setImgSrc(res.avatarUrl);
        // atualiza user no estado/localStorage
        const updatedUser = { ...authUser, avatar: res.avatarUrl };
        login(updatedUser);
      }
    } catch (err) {
      console.error('Falha ao enviar avatar:', err);
    } finally {
      // limpa o input para permitir reupload do mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
            <button
              type="button"
              className="relative block w-20 h-20"
              onClick={() => fileInputRef.current?.click()}
              title="Alterar avatar"
            >
              <Image
                width={80}
                height={80}
                src={imgSrc}
                alt={user.firstName || "user"}
                onError={() => setImgSrc(fallback)}
              />
              <span className="absolute bottom-0 right-0 inline-flex items-center justify-center w-6 h-6 text-xs text-white bg-brand-600 rounded-full shadow">✎</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="order-3 xl:order-2">
              <div className="flex flex-col items-center gap-2 xl:items-start">
              <div className="text-xl font-semibold text-gray-800 dark:text-white/90">
                {user.firstName || "firstname"} {user.lastName || "lastname"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {user.company || "company"}
              </div>
              <div className="text-sm text-gray-400">
                {user.email || "email@email.com"}
              </div>
            </div>
          </div>
          <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
            <button onClick={onEdit} className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto">
              <svg
                className="fill-current"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                  fill=""
                />
              </svg>
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
