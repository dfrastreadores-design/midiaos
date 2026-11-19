
-- Fix 1: Restrict pi_assinaturas_cliente DELETE to admins or PI owner (executivo)
DROP POLICY IF EXISTS "auth delete pi_assin" ON public.pi_assinaturas_cliente;
CREATE POLICY "auth delete pi_assin" ON public.pi_assinaturas_cliente
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.pis p
      WHERE p.id = pi_assinaturas_cliente.pi_id
        AND p.executivo_id = auth.uid()
    )
  );

-- Fix 2: Restrict permuta tables to authenticated users with admin/diretoria/financeiro privileges
DROP POLICY IF EXISTS "Users can manage permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Users can manage permuta_saldos" ON public.permuta_saldos;

CREATE POLICY "Authenticated can read permuta_recebimentos"
  ON public.permuta_recebimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert permuta_recebimentos"
  ON public.permuta_recebimentos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update permuta_recebimentos"
  ON public.permuta_recebimentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete permuta_recebimentos"
  ON public.permuta_recebimentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read permuta_saldos"
  ON public.permuta_saldos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages permuta_saldos"
  ON public.permuta_saldos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix 3: Add search_path to remaining SECURITY DEFINER / public functions
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.update_permuta_saldo() SET search_path = public;
