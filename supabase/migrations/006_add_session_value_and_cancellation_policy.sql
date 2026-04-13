-- Add default session value and cancellation policy to profiles table

-- Add columns if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_session_value decimal(10, 2) DEFAULT 250.00,
ADD COLUMN IF NOT EXISTS cancellation_policy text DEFAULT '24h';

-- Create type for cancellation policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancellation_policy_type') THEN
    CREATE TYPE public.cancellation_policy_type AS ENUM ('1h', '24h', '1w');
  END IF;
END;
$$;

-- Add check constraint for valid cancellation policies
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS valid_cancellation_policy;

ALTER TABLE public.profiles
ADD CONSTRAINT valid_cancellation_policy 
CHECK (cancellation_policy IN ('1h', '24h', '1w'));
