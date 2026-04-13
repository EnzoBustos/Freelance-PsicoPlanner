-- ============================================================
-- PsicoPlanner Database Schema
-- ============================================================

-- Drop existing objects to allow safe re-runs (idempotent migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
DROP TRIGGER IF EXISTS update_therapeutic_goals_updated_at ON public.therapeutic_goals;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS update_clinical_alerts_updated_at ON public.clinical_alerts;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Psychologists can view own patients" ON public.patients;
DROP POLICY IF EXISTS "Psychologists can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Psychologists can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Psychologists can delete own patients" ON public.patients;

DROP POLICY IF EXISTS "Psychologists can view own patients' goals" ON public.therapeutic_goals;
DROP POLICY IF EXISTS "Psychologists can manage own patients' goals" ON public.therapeutic_goals;
DROP POLICY IF EXISTS "Psychologists can update own patients' goals" ON public.therapeutic_goals;
DROP POLICY IF EXISTS "Psychologists can delete own patients' goals" ON public.therapeutic_goals;

DROP POLICY IF EXISTS "Psychologists can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Psychologists can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Psychologists can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Psychologists can delete own sessions" ON public.sessions;

DROP POLICY IF EXISTS "Psychologists can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Psychologists can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Psychologists can update own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Psychologists can view own alerts" ON public.clinical_alerts;
DROP POLICY IF EXISTS "Psychologists can manage own alerts" ON public.clinical_alerts;
DROP POLICY IF EXISTS "Psychologists can update own alerts" ON public.clinical_alerts;
DROP POLICY IF EXISTS "Psychologists can delete own alerts" ON public.clinical_alerts;

-- Drop indexes
DROP INDEX IF EXISTS idx_patients_psychologist_id;
DROP INDEX IF EXISTS idx_patients_status;
DROP INDEX IF EXISTS idx_sessions_psychologist_id;
DROP INDEX IF EXISTS idx_sessions_patient_id;
DROP INDEX IF EXISTS idx_sessions_date;
DROP INDEX IF EXISTS idx_therapeutic_goals_patient_id;
DROP INDEX IF EXISTS idx_transactions_psychologist_id;
DROP INDEX IF EXISTS idx_transactions_date;
DROP INDEX IF EXISTS idx_clinical_alerts_psychologist_id;

-- Disable RLS temporarily
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.therapeutic_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clinical_alerts DISABLE ROW LEVEL SECURITY;

-- Drop tables
DROP TABLE IF EXISTS public.clinical_alerts CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.therapeutic_goals CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- Create Tables
-- ============================================================

-- Create profiles table (user info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  crp TEXT UNIQUE NOT NULL,
  specialties TEXT[] DEFAULT '{}',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  age INTEGER,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  legal_guardian TEXT,
  health_plan TEXT,
  card_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'em_pausa', 'alta', 'encaminhado')),
  avatar TEXT,
  next_session TIMESTAMP WITH TIME ZONE,
  session_value DECIMAL(10, 2),
  search_reason TEXT,
  main_complaint TEXT,
  health_history TEXT,
  medications TEXT,
  diagnostic_hypothesis TEXT,
  cid10 TEXT,
  risk_level TEXT DEFAULT 'baixo' CHECK (risk_level IN ('baixo', 'medio', 'alto')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create therapeutic goals table
CREATE TABLE IF NOT EXISTS public.therapeutic_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  date_set DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration INTEGER DEFAULT 50,
  type TEXT DEFAULT 'presencial' CHECK (type IN ('presencial', 'online')),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('confirmada', 'pendente', 'cancelada', 'realizada', 'falta')),
  value DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'pendente' CHECK (payment_status IN ('pago', 'pendente', 'isento')),
  payment_method TEXT,
  online_link TEXT,
  observations TEXT,
  evolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients (id) ON DELETE SET NULL,
  patient_name TEXT,
  date DATE NOT NULL,
  type TEXT DEFAULT 'sessao' CHECK (type IN ('sessao', 'cancelamento', 'outro')),
  value DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create clinical alerts table
CREATE TABLE IF NOT EXISTS public.clinical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  type TEXT DEFAULT 'faltas' CHECK (type IN ('faltas', 'evolucao', 'inadimplencia')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_patients_psychologist_id ON public.patients (psychologist_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients (status);
CREATE INDEX IF NOT EXISTS idx_sessions_psychologist_id ON public.sessions (psychologist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON public.sessions (patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions (date);
CREATE INDEX IF NOT EXISTS idx_therapeutic_goals_patient_id ON public.therapeutic_goals (patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_psychologist_id ON public.transactions (psychologist_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (date);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_psychologist_id ON public.clinical_alerts (psychologist_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapeutic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (only own profile)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for patients (only own patients)
CREATE POLICY "Psychologists can view own patients"
  ON public.patients FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can insert own patients"
  ON public.patients FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update own patients"
  ON public.patients FOR UPDATE
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can delete own patients"
  ON public.patients FOR DELETE
  USING (auth.uid() = psychologist_id);

-- RLS Policies for therapeutic_goals
CREATE POLICY "Psychologists can view own patients' goals"
  ON public.therapeutic_goals FOR SELECT
  USING (patient_id IN (
    SELECT id FROM public.patients 
    WHERE psychologist_id = auth.uid()
  ));

CREATE POLICY "Psychologists can manage own patients' goals"
  ON public.therapeutic_goals FOR INSERT
  WITH CHECK (patient_id IN (
    SELECT id FROM public.patients 
    WHERE psychologist_id = auth.uid()
  ));

CREATE POLICY "Psychologists can update own patients' goals"
  ON public.therapeutic_goals FOR UPDATE
  USING (patient_id IN (
    SELECT id FROM public.patients 
    WHERE psychologist_id = auth.uid()
  ));

CREATE POLICY "Psychologists can delete own patients' goals"
  ON public.therapeutic_goals FOR DELETE
  USING (patient_id IN (
    SELECT id FROM public.patients 
    WHERE psychologist_id = auth.uid()
  ));

-- RLS Policies for sessions
CREATE POLICY "Psychologists can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can delete own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = psychologist_id);

-- RLS Policies for transactions
CREATE POLICY "Psychologists can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = psychologist_id);

-- RLS Policies for clinical_alerts
CREATE POLICY "Psychologists can view own alerts"
  ON public.clinical_alerts FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can manage own alerts"
  ON public.clinical_alerts FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can update own alerts"
  ON public.clinical_alerts FOR UPDATE
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists can delete own alerts"
  ON public.clinical_alerts FOR DELETE
  USING (auth.uid() = psychologist_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_therapeutic_goals_updated_at BEFORE UPDATE ON public.therapeutic_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinical_alerts_updated_at BEFORE UPDATE ON public.clinical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, crp)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'crp', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger quando um novo usuário é criado em auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
