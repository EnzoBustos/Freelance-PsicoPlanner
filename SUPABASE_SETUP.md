# 🚀 Guia de Setup - Supabase Real Database

Este guia explica como migrar seus dados de **mock** para **dados reais** no Supabase.

---

## 📋 Pré-requisitos

- ✅ Conta Supabase ativa
- ✅ Projeto Supabase criado
- ✅ URL e chave de API do projeto

---

## ✨ Opção 1: Via SQL Editor (Recomendado - Mais Rápido)

### 1. Abra o SQL Editor do Supabase

```
https://supabase.com → Seu Projeto → SQL Editor
```

### 2. Crie um novo query editor

Clique em **"New Query"**

### 3. Cole o SQL da migration

1. Abra o arquivo: `supabase/migrations/001_create_psychologist_management_system.sql`
2. Copie **TODO** o conteúdo
3. Cole no SQL editor do Supabase
4. Clique em **"Run"** (ou Ctrl+Enter)

✅ **Pronto!** As tabelas estão criadas com Row Level Security ativado.

---

## 🔧 Opção 2: Via Supabase CLI (Mais Profissional)

Se você já instalou Supabase CLI:

```bash
# 1. Login
supabase login

# 2. Link seu projeto remoto
supabase link --project-ref seu-project-ref

# 3. Executar migrations
supabase db push
```

---

## 📊 Verificar se Funcionou

No Supabase Dashboard:

1. Vá para **Database → Tables**
2. Você deve ver estas tabelas:
   - ✓ `profiles` — Dados do psicólogo
   - ✓ `patients` — Pacientes
   - ✓ `therapeutic_goals` — Metas terapêuticas
   - ✓ `sessions` — Consultas agendadas
   - ✓ `transactions` — Movimentação financeira
   - ✓ `clinical_alerts` — Alertas clínicos

---

## 🔐 Row Level Security (RLS)

As policies foram configuradas automaticamente:

- **Cada psicólogo só vê seus próprios dados**
- **Dados são isolados por `psychologist_id`**
- **Apenas o usuário autenticado acessa seus registros**

---

## 📝 Inserir Seus Dados Reais

### ❌ NÃO copie dados mock do código!

Agora você precisa inserir dados reais. Existem 2 formas:

### Opção A: Via Supabase Dashboard (UI)

1. Vá para **Database → Tables → profiles**
2. Clique em **"Insert row"**
3. Preencha seus dados (nome, CRP, etc)

### Opção B: Via SQL Insert

No SQL Editor do Supabase, execute:

```sql
-- Insira seu perfil de psicólogo
-- OBS: Substitua pela seu user_id real do auth.users
INSERT INTO public.profiles (
  id, email, name, crp, specialties, phone
) VALUES (
  'seu-user-id-aqui', -- Veja como obter abaixo
  'seu@email.com',
  'Seu Nome Completo',
  '06/123456',
  ARRAY['Terapia Cognitivo-Comportamental', 'Psicologia Clínica'],
  '(11) 98765-4321'
);

-- Insira seus pacientes
INSERT INTO public.patients (
  psychologist_id, name, birth_date, age, cpf, phone, email, 
  address, status, session_value, search_reason, main_complaint, 
  risk_level
) VALUES (
  'seu-user-id-aqui',
  'Nome do Paciente',
  '1990-01-15',
  34,
  '123.456.789-00',
  '(11) 91234-5678',
  'paciente@email.com',
  'Endereço completo',
  'ativo',
  250.00,
  'Motivo da procura',
  'Queixa principal',
  'baixo'
);
```

### 🔍 Como Obter seu User ID?

1. No Supabase Dashboard → **Authentication → Users**
2. Clique no número da linha (seu usuário)
3. Copie o **UUID** (ID)

Ou execute este SQL:

```sql
SELECT auth.uid();
```

---

## 🧵 Próximo Passo: Atualizar React

O código React ainda está usando `mockData`. Você precisa:

### 1. Criar service para fetch dos dados reais

```typescript
// src/services/supabase.ts
import { supabase } from '@/integrations/client';

export const fetchPatients = async () => {
  const { data, error } = await supabase
    .from('patients')
    .select('*');
  if (error) throw error;
  return data;
};
```

### 2. Trocar imports em cada página

**Antes (usando mock):**
```typescript
import { patients, sessions } from '@/data/mockData';
```

**Depois (usando banco real):**
```typescript
import { fetchPatients, fetchSessions } from '@/services/supabase';

const [patients, setPatients] = useState([]);
useEffect(() => {
  fetchPatients().then(setPatients);
}, []);
```

---

## ⚠️ Problemas Comuns

### Erro: "violates row level security policy"

**Causa:** O `psychologist_id` está nulo ou diferente do user_id autenticado

**Solução:** 
1. Verifique seu ID de usuário com `SELECT auth.uid()`
2. Garanta que está inserindo com seu UUID correto

### Erro: "undefined reference to table"

**Causa:** Migration não foi executada

**Solução:** Cole o SQL da migration no SQL Editor e execute

### Dados ainda aparecem mockados

**Causa:** Código React ainda usa `mockData.ts`

**Solução:** Atualize as páginas para usar `supabase` em vez de `mockData`

---

## ✅ Checklist Final

- [ ] Migration SQL executada (tabelas criadas)
- [ ] Seu perfil inserido (profiles table)
- [ ] Pelo menos 1 paciente inserido
- [ ] Código React atualizado para usar `supabase` em vez de `mockData`
- [ ] Login realizado e dados aparecem corretos
- [ ] Sem dados fake/mock na tela

---

## 🆘 Precisa de Ajuda?

Se alguma coisa não funcionou:
1. Verifique se a migration SQL executou com sucesso
2. Confirme que seu `user_id` está correto
3. Verifique a aba **Logs** no Supabase Dashboard para erros

---

**Agora seu PsicoPlanner trabalha com dados REAIS! 🎉**
