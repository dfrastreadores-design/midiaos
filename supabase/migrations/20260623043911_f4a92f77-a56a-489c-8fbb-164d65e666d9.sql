
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS max_usuarios integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS mensagem_alerta text,
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_em timestamptz,
  ADD COLUMN IF NOT EXISTS bloqueado_motivo text;

-- Permite que qualquer usuário autenticado leia APENAS a mensagem de alerta / status de bloqueio do seu próprio tenant
DROP POLICY IF EXISTS "Usuários veem o próprio tenant" ON public.tenants;
CREATE POLICY "Usuários veem o próprio tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
