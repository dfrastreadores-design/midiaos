-- ==============================================================================
-- MIGRATION: Modulo Simulador de Propostas e Calculo de Comissoes de Midia
-- DATA: 2026-10-05 22:00:00
-- ==============================================================================

-- 1. TABELA PROPOSALS (Simulador de Propostas Comerciais de Midia Multiveiculos)
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  campaign_title TEXT,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net_agency NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_payout_partners NUMERIC(14,2) NOT NULL DEFAULT 0,
  profit_margin_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'converted_to_pi')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id ON public.proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);

-- 2. TABELA PROPOSAL_ITEMS (Itens de Midia da Proposta / Espacos Publicitarios)
CREATE TABLE IF NOT EXISTS public.proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  media_service_id UUID REFERENCES public.media_services_catalog(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  is_own_product BOOLEAN NOT NULL DEFAULT false,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  billing_type TEXT NOT NULL DEFAULT 'insercao',
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  net_client_val NUMERIC(14,2) NOT NULL DEFAULT 0,
  agency_commission_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  agency_commission_val NUMERIC(14,2) NOT NULL DEFAULT 0,
  partner_payout_val NUMERIC(14,2) NOT NULL DEFAULT 0,
  min_negotiated_unit_price NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON public.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_media_service_id ON public.proposal_items(media_service_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_partner_id ON public.proposal_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_tenant_id ON public.proposal_items(tenant_id);

-- 3. HABILITACAO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- Politicas para public.proposals
DROP POLICY IF EXISTS "tenant_isolation_select_proposals" ON public.proposals;
CREATE POLICY "tenant_isolation_select_proposals" ON public.proposals
  FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_insert_proposals" ON public.proposals;
CREATE POLICY "tenant_isolation_insert_proposals" ON public.proposals
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_update_proposals" ON public.proposals;
CREATE POLICY "tenant_isolation_update_proposals" ON public.proposals
  FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_delete_proposals" ON public.proposals;
CREATE POLICY "tenant_isolation_delete_proposals" ON public.proposals
  FOR DELETE
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

-- Politicas para public.proposal_items
DROP POLICY IF EXISTS "tenant_isolation_select_proposal_items" ON public.proposal_items;
CREATE POLICY "tenant_isolation_select_proposal_items" ON public.proposal_items
  FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id
      AND (p.tenant_id = public.current_user_tenant_id() OR public.is_master_admin())
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_insert_proposal_items" ON public.proposal_items;
CREATE POLICY "tenant_isolation_insert_proposal_items" ON public.proposal_items
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id
      AND (p.tenant_id = public.current_user_tenant_id() OR public.is_master_admin())
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_update_proposal_items" ON public.proposal_items;
CREATE POLICY "tenant_isolation_update_proposal_items" ON public.proposal_items
  FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_delete_proposal_items" ON public.proposal_items;
CREATE POLICY "tenant_isolation_delete_proposal_items" ON public.proposal_items
  FOR DELETE
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

-- 4. SEGURANCA: TRIGGERS DE LIXEIRA E AUDITORIA
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_move_to_trash') THEN
    DROP TRIGGER IF EXISTS trg_proposals_trash ON public.proposals;
    CREATE TRIGGER trg_proposals_trash
      BEFORE DELETE ON public.proposals
      FOR EACH ROW EXECUTE FUNCTION public.fn_move_to_trash();

    DROP TRIGGER IF EXISTS trg_proposal_items_trash ON public.proposal_items;
    CREATE TRIGGER trg_proposal_items_trash
      BEFORE DELETE ON public.proposal_items
      FOR EACH ROW EXECUTE FUNCTION public.fn_move_to_trash();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_log_alteracao') THEN
    DROP TRIGGER IF EXISTS trg_proposals_audit ON public.proposals;
    CREATE TRIGGER trg_proposals_audit
      AFTER INSERT OR UPDATE OR DELETE ON public.proposals
      FOR EACH ROW EXECUTE FUNCTION public.fn_log_alteracao();
  END IF;
END $$;
