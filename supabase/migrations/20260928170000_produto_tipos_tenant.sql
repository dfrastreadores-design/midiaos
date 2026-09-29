-- ==============================================================================
-- MIGRATION: 20260928170000_produto_tipos_tenant.sql
-- DESCRIÇÃO: Isolamento estrito de Tipos de Produto por Inquilino (Multi-Tenant)
-- DATA: 2026-09-28
-- ==============================================================================

-- 1. Adiciona coluna tenant_id na tabela produto_tipos se não existir
ALTER TABLE public.produto_tipos 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_produto_tipos_tenant_id ON public.produto_tipos(tenant_id);

-- 2. Trigger para auto-atribuir tenant_id no INSERT caso não informado
DROP TRIGGER IF EXISTS trg_produto_tipos_set_tenant ON public.produto_tipos;
CREATE TRIGGER trg_produto_tipos_set_tenant
  BEFORE INSERT ON public.produto_tipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_tenant_id();

-- 3. Atualiza restrição de unicidade para ser por inquilino + mídia + nome
ALTER TABLE public.produto_tipos DROP CONSTRAINT IF EXISTS produto_tipos_nome_midia_key;
ALTER TABLE public.produto_tipos DROP CONSTRAINT IF EXISTS produto_tipos_tenant_midia_nome_key;
DROP INDEX IF EXISTS idx_produto_tipos_tenant_midia_nome;

CREATE UNIQUE INDEX idx_produto_tipos_tenant_midia_nome 
  ON public.produto_tipos (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), midia, lower(trim(nome)));

-- 4. Atualiza políticas de RLS para isolamento por inquilino
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_select" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_insert" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_update" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_delete" ON public.produto_tipos;

-- SELECT: Usuário vê apenas os tipos cadastrados pelo seu inquilino
CREATE POLICY "produto_tipos_tenant_select" ON public.produto_tipos
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid())
  );

-- INSERT: Permite cadastrar tipos vinculados ao próprio inquilino
CREATE POLICY "produto_tipos_tenant_insert" ON public.produto_tipos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    tenant_id = public.current_user_tenant_id() OR
    tenant_id IS NULL
  );

-- UPDATE: Atualização apenas de tipos do inquilino
CREATE POLICY "produto_tipos_tenant_update" ON public.produto_tipos
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid())
  );

-- DELETE: Exclusão apenas de tipos do inquilino
CREATE POLICY "produto_tipos_tenant_delete" ON public.produto_tipos
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid())
  );
