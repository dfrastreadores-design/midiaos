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
INSERT INTO public.entities (id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
SELECT 
  c.id, 
  'cliente', 
  c.razao_social, 
  c.nome_fantasia, 
  c.cnpj, 
  NULL, 
  NULL, 
  (CASE WHEN c.status = 'inativo' THEN false ELSE true END)
FROM public.clientes c
WHERE c.cnpj IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  cnpj = EXCLUDED.cnpj,
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia;

INSERT INTO public.entities (id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
SELECT 
  a.id, 
  'agencia', 
  a.razao_social, 
  a.nome_fantasia, 
  a.cnpj, 
  NULL, 
  NULL, 
  true
FROM public.agencias a
WHERE a.cnpj IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  cnpj = EXCLUDED.cnpj,
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    INSERT INTO public.entities (id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
    SELECT 
      p.id, 
      'veiculo', 
      p.razao_social, 
      p.nome_fantasia, 
      p.cnpj, 
      p.contato_email, 
      p.contato_telefone, 
      COALESCE(p.ativo, true)
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
