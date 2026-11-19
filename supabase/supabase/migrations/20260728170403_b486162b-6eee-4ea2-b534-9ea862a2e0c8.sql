
-- 1. Remove blanket anon read on post-sale tables (public page uses the service-role server function)
DROP POLICY IF EXISTS "pos_vendas anon read by token" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_venda_anexos anon read" ON public.pos_venda_anexos;

-- 2. Scope proposta_anexos table reads to the proposal's tenant
DROP POLICY IF EXISTS "auth can view proposta anexos" ON public.proposta_anexos;
CREATE POLICY "view proposta anexos by proposta access"
ON public.proposta_anexos FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposta_anexos.proposta_id
      AND (p.tenant_id IS NULL OR p.tenant_id = current_tenant_id())
  )
);

-- 3. Security-definer helpers for storage policies
CREATE OR REPLACE FUNCTION public.can_access_storage_pi_anexo(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.pi_anexos a
    WHERE a.arquivo_path = _name
      AND (
        a.created_by = _uid
        OR (a.pi_id IS NOT NULL AND can_access_pi(a.pi_id, _uid))
        OR (a.cliente_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = a.cliente_id AND (c.executivo_id = _uid OR c.created_by = _uid)))
        OR (a.agencia_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agencias g WHERE g.id = a.agencia_id AND (g.executivo_id = _uid OR g.created_by = _uid)))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_material(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.materiais_apoio m
    WHERE m.arquivo_path = _name
      AND (m.created_by = _uid OR m.tenant_id IS NULL OR m.tenant_id = current_tenant_id())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_projeto(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.projetos_especiais p
    WHERE p.arquivo_url = _name
      AND (p.created_by = _uid OR p.responsavel_id = _uid OR p.tenant_id IS NULL OR p.tenant_id = current_tenant_id())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_proposta_anexo(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id::text = split_part(_name, '/', 1)
      AND (p.created_by = _uid OR p.executivo_id = _uid OR p.tenant_id IS NULL OR p.tenant_id = current_tenant_id())
  );
$$;

-- 4. Storage policies: pi-anexos
DROP POLICY IF EXISTS "pi-anexos read auth" ON storage.objects;
CREATE POLICY "pi-anexos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pi-anexos'
  AND (owner = auth.uid() OR public.can_access_storage_pi_anexo(name, auth.uid()))
);

-- 5. Storage policies: materiais-apoio
DROP POLICY IF EXISTS "auth read materiais-apoio files" ON storage.objects;
CREATE POLICY "materiais-apoio read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'materiais-apoio'
  AND (owner = auth.uid() OR public.can_access_storage_material(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth upload materiais-apoio files" ON storage.objects;
CREATE POLICY "materiais-apoio upload own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materiais-apoio'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 6. Storage policies: projetos-especiais
DROP POLICY IF EXISTS "auth read projetos files" ON storage.objects;
CREATE POLICY "projetos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR public.can_access_storage_projeto(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth update projetos files" ON storage.objects;
CREATE POLICY "projetos update scoped" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_projeto(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth delete projetos files" ON storage.objects;
CREATE POLICY "projetos delete scoped" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR is_admin(auth.uid()))
);

-- 7. Storage policies: proposta-anexos
DROP POLICY IF EXISTS "auth view proposta-anexos files" ON storage.objects;
CREATE POLICY "proposta-anexos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth update proposta-anexos files" ON storage.objects;
CREATE POLICY "proposta-anexos update scoped" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth delete proposta-anexos files" ON storage.objects;
CREATE POLICY "proposta-anexos delete scoped" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth upload proposta-anexos files" ON storage.objects;
CREATE POLICY "proposta-anexos upload scoped" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proposta-anexos'
  AND public.can_access_storage_proposta_anexo(name, auth.uid())
);
