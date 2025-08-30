# Sistema de Odontograma Laboratorial - Pacote de Integração

Este pacote contém todos os arquivos essenciais para integrar o sistema de odontograma em qualquer aplicação React.

## 📁 Arquivos Incluídos

- `OdontogramaSystem.jsx` - Componente principal React
- `OdontogramaSystem.css` - Estilos CSS completos
- `README.md` - Documentação de integração

## 🚀 Instalação e Uso

### 1. Copiar Arquivos
```bash
# Copie os arquivos para seu projeto
cp OdontogramaSystem.jsx src/components/
cp OdontogramaSystem.css src/components/
```

### 2. Importar no seu Componente
```jsx
import OdontogramaSystem from './components/OdontogramaSystem';
```

### 3. Uso Básico
```jsx
function App() {
  const handleSubmit = (orderData) => {
    console.log('Dados do pedido:', orderData);
    // Processar dados do formulário
  };

  return (
    <OdontogramaSystem 
      onSubmit={handleSubmit}
    />
  );
}
```

## ⚙️ Props Disponíveis

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `onSubmit` | function | undefined | Callback chamado ao enviar o formulário |
| `initialData` | object | {} | Dados iniciais para pré-preencher |
| `showPatientField` | boolean | true | Exibir campo nome do paciente |
| `showFileUpload` | boolean | true | Exibir seção de upload |
| `customTitle` | string | "Sistema de..." | Título personalizado |

## 📋 Estrutura dos Dados

### Dados de Entrada (initialData)
```javascript
{
  patient: "Nome do Paciente",
  constructions: {
    "11": "Crown",
    "12": "Veneer"
  },
  vitaShade: "A2",
  files: []
}
```

### Dados de Saída (onSubmit)
```javascript
{
  patient: "Nome do Paciente",
  constructions: {
    "11": "Crown",
    "12": "Veneer",
    "21": "Inlay"
  },
  vitaShade: "A2",
  files: [
    {
      id: 1234567890,
      name: "foto.jpg",
      size: 1024,
      type: "image/jpeg",
      uploadDate: "19/08/2025",
      file: File
    }
  ],
  date: "19/08/2025",
  time: "18:30:15"
}
```

## 🦷 Tipos de Construção Disponíveis

- **Inlay** - Restauração interna
- **Onlay** - Restauração externa  
- **Veneer** - Faceta
- **Crown** - Coroa
- **Pontic** - Pôntico
- **Provisional crown** - Coroa provisória
- **BiteSplint** - Placa oclusal
- **Bar** - Barra
- **Waxup** - Enceramento
- **Model** - Modelo

## 📂 Formatos de Arquivo Suportados

- **Imagens**: JPG, JPEG, PNG, GIF, WEBP
- **Vídeos**: MP4, AVI, MOV, WMV  
- **Modelos 3D**: STL, OBJ, PLY

## 🎯 Funcionalidades

### Seleção de Dentes
- **Clique simples**: Seleciona/deseleciona um dente
- **Shift + Clique**: Seleção em sequência na mesma arcada
- **Ctrl + Clique**: Seleção múltipla

### Aplicação de Construções
1. Selecione os dentes desejados
2. Clique no tipo de construção
3. A construção é aplicada automaticamente
4. Dentes ficam coloridos conforme o tipo

### Escala de Cores Vita
- **16 cores padrão**: A1-A4, B1-B4, C1-C4, D2-D5
- **Botões quadrados**: Cores reais com códigos no centro
- **Seleção única**: Uma cor por formulário
- **Integração**: Cor incluída nos dados de saída

### Upload de Arquivos
- Suporte a múltiplos arquivos
- Visualização com ícones por tipo
- Informações de tamanho e data
- Remoção individual

## 🔧 Personalização

### Modificar Cores dos Tipos
```javascript
const CONSTRUCTION_TYPES = {
  'Crown': '#FF8800',  // Laranja
  'Veneer': '#210033', // Roxo escuro
  // ... adicionar/modificar conforme necessário
};
```

### Customizar Validações
```javascript
const handleSubmitOrder = () => {
  // Suas validações personalizadas
  if (!customValidation()) {
    alert('Erro personalizado');
    return;
  }
  
  // Processar dados...
};
```

## 📱 Responsividade

O sistema é totalmente responsivo:
- **Desktop**: Layout em 4 colunas
- **Tablet**: Layout adaptado
- **Mobile**: Layout em coluna única

## 🔗 Integração com APIs

### Exemplo com Backend
```javascript
const handleSubmit = async (orderData) => {
  try {
    const formData = new FormData();
    formData.append('patient', orderData.patient);
    formData.append('constructions', JSON.stringify(orderData.constructions));
    
    // Anexar arquivos
    orderData.files.forEach(file => {
      formData.append('files', file.file);
    });
    
    const response = await fetch('/api/odontograma', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      alert('Pedido enviado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao enviar:', error);
  }
};
```

## 🛠️ Dependências

- **React** 16.8+ (hooks)
- **Navegador** moderno com suporte a ES6+

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação
2. Teste os exemplos fornecidos
3. Valide as props passadas
4. Confirme compatibilidade do navegador

## 🎨 Temas e Estilos

O CSS está organizado em seções:
- Layout principal
- Componentes individuais  
- Estados interativos
- Responsividade

Modifique as variáveis CSS para personalizar:
```css
:root {
  --primary-color: #073b4c;
  --secondary-color: #118ab2;
  --success-color: #28a745;
  --danger-color: #dc3545;
}
```
