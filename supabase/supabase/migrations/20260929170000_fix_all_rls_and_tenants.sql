-- ==============================================================================
-- MIGRATION: 20260929170000_fix_all_rls_and_tenants.sql
-- DESCRIÇÃO: Ajuste de RLS para resolver "violates row-level security policy" em cadastros
-- DATA: 2026-09-29
-- ==============================================================================

-- 1. Habilitar RLS na tabela de Parceiros (se estiver faltando)
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_parceiros_set_tenant ON public.parceiros;
CREATE TRIGGER trg_parceiros_set_tenant
  BEFORE INSERT ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_tenant_id();

DROP POLICY IF EXISTS "tenant_isolation_select_parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "tenant_isolation_insert_parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "tenant_isolation_update_parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "tenant_isolation_delete_parceiros" ON public.parceiros;

CREATE POLICY "tenant_isolation_select_parceiros" ON public.parceiros
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_parceiros" ON public.parceiros
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "tenant_isolation_update_parceiros" ON public.parceiros
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_parceiros" ON public.parceiros
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- 2. Ajustar tabela PRODUTOS para permitir que Executivos também cadastrem produtos
DROP POLICY IF EXISTS "tenant_isolation_insert_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_insert_produtos" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR 
    tenant_id = public.current_user_tenant_id() OR 
    tenant_id IS NULL
  );

DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_update_produtos" ON public.produtos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

-- 3. Ajustar tabela PRODUTO_TIPOS
ALTER TABLE public.produto_tipos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_produto_tipos_set_tenant ON public.produto_tipos;
CREATE TRIGGER trg_produto_tipos_set_tenant
  BEFORE INSERT ON public.produto_tipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_tenant_id();

DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_select" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_insert" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_update" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_delete" ON public.produto_tipos;

CREATE POLICY "produto_tipos_tenant_select" ON public.produto_tipos
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid()) OR
    (tenant_id IS NULL)
  );

CREATE POLICY "produto_tipos_tenant_insert" ON public.produto_tipos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    tenant_id = public.current_user_tenant_id() OR
    tenant_id IS NULL
  );

CREATE POLICY "produto_tipos_tenant_update" ON public.produto_tipos
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())) OR
    (created_by = auth.uid())
  );

CREATE POLICY "produto_tipos_tenant_delete" ON public.produto_tipos
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())) OR
    (created_by = auth.uid())
  );

GRANT ALL ON public.produto_tipos TO authenticated;
GRANT ALL ON public.produto_tipos TO service_role;
