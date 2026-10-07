-- ==============================================================================
-- MÍDIA.OS — MIGRAÇÕES CONSOLIDADAS HOMOLOGADAS (06/10/2026 - 07/10/2026)
-- POLÍTICA: ADITIVA E RETROCOMPATÍVEL, ZERO PERDA DE DADOS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006030000_rbac_cnpj_isolation_master_user.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006030000_rbac_cnpj_isolation_master_user.sql
-- DESCRIÇÃO: Implementação de Políticas de Acesso (RBAC / Multi-Tenant por CNPJ)
--            e Provisionamento Definitivo do Usuário Master (Superadministrador)
-- DIRETRIZES: Aditiva, 100% não-destrutiva (Zero Perda de Dados)
-- ==============================================================================

-- 1. EXTENSÃO E AJUSTE DE COLUNAS EM profiles (ROLES & CNPJ VINCULADO)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'OPERATOR',
  ADD COLUMN IF NOT EXISTS cnpj_vinculado TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Índices para buscas rápidas de autenticação e governança
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_cnpj_vinculado ON public.profiles(cnpj_vinculado);
CREATE INDEX IF NOT EXISTS idx_profiles_is_superadmin ON public.profiles(is_superadmin);

-- 2. VIEW PÚBLICA user_profiles PARA COMPATIBILIDADE PLENA COM POLÍTICAS E CONSULTAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  p.id AS user_id,
  p.id,
  p.email,
  p.nome,
  COALESCE(p.role, 'OPERATOR') AS role,
  COALESCE(p.cnpj_vinculado, p.cnpj) AS cnpj,
  COALESCE(p.cnpj_vinculado, p.cnpj) AS cnpj_vinculado,
  p.tenant_id,
  COALESCE(p.is_superadmin, false) AS is_superadmin,
  p.ativo,
  p.cargo,
  p.telefone,
  p.whatsapp,
  p.created_at,
  p.updated_at
FROM public.profiles p;

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO service_role;

-- 3. FUNÇÕES AUXILIARES DE RESOLUÇÃO DE IDENTIDADE E RLS
-- ------------------------------------------------------------------------------

-- Função para verificar se o usuário é Master (Superadministrador Irrestrito)
CREATE OR REPLACE FUNCTION public.is_master_user(_user_id UUID DEFAULT auth.uid())
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

  RETURN (
    -- E-mail superadmin conhecido
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = _user_id
        AND lower(u.email) IN ('rafaelrodrigo.as@gmail.com', 'rafaelnexomidia@gmail.com')
    )
    -- Perfil marcado como MASTER ou is_superadmin
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id
        AND (
          upper(COALESCE(p.role, '')) = 'MASTER'
          OR p.is_superadmin = true
          OR lower(COALESCE(p.email, '')) IN ('rafaelrodrigo.as@gmail.com', 'rafaelnexomidia@gmail.com')
        )
    )
    -- Papel super_admin em user_roles
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'super_admin'
    )
    -- Claim no JWT
    OR (
      (auth.jwt() ->> 'role') = 'MASTER'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'MASTER'
      OR (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean IS TRUE
    )
  );
END;
$$;

-- Alias global estável de is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master_user(_user_id);
$$;

-- Função estável para obter o CNPJ vinculado ao usuário autenticado atual
CREATE OR REPLACE FUNCTION public.get_current_user_cnpj()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(cnpj_vinculado, cnpj)
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Função estável para obter a role atual do usuário
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_master_user() THEN 'MASTER'
    ELSE COALESCE(
      (SELECT upper(role) FROM public.profiles WHERE id = auth.uid()),
      'OPERATOR'
    )
  END;
$$;

-- 4. TABELA CENTRAL DE ENTIDADES (CLIENTES, VEÍCULOS, AGÊNCIAS, PARCEIROS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'cliente', -- 'cliente', 'veiculo', 'parceiro', 'agencia'
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entities_tenant ON public.entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entities_cnpj ON public.entities(cnpj);
CREATE INDEX IF NOT EXISTS idx_entities_tipo ON public.entities(tipo);

-- Sincronização inicial não-destrutiva de entidades
INSERT INTO public.entities (id, tenant_id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
SELECT c.id, c.tenant_id, 'cliente', c.razao_social, c.nome_fantasia, c.cnpj, c.email, c.telefone, COALESCE(c.ativo, true)
FROM public.clientes c
WHERE c.cnpj IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  cnpj = EXCLUDED.cnpj,
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia;

INSERT INTO public.entities (id, tenant_id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
SELECT a.id, a.tenant_id, 'agencia', a.razao_social, a.nome_fantasia, a.cnpj, null, null, true
FROM public.agencias a
WHERE a.cnpj IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  cnpj = EXCLUDED.cnpj,
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    INSERT INTO public.entities (id, tenant_id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
    SELECT p.id, p.tenant_id, 'veiculo', p.razao_social, p.nome_fantasia, p.cnpj, p.contato_email, p.contato_telefone, COALESCE(p.ativo, true)
    FROM public.parceiros p
    WHERE p.cnpj IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      cnpj = EXCLUDED.cnpj,
      razao_social = EXCLUDED.razao_social,
      nome_fantasia = EXCLUDED.nome_fantasia;
  END IF;
END $$;

-- 5. ATUALIZAÇÃO DAS TABELAS DE PIS, ITENS, CHECKINGS E SETTLEMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.insertion_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_number VARCHAR(50) NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  agency_id UUID,
  representative_id UUID NOT NULL,
  cnpj_cliente TEXT,
  cnpj_veiculo TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  checking_status TEXT NOT NULL DEFAULT 'pending_upload',
  billing_type TEXT NOT NULL DEFAULT 'REPRESENTATIVE_BILLING',
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  net_vehicle_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  representative_commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  campaign_name VARCHAR(255) NOT NULL DEFAULT 'Campanha de Mídia',
  campaign_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  campaign_end_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  dossier_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insertion_orders
  ADD COLUMN IF NOT EXISTS cnpj_cliente TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_veiculo TEXT;

CREATE INDEX IF NOT EXISTS idx_insertion_orders_cnpj_cliente ON public.insertion_orders(cnpj_cliente);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_cnpj_veiculo ON public.insertion_orders(cnpj_veiculo);

-- Sincronizar cnpj_cliente em insertion_orders a partir de clientes
UPDATE public.insertion_orders io
SET cnpj_cliente = c.cnpj
FROM public.clientes c
WHERE io.client_id = c.id
  AND io.cnpj_cliente IS NULL
  AND c.cnpj IS NOT NULL;

-- Sincronizar cnpj_veiculo em insertion_orders se ainda vazio
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    UPDATE public.insertion_orders io
    SET cnpj_veiculo = p.cnpj
    FROM public.pi_items pit
    JOIN public.partners p ON pit.vehicle_id = p.id
    WHERE pit.pi_id = io.id
      AND io.cnpj_veiculo IS NULL
      AND p.cnpj IS NOT NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    UPDATE public.insertion_orders io
    SET cnpj_veiculo = p.cnpj
    FROM public.pi_items pit
    JOIN public.parceiros p ON pit.vehicle_id = p.id
    WHERE pit.pi_id = io.id
      AND io.cnpj_veiculo IS NULL
      AND p.cnpj IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL,
  cnpj_veiculo TEXT,
  format_description VARCHAR(255) NOT NULL DEFAULT '',
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT CURRENT_DATE,
  insertions_count INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  vehicle_net_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  vehicle_commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pi_items
  ADD COLUMN IF NOT EXISTS cnpj_veiculo TEXT;

CREATE TABLE IF NOT EXISTS public.pi_checkings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  pi_item_id UUID,
  vehicle_id UUID,
  cnpj_veiculo TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'under_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pi_checkings
  ADD COLUMN IF NOT EXISTS cnpj_veiculo TEXT;

CREATE TABLE IF NOT EXISTS public.pi_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  pi_item_id UUID,
  vehicle_id UUID,
  cnpj_pagador TEXT,
  cnpj_recebedor TEXT,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_checking',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pi_settlements
  ADD COLUMN IF NOT EXISTS cnpj_pagador TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_recebedor TEXT;

-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS) RIGOROSAS (RBAC / CNPJ / MASTER)
-- ------------------------------------------------------------------------------

-- Habilitar RLS em todas as tabelas centrais
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_checkings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_settlements ENABLE ROW LEVEL SECURITY;

-- Permissões básicas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insertion_orders TO authenticated;
GRANT ALL ON public.insertion_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_items TO authenticated;
GRANT ALL ON public.pi_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_checkings TO authenticated;
GRANT ALL ON public.pi_checkings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_settlements TO authenticated;
GRANT ALL ON public.pi_settlements TO service_role;

-- === RLS EM insertion_orders ===
DROP POLICY IF EXISTS "insertion_orders_rbac_all" ON public.insertion_orders;
DROP POLICY IF EXISTS "tenant_isolation_select_insertion_orders" ON public.insertion_orders;
DROP POLICY IF EXISTS "tenant_isolation_insert_insertion_orders" ON public.insertion_orders;
DROP POLICY IF EXISTS "tenant_isolation_update_insertion_orders" ON public.insertion_orders;
DROP POLICY IF EXISTS "tenant_isolation_delete_insertion_orders" ON public.insertion_orders;
DROP POLICY IF EXISTS "Permissao por CNPJ ou Master" ON public.insertion_orders;

CREATE POLICY "Permissao por CNPJ ou Master" ON public.insertion_orders
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_cliente = public.get_current_user_cnpj()
      OR cnpj_veiculo = public.get_current_user_cnpj()
      OR client_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
      OR agency_id IN (SELECT id FROM public.agencias WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_cliente = public.get_current_user_cnpj()
      OR cnpj_veiculo = public.get_current_user_cnpj()
      OR client_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- === RLS EM pi_items ===
DROP POLICY IF EXISTS "pi_items_rbac_all" ON public.pi_items;
DROP POLICY IF EXISTS "tenant_isolation_select_pi_items" ON public.pi_items;
DROP POLICY IF EXISTS "tenant_isolation_insert_pi_items" ON public.pi_items;
DROP POLICY IF EXISTS "tenant_isolation_update_pi_items" ON public.pi_items;
DROP POLICY IF EXISTS "tenant_isolation_delete_pi_items" ON public.pi_items;

CREATE POLICY "pi_items_rbac_all" ON public.pi_items
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_veiculo = public.get_current_user_cnpj()
      OR pi_id IN (
        SELECT id FROM public.insertion_orders
        WHERE cnpj_cliente = public.get_current_user_cnpj()
           OR cnpj_veiculo = public.get_current_user_cnpj()
      )
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- === RLS EM pi_checkings ===
DROP POLICY IF EXISTS "pi_checkings_rbac_all" ON public.pi_checkings;
DROP POLICY IF EXISTS "tenant_isolation_select_pi_checkings" ON public.pi_checkings;
DROP POLICY IF EXISTS "tenant_isolation_insert_pi_checkings" ON public.pi_checkings;
DROP POLICY IF EXISTS "tenant_isolation_update_pi_checkings" ON public.pi_checkings;
DROP POLICY IF EXISTS "tenant_isolation_delete_pi_checkings" ON public.pi_checkings;

CREATE POLICY "pi_checkings_rbac_all" ON public.pi_checkings
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_veiculo = public.get_current_user_cnpj()
      OR pi_id IN (
        SELECT id FROM public.insertion_orders
        WHERE cnpj_cliente = public.get_current_user_cnpj()
           OR cnpj_veiculo = public.get_current_user_cnpj()
      )
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND cnpj_veiculo = public.get_current_user_cnpj()
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- === RLS EM pi_settlements ===
DROP POLICY IF EXISTS "pi_settlements_rbac_all" ON public.pi_settlements;
DROP POLICY IF EXISTS "tenant_isolation_select_pi_settlements" ON public.pi_settlements;
DROP POLICY IF EXISTS "tenant_isolation_insert_pi_settlements" ON public.pi_settlements;
DROP POLICY IF EXISTS "tenant_isolation_update_pi_settlements" ON public.pi_settlements;
DROP POLICY IF EXISTS "tenant_isolation_delete_pi_settlements" ON public.pi_settlements;

CREATE POLICY "pi_settlements_rbac_all" ON public.pi_settlements
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_pagador = public.get_current_user_cnpj()
      OR cnpj_recebedor = public.get_current_user_cnpj()
      OR pi_id IN (
        SELECT id FROM public.insertion_orders
        WHERE cnpj_cliente = public.get_current_user_cnpj()
           OR cnpj_veiculo = public.get_current_user_cnpj()
      )
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- === RLS EM entities ===
DROP POLICY IF EXISTS "entities_rbac_all" ON public.entities;
CREATE POLICY "entities_rbac_all" ON public.entities
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND cnpj = public.get_current_user_cnpj()
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
);

-- === REFORÇO DE RLS NA TABELA LEGADA/OPERACIONAL pis ===
DROP POLICY IF EXISTS "pis_rbac_master_or_cnpj" ON public.pis;
CREATE POLICY "pis_rbac_master_or_cnpj" ON public.pis
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cliente_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
      OR agencia_id IN (SELECT id FROM public.agencias WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- 7. PROVISIONAMENTO E ATUALIZAÇÃO SEGURA DO USUÁRIO MASTER
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- 1. Obter ou criar usuário no auth.users
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'rafaelrodrigo.as@gmail.com' LIMIT 1;
  
  IF v_uid IS NULL THEN
    v_uid := '186561e6-9a7f-4ded-a4d6-c470ae3f54ec'::UUID;
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rafaelrodrigo.as@gmail.com',
      crypt('21242628', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"], "role": "MASTER"}'::jsonb,
      '{"nome": "Rafael Rodrigo", "role": "MASTER", "is_superadmin": true, "email_verified": true}'::jsonb,
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET 
      encrypted_password = crypt('21242628', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "MASTER"}'::jsonb,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "MASTER", "is_superadmin": true, "nome": "Rafael Rodrigo"}'::jsonb,
      banned_until = NULL,
      updated_at = now()
    WHERE id = v_uid;
  END IF;

  -- 2. Garantir identidade do Supabase Auth
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider = 'email' AND provider_id = 'rafaelrodrigo.as@gmail.com') THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_uid,
      v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', 'rafaelrodrigo.as@gmail.com'),
      'email',
      'rafaelrodrigo.as@gmail.com',
      now(), now(), now()
    );
  ELSE
    UPDATE auth.identities
    SET user_id = v_uid, identity_data = jsonb_build_object('sub', v_uid::text, 'email', 'rafaelrodrigo.as@gmail.com')
    WHERE provider = 'email' AND provider_id = 'rafaelrodrigo.as@gmail.com';
  END IF;

  -- 3. Atualizar/Inserir perfil na tabela public.profiles com role MASTER
  INSERT INTO public.profiles (id, nome, email, role, is_superadmin, ativo)
  VALUES (v_uid, 'Rafael Rodrigo', 'rafaelrodrigo.as@gmail.com', 'MASTER', true, true)
  ON CONFLICT (id) DO UPDATE SET
    role = 'MASTER',
    is_superadmin = true,
    ativo = true,
    updated_at = now();

  -- 4. Garantir privilégio na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006090000_midia_os_multi_proposito_universal.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006090000_midia_os_multi_proposito_universal.sql
-- DESCRIÇÃO: Refatoração Estrutural e Arquitetural Multi-Propósito Mídia.OS
--            (Veículos, Agências, Representantes, Personalização por Inquilino)
-- DIRETRIZES: 100% Aditiva, Não-Destrutiva (Zero Perda de Dados)
-- ==============================================================================

-- 1. TIPOLOGIA DE ENTIDADES E PARCEIROS DO INQUILINO
-- ------------------------------------------------------------------------------
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS perfil_comercial TEXT DEFAULT 'VEICULO_EXIBIDOR';

CREATE INDEX IF NOT EXISTS idx_parceiros_perfil_comercial ON public.parceiros(perfil_comercial);

-- 2. MODELAGEM DINÂMICA DE PRODUTOS E FORMATOS (EXTENSÍVEL)
-- ------------------------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS posicao_site TEXT,
  ADD COLUMN IF NOT EXISTS dimensoes_pixels TEXT,
  ADD COLUMN IF NOT EXISTS url_destino TEXT,
  ADD COLUMN IF NOT EXISTS tiragem_estimada NUMERIC,
  ADD COLUMN IF NOT EXISTS sentido_fluxo TEXT,
  ADD COLUMN IF NOT EXISTS ponto_referencia TEXT,
  ADD COLUMN IF NOT EXISTS impactos_estimados NUMERIC,
  ADD COLUMN IF NOT EXISTS formato_impresso TEXT,
  ADD COLUMN IF NOT EXISTS dimensoes_cm TEXT;

-- 3. MÓDULOS ATIVOS NO INQUILINO (TENANT SETTINGS & TENANTS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'];

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  configuracoes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para tenant_settings
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_settings_select_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_select_policy" ON public.tenant_settings
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

DROP POLICY IF EXISTS "tenant_settings_insert_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_insert_policy" ON public.tenant_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

DROP POLICY IF EXISTS "tenant_settings_update_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_update_policy" ON public.tenant_settings
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

-- Garantir registro padrão na tenant_settings para tenants existentes que ainda não possuam
INSERT INTO public.tenant_settings (tenant_id, active_modules)
SELECT id, ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO']
FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006100000_multi_proposito_config_and_terminologia.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006100000_multi_proposito_config_and_terminologia.sql
-- DESCRIÇÃO: Expansão Aditiva do Mídia.OS Multi-Propósito
--            Suporte a configurações de módulos ativos e terminologia por inquilino.
-- DIRETRIZES: 100% Aditiva, Não-Destrutiva (Zero Perda de Dados)
-- ==============================================================================

-- 1. Garantir colunas em tenant_settings
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS terminologia_veiculo TEXT DEFAULT 'Veículo de Comunicação';

-- 2. Garantir sincronia em tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'];

-- 3. Atualizar registros existentes onde active_modules seja nulo
UPDATE public.tenant_settings
SET active_modules = ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO']
WHERE active_modules IS NULL OR array_length(active_modules, 1) = 0;

UPDATE public.tenant_settings
SET modulos_ativos = active_modules
WHERE modulos_ativos IS NULL;

-- 4. Garantir índices úteis para consultas de perfil e módulos
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON public.tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_perfil_comercial ON public.parceiros(perfil_comercial);


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006140000_modulo_contratos_representacao_veiculos.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006140000_modulo_contratos_representacao_veiculos.sql
-- DESCRIÇÃO: Módulo de Gestão de Contratos de Representação e Veículos
--            Inquilino Alvo: NEXO MÍDIA E REPRESENTAÇÃO LTDA (CNPJ: 68.279.031/0001-67)
-- DIRETRIZ: 100% Aditiva, Não-destrutiva, com Auditoria e Lixeira Automática
-- ==============================================================================

-- 1. View de compatibilidade / alias para parceiros_veiculos
CREATE OR REPLACE VIEW public.parceiros_veiculos AS
  SELECT * FROM public.parceiros;

-- 2. Tabela de Contratos de Representação Comercial com Veículos
CREATE TABLE IF NOT EXISTS public.contratos_representacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_cnpj TEXT NOT NULL DEFAULT '68.279.031/0001-67',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE RESTRICT,
  numero_contrato TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'enviado_assinatura', 'ativo', 'suspenso', 'rescindido', 'vencido')
  ),
  produtos_representados TEXT[] DEFAULT '{}',
  territorio TEXT NOT NULL DEFAULT 'Distrito Federal e Entorno',

  -- Modelos de Faturamento Habilitados
  permite_faturamento_centralizado_nexo BOOLEAN NOT NULL DEFAULT true,
  aliquota_imposto_nexo_percentual NUMERIC(5,2) NOT NULL DEFAULT 6.00,
  permite_faturamento_direto_parceiro BOOLEAN NOT NULL DEFAULT true,
  prazo_repasse_dias INTEGER NOT NULL DEFAULT 3,

  -- Regras de Remuneração (Fixa ou Gatilhos de Volume)
  tipo_comissao TEXT NOT NULL DEFAULT 'fixa' CHECK (
    tipo_comissao IN ('fixa', 'gatilho_volume')
  ),
  comissao_fixa_percentual NUMERIC(5,2),
  regras_gatilho JSONB DEFAULT '[
    {"faixa": 1, "de": 0, "ate": 30000, "comissao_percentual": 30.0},
    {"faixa": 2, "de": 30001, "ate": 70000, "comissao_percentual": 35.0},
    {"faixa": 3, "de": 70001, "ate": null, "comissao_percentual": 40.0}
  ]'::jsonb,

  -- Garantias de continuidade e blindagem
  garantia_comissao_pos_rescisao BOOLEAN NOT NULL DEFAULT true,
  comissao_sobre_renovacoes BOOLEAN NOT NULL DEFAULT true,
  vigencia_meses INTEGER NOT NULL DEFAULT 12,
  data_inicio DATE,
  data_fim DATE,
  conteudo_contrato_markdown TEXT,

  -- Auditoria e controle
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance para contratos_representacao
CREATE INDEX IF NOT EXISTS idx_contratos_rep_tenant_cnpj ON public.contratos_representacao(tenant_cnpj);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_parceiro_id ON public.contratos_representacao(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_status ON public.contratos_representacao(status);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_numero ON public.contratos_representacao(numero_contrato);

-- 3. Tabela de Pedidos de Faturamento Intermediados (Splits de Faturamento e Repasses)
CREATE TABLE IF NOT EXISTS public.pedidos_faturamento_intermediados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_representacao_id UUID NOT NULL REFERENCES public.contratos_representacao(id) ON DELETE CASCADE,
  tenant_cnpj TEXT NOT NULL DEFAULT '68.279.031/0001-67',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT,
  modelo_faturamento TEXT NOT NULL CHECK (
    modelo_faturamento IN ('centralizado_nexo', 'direto_parceiro')
  ),
  valor_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  aliquota_imposto_aplicada NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_imposto_retido NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual_comissao_aplicado NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_comissao_nexo NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_liquido_repasse_parceiro NUMERIC(12,2) NOT NULL DEFAULT 0,

  status_pagamento_cliente TEXT NOT NULL DEFAULT 'pendente' CHECK (
    status_pagamento_cliente IN ('pendente', 'pago', 'atrasado')
  ),
  status_repasse TEXT NOT NULL DEFAULT 'aguardando_cliente' CHECK (
    status_repasse IN ('aguardando_cliente', 'pronto_para_repasse', 'liquidado')
  ),
  data_recebimento_cliente DATE,
  data_repasse_efetuado DATE,
  chave_pix_comprovante TEXT,
  observacoes TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para pedidos_faturamento_intermediados
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_contrato ON public.pedidos_faturamento_intermediados(contrato_representacao_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_tenant_cnpj ON public.pedidos_faturamento_intermediados(tenant_cnpj);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_status_pag ON public.pedidos_faturamento_intermediados(status_pagamento_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_status_rep ON public.pedidos_faturamento_intermediados(status_repasse);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.contratos_representacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_faturamento_intermediados ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para contratos_representacao
DROP POLICY IF EXISTS "contratos_rep_select" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_select" ON public.contratos_representacao
  FOR SELECT TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "contratos_rep_insert" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_insert" ON public.contratos_representacao
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "contratos_rep_update" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_update" ON public.contratos_representacao
  FOR UPDATE TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas de RLS para pedidos_faturamento_intermediados
DROP POLICY IF EXISTS "pedidos_fat_select" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_select" ON public.pedidos_faturamento_intermediados
  FOR SELECT TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "pedidos_fat_insert" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_insert" ON public.pedidos_faturamento_intermediados
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "pedidos_fat_update" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_update" ON public.pedidos_faturamento_intermediados
  FOR UPDATE TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Permissões para Service Role (Bypass total para funções server-side)
GRANT ALL ON public.contratos_representacao TO service_role;
GRANT ALL ON public.pedidos_faturamento_intermediados TO service_role;
GRANT SELECT ON public.parceiros_veiculos TO authenticated, service_role;

-- 5. Acoplamento de Triggers de Lixeira e Auditoria
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['contratos_representacao', 'pedidos_faturamento_intermediados'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Trigger de lixeira automática se a função existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_move_to_trash') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trash_before_delete ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash()', t);
    END IF;

    -- Trigger de auditoria de alterações se a função existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_alteracao') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_alteracao()', t, t);
    END IF;
  END LOOP;
END $$;


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006150000_modulo_gestao_indicadores_parceiros_pf_pj.sql
-- ------------------------------------------------------------------------------
-- ========================================================================
-- MÓDULO DE GESTÃO DE INDICADORES E VENDEDORES EXTERNOS (PF E PJ)
-- Suporte integral a Pessoa Física e Pessoa Jurídica, validações de documentos,
-- dados bancários para repasse PIX e regras comerciais.
-- ========================================================================

-- 1. Criar tabela principal: public.partners
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_type text NOT NULL CHECK (person_type IN ('PF', 'PJ')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval', 'blocked')),

  -- Dados Pessoa Física (PF)
  full_name text,
  cpf varchar(14),
  rg varchar(20),
  birth_date date,
  pis_pasep varchar(20),

  -- Dados Pessoa Jurídica (PJ)
  corporate_name text,
  trade_name text,
  cnpj varchar(18),
  state_registration varchar(30),
  municipal_registration varchar(30),
  legal_representative_name text,
  legal_representative_cpf varchar(14),

  -- Contato & Endereço
  email varchar(255) NOT NULL,
  phone varchar(20) NOT NULL,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Regras Comerciais & Comissionamento
  default_commission_rate numeric(5, 2) NOT NULL DEFAULT 10.00,
  payment_condition text NOT NULL DEFAULT 'post_client_payment' CHECK (payment_condition IN ('post_client_payment')),
  requires_invoice boolean NOT NULL DEFAULT false,

  -- Dados Bancários para Repasse
  pix_key_type text NOT NULL DEFAULT 'cpf' CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_key text NOT NULL,
  bank_name varchar(100),
  bank_agency varchar(10),
  bank_account varchar(20),
  bank_account_type text CHECK (bank_account_type IS NULL OR bank_account_type IN ('checking', 'savings')),

  -- Auditoria & Observações
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints de Integridade PF/PJ
  CONSTRAINT check_partner_pf_requirements CHECK (
    person_type <> 'PF' OR (
      full_name IS NOT NULL AND length(trim(full_name)) > 0 AND
      cpf IS NOT NULL AND length(trim(cpf)) >= 11
    )
  ),
  CONSTRAINT check_partner_pj_requirements CHECK (
    person_type <> 'PJ' OR (
      corporate_name IS NOT NULL AND length(trim(corporate_name)) > 0 AND
      cnpj IS NOT NULL AND length(trim(cnpj)) >= 14
    )
  )
);

-- 2. Índices de Desempenho e Unicidade por Inquilino
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_tenant_cpf ON public.partners(tenant_id, cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_tenant_cnpj ON public.partners(tenant_id, cnpj)
  WHERE cnpj IS NOT NULL AND cnpj <> '';

CREATE INDEX IF NOT EXISTS idx_partners_tenant_email ON public.partners(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_status ON public.partners(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_person_type ON public.partners(tenant_id, person_type);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_id ON public.partners(tenant_id);

-- 3. Trigger de updated_at para partners
CREATE OR REPLACE TRIGGER set_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Habilitar RLS (Row Level Security) com Isolamento Multitenant
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners tenant isolation policy" ON public.partners;
CREATE POLICY "Partners tenant isolation policy" ON public.partners
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

-- 5. Interoperabilidade e Retrocompatibilidade com tabela 'indicadores'
-- Adiciona colunas complementares em 'indicadores' para sincronização transparente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'person_type'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN person_type text DEFAULT 'PF';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN status text DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'corporate_name'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN corporate_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'trade_name'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN trade_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'requires_invoice'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN requires_invoice boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN address jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_agency'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_agency varchar(10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_account'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_account varchar(20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_account_type'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_account_type text;
  END IF;
END $$;

-- 6. Gatilho de Sincronização Automática: partners -> indicadores
-- Permite que novas entidades em 'partners' satisfaçam FKs existentes em clientes/pis/comissoes
CREATE OR REPLACE FUNCTION public.sync_partner_to_indicadores()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.indicadores (
    id,
    tenant_id,
    nome,
    email,
    telefone,
    cpf_cnpj,
    chave_pix,
    tipo_chave_pix,
    banco_nome,
    percentual_comissao_padrao,
    observacoes,
    ativo,
    person_type,
    status,
    corporate_name,
    trade_name,
    requires_invoice,
    address,
    bank_agency,
    bank_account,
    bank_account_type,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.tenant_id,
    COALESCE(NEW.full_name, NEW.trade_name, NEW.corporate_name, 'Parceiro'),
    NEW.email,
    NEW.phone,
    COALESCE(NEW.cpf, NEW.cnpj),
    NEW.pix_key,
    NEW.pix_key_type,
    NEW.bank_name,
    NEW.default_commission_rate,
    NEW.notes,
    (NEW.status = 'active'),
    NEW.person_type,
    NEW.status,
    NEW.corporate_name,
    NEW.trade_name,
    NEW.requires_invoice,
    NEW.address,
    NEW.bank_agency,
    NEW.bank_account,
    NEW.bank_account_type,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    cpf_cnpj = EXCLUDED.cpf_cnpj,
    chave_pix = EXCLUDED.chave_pix,
    tipo_chave_pix = EXCLUDED.tipo_chave_pix,
    banco_nome = EXCLUDED.banco_nome,
    percentual_comissao_padrao = EXCLUDED.percentual_comissao_padrao,
    observacoes = EXCLUDED.observacoes,
    ativo = EXCLUDED.ativo,
    person_type = EXCLUDED.person_type,
    status = EXCLUDED.status,
    corporate_name = EXCLUDED.corporate_name,
    trade_name = EXCLUDED.trade_name,
    requires_invoice = EXCLUDED.requires_invoice,
    address = EXCLUDED.address,
    bank_agency = EXCLUDED.bank_agency,
    bank_account = EXCLUDED.bank_account,
    bank_account_type = EXCLUDED.bank_account_type,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_partner_to_indicadores ON public.partners;
CREATE TRIGGER trg_sync_partner_to_indicadores
  AFTER INSERT OR UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_partner_to_indicadores();

-- 7. Migração Inicial de Dados Pré-existentes de 'indicadores' para 'partners' (se houver)
INSERT INTO public.partners (
  id,
  tenant_id,
  person_type,
  status,
  full_name,
  cpf,
  cnpj,
  corporate_name,
  trade_name,
  email,
  phone,
  default_commission_rate,
  payment_condition,
  requires_invoice,
  pix_key_type,
  pix_key,
  bank_name,
  notes,
  created_at,
  updated_at
)
SELECT
  i.id,
  i.tenant_id,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN 'PJ' ELSE 'PF' END AS person_type,
  CASE WHEN i.ativo THEN 'active' ELSE 'inactive' END AS status,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) <= 11 THEN i.nome ELSE NULL END AS full_name,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) <= 11 THEN i.cpf_cnpj ELSE NULL END AS cpf,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.cpf_cnpj ELSE NULL END AS cnpj,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.nome ELSE NULL END AS corporate_name,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.nome ELSE NULL END AS trade_name,
  COALESCE(i.email, 'contato@midiaos.com.br'),
  COALESCE(i.telefone, '(61) 99999-9999'),
  COALESCE(i.percentual_comissao_padrao, 10.00),
  'post_client_payment',
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN true ELSE false END,
  COALESCE(i.tipo_chave_pix, 'cpf'),
  COALESCE(i.chave_pix, i.cpf_cnpj, 'pendente'),
  i.banco_nome,
  i.observacoes,
  i.created_at,
  i.updated_at
FROM public.indicadores i
WHERE NOT EXISTS (
  SELECT 1 FROM public.partners p WHERE p.id = i.id
)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006160000_modulo_circuitos_bundles_parceiros.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006160000_modulo_circuitos_bundles_parceiros.sql
-- DESCRIÇÃO: Módulo de Circuitos e Bundles com Desconto Exclusivo por Parceiro Elegível
-- ==============================================================================

-- 1. Adicionar flag de permissão allows_circuit_bundles nas tabelas de parceiros
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parceiros' AND column_name = 'allows_circuit_bundles') THEN
      ALTER TABLE public.parceiros ADD COLUMN allows_circuit_bundles boolean NOT NULL DEFAULT false;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'allows_circuit_bundles') THEN
      ALTER TABLE public.partners ADD COLUMN allows_circuit_bundles boolean NOT NULL DEFAULT false;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'indicadores') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'indicadores' AND column_name = 'allows_circuit_bundles') THEN
      ALTER TABLE public.indicadores ADD COLUMN allows_circuit_bundles boolean NOT NULL DEFAULT false;
    END IF;
  END IF;

  -- Campo de rastreamento do bundle em itens de propostas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposta_itens') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'circuit_bundle_id') THEN
      ALTER TABLE public.proposta_itens ADD COLUMN circuit_bundle_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'bundle_discount_applied') THEN
      ALTER TABLE public.proposta_itens ADD COLUMN bundle_discount_applied boolean DEFAULT false;
    END IF;
  END IF;
END $$;

-- 2. Tabela principal de Circuitos e Bundles
CREATE TABLE IF NOT EXISTS public.circuit_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  media_type text DEFAULT 'DOOH',
  pricing_type text NOT NULL DEFAULT 'discount_percentage' CHECK (pricing_type IN ('fixed_price', 'discount_percentage', 'discount_nominal')),
  discount_value numeric(12, 2) NOT NULL DEFAULT 0.00,
  fixed_price numeric(12, 2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circuit_bundles_tenant ON public.circuit_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_circuit_bundles_partner ON public.circuit_bundles(partner_id);
CREATE INDEX IF NOT EXISTS idx_circuit_bundles_active ON public.circuit_bundles(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_circuit_bundles_code_tenant ON public.circuit_bundles(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'), code);

-- 3. Tabela de Composição de Itens do Circuito
CREATE TABLE IF NOT EXISTS public.circuit_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.circuit_bundles(id) ON DELETE CASCADE,
  produto_id uuid,
  media_service_id uuid,
  product_name text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1.00,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0.00,
  is_mandatory boolean NOT NULL DEFAULT true,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circuit_bundle_items_bundle ON public.circuit_bundle_items(bundle_id);

-- 4. Tabela de Permissões Explícitas de Circuitos por Parceiro
CREATE TABLE IF NOT EXISTS public.circuit_bundle_partner_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.circuit_bundles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_bundle_partner_permission UNIQUE (bundle_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_partner_perms_bundle ON public.circuit_bundle_partner_permissions(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_partner_perms_partner ON public.circuit_bundle_partner_permissions(partner_id);

-- 5. Trigger de updated_at para circuit_bundles
CREATE OR REPLACE TRIGGER set_circuit_bundles_updated_at
  BEFORE UPDATE ON public.circuit_bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Habilitar RLS nas tabelas criadas
ALTER TABLE public.circuit_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_bundle_partner_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Circuit bundles tenant isolation policy" ON public.circuit_bundles;
CREATE POLICY "Circuit bundles tenant isolation policy" ON public.circuit_bundles
  FOR ALL
  USING (
    tenant_id IS NULL OR
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Circuit bundle items policy" ON public.circuit_bundle_items;
CREATE POLICY "Circuit bundle items policy" ON public.circuit_bundle_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Circuit bundle partner perms policy" ON public.circuit_bundle_partner_permissions;
CREATE POLICY "Circuit bundle partner perms policy" ON public.circuit_bundle_partner_permissions
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006220000_admin_reset_user_password_rpc.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006220000_admin_reset_user_password_rpc.sql
-- DESCRIÇÃO: Função RPC segura com SECURITY DEFINER para redefinição administrativa
-- de senhas de usuários por Administradores / Master.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  target_user_id UUID,
  new_plain_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_email TEXT;
  v_is_admin BOOLEAN := FALSE;
  v_target_email TEXT;
BEGIN
  -- Identifica o usuário chamador a partir do contexto da sessão JWT
  v_caller_id := auth.uid();
  
  -- Se chamado via service_role, auth.uid() pode ser nulo mas a role é service_role
  IF v_caller_id IS NULL AND current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Não autorizado: usuário não autenticado';
  END IF;

  -- Se for um usuário autenticado normal, valida se ele é administrador
  IF v_caller_id IS NOT NULL THEN
    SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;

    -- Master email ou perfil com permissão
    IF lower(COALESCE(v_caller_email, '')) = 'rafaelrodrigo.as@gmail.com' THEN
      v_is_admin := TRUE;
    ELSE
      -- Verifica se é superadmin ou admin em profiles
      SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = v_caller_id 
          AND (is_superadmin = true OR role IN ('admin', 'super_admin', 'MASTER', 'diretoria'))
      ) INTO v_is_admin;

      -- Se ainda não for admin, verifica em user_roles
      IF NOT v_is_admin THEN
        SELECT EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = v_caller_id AND role IN ('admin', 'super_admin')
        ) INTO v_is_admin;
      END IF;
    END IF;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Apenas administradores podem redefinir a senha de outros usuários';
    END IF;
  END IF;

  -- Validação de tamanho mínimo de senha
  IF length(new_plain_password) < 6 THEN
    RAISE EXCEPTION 'A senha deve possuir no mínimo 6 caracteres';
  END IF;

  -- Busca o email do usuário alvo
  SELECT email INTO v_target_email FROM auth.users WHERE id = target_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Atualiza com segurança a senha encriptada em auth.users utilizando bcrypt bf
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_plain_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  -- Registra auditoria
  BEGIN
    INSERT INTO public.auditoria_acessos (
      actor_id,
      actor_email,
      acao,
      target_user_id,
      target_email,
      detalhes
    ) VALUES (
      COALESCE(v_caller_id, gen_random_uuid()),
      v_caller_email,
      'senha_redefinida',
      target_user_id,
      v_target_email,
      jsonb_build_object('origem', 'admin_reset_user_password_rpc', 'redefinido_em', now())
    );
  EXCEPTION WHEN OTHERS THEN
    -- ignora erro de auditoria para não travar a operação principal
  END;

  RETURN jsonb_build_object('success', true, 'message', 'Senha redefinida com sucesso');
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;
COMMENT ON FUNCTION public.admin_reset_user_password IS 'Redefine a senha de outro usuário de forma segura, garantindo autorização de Administrador';


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006230000_public_inventory_white_label_view.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006230000_public_inventory_white_label_view.sql
-- DESCRIÇÃO: Função RPC e View segura para inventário público White-Label (Flux OOH)
-- REGRA CRÍTICA DE PRIVACIDADE: NUNCA expõe dados, nomes ou IDs de parceiros proprietários.
-- ==============================================================================

-- 1. Habilita Realtime para as tabelas de ativos e produtos se ainda não estiver habilitado
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
  EXCEPTION WHEN OTHERS THEN
    -- já adicionado ou tabela sem PK replicável
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media_services_catalog;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 2. Função RPC segura com SECURITY DEFINER para consulta pública de ativos
-- Retorna estritamente dados operacionais e de localização dos ativos, sem parceiros
CREATE OR REPLACE FUNCTION public.get_public_inventory_assets(
  p_cidade TEXT DEFAULT NULL,
  p_tipo_midia TEXT DEFAULT NULL,
  p_busca TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  codigo_ativo TEXT,
  nome_ponto TEXT,
  tipo_midia TEXT,
  formato TEXT,
  dimensoes TEXT,
  cidade TEXT,
  bairro TEXT,
  uf TEXT,
  endereco TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  fotos_urls TEXT[],
  status_disponibilidade TEXT,
  valor_tabela NUMERIC,
  impactos_estimados NUMERIC,
  fluxo_diario NUMERIC,
  link_maps TEXT,
  sentido_via TEXT,
  ponto_referencia TEXT,
  ativo BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_codigo_ativo'),
      ('DF-' || UPPER(SUBSTRING(p.id::text FROM 1 FOR 4)))
    ) AS codigo_ativo,
    p.nome AS nome_ponto,
    COALESCE(p.tipo, p.midia::text, 'OOH') AS tipo_midia,
    COALESCE(p.formato, p.formato_ooh, 'Bi-Semana') AS formato,
    COALESCE(p.resolucao, p.formato_tela, p.dimensoes_pixels, NULL) AS dimensoes,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_cidade'),
      NULLIF(TRIM(SPLIT_PART(p.endereco_ponto, ',', 2)), ''),
      'Brasília'
    ) AS cidade,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_bairro'),
      NULLIF(TRIM(SPLIT_PART(p.endereco_ponto, '-', 1)), ''),
      'Plano Piloto'
    ) AS bairro,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_uf'),
      'DF'
    ) AS uf,
    p.endereco_ponto AS endereco,
    p.latitude,
    p.longitude,
    CASE 
      WHEN p.fotos IS NOT NULL AND array_length(p.fotos, 1) > 0 THEN p.fotos
      WHEN (p.detalhes_venda::jsonb->'_fotos') IS NOT NULL THEN 
        ARRAY(SELECT jsonb_array_elements_text(p.detalhes_venda::jsonb->'_fotos'))
      ELSE ARRAY[]::TEXT[]
    END AS fotos_urls,
    COALESCE((p.detalhes_venda::jsonb->>'_status_disponibilidade'), 'Disponível') AS status_disponibilidade,
    COALESCE(p.valor_unit, 0.00) AS valor_tabela,
    COALESCE(p.impactos_estimados, 0) AS impactos_estimados,
    COALESCE((p.detalhes_venda::jsonb->>'_fluxo_veiculos_dia')::numeric, 0) AS fluxo_diario,
    p.link_maps,
    COALESCE(p.sentido_via, (p.detalhes_venda::jsonb->>'_sentido_fluxo')) AS sentido_via,
    p.ponto_referencia,
    p.ativo,
    p.updated_at
  FROM public.produtos p
  WHERE p.ativo = true
    AND (p_cidade IS NULL OR p.endereco_ponto ILIKE ('%' || p_cidade || '%') OR (p.detalhes_venda::jsonb->>'_cidade') ILIKE ('%' || p_cidade || '%'))
    AND (p_tipo_midia IS NULL OR p.tipo ILIKE ('%' || p_tipo_midia || '%') OR p.midia::text ILIKE ('%' || p_tipo_midia || '%'))
    AND (
      p_busca IS NULL OR 
      p.nome ILIKE ('%' || p_busca || '%') OR 
      p.endereco_ponto ILIKE ('%' || p_busca || '%') OR
      (p.detalhes_venda::jsonb->>'_codigo_ativo') ILIKE ('%' || p_busca || '%')
    )
  ORDER BY p.updated_at DESC;
END;
$$;

-- Permissões de acesso público e autenticado
GRANT EXECUTE ON FUNCTION public.get_public_inventory_assets(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_public_inventory_assets IS 'Consulta de inventário público para vitrine White-Label (estilo Flux OOH) sem expor parceiros proprietários';


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261006240000_garantir_edicao_universal_rls_update.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006240000_garantir_edicao_universal_rls_update.sql
-- DESCRIÇÃO: Garante permissões de UPDATE, RLS resiliente a dados importados/nulos,
--            rastreabilidade (updated_at, updated_by) em todas as entidades comerciais.
-- POLÍTICA AGENTS.md: Não-destrutiva, 100% aditiva, retrocompatível.
-- ==============================================================================

-- 1. FUNÇÃO TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.trg_auto_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. GARANTIR COLUNAS updated_at E updated_by EM TODAS AS TABELAS PRINCIPAIS
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'produtos',
    'parceiros',
    'partners',
    'clientes',
    'agencias',
    'pedidos_insercao',
    'propostas',
    'tarefas',
    'materiais_apoio',
    'links_uteis',
    'media_services_catalog',
    'circuitos_bundles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;', tbl);
      
      -- Criar trigger de updated_at
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_auto_updated_at ON public.%I;', tbl, tbl);
      EXECUTE format('CREATE TRIGGER trg_%I_auto_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_auto_touch_updated_at();', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- 3. POLÍTICAS DE UPDATE PERMISSIVAS E RESILIENTES A IMPORTAÇÕES (ZERO BLOQUEIO RLS)

-- PRODUTOS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "permitir_update_universal_produtos" ON public.produtos;
    
    CREATE POLICY "permitir_update_universal_produtos" ON public.produtos
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PARCEIROS (TABELA LEGADA E NOVA)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_parceiros" ON public.parceiros;
    DROP POLICY IF EXISTS "permitir_update_universal_parceiros" ON public.parceiros;
    
    CREATE POLICY "permitir_update_universal_parceiros" ON public.parceiros
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PARTNERS (REPRESENTAÇÃO COMERCIAL)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_partners_update" ON public.partners;
    DROP POLICY IF EXISTS "permitir_update_universal_partners" ON public.partners;
    
    CREATE POLICY "permitir_update_universal_partners" ON public.partners
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- MEDIA_SERVICES_CATALOG (CATÁLOGO DE ESPAÇOS / SERVIÇOS)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_services_catalog') THEN
    ALTER TABLE public.media_services_catalog ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_media_catalog" ON public.media_services_catalog;
    
    CREATE POLICY "permitir_update_universal_media_catalog" ON public.media_services_catalog
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- CLIENTES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "permitir_update_universal_clientes" ON public.clientes;
    
    CREATE POLICY "permitir_update_universal_clientes" ON public.clientes
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- AGÊNCIAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agencias') THEN
    ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "permitir_update_universal_agencias" ON public.agencias;
    
    CREATE POLICY "permitir_update_universal_agencias" ON public.agencias
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PEDIDOS DE INSERÇÃO (PIs)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos_insercao') THEN
    ALTER TABLE public.pedidos_insercao ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_pi" ON public.pedidos_insercao;
    DROP POLICY IF EXISTS "permitir_update_universal_pi" ON public.pedidos_insercao;
    
    CREATE POLICY "permitir_update_universal_pi" ON public.pedidos_insercao
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      );
  END IF;
END $$;

-- PROPOSTAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'propostas') THEN
    ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "permitir_update_universal_propostas" ON public.propostas;
    
    CREATE POLICY "permitir_update_universal_propostas" ON public.propostas
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      );
  END IF;
END $$;

-- TAREFAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tarefas') THEN
    ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_tarefas" ON public.tarefas;
    
    CREATE POLICY "permitir_update_universal_tarefas" ON public.tarefas
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        responsavel_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        responsavel_id = auth.uid()
      );
  END IF;
END $$;

-- MATERIAIS DE APOIO E LINKS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materiais_apoio') THEN
    ALTER TABLE public.materiais_apoio ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_materiais" ON public.materiais_apoio;
    
    CREATE POLICY "permitir_update_universal_materiais" ON public.materiais_apoio
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'links_uteis') THEN
    ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_links" ON public.links_uteis;
    
    CREATE POLICY "permitir_update_universal_links" ON public.links_uteis
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- CIRCUITOS E BUNDLES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'circuitos_bundles') THEN
    ALTER TABLE public.circuitos_bundles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_circuitos" ON public.circuitos_bundles;
    
    CREATE POLICY "permitir_update_universal_circuitos" ON public.circuitos_bundles
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- NOTIFICAR RECARGA DE SCHEMA
NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------------------
-- INÍCIO: 20261007010000_esteira_operacional_pi_duplo_fluxo_veiculacao.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261007010000_esteira_operacional_pi_duplo_fluxo_veiculacao.sql
-- MÍDIA.OS: MODELAGEM ADITIVA DO DUPLO FLUXO DE PEDIDOS DE INSERÇÃO (PI)
-- E GATILHO DE VALIDAÇÃO DE VEICULAÇÃO OPERACIONAL / ATIVOS OOH
-- ==============================================================================

-- 1. EVOLUÇÃO ADITIVA DA TABELA public.pis
-- ------------------------------------------------------------------------------
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_pi TEXT DEFAULT 'CLIENTE', -- 'CLIENTE' | 'PARCEIRO'
  ADD COLUMN IF NOT EXISTS numero_pi TEXT,
  ADD COLUMN IF NOT EXISTS emissor_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destinatario_id UUID,
  ADD COLUMN IF NOT EXISTS valor_bruto NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_comissao_agencia NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_desconto_inquilino NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_abatimentos NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_veiculacao TEXT DEFAULT 'aguardando_pi', -- 'aguardando_pi' | 'veiculacao_autorizada' | 'em_veiculacao' | 'veiculado'
  ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pis_proposta_id ON public.pis(proposta_id);
CREATE INDEX IF NOT EXISTS idx_pis_tipo_pi ON public.pis(tipo_pi);
CREATE INDEX IF NOT EXISTS idx_pis_destinatario_id ON public.pis(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_pis_emissor_id ON public.pis(emissor_id);
CREATE INDEX IF NOT EXISTS idx_pis_status_veiculacao ON public.pis(status_veiculacao);

-- Sincronizar numero_pi com numero onde nulo
UPDATE public.pis
SET numero_pi = numero
WHERE numero_pi IS NULL;

-- 2. EVOLUÇÃO ADITIVA DA TABELA public.pi_itens
-- ------------------------------------------------------------------------------
ALTER TABLE public.pi_itens
  ADD COLUMN IF NOT EXISTS ativo_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS periodo_veiculacao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS valor_unitario_tabela NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_unitario_negociado NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido_item NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abatimentos_item NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pi_itens_ativo_id ON public.pi_itens(ativo_id);
CREATE INDEX IF NOT EXISTS idx_pi_itens_produto_id ON public.pi_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_pi_itens_parceiro_id ON public.pi_itens(parceiro_id);

-- 3. EVOLUÇÃO ADITIVA DA TABELA public.produtos (ATIVOS / PONTOS / FACES OOH)
-- ------------------------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS status_operacional TEXT DEFAULT 'disponivel', -- 'disponivel' | 'reservado' | 'bloqueado_comercial' | 'em_veiculacao'
  ADD COLUMN IF NOT EXISTS pi_ativo_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposta_ativa_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_status_operacional ON public.produtos(status_operacional);
CREATE INDEX IF NOT EXISTS idx_produtos_pi_ativo_id ON public.produtos(pi_ativo_id);

-- 4. VIEWS DE COMPATIBILIDADE PARA pedidos_insercao E pedidos_insercao_itens
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.pedidos_insercao AS
SELECT 
  id,
  tenant_id,
  proposta_id,
  COALESCE(tipo_pi, 'CLIENTE') AS tipo_pi,
  COALESCE(numero_pi, numero) AS numero_pi,
  COALESCE(emissor_id, tenant_id) AS emissor_id,
  COALESCE(destinatario_id, CASE WHEN tipo_pi = 'PARCEIRO' THEN parceiro_id ELSE COALESCE(agencia_id, cliente_id) END) AS destinatario_id,
  COALESCE(valor_bruto, valor_tabela, valor_negociado, 0) AS valor_bruto,
  COALESCE(percentual_comissao_agencia, 0) AS percentual_comissao_agencia,
  COALESCE(percentual_desconto_inquilino, 0) AS percentual_desconto_inquilino,
  COALESCE(valor_abatimentos, valor_desconto, 0) AS valor_abatimentos,
  COALESCE(valor_liquido, valor_negociado, 0) AS valor_liquido,
  CASE 
    WHEN UPPER(status::text) IN ('RASCUNHO') THEN 'RASCUNHO'
    WHEN UPPER(status::text) IN ('CANCELADO', 'REPROVADO') THEN 'CANCELADO'
    WHEN UPPER(status::text) IN ('APROVADO', 'ASSINADO', 'VEICULADO', 'FATURADO', 'FINALIZADO') THEN 'APROVADO'
    ELSE 'EMITIDO'
  END AS status,
  status_veiculacao,
  COALESCE(data_emissao, created_at) AS data_emissao,
  periodo_inicio,
  periodo_fim,
  cliente_id,
  agencia_id,
  parceiro_id,
  pi_pai_id,
  campanha,
  observacao,
  created_at,
  updated_at
FROM public.pis;

CREATE OR REPLACE VIEW public.pedidos_insercao_itens AS
SELECT
  id,
  pi_id AS pedido_insercao_id,
  COALESCE(ativo_id, produto_id) AS ativo_id,
  COALESCE(produto_id, ativo_id) AS produto_id,
  parceiro_id,
  periodo_veiculacao,
  COALESCE(valor_unitario_tabela, valor_tabela, valor_unit, 0) AS valor_unitario_tabela,
  COALESCE(valor_unitario_negociado, valor_negociado, valor_unit, 0) AS valor_unitario_negociado,
  COALESCE(valor_liquido_item, repasse_valor, valor_negociado, 0) AS valor_liquido_item,
  COALESCE(abatimentos_item, comissao_valor, 0) AS abatimentos_item,
  tipo,
  programa,
  formato,
  total_insercoes,
  created_at
FROM public.pi_itens;

GRANT SELECT ON public.pedidos_insercao TO authenticated, service_role;
GRANT SELECT ON public.pedidos_insercao_itens TO authenticated, service_role;

-- 5. GATILHO DE PROTEÇÃO E VALIDAÇÃO DE VEICULAÇÃO DO ATIVO
-- ------------------------------------------------------------------------------
-- Regra: Um ativo de mídia só pode transicionar para 'em_veiculacao' se houver um PI emitido.
CREATE OR REPLACE FUNCTION public.validar_status_veiculacao_ativo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pi_status TEXT;
BEGIN
  -- Se estiver tentando colocar o ativo em veiculação
  IF NEW.status_operacional = 'em_veiculacao' THEN
    IF NEW.pi_ativo_id IS NULL THEN
      -- Se não tem PI vinculado, reverte para bloqueado comercial
      NEW.status_operacional := 'bloqueado_comercial';
    ELSE
      SELECT status::text INTO v_pi_status
      FROM public.pis
      WHERE id = NEW.pi_ativo_id;

      IF v_pi_status IS NULL OR LOWER(v_pi_status) IN ('rascunho', 'cancelado', 'reprovado') THEN
        -- PI ainda não emitido / aprovado oficialmente
        NEW.status_operacional := 'bloqueado_comercial';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_status_veiculacao_ativo ON public.produtos;
CREATE TRIGGER trg_validar_status_veiculacao_ativo
BEFORE INSERT OR UPDATE OF status_operacional, pi_ativo_id ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.validar_status_veiculacao_ativo();

-- 6. REFORÇO DE POLÍTICA RLS PARA SEGURANÇA E ISOLAMENTO DE PARCEIROS
-- ------------------------------------------------------------------------------
-- O parceiro só tem acesso ao seu próprio PI e seus próprios itens
DROP POLICY IF EXISTS "pis_partner_isolation" ON public.pis;
CREATE POLICY "pis_partner_isolation" ON public.pis
FOR SELECT TO authenticated
USING (
  public.is_master_user()
  OR (
    -- Usuário parceiro autenticado pelo CNPJ só vê os seus próprios PIs
    public.get_current_user_cnpj() IS NOT NULL
    AND parceiro_id IN (SELECT id FROM public.parceiros WHERE cnpj = public.get_current_user_cnpj())
  )
  OR (
    -- Clientes e agências continuam acessando seus respectivos PIs
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cliente_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
      OR agencia_id IN (SELECT id FROM public.agencias WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    -- Inquilino / Administradores sem vínculo exclusivo de CNPJ parceiro
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);


NOTIFY pgrst, 'reload schema';
