"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import { useRoles } from "@/hooks/useRoles";
import { useUserProfile } from "@/hooks/useUserProfile";

// Adicionar tipagem opcional para datas no tipo UserProfile
interface UserProfileWithDates {
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
// Se houver interface UserProfile, adicionar os campos createdAt/updatedAt nela também.

interface FormData {
  avatar: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  country: string;
  city: string;
  zip: string;
  vat: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfileForm({ user, onSave }: { user: any; onSave: (data: any) => void }) {
  const [enderecosSalvos, setEnderecosSalvos] = useState(false);
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();
  const { profile, loading: profileLoading, saving, error: profileError, updateProfile, loadProfile } = useUserProfile();

  // Garantir que profile já foi declarado e datas tipadas
  let createdAt: Date | null = null;
  let updatedAt: Date | null = null;
  const rawCreatedAt = user?.createdAt || (profile && (profile as any)?.createdAt);
  const rawUpdatedAt = user?.updatedAt || (profile && (profile as any)?.updatedAt);
  if (rawCreatedAt) createdAt = new Date(rawCreatedAt);
  if (rawUpdatedAt) updatedAt = new Date(rawUpdatedAt);

  const [form, setForm] = useState<FormData>({
    avatar: user?.avatar || "/images/user/owner.jpg",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    role: user?.role || "",
    company: user?.company || "",
    country: user?.country || "",
    city: user?.city || "",
    zip: user?.zip || "",
    vat: user?.vat || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isAdmin = user?.role === "admin" || user?.role === "Administrador";

  // Carregar perfil do usuário quando o componente montar
  useEffect(() => {
    if ((user?._id || user?.id) && !profile && !profileLoading) {
      loadProfile(user._id || user.id);
    }
  }, [user?._id, user?.id]); // Removido loadProfile das dependências para evitar loop

  // Atualizar formulário quando o perfil for carregado
  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        role: profile.role || "",
        company: profile.company || "",
        country: profile.country || "",
        city: profile.city || "",
        zip: profile.zip || "",
        vat: profile.vat || "",
        avatar: profile.avatar || "/images/user/owner.jpg",
      }));
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!user?._id && !user?.id) {
      setMessage({ type: 'error', text: 'ID do usuário não encontrado' });
      return;
    }

    try {
      // Validar campos de senha se preenchidos
      let passwordData = undefined;
      if (form.currentPassword || form.newPassword || form.confirmPassword) {
        if (!form.currentPassword) {
          setMessage({ type: 'error', text: 'Senha atual é obrigatória para alterar a senha' });
          return;
        }
        if (!form.newPassword) {
          setMessage({ type: 'error', text: 'Nova senha é obrigatória' });
          return;
        }
        if (form.newPassword !== form.confirmPassword) {
          setMessage({ type: 'error', text: 'Nova senha e confirmação não coincidem' });
          return;
        }
        if (form.newPassword.length < 6) {
          setMessage({ type: 'error', text: 'Nova senha deve ter pelo menos 6 caracteres' });
          return;
        }
        
        passwordData = {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        };
      }

      // Preparar dados do perfil
      const profileData: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        country: form.country,
        city: form.city,
        zip: form.zip,
        vat: form.vat,
      };
      
      // Incluir company apenas se o usuário for médico ou laboratório
      if (form.role.toLowerCase() === 'doctor' || form.role.toLowerCase() === 'laboratory') {
        profileData.company = form.company;
      }

      // Atualizar perfil usando a API real
      const success = await updateProfile(user._id || user.id, profileData, passwordData);
      
      if (success) {
        // Só some os campos se todos estiverem preenchidos
        if (form.country && form.city && form.zip && form.vat) {
          setEnderecosSalvos(true);
        }
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        
        // Limpar campos de senha após sucesso
        setForm(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));

        // Notificar componente pai
        onSave({ ...profileData, passwordChanged: !!passwordData });
        // Forçar reload do profile após salvar para pegar datas atualizadas
        await loadProfile(user._id || user.id);
      }

    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      setMessage({ type: 'error', text: 'Erro ao salvar perfil. Tente novamente.' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ao editar qualquer campo de endereço, reabilita exibição se estava oculto
    if (["country","city","zip","vat"].includes(e.target.name)) {
      setEnderecosSalvos(false);
    }
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setForm(prev => ({ ...prev, role: value }));
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit} autoComplete="off">
      {/* Mensagens de feedback */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
            : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Erro da API */}
      {profileError && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          {profileError}
        </div>
      )}

      <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-start">
        <div className="w-24 h-24 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
          <Image width={96} height={96} src={form.avatar} alt="user avatar" />
        </div>
        <div className="flex-1 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-7">
          <div>
            <Label htmlFor="firstName">Nome</Label>
            <Input name="firstName" defaultValue={form.firstName} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="lastName">Sobrenome</Label>
            <Input name="lastName" defaultValue={form.lastName} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input name="email" type="email" defaultValue={form.email} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input name="phone" defaultValue={form.phone} onChange={handleChange} />
          </div>
          
          {/* Campo Função - apenas para admins */}
          {isAdmin && (
            <div>
              <Label htmlFor="role">Função</Label>
              <Select
                options={roles}
                defaultValue={form.role}
                onChange={handleRoleChange}
                placeholder="Selecione uma função"
              />
            </div>
          )}
          
          {/* Campo Company - condicional para doctors/laboratory */}
          {(form.role.toLowerCase() === 'doctor' || form.role.toLowerCase() === 'laboratory') && (
            <div>
              <Label htmlFor="company">
                {form.role.toLowerCase() === 'doctor' ? 'Clínica' : 'Laboratório'}
              </Label>
              <Input 
                name="company" 
                defaultValue={form.company}
                onChange={handleChange}
                placeholder={`Digite o nome do ${form.role.toLowerCase() === 'doctor' ? 'clínica' : 'laboratório'}`}
              />
            </div>
          )}
          
          {/* Campos de endereço - apenas no primeiro acesso (quando vazios) ou para admins */}
          {(isAdmin || (createdAt && updatedAt && createdAt.getTime() === updatedAt.getTime()) || !enderecosSalvos) && (
            <>
              <div>
                <Label htmlFor="country">País</Label>
                <Input name="country" defaultValue={form.country} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="city">Cidade/Estado</Label>
                <Input name="city" defaultValue={form.city} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="zip">Código Postal</Label>
                <Input name="zip" defaultValue={form.zip} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="vat">NIF</Label>
                <Input name="vat" defaultValue={form.vat} onChange={handleChange} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-start">
        <div className="w-24 h-24 flex items-center justify-center">
          <div className="text-2xl">🔒</div>
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Alterar Senha (Opcional)</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Deixe em branco se não quiser alterar a senha</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-7">
            <div className="md:col-span-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input 
                name="currentPassword" 
                type="password" 
                placeholder="Digite sua senha atual"
                defaultValue={form.currentPassword} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input 
                name="newPassword" 
                type="password" 
                placeholder="Digite a nova senha"
                defaultValue={form.newPassword} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input 
                name="confirmPassword" 
                type="password" 
                placeholder="Confirme a nova senha"
                defaultValue={form.confirmPassword} 
                onChange={handleChange} 
              />
            </div>
          </div>
        </div>
      </div>

      
      <div className="flex justify-end">
        <Button disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
