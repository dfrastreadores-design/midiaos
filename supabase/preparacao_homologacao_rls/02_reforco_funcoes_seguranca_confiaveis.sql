-- ==============================================================================
-- ETAPA 4 - HOMOLOGAÇÃO PREPARADA (NÃO EXECUTADA)
-- ARQUIVO: 02_reforco_funcoes_seguranca_confiaveis.sql
-- OBJETIVO: Blindar funções centrais de autorização no PostgreSQL.
-- REGRA MANDATÓRIA: Não executar automaticamente. Apenas para ambiente de homologação.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SUPERADMIN EXCLUSIVO (Master da Plataforma)
-- Ancorado unicamente em email verificado de auth.users.
-- NUNCA confia em user_metadata, JWT claims do cliente ou profiles.role = 'MASTER'.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF _user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 
        FROM auth.users u
        WHERE u.id = _user_id
          AND lower(u.email) IN ('rafaelrodrigo.as@gmail.com')
    );
END;
$$;

-- Alias global estável
CREATE OR REPLACE FUNCTION public.is_master_user(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin(_user_id);
$$;

-- ------------------------------------------------------------------------------
-- 2. RESOLUÇÃO CONFIÁVEL DO TENANT_ID ATUAL
-- Lê estritamente da tabela public.profiles no servidor.
-- Imune a spoofing de user_metadata no cliente.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
$$;

-- Alias retrocompatível
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_user_tenant_id();
$$;

-- ------------------------------------------------------------------------------
-- 3. RESOLUÇÃO DE PAPÉIS POR TENANT (RBAC ESCOPO POR EMPRESA)
-- Valida se o usuário possui cargo administrativo na PRÓPRIA empresa.
-- Impede que um admin do Tenant A tenha privilégios no Tenant B.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_tenant UUID;
BEGIN
    IF v_user_id IS NULL OR _tenant_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Master da Plataforma tem acesso global
    IF public.is_super_admin(v_user_id) THEN
        RETURN TRUE;
    END IF;

    -- Verifica se o usuário pertence à mesma empresa
    SELECT tenant_id INTO v_user_tenant FROM public.profiles WHERE id = v_user_id;
    IF v_user_tenant IS NULL OR v_user_tenant <> _tenant_id THEN
        RETURN FALSE;
    END IF;

    -- Verifica se possui papel de Master da Empresa, Admin ou Diretoria
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_user_id
          AND ur.role::text IN ('master_empresa', 'admin', 'diretoria', 'super_admin')
    ) OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_user_id
          AND p.role::text IN ('MASTER_EMPRESA', 'ADMIN', 'DIRETORIA')
    );
END;
$$;

-- Valida se o usuário tem papel específico dentro da empresa (ex: 'opec', 'financeiro')
CREATE OR REPLACE FUNCTION public.is_tenant_role(_role_name TEXT, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_tenant UUID;
BEGIN
    IF v_user_id IS NULL OR _tenant_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF public.is_super_admin(v_user_id) THEN
        RETURN TRUE;
    END IF;

    SELECT tenant_id INTO v_user_tenant FROM public.profiles WHERE id = v_user_id;
    IF v_user_tenant IS NULL OR v_user_tenant <> _tenant_id THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_user_id
          AND lower(ur.role::text) = lower(_role_name)
    );
END;
$$;
