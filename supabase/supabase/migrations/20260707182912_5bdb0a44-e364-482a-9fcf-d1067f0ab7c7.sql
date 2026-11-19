
DROP POLICY IF EXISTS "admin insert metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin update metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin delete metas" ON public.metas_executivo;

CREATE POLICY "admin or diretoria insert metas" ON public.metas_executivo
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));

CREATE POLICY "admin or diretoria update metas" ON public.metas_executivo
  FOR UPDATE USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));

CREATE POLICY "admin or diretoria delete metas" ON public.metas_executivo
  FOR DELETE USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));
