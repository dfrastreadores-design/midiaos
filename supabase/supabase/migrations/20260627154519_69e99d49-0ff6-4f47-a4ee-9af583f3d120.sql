
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consentimento_lgpd_at timestamptz,
  ADD COLUMN IF NOT EXISTS consentimento_versao text;

CREATE TABLE IF NOT EXISTS public.lgpd_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('exportacao','exclusao','correcao')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','rejeitada')),
  observacoes text,
  resposta text,
  processado_em timestamptz,
  processado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lgpd_solicitacoes TO authenticated;
GRANT ALL ON public.lgpd_solicitacoes TO service_role;

ALTER TABLE public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas próprias solicitações LGPD"
  ON public.lgpd_solicitacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Usuário cria suas próprias solicitações LGPD"
  ON public.lgpd_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_lgpd_solicitacoes_updated
  BEFORE UPDATE ON public.lgpd_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lgpd_solicitacoes_user ON public.lgpd_solicitacoes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lgpd_solicitacoes_status ON public.lgpd_solicitacoes(status) WHERE status = 'pendente';
