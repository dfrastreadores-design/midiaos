CREATE TABLE public.links_uteis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  icone TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.links_uteis TO authenticated;
GRANT ALL ON public.links_uteis TO service_role;

ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view links" ON public.links_uteis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create links" ON public.links_uteis
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin can update links" ON public.links_uteis
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin can delete links" ON public.links_uteis
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE TRIGGER links_uteis_updated_at
  BEFORE UPDATE ON public.links_uteis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();