-- migration for tenant-specific proposal models and isolated visibility
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS proposta_layout_padrao text DEFAULT 'padrao';

-- Ensure all public tables have proper RLS for multi-tenancy
DROP POLICY IF EXISTS "Usuario ve propostas do seu tenant" ON public.propostas;
CREATE POLICY "Usuario ve propostas do seu tenant" ON public.propostas
FOR SELECT TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuario gerencia propostas do seu tenant" ON public.propostas;
CREATE POLICY "Usuario gerencia propostas do seu tenant" ON public.propostas
FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Repeat for proposal_history (correct column name is proposal_id)
DROP POLICY IF EXISTS "Usuario ve historico do seu tenant" ON public.proposal_history;
CREATE POLICY "Usuario ve historico do seu tenant" ON public.proposal_history
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.propostas p
  WHERE p.id = proposal_history.proposal_id
  AND p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
));

GRANT SELECT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
