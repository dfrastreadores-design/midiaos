
ALTER TABLE public.projetos_especiais
  ADD COLUMN IF NOT EXISTS arquivo_url text,
  ADD COLUMN IF NOT EXISTS arquivo_nome text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('projetos-especiais', 'projetos-especiais', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read projetos files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'projetos-especiais');

CREATE POLICY "auth upload projetos files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'projetos-especiais');

CREATE POLICY "auth update projetos files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'projetos-especiais');

CREATE POLICY "auth delete projetos files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'projetos-especiais');
