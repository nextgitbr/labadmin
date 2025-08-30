// Exemplo de uso do Sistema de Odontograma
import React from 'react';
import OdontogramaSystem from './OdontogramaSystem';

// Exemplo 1: Uso básico
function ExemploBasico() {
  const handleSubmit = (orderData) => {
    console.log('Pedido recebido:', orderData);
    alert('Pedido processado com sucesso!');
  };

  return (
    <OdontogramaSystem 
      onSubmit={handleSubmit}
    />
  );
}

// Exemplo 2: Com dados iniciais
function ExemploComDados() {
  const dadosIniciais = {
    patient: "João Silva",
    constructions: {
      "11": "Crown",
      "21": "Veneer"
    },
    files: []
  };

  const handleSubmit = (orderData) => {
    // Enviar para API
    fetch('/api/laboratorio/pedidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Sucesso:', data);
    })
    .catch(error => {
      console.error('Erro:', error);
    });
  };

  return (
    <OdontogramaSystem 
      onSubmit={handleSubmit}
      initialData={dadosIniciais}
      customTitle="Laboratório Dental - Novo Pedido"
    />
  );
}

// Exemplo 3: Versão simplificada (sem upload de arquivos)
function ExemploSimplificado() {
  const handleSubmit = (orderData) => {
    // Processar apenas construções dentárias
    const { patient, constructions } = orderData;
    
    // Salvar no localStorage ou enviar para API
    localStorage.setItem('ultimoPedido', JSON.stringify({
      patient,
      constructions,
      data: new Date().toISOString()
    }));
    
    alert(`Pedido salvo para ${patient}`);
  };

  return (
    <OdontogramaSystem 
      onSubmit={handleSubmit}
      showFileUpload={false}
      customTitle="Planejamento Rápido"
    />
  );
}

// Exemplo 4: Integração com formulário maior
function ExemploIntegracao() {
  const [dadosCompletos, setDadosCompletos] = React.useState({
    clinica: '',
    dentista: '',
    observacoes: '',
    odontograma: null
  });

  const handleOdontogramaSubmit = (orderData) => {
    setDadosCompletos(prev => ({
      ...prev,
      odontograma: orderData
    }));
    
    console.log('Dados completos:', {
      ...dadosCompletos,
      odontograma: orderData
    });
  };

  return (
    <div>
      <h1>Formulário Completo do Laboratório</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Clínica:</label>
        <input 
          value={dadosCompletos.clinica}
          onChange={(e) => setDadosCompletos(prev => ({
            ...prev, 
            clinica: e.target.value
          }))}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Dentista:</label>
        <input 
          value={dadosCompletos.dentista}
          onChange={(e) => setDadosCompletos(prev => ({
            ...prev, 
            dentista: e.target.value
          }))}
        />
      </div>
      
      <OdontogramaSystem 
        onSubmit={handleOdontogramaSubmit}
        showPatientField={true}
        customTitle="Especificações do Trabalho"
      />
      
      <div style={{ marginTop: '20px' }}>
        <label>Observações:</label>
        <textarea 
          value={dadosCompletos.observacoes}
          onChange={(e) => setDadosCompletos(prev => ({
            ...prev, 
            observacoes: e.target.value
          }))}
          rows={4}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}

export {
  ExemploBasico,
  ExemploComDados,
  ExemploSimplificado,
  ExemploIntegracao
};
