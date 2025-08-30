"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";
import Switch from "@/components/form/switch/Switch";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";
import Tabs from "@/components/ui/Tabs";

import { useSessionConfig } from '@/hooks/useSessionConfig';
import { useSessionTimeout } from '@/context/SessionTimeoutContext';
import { usePinManager } from '@/hooks/usePinManager';
import PinProtection from '@/components/auth/PinProtection';
import SessionAlertSettings from '@/components/settings/SessionAlertSettings';
import SuccessAlertSettings from '@/components/settings/SuccessAlertSettings';
import LocalStorageSettings from '@/components/settings/LocalStorageSettings';

import AuthGuard from '@/components/auth/AuthGuard';
import { useAppSettings } from '@/hooks/useAppSettings';

export default function SettingsPage() {
  const { timeoutMinutes, loading, error, saveTimeout } = useSessionConfig();
  const { remaining } = useSessionTimeout();
  const [inputValue, setInputValue] = React.useState<number>(timeoutMinutes);
  React.useEffect(() => { setInputValue(timeoutMinutes); }, [timeoutMinutes]);

  // App Settings (nome da aplicação + welcome card)
  const { settings: appSettings, save: saveAppSettings, saving: savingAppSettings } = useAppSettings();
  const [appName, setAppName] = React.useState<string>('');
  const [showWelcome, setShowWelcome] = React.useState<boolean>(true);
  const [welcomeMessage, setWelcomeMessage] = React.useState<string>('');
  const [advantages, setAdvantages] = React.useState<{ destaque: string; complemento: string; active?: boolean }[]>([]);
  const [showAdvantages, setShowAdvantages] = React.useState<boolean>(true);
  const [advantagesRotationMs, setAdvantagesRotationMs] = React.useState<number>(8000);
  const [isAdvModalOpen, setIsAdvModalOpen] = React.useState<boolean>(false);
  const [editAdvIndex, setEditAdvIndex] = React.useState<number | null>(null);
  const [advForm, setAdvForm] = React.useState<{ destaque: string; complemento: string; active: boolean }>({ destaque: '', complemento: '', active: true });
  React.useEffect(() => {
    setAppName(appSettings.appName || '');
    setShowWelcome(appSettings.showWelcome ?? true);
    setWelcomeMessage(appSettings.welcomeMessage || '');
    setAdvantages(Array.isArray(appSettings.advantages) ? appSettings.advantages.map(it => ({ ...it, active: it.active !== false })) : []);
    setShowAdvantages(appSettings.showAdvantages ?? true);
    setAdvantagesRotationMs(Number(appSettings.advantagesRotationMs) || 8000);
  }, [appSettings.appName, appSettings.showWelcome, appSettings.welcomeMessage, appSettings.advantages, appSettings.showAdvantages, appSettings.advantagesRotationMs]);

  // Estados para gerenciar PIN
  const pinManager = usePinManager();
  const [pinData, setPinData] = React.useState({
    currentPin: '',
    newPin: '',
    confirmNewPin: ''
  });

  // Função para lidar com mudanças nos campos do PIN
  const handlePinChange = (field: keyof typeof pinData, value: string) => {
    setPinData(prev => ({ ...prev, [field]: value }));
    pinManager.clearMessages();
  };

  // Função para alterar PIN
  const handleChangePin = async () => {
    const success = await pinManager.changePin(pinData);
    if (success) {
      setPinData({ currentPin: '', newPin: '', confirmNewPin: '' });
    }
  };

  // Formatar tempo restante para próxima alteração
  const formatTimeRemaining = (timeMs: number): string => {
    const seconds = Math.ceil(timeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Configurações" />
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white pt-4 dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Tabs para Configurações */}
          <Tabs
            tabs={[
              {
                label: "Sistema",
                content: (
                  <div className="space-y-6">
                    {/* Status da aplicação, erros, versão, usuários logados, última atualização */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/10 dark:border-red-900/30">
                        <span className="font-semibold text-red-600 dark:text-red-400">Erros em execução</span>
                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">Nenhum erro no momento.</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-gray-900/10 dark:border-gray-900/30">
                        <div className="flex flex-col gap-2">
                          <span className="font-medium text-gray-700 dark:text-gray-200">Versão da Build</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">2.0.2</span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">Usuários logados</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">2</span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">Última Atualização</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">01/08/2025 10:00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                label: "Aparência",
                content: (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                      <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Personalização</div>
                      <div className="flex flex-col gap-4">
                        <InputField
                          id="appName"
                          placeholder="Nome da Aplicação"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          className=""
                        />
                        <div className="text-xs text-gray-500 dark:text-gray-400">Atual: <b>{appSettings.appName}</b></div>
                        {/* Logomarca e favicon com preview (placeholder) */}
                        <div className="flex flex-col md:flex-row gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Logomarca</label>
                            <input type="file" className="block w-full text-sm text-gray-400 dark:text-gray-400" />
                            <div className="mt-2 w-24 h-12 bg-gray-100 dark:bg-gray-900 rounded flex items-center justify-center">Preview</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Favicon</label>
                            <input type="file" className="block w-full text-sm text-gray-400 dark:text-gray-400" />
                            <div className="mt-2 w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded flex items-center justify-center">Preview</div>
                          </div>
                        </div>
                        {/* Cores dominantes (placeholder) */}
                        <div className="flex gap-4 items-center">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Cores dominantes</label>
                          <input type="color" className="w-8 h-8 rounded" />
                          <input type="color" className="w-8 h-8 rounded" />
                        </div>
                      </div>
                      <Button
                        className="mt-3 w-full sm:w-auto sm:ml-auto"
                        size="md"
                        variant="primary"
                        onClick={async () => {
                          const trimmed = (appName || '').trim();
                          if (!trimmed) return;
                          await saveAppSettings({ appName: trimmed });
                        }}
                        disabled={savingAppSettings || (appName || '').trim().length === 0}
                      >
                        {savingAppSettings ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                      <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Card Boas-vindas</div>
                      <Switch
                        key={showWelcome ? 'on' : 'off'}
                        label="Exibir card de boas-vindas"
                        defaultChecked={showWelcome}
                        onChange={(checked) => setShowWelcome(checked)}
                      />
                      <div className="mt-4">
                        <label htmlFor="welcomeMessage" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Mensagem de boas-vindas</label>
                        <TextArea
                          placeholder="Digite a mensagem que será exibida no dashboard"
                          rows={3}
                          value={welcomeMessage}
                          onChange={(val: string) => setWelcomeMessage(val)}
                        />
                        <Button
                          className="mt-3 w-full sm:w-auto sm:ml-auto"
                          size="md"
                          variant="primary"
                          onClick={async () => {
                            await saveAppSettings({ showWelcome, welcomeMessage });
                          }}
                          disabled={savingAppSettings}
                        >
                          {savingAppSettings ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Card Vantagens</div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-3">
                        <div className="sm:ml-auto flex gap-3 items-center">
                          <Switch
                            label="Exibir"
                            defaultChecked={showAdvantages}
                            onChange={(checked) => setShowAdvantages(checked)}
                            key={showAdvantages ? 'adv-on' : 'adv-off'}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Rotação (ms)</span>
                            <InputField
                              id="advantagesRotationMs"
                              type="number"
                              min="2000"
                              max="60000"
                              value={String(advantagesRotationMs)}
                              onChange={(e) => setAdvantagesRotationMs(Math.max(2000, Math.min(60000, Number(e.target.value) || 8000)))}
                            />
                          </div>
                        </div>
                      </div>
                      <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-200">Mensagens de vantagens</label>
                      <div className="w-full overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left">#</th>
                              <th className="px-4 py-3 text-left">Destaque</th>
                              <th className="px-4 py-3 text-left">Complemento</th>
                              <th className="px-4 py-3 text-left">Status</th>
                              <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {advantages.map((item, idx) => (
                              <tr key={idx} className="border-t border-gray-100 dark:border-gray-700/60">
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{item.destaque || <span className="text-gray-400">—</span>}</td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[420px] truncate">{item.complemento || <span className="text-gray-400">—</span>}</td>
                                <td className="px-4 py-3">
                                  {item.active !== false ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-0.5 text-xs">Ativo</span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300 px-2.5 py-0.5 text-xs">Inativo</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditAdvIndex(idx);
                                        setAdvForm({ destaque: item.destaque || '', complemento: item.complemento || '', active: item.active !== false });
                                        setIsAdvModalOpen(true);
                                      }}
                                    >Editar</Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAdvantages(prev => {
                                        if (idx === 0) return prev;
                                        const arr = [...prev];
                                        const tmp = arr[idx-1];
                                        arr[idx-1] = arr[idx];
                                        arr[idx] = tmp;
                                        return arr;
                                      })}
                                    >↑</Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAdvantages(prev => {
                                        if (idx >= prev.length - 1) return prev;
                                        const arr = [...prev];
                                        const tmp = arr[idx+1];
                                        arr[idx+1] = arr[idx];
                                        arr[idx] = tmp;
                                        return arr;
                                      })}
                                    >↓</Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAdvantages(prev => {
                                        const arr = [...prev];
                                        arr.splice(idx + 1, 0, { ...arr[idx] });
                                        return arr;
                                      })}
                                    >Duplicar</Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAdvantages(prev => prev.filter((_, i) => i !== idx))}
                                    >Remover</Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {advantages.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">Nenhuma frase adicionada.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex gap-3 items-center mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditAdvIndex(null);
                            setAdvForm({ destaque: '', complemento: '', active: true });
                            setIsAdvModalOpen(true);
                          }}
                        >Adicionar frase</Button>
                        <Button
                          className="sm:ml-auto"
                          size="md"
                          variant="primary"
                          onClick={async () => {
                            const cleaned = advantages.filter(it => (it.destaque?.trim() || it.complemento?.trim()));
                            await saveAppSettings({ advantages: cleaned, showAdvantages, advantagesRotationMs });
                          }}
                          disabled={savingAppSettings}
                        >{savingAppSettings ? 'Salvando...' : 'Salvar'}</Button>
                      </div>

                      {isAdvModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAdvModalOpen(false)}></div>
                          <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 w-full max-w-lg shadow-xl">
                            <div className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{editAdvIndex === null ? 'Adicionar frase' : 'Editar frase'}</div>
                            <div className="space-y-4">
                              <InputField
                                id="adv-destaque"
                                placeholder="Título em destaque"
                                value={advForm.destaque}
                                onChange={(e) => setAdvForm(prev => ({ ...prev, destaque: e.target.value }))}
                              />
                              <InputField
                                id="adv-complemento"
                                placeholder="Complemento da frase"
                                value={advForm.complemento}
                                onChange={(e) => setAdvForm(prev => ({ ...prev, complemento: e.target.value }))}
                              />
                              <div className="pt-1">
                                <Switch
                                  label="Ativo"
                                  key={advForm.active ? 'modal-active-on' : 'modal-active-off'}
                                  defaultChecked={advForm.active}
                                  onChange={(checked) => setAdvForm(prev => ({ ...prev, active: checked }))}
                                />
                              </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                              <Button variant="outline" size="md" onClick={() => setIsAdvModalOpen(false)}>Cancelar</Button>
                              <Button
                                variant="primary"
                                size="md"
                                onClick={() => {
                                  const payload = { destaque: (advForm.destaque || '').trim(), complemento: (advForm.complemento || '').trim(), active: advForm.active };
                                  if (editAdvIndex === null) {
                                    setAdvantages(prev => [...prev, payload]);
                                  } else {
                                    setAdvantages(prev => prev.map((it, i) => i === editAdvIndex ? payload : it));
                                  }
                                  setIsAdvModalOpen(false);
                                }}
                              >Salvar</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              },
              {
                label: "Alertas",
                content: (
                  <div className="space-y-6">
                    {/* Configurações de Alerta de Sessão */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                      <div className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Alerta de Expiração de Sessão</div>
                      <SessionAlertSettings />
                    </div>
                    
                    {/* Configurações de Alerta de Sucesso */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Alertas de Sucesso</div>
                      <SuccessAlertSettings />
                    </div>
                  </div>
                )
              },
              {
                label: "Permissões",
                content: (
                  <PinProtection
                    title="Área de Permissões"
                    description="Esta área contém configurações sensíveis de permissões de usuários."
                    sessionDuration={15}
                  >
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                        <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Permissões por tipo de usuário</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">Edite as permissões de cada perfil clicando nos ícones da tabela abaixo. Apenas administradores podem editar.</div>
                        {/* Tabela dinâmica de permissões */}
                        <React.Suspense fallback={<div>Carregando permissões...</div>}>
                          {typeof window !== 'undefined' && require('./permissoes/PermissionsTable').default ? React.createElement(require('./permissoes/PermissionsTable').default) : null}
                        </React.Suspense>
                      </div>
                    </div>
                  </PinProtection>
                )
              },
              {
                label: "Configurações do Sistema",
                content: (
                  <PinProtection
                    title="Configurações do Sistema"
                    description="Esta área contém configurações críticas do sistema que podem afetar todos os usuários."
                    sessionDuration={20}
                  >
                    <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                      <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Tempo de sessão global</div>
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                      <InputField
                        id="globalSessionTime"
                        type="number"
                        min="1"
                        defaultValue={String(inputValue)}
                        onChange={e => setInputValue(Number(e.target.value))}
                        placeholder="Tempo de sessão (minutos)"
                      />
                      <div className="text-xs text-gray-500 mt-2">
                        Tempo atual: <b>{timeoutMinutes} min</b>. Tempo restante: <b>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</b>
                      </div>
                      <Button
                        className="sm:ml-auto w-full sm:w-auto"
                        size="md"
                        variant="primary"
                        disabled={loading || inputValue < 1}
                        onClick={() => saveTimeout(inputValue)}
                      >
                        Salvar
                      </Button>
                      {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
                    </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Alterar PIN de proteção</div>
                      
                      <div className="space-y-4">
                        <div>
                          <input 
                            id="currentPin" 
                            placeholder="PIN atual" 
                            type="password" 
                            value={pinData.currentPin}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              handlePinChange('currentPin', value);
                            }}
                            maxLength={6}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <input 
                            id="newPin" 
                            placeholder="Novo PIN (4-6 dígitos)" 
                            type="password" 
                            value={pinData.newPin}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              handlePinChange('newPin', value);
                            }}
                            maxLength={6}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <input 
                            id="confirmNewPin" 
                            placeholder="Confirmar novo PIN" 
                            type="password" 
                            value={pinData.confirmNewPin}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              handlePinChange('confirmNewPin', value);
                            }}
                            maxLength={6}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {/* Mensagens de status */}
                      {pinManager.error && (
                        <div className="text-red-500 text-xs mt-2">{pinManager.error}</div>
                      )}
                      {pinManager.success && (
                        <div className="text-green-500 text-xs mt-2">{pinManager.success}</div>
                      )}
                      
                      {/* Informações sobre restrições */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {pinManager.canChangePin ? (
                          "PIN pode ser alterado. Deve ter entre 4 e 6 dígitos."
                        ) : (
                          `Aguarde ${formatTimeRemaining(pinManager.timeUntilNextChange)} para alterar novamente.`
                        )}
                      </div>
                      
                      <Button 
                        className="mt-4 w-full sm:w-auto sm:ml-auto" 
                        size="md" 
                        variant="primary"
                        onClick={handleChangePin}
                        disabled={pinManager.loading || !pinManager.canChangePin}
                      >
                        {pinManager.loading ? 'Alterando...' : 'Alterar PIN'}
                      </Button>
                    </div>
                    
                    {/* Gerenciamento do localStorage */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Gerenciamento do localStorage</div>
                      <LocalStorageSettings />
                    </div>
                  </div>
                  </PinProtection>
                )
              }
            ]}
          />
        </div>
      </div>
    </>
  );
}
