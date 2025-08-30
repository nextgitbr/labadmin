'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AuthGuard from '@/components/auth/AuthGuard';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { apiClient } from '@/lib/apiClient';

interface Stage {
  _id?: string;
  id: string;
  name: string;
  color: string;
  order: number;
  primaryColor?: string;
  backgroundColor?: string;
  stroke?: string;
  cardBgColor?: string;
}

export default function StagesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', color: '#3b82f6' });

  // Buscar etapas
  const fetchStages = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Stage[]>('/api/stages');
      setStages(data);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  // Adicionar nova etapa
  const handleAddStage = async () => {
    if (!newStage.name.trim()) return;

    try {
      const createdStage = await apiClient.post<Stage>('/api/stages', newStage);
      setStages(prev => [...prev, createdStage]);
      setNewStage({ name: '', color: '#3b82f6' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      alert('Erro ao criar etapa');
    }
  };

  // Remover etapa
  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Tem certeza que deseja remover esta etapa?')) return;

    try {
      await apiClient.delete(`/api/stages?id=${encodeURIComponent(stageId)}`);
      setStages(prev => prev.filter(stage => stage.id !== stageId));
    } catch (error) {
      console.error('Erro ao remover etapa:', error);
      alert('Erro ao remover etapa');
    }
  };

  // Atualizar ordem das etapas
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStages(items);

    try {
      await apiClient.put('/api/stages', { stages: items });
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      fetchStages(); // Recarregar em caso de erro
    }
  };

  const colorOptions = [
    { value: '#3b82f6', name: 'Azul' },
    { value: '#f59e0b', name: 'Amarelo' },
    { value: '#10b981', name: 'Verde' },
    { value: '#ef4444', name: 'Vermelho' },
    { value: '#8b5cf6', name: 'Roxo' },
    { value: '#f97316', name: 'Laranja' },
    { value: '#06b6d4', name: 'Ciano' },
    { value: '#84cc16', name: 'Lima' }
  ];

  if (loading) {
    return (
      <AuthGuard requiredPermission="configuracoes">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredPermission="configuracoes">
      <PageBreadcrumb pageTitle="Configurar Etapas" />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Etapas do Processo de Produção
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure as etapas do fluxo de produção dos pedidos
            </p>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nova Etapa
          </button>
        </div>

        {/* Lista de Etapas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Etapas Atuais
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Arraste e solte para reordenar as etapas
          </p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stages">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {stages.map((stage, index) => (
                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 ${
                            snapshot.isDragging ? 'shadow-lg' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400 text-sm">
                                {index + 1}.
                              </span>
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              ></div>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {stage.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 dark:text-gray-400">Primária</label>
                              <input
                                type="color"
                                value={stage.color}
                                onChange={async (e) => {
                                  const value = e.target.value;
                                  try {
                                    await apiClient.patch('/api/stages', { id: stage.id, color: value });
                                    setStages(prev => prev.map(s => s.id === stage.id ? { ...s, color: value } : s));
                                  } catch (err) { console.error(err); }
                                }}
                                className="w-8 h-8 rounded"
                                title="Cor primária"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 dark:text-gray-400">Fundo</label>
                              <input
                                type="color"
                                value={stage.backgroundColor || ''}
                                onChange={async (e) => {
                                  const value = e.target.value;
                                  try {
                                    await apiClient.patch('/api/stages', { id: stage.id, backgroundColor: value });
                                    setStages(prev => prev.map(s => s.id === stage.id ? { ...s, backgroundColor: value } : s));
                                  } catch (err) { console.error(err); }
                                }}
                                className="w-8 h-8 rounded"
                                title="Cor de fundo do cartão"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 dark:text-gray-400">BG do Card</label>
                              <input
                                type="color"
                                value={stage.cardBgColor || ''}
                                onChange={async (e) => {
                                  const value = e.target.value;
                                  try {
                                    await apiClient.patch('/api/stages', { id: stage.id, cardBgColor: value });
                                    setStages(prev => prev.map(s => s.id === stage.id ? { ...s, cardBgColor: value } : s));
                                  } catch (err) { console.error(err); }
                                }}
                                className="w-8 h-8 rounded"
                                title="BG do Card (aplicado nos cards do Kanban)"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 dark:text-gray-400">Borda</label>
                              <input
                                type="color"
                                value={stage.stroke || ''}
                                onChange={async (e) => {
                                  const value = e.target.value;
                                  try {
                                    await apiClient.patch('/api/stages', { id: stage.id, stroke: value });
                                    setStages(prev => prev.map(s => s.id === stage.id ? { ...s, stroke: value } : s));
                                  } catch (err) { console.error(err); }
                                }}
                                className="w-8 h-8 rounded"
                                title="Cor da borda do cartão"
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">ID: {stage.id}</span>
                            <button
                              onClick={() => handleDeleteStage(stage.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remover etapa"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Modal Adicionar Etapa */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Nova Etapa
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome da Etapa
                  </label>
                  <input
                    type="text"
                    value={newStage.name}
                    onChange={(e) => setNewStage(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Ex: Moldagem"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cor
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setNewStage(prev => ({ ...prev, color: color.value }))}
                        className={`w-12 h-12 rounded-lg border-2 ${
                          newStage.color === color.value ? 'border-gray-900 dark:border-white' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddStage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Criar Etapa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
