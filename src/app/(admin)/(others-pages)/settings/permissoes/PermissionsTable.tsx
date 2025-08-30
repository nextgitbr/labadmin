"use client";
import React from "react";
import rolesPtBr from "@/locales/roles-ptBR";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function formatPerm(p: any) {
  return {
    nivel: p.role,
    dashboard: p.permissions.dashboard,
    pedidos: p.permissions.pedidos,
    kanban: p.permissions.kanban,
    tasklist: p.permissions.tasklist,
    notice: p.permissions.notice,
    tabelaPrecos: p.permissions.tabelaPrecos,
    calendar: p.permissions.calendar,
    usuarios: p.permissions.usuarios,
    configuracoes: p.permissions.configuracoes,
    configuracoesKanban: p.permissions.configuracoesKanban,
    taskMoveBackward: (p.permissions as any).taskMoveBackward,
    dados: p.permissions.dados || "-"
  };
}

const check = (
  value: boolean | { visualizar: boolean; criar: boolean; editar: boolean } | undefined,
  tipo: "visualizar" | "criar" | "editar" = "visualizar"
) => {
  if (!value) return "❌";
  if (typeof value === "boolean") return value ? "✅" : "❌";
  return value[tipo] ? "✅" : "❌";
};

export default function PermissionsTable() {
  const { user } = useAuth(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  console.log('PermissionsTable renderizado. Usuário:', user);

  useEffect(() => {
    console.log('useEffect executado - buscando permissões');
    setLoading(true);
    fetch("/api/permissions")
      .then(async (res) => {
        console.log('Resposta da API permissions:', res.status);
        if (!res.ok) throw new Error("Erro ao buscar permissões");
        const data = await res.json();
        console.log('Dados recebidos da API:', data);
        const formattedData = data.map(formatPerm);
        console.log('Dados formatados:', formattedData);
        setPermissions(formattedData);
      })
      .catch((err) => {
        console.error('Erro ao buscar permissões:', err);
        setError("Erro ao buscar permissões do backend.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Carregando permissões...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  // Função para alternar o valor de uma permissão
  const handleToggle = async (role: string, path: string[], tipo?: string) => {
    console.log('handleToggle chamado com:', { role, path, tipo });
    console.log('Usuário completo:', user);
    
    // Verifica se é administrador (pode ser via role ou email admin)
    const isAdmin = user?.role === "administrator" || user?.email === "admin@labadmin.com";
    console.log('É administrador?', isAdmin, '(role:', user?.role, ', email:', user?.email, ')');
    
    if (!user || !isAdmin) {
      console.log('Usuário não é administrador. Bloqueando ação.');
      return;
    }
    
    console.log('Toggle chamado:', { role, path, tipo });
    
    try {
      // Atualiza o estado local imediatamente
      const updatedPermissions = permissions.map((p) => {
        if (p.nivel !== role) return p;
        
        const newPerm = { ...p };
        
        // Alterna o valor baseado no caminho
        if (path[0] === 'pedidos' && tipo) {
          if (!newPerm.pedidos) {
            newPerm.pedidos = { visualizar: false, criar: false, editar: false };
          }
          newPerm.pedidos = { ...newPerm.pedidos, [tipo]: !newPerm.pedidos[tipo] };
        } else {
          newPerm[path[0]] = !newPerm[path[0]];
        }
        
        console.log(`Alterando ${path[0]}${tipo ? '.' + tipo : ''} para role ${role}:`, 
          `${tipo ? (p[path[0]] as any)?.[tipo] : p[path[0]]} → ${tipo ? (newPerm[path[0]] as any)?.[tipo] : newPerm[path[0]]}`);
        
        return newPerm;
      });
      
      // Atualiza o estado
      setPermissions(updatedPermissions);
      
      // Encontra a permissão alterada para enviar ao backend
      const changedPermission = updatedPermissions.find(p => p.nivel === role);
      if (changedPermission) {
        const permissionsData = {
          dashboard: changedPermission.dashboard,
          pedidos: changedPermission.pedidos,
          kanban: changedPermission.kanban,
          tasklist: changedPermission.tasklist,
          taskMoveBackward: changedPermission.taskMoveBackward,
          notice: changedPermission.notice,
          tabelaPrecos: changedPermission.tabelaPrecos,
          calendar: changedPermission.calendar,
          usuarios: changedPermission.usuarios,
          configuracoes: changedPermission.configuracoes,
          configuracoesKanban: changedPermission.configuracoesKanban,
        };
        
        console.log('Enviando para API:', { role, permissions: permissionsData });
        
        // Atualiza no backend
        const response = await fetch("/api/permissions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, permissions: permissionsData })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Permissão atualizada com sucesso:', result);
        } else {
          console.error('Erro ao atualizar permissão no backend');
          // Reverte a mudança local em caso de erro
          setPermissions(permissions);
        }
      }
    } catch (error) {
      console.error('Erro ao processar toggle:', error);
      // Reverte a mudança local em caso de erro
      setPermissions(permissions);
    }
  };

  console.log('Renderizando tabela. Permissões:', permissions);
  console.log('Usuário atual:', user);
  console.log('É administrador?', user?.role === "administrator");

  return (
    <div className="overflow-x-auto p-6">
      {/* Debug Info ocultado em produção */}
      <table className="min-w-[900px] w-full border border-gray-200 dark:border-gray-700 rounded-xl text-sm" style={{ color: '#b1ceff' }}>
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800" style={{ color: '#b1ceff' }}>
            <th className="px-4 py-2">Nível</th>
            <th className="px-4 py-2">Dashboard</th>
            <th className="px-4 py-2">Pedidos<br/><span className='font-normal'>(Visualizar)</span></th>
            <th className="px-4 py-2">Pedidos<br/><span className='font-normal'>(Criar)</span></th>
            <th className="px-4 py-2">Pedidos<br/><span className='font-normal'>(Editar)</span></th>
            <th className="px-4 py-2">Kanban</th>
            <th className="px-4 py-2">Task List</th>
            <th className="px-4 py-2">Mover p/ trás<br/><span className='font-normal'>(Task)</span></th>
            <th className="px-4 py-2">Avisos</th>
            <th className="px-4 py-2">Tabela de Preços</th>
            <th className="px-4 py-2">Calendar</th>
            <th className="px-4 py-2">Usuários</th>
            <th className="px-4 py-2">Configurações</th>
            <th className="px-4 py-2">Configurações › Kanban</th>
            <th className="px-4 py-2">Dados visualizados</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.nivel} className="text-center border-t border-gray-200 dark:border-gray-700">
              <td className="px-4 py-2 font-semibold text-left">{(() => {
  const raw = p.nivel?.toLowerCase();
  const traduzido = rolesPtBr[raw] || raw;
  return traduzido.charAt(0).toUpperCase() + traduzido.slice(1);
})()}</td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && (user.role === "administrator" || user.email === "admin@labadmin.com")
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={(e) => {
                    console.log('🔥 CLIQUE DETECTADO! Botão dashboard clicado para:', p.nivel);
                    console.log('🔥 Event target:', e.target);
                    console.log('🔥 Event currentTarget:', e.currentTarget);
                    console.log('🔥 Button disabled?', e.currentTarget.disabled);
                    console.log('🔥 User role:', user?.role);
                    console.log('🔥 User email:', user?.email);
                    alert('Clique detectado no botão Dashboard para ' + p.nivel);
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(p.nivel, ["dashboard"]);
                  }}
                  disabled={!user || (user.role !== "administrator" && user.email !== "admin@labadmin.com")}
                  aria-label="Alternar dashboard"
                >
                  {check(p.dashboard)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["pedidos"], "visualizar")}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar visualizar pedidos"
                >
                  {check(p.pedidos, "visualizar")}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["pedidos"], "criar")}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar criar pedidos"
                >
                  {check(p.pedidos, "criar")}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["pedidos"], "editar")}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar editar pedidos"
                >
                  {check(p.pedidos, "editar")}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["kanban"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar kanban"
                >
                  {check(p.kanban)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["tasklist"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar tasklist"
                >
                  {check(p.tasklist as boolean)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["taskMoveBackward"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar mover para trás (tasks)"
                >
                  {check(p.taskMoveBackward as boolean)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["notice"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar notice"
                >
                  {check(p.notice as boolean)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["tabelaPrecos"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar tabela de preços"
                >
                  {check(p.tabelaPrecos)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["calendar"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar calendar"
                >
                  {check(p.calendar)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["usuarios"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar usuários"
                >
                  {check(p.usuarios)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["configuracoes"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar configurações"
                >
                  {check(p.configuracoes)}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`px-2 py-1 rounded transition-colors ${
                    user && user.role === "administrator" 
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                      : "cursor-default"
                  }`}
                  onClick={() => handleToggle(p.nivel, ["configuracoesKanban"])}
                  disabled={!user || user.role !== "administrator"}
                  aria-label="Alternar configurações kanban"
                >
                  {check(p.configuracoesKanban as boolean)}
                </button>
              </td>
              <td>{p.dados}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
