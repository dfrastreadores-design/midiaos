
-- Restringir leitura por proprietário (executivo/created_by) com admin vendo tudo

-- CLIENTES
DROP POLICY IF EXISTS "auth read clientes" ON public.clientes;
CREATE POLICY "owner or admin read clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- AGENCIAS
DROP POLICY IF EXISTS "auth read agencias" ON public.agencias;
CREATE POLICY "owner or admin read agencias" ON public.agencias
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PIS
DROP POLICY IF EXISTS "auth read pis" ON public.pis;
CREATE POLICY "owner or admin read pis" ON public.pis
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PI_ITENS (via PI pai)
DROP POLICY IF EXISTS "auth read pi_itens" ON public.pi_itens;
CREATE POLICY "owner or admin read pi_itens" ON public.pi_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  ));

-- PI_HISTORICO (via PI pai)
DROP POLICY IF EXISTS "auth read pi_historico" ON public.pi_historico;
CREATE POLICY "owner or admin read pi_historico" ON public.pi_historico
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = pi_historico.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  ));

-- PROPOSTAS
DROP POLICY IF EXISTS "auth read propostas" ON public.propostas;
CREATE POLICY "owner or admin read propostas" ON public.propostas
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PROPOSTA_ITENS (via proposta pai)
DROP POLICY IF EXISTS "auth read proposta_itens" ON public.proposta_itens;
CREATE POLICY "owner or admin read proposta_itens" ON public.proposta_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.propostas pr
    WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  ));

-- REUNIOES
DROP POLICY IF EXISTS "auth read reunioes" ON public.reunioes;
CREATE POLICY "owner or admin read reunioes" ON public.reunioes
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PROJETOS ESPECIAIS
DROP POLICY IF EXISTS "auth read projetos" ON public.projetos_especiais;
CREATE POLICY "owner or admin read projetos" ON public.projetos_especiais
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid());
