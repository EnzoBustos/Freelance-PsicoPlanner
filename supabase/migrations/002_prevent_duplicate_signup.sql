-- Prevent duplicate signup by email/crp and expose conflict check RPC

-- Case-insensitive and normalized unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_ci_uidx
  ON public.profiles (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_crp_norm_uidx
  ON public.profiles ((regexp_replace(lower(crp), '\s+', '', 'g')));

-- RPC used by signup form to validate conflicts before auth.signUp
CREATE OR REPLACE FUNCTION public.check_profile_conflict(p_email text, p_crp text)
RETURNS TABLE(email_exists boolean, crp_exists boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE lower(email) = lower(trim(p_email))
    ) AS email_exists,
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE regexp_replace(lower(crp), '\s+', '', 'g') = regexp_replace(lower(trim(p_crp)), '\s+', '', 'g')
    ) AS crp_exists;
$$;

GRANT EXECUTE ON FUNCTION public.check_profile_conflict(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_profile_conflict(text, text) TO authenticated;
