
CREATE TABLE public.pi_aprovacoes_diretoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  tenant_id UUID,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',
  aprovador_nome TEXT,
  aprovador_cargo TEXT,
  assinatura_url TEXT,
  ip TEXT,
  user_agent TEXT,
  motivo_reprovacao TEXT,
  decidido_em TIMESTAMPTZ,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pi_aprov_dir_pi ON public.pi_aprovacoes_diretoria(pi_id);
CREATE INDEX idx_pi_aprov_dir_token ON public.pi_aprovacoes_diretoria(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_aprovacoes_diretoria TO authenticated;
GRANT ALL ON public.pi_aprovacoes_diretoria TO service_role;

ALTER TABLE public.pi_aprovacoes_diretoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant view aprov dir" ON public.pi_aprovacoes_diretoria
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "tenant insert aprov dir" ON public.pi_aprovacoes_diretoria
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_pi_aprov_dir_updated
  BEFORE UPDATE ON public.pi_aprovacoes_diretoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_pi_aprov_dir_tenant
  BEFORE INSERT ON public.pi_aprovacoes_diretoria
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
