
CREATE TABLE public.system_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  emoji TEXT DEFAULT '✨',
  versao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_announcements TO authenticated;
GRANT ALL ON public.system_announcements TO service_role;

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer autenticado vê ativos"
  ON public.system_announcements FOR SELECT
  TO authenticated
  USING (ativo = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin gerencia"
  ON public.system_announcements FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_system_announcements_updated
  BEFORE UPDATE ON public.system_announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_system_announcements_ativo_created ON public.system_announcements (ativo, created_at DESC);
