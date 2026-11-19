-- ==============================================================================
-- MIGRATION: 20261010090000_produtos_inquilino_parceiros_rls.sql
-- DESCRIÇÃO: Garantir visibilidade irrestrita e multi-tenant de produtos de parceiros
--            homologados e produtos próprios do inquilino.
-- DATA: 2026-10-10
-- ==============================================================================

-- 1. ADICIONAR COLUNAS ADITIVAS (IF NOT EXISTS)
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS origem_produto text DEFAULT 'PROPRIO',
  ADD COLUMN IF NOT EXISTS organizacao_id uuid,
  ADD COLUMN IF NOT EXISTS partner_id uuid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organizacao_id uuid;

-- 2. ATUALIZAR FUNÇÃO IS_SUPER_ADMIN PARA INCLUIR MASTER USERS
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) IN ('rafaelrodrigo.as@gmail.com', 'rafaelnexomidia@gmail.com')
  );
$$;

-- 3. AJUSTAR POLÍTICA DE LEITURA (SELECT) EM PRODUTOS
-- Permite leitura se:
--   - For super admin
--   - Produto for do inquilino atual (tenant_id = current_user_tenant_id())
--   - Produto não tiver tenant_id específico (global/sistema)
--   - Produto for de parceiro homologado (parceiro_id, partner_id, parceiro_nome ou parceiro_cnpj presente)
DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
DROP POLICY IF EXISTS "permitir_select_universal_produtos" ON public.produtos;

CREATE POLICY "tenant_isolation_select_produtos" ON public.produtos
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_user_tenant_id() OR
    parceiro_id IS NOT NULL OR
    partner_id IS NOT NULL OR
    parceiro_nome IS NOT NULL OR
    parceiro_cnpj IS NOT NULL OR
    origem_produto = 'PARCEIRO'
  );
