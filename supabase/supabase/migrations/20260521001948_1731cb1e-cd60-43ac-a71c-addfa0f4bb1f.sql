
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read client logos" ON storage.objects;
CREATE POLICY "public read client logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth upload client logos" ON storage.objects;
CREATE POLICY "auth upload client logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth update client logos" ON storage.objects;
CREATE POLICY "auth update client logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth delete client logos" ON storage.objects;
CREATE POLICY "auth delete client logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos');
