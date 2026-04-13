-- Add default session duration to psychologist profile
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_session_duration INTEGER DEFAULT 50 CHECK (default_session_duration > 0 AND default_session_duration <= 240);