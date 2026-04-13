-- Fix and verify the trigger that creates profiles on signup

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate function that creates profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    crp,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'name'), ''),
    COALESCE((NEW.raw_user_meta_data->>'crp'), ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    crp = COALESCE(EXCLUDED.crp, profiles.crp),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Sync existing auth users to profiles table (in case some were created before trigger)
INSERT INTO public.profiles (id, email, name, crp, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE((raw_user_meta_data->>'name'), '') as name,
  COALESCE((raw_user_meta_data->>'crp'), '') as crp,
  created_at,
  updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Log the sync result
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.profiles;
  RAISE NOTICE 'Total profiles in database: %', v_count;
END;
$$;
