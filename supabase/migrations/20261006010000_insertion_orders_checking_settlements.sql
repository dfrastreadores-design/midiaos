-- ============================================================================
-- MIGRAÇÃO: Módulo de Pedidos de Inserção (PI), Checking e Conciliação Financeira
-- Dialeto: PostgreSQL (compatível com Supabase)
-- Políticas estritas de Zero Perda de Dados (IF NOT EXISTS, tipos seguros)
-- ============================================================================

-- 1. TIPOS ENUMERADOS (ENUMS) COM VERIFICAÇÃO SEGURA
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type_enum') THEN
    CREATE TYPE billing_type_enum AS ENUM (
      'REPRESENTATIVE_BILLING',    -- Modalidade 1: Representante fatura o cliente e repassa ao veículo
      'DIRECT_VEHICLE_BILLING'     -- Modalidade 2: Veículo fatura direto e repassa comissão ao representante
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_status_enum') THEN
    CREATE TYPE pi_status_enum AS ENUM (
      'draft',              -- Rascunho
      'approved',           -- Aprovado / Autorizado para veiculação
      'in_broadcast',       -- Em veiculação
      'awaiting_checking',  -- Aguardando comprovação / relatórios
      'checking_approved',  -- Checking conferido e aprovado pelo Representante
      'billed',             -- Faturado / Dossiê enviado para o Cliente
      'paid_by_client',     -- Cliente quitou a fatura
      'settled',            -- Comissões e repasses aos veículos 100% concluídos
      'canceled'            -- Cancelado
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checking_status_enum') THEN
    CREATE TYPE checking_status_enum AS ENUM (
      'pending_upload',     -- Aguardando envio de arquivos pelo veículo
      'under_review',       -- Em conferência pelo Representante
      'approved',           -- Aprovado
      'rejected'            -- Reprovado com necessidade de reenvio
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_type_enum') THEN
    CREATE TYPE settlement_type_enum AS ENUM (
      'CLIENT_RECEIVABLE',      -- Cobrança contra o cliente (fatura bruta)
      'VEHICLE_PAYABLE',       -- Repasse líquido destinado ao veículo
      'COMMISSION_RECEIVABLE'   -- Comissão a receber do veículo (Modalidade 2)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_status_enum') THEN
    CREATE TYPE settlement_status_enum AS ENUM (
      'pending_checking',   -- Aguardando validação do checking
      'awaiting_payment',   -- Liberado para pagamento / aguardando vencimento
      'paid',               -- Liquidado
      'canceled'            -- Cancelado
    );
  END IF;
END $$;

-- ============================================================================
-- 2. TABELA PRINCIPAL: insertion_orders (PIs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.insertion_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pi_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    agency_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
    representative_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
    legacy_pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
    
    billing_type billing_type_enum NOT NULL DEFAULT 'REPRESENTATIVE_BILLING',
    status pi_status_enum NOT NULL DEFAULT 'draft',
    checking_status checking_status_enum NOT NULL DEFAULT 'pending_upload',
    
    -- Valores Financeiros Consolidados
    gross_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    representative_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Ex: 20.00 (%)
    representative_commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_vehicle_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Período de Campanha
    campaign_name VARCHAR(255) NOT NULL DEFAULT 'Campanha de Mídia',
    campaign_title VARCHAR(255), -- Alias retrocompatível
    campaign_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    campaign_end_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start DATE,           -- Alias retrocompatível
    period_end DATE,             -- Alias retrocompatível
    
    -- Dossiê Digital e Documentação
    invoice_number VARCHAR(100),
    invoice_url TEXT,
    vehicle_invoice_number VARCHAR(100),
    vehicle_invoice_url TEXT,
    dossier_url TEXT,
    dossier_data JSONB DEFAULT '{}'::jsonb,
    dossier_generated_at TIMESTAMPTZ,

    -- Metadados e Auditoria
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. TABELA DE ITENS DO PI: pi_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pi_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
    
    format_description VARCHAR(255) NOT NULL, -- Ex: "Banner Topo 970x90", "Spot 30s", "Post Feed"
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    insertions_count INTEGER NOT NULL DEFAULT 1,
    
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Divisão específica por item/veículo
    vehicle_commission_rate NUMERIC(5, 2), -- Caso varie por veículo/linha
    vehicle_commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vehicle_net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    checking_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. TABELA DE AUDITORIA/CHECKING: pi_checkings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pi_checkings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
    pi_item_id UUID REFERENCES public.pi_items(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type VARCHAR(50), -- 'image/png', 'application/pdf', 'audio/mp3', etc.
    description TEXT,
    notes TEXT,
    external_link TEXT,
    broadcast_date DATE,
    broadcast_time TEXT,
    
    status checking_status_enum NOT NULL DEFAULT 'under_review',
    rejection_reason TEXT,
    
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. TABELA FINANCEIRA DE CONCILIAÇÃO/REPASSES: pi_settlements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pi_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
    pi_item_id UUID REFERENCES public.pi_items(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    
    type settlement_type_enum NOT NULL,
    
    -- Partes envolvidas no pagamento/repasse
    payer_id UUID,
    receiver_id UUID,
    payer_type TEXT, -- 'client', 'representative', 'vehicle'
    receiver_type TEXT, -- 'representative', 'vehicle'
    
    amount NUMERIC(14, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    
    status settlement_status_enum NOT NULL DEFAULT 'pending_checking',
    invoice_number VARCHAR(100),
    proof_of_payment_url TEXT,
    receipt_url TEXT,
    payment_method TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. ÍNDICES PARA ALTA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_insertion_orders_tenant ON public.insertion_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_client ON public.insertion_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_representative ON public.insertion_orders(representative_id);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_status ON public.insertion_orders(status);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_checking ON public.insertion_orders(checking_status);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_billing ON public.insertion_orders(billing_type);

CREATE INDEX IF NOT EXISTS idx_pi_items_pi_id ON public.pi_items(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_vehicle_id ON public.pi_items(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_pi_checkings_pi_id ON public.pi_checkings(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_checkings_item_id ON public.pi_checkings(pi_item_id);
CREATE INDEX IF NOT EXISTS idx_pi_checkings_status ON public.pi_checkings(status);

CREATE INDEX IF NOT EXISTS idx_pi_settlements_pi_id ON public.pi_settlements(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_settlements_status ON public.pi_settlements(status);
CREATE INDEX IF NOT EXISTS idx_pi_settlements_type ON public.pi_settlements(type);

-- ============================================================================
-- 7. GATILHO (TRIGGER): TRAVA INVIOLÁVEL DE CHECKING PARA FATURAMENTO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_checking_before_billing()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status estiver mudando para 'billed' ou 'checking_approved'
    IF NEW.status IN ('billed', 'checking_approved') AND OLD.status NOT IN ('billed', 'checking_approved') THEN
        -- Verifica se o checking do PI foi formalmente aprovado
        IF NEW.checking_status != 'approved' THEN
            RAISE EXCEPTION 'Não é permitido faturar ou liberar o PI % sem aprovação formal de 100%% do checking.', NEW.pi_number;
        END IF;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_pi_billing_lock ON public.insertion_orders;
CREATE TRIGGER trg_check_pi_billing_lock
BEFORE UPDATE ON public.insertion_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_checking_before_billing();

-- ============================================================================
-- 8. GATILHO (TRIGGER): ATUALIZAÇÃO AUTOMÁTICA DOS TOTAIS DO PI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_pi_totals_from_items()
RETURNS TRIGGER AS $$
DECLARE
    target_pi_id UUID;
    total_bruto NUMERIC(14, 2);
    total_liquido NUMERIC(14, 2);
    total_comissao NUMERIC(14, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_pi_id := OLD.pi_id;
    ELSE
        target_pi_id := NEW.pi_id;
    END IF;

    SELECT 
        COALESCE(SUM(total_price), 0),
        COALESCE(SUM(vehicle_net_amount), 0),
        COALESCE(SUM(vehicle_commission_amount), 0)
    INTO total_bruto, total_liquido, total_comissao
    FROM public.pi_items
    WHERE pi_id = target_pi_id;

    UPDATE public.insertion_orders
    SET 
        gross_amount = total_bruto,
        net_vehicle_amount = total_liquido,
        representative_commission_amount = total_comissao,
        updated_at = NOW()
    WHERE id = target_pi_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_pi_totals ON public.pi_items;
CREATE TRIGGER trg_sync_pi_totals
AFTER INSERT OR UPDATE OR DELETE ON public.pi_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_pi_totals_from_items();

-- ============================================================================
-- 9. HABILITAR ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACESSO MULTI-TENANT
-- ============================================================================
ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_checkings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_settlements ENABLE ROW LEVEL SECURITY;

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
