
-- 1) RLS mais restritas em UPDATE
DROP POLICY IF EXISTS "auth update pis" ON public.pis;
CREATE POLICY "owner or admin update pis" ON public.pis FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update propostas" ON public.propostas;
CREATE POLICY "owner or admin update propostas" ON public.propostas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update clientes" ON public.clientes;
CREATE POLICY "owner or admin update clientes" ON public.clientes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update agencias" ON public.agencias;
CREATE POLICY "owner or admin update agencias" ON public.agencias FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update reunioes" ON public.reunioes;
CREATE POLICY "owner or admin update reunioes" ON public.reunioes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- 2) Fechar SECURITY DEFINER para anônimo / público
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_pi_numero() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_proposta_numero() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 3) Bucket client-logos: privado + sem listagem pública
UPDATE storage.buckets SET public = false WHERE id = 'client-logos';

DROP POLICY IF EXISTS "public read client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth update client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth delete client logos" ON storage.objects;

CREATE POLICY "auth read client logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-logos');
CREATE POLICY "exec admin upload client logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'executivo')));
CREATE POLICY "exec admin update client logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'executivo')));
CREATE POLICY "admin delete client logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos' AND public.is_admin(auth.uid()));
