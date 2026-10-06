-- ============================================================================
-- MIGRAÇÃO: Suporte a Custos de Produção no Pedido de Inserção (PI)
-- Modos: EMBEDDED (Composição Oculta) e ITEMIZED (Discriminado Aberto)
-- Regras de Comissionamento e Divisão Interna vs. Exibição Comercial
-- ============================================================================

-- 1. TIPOS ENUMERADOS PARA PRODUÇÃO E EXIBIÇÃO
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_item_type_enum') THEN
    CREATE TYPE pi_item_type_enum AS ENUM ('MEDIA', 'PRODUCTION');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_display_mode_enum') THEN
    CREATE TYPE pi_display_mode_enum AS ENUM ('ITEMIZED', 'EMBEDDED');
  END IF;
END $$;

-- 2. NOVAS COLUNAS NA TABELA pi_items
ALTER TABLE public.pi_items
  ADD COLUMN IF NOT EXISTS item_type pi_item_type_enum NOT NULL DEFAULT 'MEDIA',
  ADD COLUMN IF NOT EXISTS display_mode pi_display_mode_enum NOT NULL DEFAULT 'ITEMIZED',
  ADD COLUMN IF NOT EXISTS parent_media_item_id UUID REFERENCES public.pi_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_commissionable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS media_raw_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS embedded_production_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS client_facing_total NUMERIC(14,2) NOT NULL DEFAULT 0.00;

-- 3. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pi_items_parent_media ON public.pi_items(parent_media_item_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_item_type ON public.pi_items(item_type);
CREATE INDEX IF NOT EXISTS idx_pi_items_display_mode ON public.pi_items(display_mode);

-- 4. ATUALIZAR GATILHO (TRIGGER) PARA RESPEITAR ITENS DE PRODUÇÃO E COMISSÃO
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
