-- Persist recurrence metadata for agenda sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_index INTEGER;