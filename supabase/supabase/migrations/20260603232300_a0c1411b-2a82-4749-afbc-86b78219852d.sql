
-- 1) Restrict SELECT on pi_assinaturas_cliente to admin / PI owner / creator
DROP POLICY IF EXISTS "auth read pi_assin" ON public.pi_assinaturas_cliente;
CREATE POLICY "owner or admin read pi_assin"
  ON public.pi_assinaturas_cliente
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pis p
      WHERE p.id = pi_assinaturas_cliente.pi_id
        AND (p.executivo_id = auth.uid() OR p.created_by = auth.uid())
    )
    OR criado_por = auth.uid()
  );

-- 2) Restrict INSERT on pi_historico to users who own / are assigned to / admin the referenced PI
DROP POLICY IF EXISTS "auth insert pi_historico" ON public.pi_historico;
CREATE POLICY "owner or admin insert pi_historico"
  ON public.pi_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pis p
      WHERE p.id = pi_historico.pi_id
        AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- 3) Block direct INSERTs on auditoria_alteracoes from authenticated users.
--    The log_alteracao() trigger runs as SECURITY DEFINER and continues to write rows.
CREATE POLICY "no direct insert auditoria_alteracoes"
  ON public.auditoria_alteracoes
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
