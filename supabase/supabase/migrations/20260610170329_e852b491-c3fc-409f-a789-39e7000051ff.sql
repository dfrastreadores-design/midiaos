
CREATE TABLE public.briefing_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivo_path TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_tipo TEXT,
  arquivo_tamanho BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_anexos TO authenticated;
GRANT ALL ON public.briefing_anexos TO service_role;

ALTER TABLE public.briefing_anexos ENABLE ROW LEVEL SECURITY;

CREATE INDEX briefing_anexos_briefing_id_idx ON public.briefing_anexos(briefing_id);

CREATE OR REPLACE FUNCTION public.can_access_briefing(_briefing_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.briefings b
    WHERE b.id = _briefing_id
      AND (
        b.created_by = _user_id
        OR public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'executivo')
        OR public.has_role(_user_id, 'diretoria')
        OR public.has_role(_user_id, 'producao')
      )
  )
$$;

CREATE POLICY "briefing_anexos_select" ON public.briefing_anexos
  FOR SELECT TO authenticated
  USING (public.can_access_briefing(briefing_id, auth.uid()));

CREATE POLICY "briefing_anexos_insert" ON public.briefing_anexos
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_access_briefing(briefing_id, auth.uid())
  );

CREATE POLICY "briefing_anexos_delete" ON public.briefing_anexos
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER briefing_anexos_updated_at
  BEFORE UPDATE ON public.briefing_anexos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for bucket "briefing-anexos"
-- Path convention: {briefing_id}/{filename}
CREATE POLICY "briefing_anexos_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'briefing-anexos'
    AND public.can_access_briefing(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "briefing_anexos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'briefing-anexos'
    AND public.can_access_briefing(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "briefing_anexos_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'briefing-anexos'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  );
