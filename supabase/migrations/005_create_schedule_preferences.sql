-- Create schedule preferences table for psychologists' office hours

CREATE TABLE IF NOT EXISTS public.schedule_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday to 6=Saturday
  day_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  
  UNIQUE(psychologist_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.schedule_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own schedule"
  ON public.schedule_preferences
  FOR SELECT
  USING (auth.uid() = psychologist_id);

CREATE POLICY "Users can insert own schedule"
  ON public.schedule_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Users can update own schedule"
  ON public.schedule_preferences
  FOR UPDATE
  USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_schedule_preferences_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_preferences_updated_at
  BEFORE UPDATE ON public.schedule_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_preferences_updated_at();

-- Initialize default schedule for new users (0=Sunday to 6=Saturday)
-- This will be called by a trigger when a new profile is created
CREATE OR REPLACE FUNCTION initialize_schedule_preferences()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.schedule_preferences (psychologist_id, day_of_week, day_name, is_active, start_time, end_time)
  VALUES
    (NEW.id, 0, 'Domingo', false, NULL, NULL),
    (NEW.id, 1, 'Segunda', true, '08:00'::time, '18:00'::time),
    (NEW.id, 2, 'Terça', true, '08:00'::time, '18:00'::time),
    (NEW.id, 3, 'Quarta', true, '08:00'::time, '18:00'::time),
    (NEW.id, 4, 'Quinta', true, '08:00'::time, '18:00'::time),
    (NEW.id, 5, 'Sexta', true, '08:00'::time, '16:00'::time),
    (NEW.id, 6, 'Sábado', false, NULL, NULL)
  ON CONFLICT (psychologist_id, day_of_week) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default schedule when profile is created
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_schedule_preferences();

-- Sync existing profiles with default schedule
INSERT INTO public.schedule_preferences (psychologist_id, day_of_week, day_name, is_active, start_time, end_time)
SELECT 
  id,
  days.day_of_week,
  days.day_name,
  CASE 
    WHEN days.day_of_week IN (0, 6) THEN false
    ELSE true
  END,
  CASE 
    WHEN days.day_of_week IN (0, 6) THEN NULL
    WHEN days.day_of_week = 5 THEN '08:00'::time
    ELSE '08:00'::time
  END,
  CASE 
    WHEN days.day_of_week IN (0, 6) THEN NULL
    WHEN days.day_of_week = 5 THEN '16:00'::time
    ELSE '18:00'::time
  END
FROM public.profiles
CROSS JOIN (
  VALUES 
    (0, 'Domingo'),
    (1, 'Segunda'),
    (2, 'Terça'),
    (3, 'Quarta'),
    (4, 'Quinta'),
    (5, 'Sexta'),
    (6, 'Sábado')
) AS days(day_of_week, day_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.schedule_preferences sp
  WHERE sp.psychologist_id = profiles.id
)
ON CONFLICT (psychologist_id, day_of_week) DO NOTHING;
