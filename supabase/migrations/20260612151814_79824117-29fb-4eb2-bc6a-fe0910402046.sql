
CREATE TABLE public.proposta_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_path text NOT NULL,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_anexos TO authenticated;
GRANT ALL ON public.proposta_anexos TO service_role;

ALTER TABLE public.proposta_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth can view proposta anexos" ON public.proposta_anexos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth can insert proposta anexos" ON public.proposta_anexos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth can update own proposta anexos" ON public.proposta_anexos
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "auth can delete own proposta anexos" ON public.proposta_anexos
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_proposta_anexos_updated_at
  BEFORE UPDATE ON public.proposta_anexos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_proposta_anexos_proposta ON public.proposta_anexos(proposta_id);

-- Storage policies for proposta-anexos bucket
CREATE POLICY "auth view proposta-anexos files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'proposta-anexos');
CREATE POLICY "auth upload proposta-anexos files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposta-anexos');
CREATE POLICY "auth update proposta-anexos files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'proposta-anexos');
CREATE POLICY "auth delete proposta-anexos files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'proposta-anexos');
