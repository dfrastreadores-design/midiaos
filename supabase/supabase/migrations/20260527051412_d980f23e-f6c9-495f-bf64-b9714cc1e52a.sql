
-- ============ 1) Realtime authorization for notification channels ============
-- The bell subscribes to channel `notif-<user_id>`; restrict realtime topic access.
DO $$ BEGIN
  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "users subscribe own notif channel" ON realtime.messages;
CREATE POLICY "users subscribe own notif channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notif-' || auth.uid()::text
);

-- Block broadcasts from clients on these channels (server-side only via service role)
DROP POLICY IF EXISTS "no client writes on notif channels" ON realtime.messages;
CREATE POLICY "no client writes on notif channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (false);

-- ============ 2) pi_itens: scope UPDATE/DELETE to owners of parent PI ============
DROP POLICY IF EXISTS "auth write pi_itens" ON public.pi_itens;

CREATE POLICY "auth insert pi_itens"
ON public.pi_itens FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "owner update pi_itens"
ON public.pi_itens FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "owner delete pi_itens"
ON public.pi_itens FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
);

-- ============ 3) proposta_itens: scope UPDATE/DELETE to owners of parent proposta ============
DROP POLICY IF EXISTS "auth write proposta_itens" ON public.proposta_itens;

CREATE POLICY "auth insert proposta_itens"
ON public.proposta_itens FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
);

CREATE POLICY "owner update proposta_itens"
ON public.proposta_itens FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
);

CREATE POLICY "owner delete proposta_itens"
ON public.proposta_itens FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
);

-- ============ 4) projetos_especiais: split ALL into INSERT/UPDATE/DELETE ============
DROP POLICY IF EXISTS "auth write projetos" ON public.projetos_especiais;

CREATE POLICY "auth insert projetos"
ON public.projetos_especiais FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner or admin update projetos"
ON public.projetos_especiais FOR UPDATE TO authenticated
USING (
  is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid()
);

CREATE POLICY "admin delete projetos"
ON public.projetos_especiais FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- ============ 5) reunioes: allow owner DELETE ============
DROP POLICY IF EXISTS "admin delete reunioes" ON public.reunioes;
CREATE POLICY "owner or admin delete reunioes"
ON public.reunioes FOR DELETE TO authenticated
USING (
  is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid()
);
