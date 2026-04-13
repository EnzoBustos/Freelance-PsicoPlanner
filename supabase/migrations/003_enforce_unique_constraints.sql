-- Enforce unique constraints on profiles to prevent duplicate signups

-- Drop previous indexes if they exist
DROP INDEX IF EXISTS profiles_email_ci_uidx;
DROP INDEX IF EXISTS profiles_crp_norm_uidx;
DROP INDEX IF EXISTS profiles_email_unique_idx;
DROP INDEX IF EXISTS profiles_crp_unique_idx;

-- Drop the old RPC function and recreate it with proper handling
DROP FUNCTION IF EXISTS public.check_profile_conflict(text, text);

-- Add real UNIQUE constraints to the profiles table
-- First, remove any null values that would prevent constraint creation
UPDATE public.profiles SET email = '' WHERE email IS NULL;
UPDATE public.profiles SET crp = '' WHERE crp IS NULL;

-- Create genuine UNIQUE constraints using expression indexes for case-insensitive matching
CREATE UNIQUE INDEX profiles_email_unique_idx
  ON public.profiles (LOWER(TRIM(email)))
  WHERE LOWER(TRIM(email)) != '';

CREATE UNIQUE INDEX profiles_crp_unique_idx
  ON public.profiles (REGEXP_REPLACE(LOWER(TRIM(crp)), '\s+', '', 'g'))
  WHERE REGEXP_REPLACE(LOWER(TRIM(crp)), '\s+', '', 'g') != '';

-- Create improved RPC function to check for conflicts
CREATE OR REPLACE FUNCTION public.check_profile_conflict(p_email text, p_crp text)
RETURNS TABLE(email_exists boolean, crp_exists boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_exists BOOLEAN;
  v_crp_exists BOOLEAN;
BEGIN
  -- Check if email exists (case-insensitive)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    AND LOWER(TRIM(email)) != ''
  ) INTO v_email_exists;
  
  -- Check if CRP exists (normalized - no spaces, lowercase)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE REGEXP_REPLACE(LOWER(TRIM(crp)), '\s+', '', 'g') = REGEXP_REPLACE(LOWER(TRIM(p_crp)), '\s+', '', 'g')
    AND REGEXP_REPLACE(LOWER(TRIM(crp)), '\s+', '', 'g') != ''
  ) INTO v_crp_exists;
  
  RETURN QUERY SELECT v_email_exists, v_crp_exists, NULL::text;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, FALSE, SQLERRM;
END;
$$;

-- Grant permissions to call the function
GRANT EXECUTE ON FUNCTION public.check_profile_conflict(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_profile_conflict(text, text) TO authenticated;

-- Remove old constraints if they exist
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS email_not_empty,
DROP CONSTRAINT IF EXISTS crp_not_empty;

-- Add constraints at table level to prevent any insert/update that violates rules
ALTER TABLE public.profiles
ADD CONSTRAINT email_not_empty CHECK (email IS NOT NULL AND TRIM(email) != ''),
ADD CONSTRAINT crp_not_empty CHECK (crp IS NOT NULL AND TRIM(crp) != '');
