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
