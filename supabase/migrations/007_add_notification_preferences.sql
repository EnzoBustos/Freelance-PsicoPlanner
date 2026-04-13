-- Add notification preferences to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_session_reminder boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_patient_absences boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_pending_payment boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_missing_evolution boolean DEFAULT true;
