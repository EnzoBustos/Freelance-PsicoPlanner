-- Create private storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own patient documents" ON storage.objects;

-- Read own documents only
CREATE POLICY "Users can read own patient documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Upload into own folder only
CREATE POLICY "Users can upload own patient documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update own documents only
CREATE POLICY "Users can update own patient documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete own documents only
CREATE POLICY "Users can delete own patient documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);