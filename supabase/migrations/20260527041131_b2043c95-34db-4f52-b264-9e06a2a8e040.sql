
CREATE TABLE public.auditoria_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao TEXT NOT NULL,
  target_user_id UUID,
  target_email TEXT,
  role TEXT,
  detalhes JSONB,
  actor_id UUID,
  actor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auditoria_acessos TO authenticated;
GRANT ALL ON public.auditoria_acessos TO service_role;

ALTER TABLE public.auditoria_acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read auditoria"
  ON public.auditoria_acessos
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_auditoria_acessos_created_at ON public.auditoria_acessos (created_at DESC);
CREATE INDEX idx_auditoria_acessos_target ON public.auditoria_acessos (target_user_id);
