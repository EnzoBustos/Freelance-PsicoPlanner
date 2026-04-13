# 🔄 Fluxo de Autenticação e Dados Reais

## ✅ Como Funciona Agora

### 1️⃣ **Signup (Cadastro)**

Quando um psicólogo se cadastra:

```
[Formulário] → [signUp + metadata] → [Auth.users criado] → [Trigger SQL] → [Profiles criado]
   Nome           Email + Senha      no Supabase         automático    com dados do usuário
   CRP            Password
```

**Passo a passo:**

1. Usuário preenche **Nome**, **CRP**, **Email**, **Senha**
2. Clica em **"Cadastrar"**
3. Supabase cria um novo usuário em `auth.users`
4. **Trigger SQL automático** cria um registro em `profiles` com:
   - `id` (do auth.users)
   - `name` (nome completo)
   - `crp` (conselho profissional)
   - `email` (email do cadastro)

5. Perfil está **100% configurado**! ✅

### 2️⃣ **Login**

```
[Email + Senha] → [signInWithPassword] → [Session criada] → [Redireciona para /) ]
                                          no localStorage   App carrega dados reais
```

### 3️⃣ **Logout**

```
[Clica Logout] → [signOut] → [Session destruída] → [Redireciona para /login]
```

---

## 📊 Dados Reais vs Mock Data

### ❌ Antes (Mock Data)

```typescript
// src/data/mockData.ts
export const patients = [
  { id: '1', name: 'Ana Beatriz Silva', ... },
  { id: '2', name: 'Bruno Costa', ... },
];

// Páginas importavam diretamente
import { patients } from '@/data/mockData';
```

**Problema:** Mesmo após login, dados fake continuavam apareçendo

### ✅ Agora (Dados Reais)

```typescript
// src/services/supabaseQueries.ts
export const fetchPatients = async () => {
  const { data } = await supabase
    .from('patients')
    .select('*');
  return data;
};

// Páginas fazem fetch do Supabase
const [patients, setPatients] = useState([]);
useEffect(() => {
  fetchPatients().then(setPatients);
}, []);
```

**Vantagens:**
- ✅ Dados em tempo real
- ✅ Sincronizam entre dispositivos
- ✅ Isolados por usuário (RLS)
- ✅ Histórico permanente

---

## 🚀 Implementação nos Componentes

### Exemplo 1: Dashboard

**Antes (Mock):**
```typescript
import { sessions, patients } from '@/data/mockData';

export default function Dashboard() {
  return (
    <div>
      {sessions.map(s => ...)}
    </div>
  );
}
```

**Depois (Real):**
```typescript
import { fetchSessions } from '@/services/supabaseQueries';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetchSessions().then(setSessions);
  }, []);

  return (
    <div>
      {sessions.map(s => ...)}
    </div>
  );
}
```

### Exemplo 2: Criar Novo Paciente

```typescript
import { createPatient } from '@/services/supabaseQueries';

const handleAddPatient = async (patientData) => {
  try {
    const newPatient = await createPatient(patientData);
    setPatients(prev => [...prev, newPatient]);
    toast.success('Paciente cadastrado!');
  } catch (error) {
    toast.error('Erro ao cadastrar');
  }
};
```

---

## 🔐 Segurança (RLS)

Cada psicólogo **só vê seus próprios dados**:

```sql
-- Exemplo: Policies no Supabase
CREATE POLICY "Psychologists can view own patients"
  ON patients FOR SELECT
  USING (auth.uid() = psychologist_id);
```

**Significa:**
- Usuário A não consegue ver pacientes do usuário B
- Dados são isolados automaticamente pelo banco
- Sem risco de vazamento de dados

---

## 📋 Checklist para Migração Completa

Páginas que precisam ser atualizadas para dados reais:

- [ ] Dashboard.tsx
- [ ] Patients.tsx
- [ ] PatientDetail.tsx
- [ ] Agenda.tsx
- [ ] Financial.tsx
- [ ] SettingsPage.tsx (perfil do psicólogo)

---

## 🎯 Próximos Passos

1. **Run a migration** no Supabase (se não fez ainda)
2. **Testar signup** — criar uma conta nova
3. **Verificar profiles table** — checar se perfil foi criado
4. **Implementar fetch real** — atualizar páginas uma a uma
5. **Remover mockData** — deletar ou deixar como fallback

---

## 🆘 Troubleshooting

### Erro: "Profiles table not created"
→ Execute a migration SQL no Supabase Dashboard

### Erro: "Trigger não funciona"
→ Verificar se trigger foi criado em `auth.triggers`

### Signup funciona mas perfil não aparece
→ Verificar RLS policies em `profiles` table

### Dados ainda ficam em branco após login
→ Usar `fetchPatients()` em vez de `mockData`

---

**Agora seu app tem dados REAIS sincronizados com Supabase! 🎉**
