# 🧠 PsicoPlanner

> **Plataforma de gestão completa para psicólogos** — Organize consultas, pacientes, agenda e dados financeiros em um só lugar.

[![React](https://img.shields.io/badge/React-18.3-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud-green?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

---

## ✨ Features

- 👥 **Gestão de Pacientes** — Cadastre e acompanhe seus pacientes
- 📅 **Agenda** — Organize suas consultas e horários
- 💰 **Controle Financeiro** — Acompanhe receitas, despesas e relatórios
- 🔐 **Autenticação Segura** — Login com Supabase Auth
- 🎨 **Interface Moderna** — Design limpo com modo escuro
- 📱 **Responsivo** — Funciona em desktop e mobile

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js 18+** (ou Bun/npm)
- **Git**
- **Conta Supabase** (gratuita em [supabase.com](https://supabase.com))

### 1. Clonar o Repositório

```bash
git clone <seu-repo>
cd Freelance-PsicoPlanner
```

### 2. Instalar Dependências

```bash
npm install
# ou com yarn
yarn install
# ou com bun
bun install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-aqui
```

**Como pegar suas credenciais:**
1. Vá para [supabase.com](https://supabase.com) e faça login
2. Abra seu projeto
3. Vá para **Settings > API**
4. Copie **Project URL** e **Publishable Key** (anon/public)

### 4. Rodar o Servidor de Desenvolvimento

```bash
npm run dev
```

O app estará disponível em:
- **Local:** `http://localhost:5173`
- **Network:** `http://seu-ip:5173`

### 5. Build para Produção

```bash
npm run build
```

---

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes da UI (buttons, inputs, etc)
│   └── layout/         # Layout principal (sidebar, topbar)
├── pages/              # Páginas da aplicação
│   ├── Auth.tsx        # Login/Cadastro
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── Patients.tsx    # Gestão de pacientes
│   ├── Agenda.tsx      # Agenda de consultas
│   ├── Financial.tsx   # Controle financeiro
│   └── SettingsPage.tsx # Configurações
├── contexts/           # React Context (Autenticação)
├── hooks/              # Custom React hooks
├── integrations/       # Integrações externas
│   └── client.ts       # Cliente Supabase
├── lib/                # Utilitários e helpers
└── data/               # Dados mock/estáticos
```

---

## 🛠 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build para produção |
| `npm run build:dev` | Build em modo desenvolvimento |
| `npm run preview` | Visualiza build localmente |
| `npm run lint` | Verifica erros de código (ESLint) |
| `npm test` | Roda testes unitários |
| `npm run test:watch` | Roda testes em modo watch |

---

## 🔌 Supabase Setup

### Primeira Vez?

Se você ainda não tem um projeto Supabase:

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Aguarde a inicialização (2-3 minutos)
4. Vá para **Settings > API** e copie as credenciais

### Rodar com Supabase Local (Avançado)

Se quiser rodar backend local com Docker:

```bash
# Instalar Supabase CLI
npm install -g @supabase/cli

# Login
supabase login

# Linkar seu projeto remoto
supabase link --project-ref seu-project-ref

# Puxar schema
supabase db pull

# Iniciar stack local
supabase start

# Ver credenciais locais
supabase status
```

---

## 🔐 Autenticação

O app usa **Supabase Auth** para gerenciar usuários:

- ✅ Login com email/senha
- ✅ Registro de novos usuários
- ✅ Sessão persistente
- ✅ Auto-refresh de tokens

Rotas protegidas exigem autenticação — usuários não autenticados são redirecionados para login.

---

## 📦 Tecnologias

- **Frontend:** React 18 + TypeScript
- **Build:** Vite 5
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Routing:** React Router
- **Forms:** React Hook Form + Zod
- **State:** TanStack React Query
- **UI Components:** Radix UI
- **Icons:** Lucide React
- **Testing:** Vitest

---

## 🐛 Troubleshooting

### Erro: "Failed to resolve @/contexts/AuthContext"
```bash
# Certifique-se que criou a pasta src/contexts/
# Se não, rode: npm run dev
# O servidor vai dar erro detalhado
```

### Erro: "VITE_SUPABASE_URL is undefined"
```bash
# Verifique se .env.local existe na raiz
# Reinicie o servidor: npm run dev
```

### Porta 5173 já está em uso
```bash
# Usar outra porta:
npm run dev -- --port 3000
```

---

## 📝 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-----------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase | ✅ Sim |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase | ✅ Sim |

---

## 🚢 Deploy

### Vercel (Recomendado)

```bash
# 1. Push para GitHub
git push origin main

# 2. Conecte seu repo ao Vercel
# 3. Adicione variáveis de ambiente no painel
# 4. Deploy automático a cada push
```

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login e deploy
netlify login
netlify deploy --prod --dir=dist
```

---

## 📧 Suporte

Encontrou um bug? Abra uma [issue](https://github.com/seu-usuario/Freelance-PsicoPlanner/issues) ou contate o desenvolvedor.

---

## 📄 Licença

Este projeto é licenciado sob a [MIT License](LICENSE).

---

**Feito com ❤️ para psicólogos**
