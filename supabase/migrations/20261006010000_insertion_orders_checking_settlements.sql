-- Migration: 20261006010000_insertion_orders_checking_settlements.sql
-- Módulo de Pedidos de Inserção (PI), Auditoria de Checking & Liquidação Financeira Bimodal
-- Políticas estritas de Zero Perda de Dados (IF NOT EXISTS, não destrutivo)

-- 1. TABELA PRINCIPAL: INSERTION_ORDERS (PIs)
CREATE TABLE IF NOT EXISTS public.insertion_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  representative_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  legacy_pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  
  -- Modalidade de Faturamento / Liquidação
  -- REPRESENTATIVE_BILLING: Faturamento via Representante (Conta Própria / Intermediação Financeira)
  -- DIRECT_VEHICLE_BILLING: Faturamento Direto pelo Veículo (Intermediação Operacional / Representação Pura)
  billing_type TEXT NOT NULL DEFAULT 'REPRESENTATIVE_BILLING' CHECK (billing_type IN ('REPRESENTATIVE_BILLING', 'DIRECT_VEHICLE_BILLING')),
  
  -- Valores Financeiros e Split
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  representative_commission_rate NUMERIC(6,2) NOT NULL DEFAULT 0,
  representative_commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_vehicle_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  -- Status do Checking de Veiculação
  -- Gatekeeper Mandatório: nenhum faturamento sem checking aprovado
  checking_status TEXT NOT NULL DEFAULT 'pending_upload' CHECK (checking_status IN ('pending_upload', 'under_review', 'approved', 'rejected')),
  
  -- Ciclo de Vida do PI
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',              -- Rascunho
    'approved',           -- Aprovado / Autorizado
    'in_broadcast',       -- Em Veiculação
    'awaiting_checking',  -- Aguardando Comprovação
    'checking_approved',  -- Checking Auditado e Validado
    'billed',             -- Faturado / Dossiê Enviado ao Cliente
    'paid_by_client',     -- Liquidado pelo Cliente
    'settled',            -- Comissões e Repasses Concluídos
    'canceled'            -- Cancelado
  )),
  
  campaign_title TEXT NOT NULL DEFAULT 'Campanha de Mídia',
  period_start DATE,
  period_end DATE,
  
  -- Dossiê Digital e Documentação
  invoice_number TEXT,
  invoice_url TEXT,
  vehicle_invoice_number TEXT,
  vehicle_invoice_url TEXT,
  dossier_url TEXT,
  dossier_data JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. LINHAS DE MÍDIA / ITENS DO PI (PI_ITEMS)
CREATE TABLE IF NOT EXISTS public.pi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  
  period_start DATE,
  period_end DATE,
  format_description TEXT NOT NULL,
  insertions_count INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  vehicle_net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  checking_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AUDITORIA E COMPROVAÇÃO DE MÍDIA (PI_CHECKINGS)
CREATE TABLE IF NOT EXISTS public.pi_checkings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  pi_item_id UUID REFERENCES public.pi_items(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT NOT NULL DEFAULT 'foto', -- 'foto', 'video', 'irradiacao', 'relatorio', 'clipping', 'link'
  external_link TEXT,
  broadcast_date DATE,
  broadcast_time TEXT,
  notes TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CONTAS A PAGAR / RECEBER DO PI (PI_SETTLEMENTS)
CREATE TABLE IF NOT EXISTS public.pi_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('CLIENT_RECEIVABLE', 'VEHICLE_PAYABLE', 'COMMISSION_RECEIVABLE')),
  payer_type TEXT NOT NULL CHECK (payer_type IN ('client', 'representative', 'vehicle')),
  receiver_type TEXT NOT NULL CHECK (receiver_type IN ('representative', 'vehicle')),
  vehicle_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_checking' CHECK (status IN ('pending_checking', 'awaiting_payment', 'paid')),
  
  payment_method TEXT,
  receipt_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_insertion_orders_tenant ON public.insertion_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_client ON public.insertion_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_status ON public.insertion_orders(status);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_checking ON public.insertion_orders(checking_status);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_billing ON public.insertion_orders(billing_type);

CREATE INDEX IF NOT EXISTS idx_pi_items_pi ON public.pi_items(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_vehicle ON public.pi_items(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_pi_checkings_pi ON public.pi_checkings(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_checkings_item ON public.pi_checkings(pi_item_id);
CREATE INDEX IF NOT EXISTS idx_pi_checkings_status ON public.pi_checkings(status);

CREATE INDEX IF NOT EXISTS idx_pi_settlements_pi ON public.pi_settlements(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_settlements_status ON public.pi_settlements(status);
CREATE INDEX IF NOT EXISTS idx_pi_settlements_type ON public.pi_settlements(type);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_checkings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_settlements ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO COM TENANT ISOLATION
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['insertion_orders', 'pi_items', 'pi_checkings', 'pi_settlements'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select_%s" ON public.%s;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_insert_%s" ON public.%s;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_update_%s" ON public.%s;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_delete_%s" ON public.%s;', t, t);

    EXECUTE format('
      CREATE POLICY "tenant_isolation_select_%s" ON public.%s
      FOR SELECT USING (
        auth.role() = ''authenticated'' AND (
          tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id IS NULL
        )
      );', t, t);

    EXECUTE format('
      CREATE POLICY "tenant_isolation_insert_%s" ON public.%s
      FOR INSERT WITH CHECK (
        auth.role() = ''authenticated''
      );', t, t);

    EXECUTE format('
      CREATE POLICY "tenant_isolation_update_%s" ON public.%s
      FOR UPDATE USING (
        auth.role() = ''authenticated'' AND (
          tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id IS NULL
        )
      );', t, t);

    EXECUTE format('
      CREATE POLICY "tenant_isolation_delete_%s" ON public.%s
      FOR DELETE USING (
        auth.role() = ''authenticated'' AND (
          tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id IS NULL
        )
      );', t, t);
  END LOOP;
END $$;

-- PERMISSÕES DE ACESSO
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insertion_orders TO authenticated;
GRANT ALL ON public.insertion_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_items TO authenticated;
GRANT ALL ON public.pi_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_checkings TO authenticated;
GRANT ALL ON public.pi_checkings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_settlements TO authenticated;
GRANT ALL ON public.pi_settlements TO service_role;
