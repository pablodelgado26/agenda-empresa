# 📅 Sistema de Agenda para Empresas

Sistema completo de gerenciamento de clientes e agendamentos desenvolvido em Next.js.

## 🚀 Funcionalidades

### 📋 Gestão de Clientes
- **Cadastro completo** com dados pessoais
- **CPF automático** com máscara (000.000.000-00)
- **Validação de email** para notificações
- **Upload de fotos** (antes e depois)
- **Edição e exclusão** de registros

### 📅 Sistema de Agendamentos
- **Calendário interativo** em português
- **Visualização mensal** com navegação
- **Agendamentos futuros** automáticos
- **Lembretes visuais** na interface

### 📧 Notificações Automáticas
- **Email automático** 5 dias antes do agendamento
- **Notificação para cliente** com detalhes do serviço
- **Notificação para empresa** com dados completos
- **Template HTML** responsivo e profissional

### 📄 Relatórios
- **Download em PDF** com todos os dados
- **Fotos incluídas** no relatório
- **Layout profissional** com cabeçalho e rodapé

### 📱 Mobile-First
- **Responsivo** para todos os dispositivos
- **Touch-friendly** com área de toque otimizada
- **Câmera integrada** para captura de fotos
- **Interface otimizada** para celular

## 🛠️ Tecnologias

- **Next.js 15** - Framework React
- **React Big Calendar** - Componente de calendário
- **EmailJS** - Envio de emails frontend
- **jsPDF** - Geração de relatórios PDF
- **CSS Modules** - Estilização modular
- **date-fns** - Manipulação de datas

## 📦 Instalação

```bash
# Clonar repositório
git clone [URL_DO_REPOSITORIO]

# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

## ⚙️ Configuração

### EmailJS (Notificações)
1. Criar conta em https://emailjs.com
2. Configurar serviço de email
3. Criar template HTML
4. Atualizar as credenciais no código:

```javascript
const EMAILJS_SERVICE_ID = 'seu_service_id';
const EMAILJS_TEMPLATE_ID = 'seu_template_id';
const EMAILJS_PUBLIC_KEY = 'sua_public_key';
const EMAIL_EMPRESA = 'email@empresa.com';
```

## 📱 Como Usar

1. **Criar Cliente**: Clique em uma data → "Fazer novo registro"
2. **Gerenciar**: Vá em "Meus Clientes" para editar/excluir
3. **Fotos**: Use a câmera para capturar antes/depois
4. **PDF**: Clique "Baixar PDF" nos detalhes do cliente
5. **Notificações**: Automáticas 5 dias antes do agendamento

## 🔧 Scripts

```bash
npm run dev      # Desenvolvimento
npm run build    # Build produção
npm start        # Servidor produção
npm run lint     # Verificar código
```

## 📝 Licença

Este projeto está sob licença MIT.

---

**Desenvolvido com ❤️ para facilitar o gerenciamento de clientes e agendamentos**
