
CREATE TABLE public.materiais_apoio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  categoria text,
  arquivo_path text NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais_apoio TO authenticated;
GRANT ALL ON public.materiais_apoio TO service_role;

ALTER TABLE public.materiais_apoio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read materiais_apoio" ON public.materiais_apoio
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert materiais_apoio" ON public.materiais_apoio
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner or admin update materiais_apoio" ON public.materiais_apoio
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "owner or admin delete materiais_apoio" ON public.materiais_apoio
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE TRIGGER trg_materiais_apoio_updated_at
  BEFORE UPDATE ON public.materiais_apoio
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- audit trigger consistent with other tables
CREATE TRIGGER trg_materiais_apoio_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.materiais_apoio
  FOR EACH ROW EXECUTE FUNCTION public.log_alteracao();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('materiais-apoio', 'materiais-apoio', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read materiais-apoio files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'materiais-apoio');

CREATE POLICY "auth upload materiais-apoio files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materiais-apoio');

CREATE POLICY "owner or admin update materiais-apoio files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materiais-apoio' AND (owner = auth.uid() OR is_admin(auth.uid())));

CREATE POLICY "owner or admin delete materiais-apoio files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materiais-apoio' AND (owner = auth.uid() OR is_admin(auth.uid())));
