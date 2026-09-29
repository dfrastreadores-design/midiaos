-- 1. Garante que a tabela tem a coluna tenant_id
ALTER TABLE public.produto_tipos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Recria o trigger para setar o tenant automaticamente
DROP TRIGGER IF EXISTS trg_produto_tipos_set_tenant ON public.produto_tipos;
CREATE TRIGGER trg_produto_tipos_set_tenant
  BEFORE INSERT ON public.produto_tipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_tenant_id();

-- 3. Remove políticas antigas que bloqueavam executivos de salvar tipos de produtos
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_select" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_insert" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_update" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_delete" ON public.produto_tipos;

-- 4. Cria as novas políticas corrigidas
-- SELECT (Permite ver do próprio inquilino ou criados pelo próprio usuário)
CREATE POLICY "produto_tipos_tenant_select" ON public.produto_tipos
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid()) OR
    (tenant_id IS NULL) -- Itens globais
  );

-- INSERT (Qualquer autenticado pode cadastrar, o trigger atrela ao inquilino)
CREATE POLICY "produto_tipos_tenant_insert" ON public.produto_tipos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    tenant_id = public.current_user_tenant_id() OR
    tenant_id IS NULL
  );

-- UPDATE (Apenas quem criou ou admins do tenant podem alterar)
CREATE POLICY "produto_tipos_tenant_update" ON public.produto_tipos
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())) OR
    (created_by = auth.uid())
  );

-- DELETE (Idem ao Update)
CREATE POLICY "produto_tipos_tenant_delete" ON public.produto_tipos
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())) OR
    (created_by = auth.uid())
  );

-- Garante permissões na tabela
GRANT ALL ON public.produto_tipos TO authenticated;
GRANT ALL ON public.produto_tipos TO service_role;
