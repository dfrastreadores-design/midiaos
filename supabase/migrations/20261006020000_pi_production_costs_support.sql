-- ============================================================================
-- MIGRAÇÃO: Suporte a Custos de Produção (Embutidos vs. Discriminados)
-- Dialeto: PostgreSQL (compatível com Supabase)
-- ============================================================================

-- 1. NOVOS TIPOS ENUMERADOS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_item_type_enum') THEN
        CREATE TYPE pi_item_type_enum AS ENUM (
            'MEDIA',        -- Inserções publicitárias / veiculação
            'PRODUCTION'   -- Produção (gravação de spot, edição de vídeo, arte estática, etc.)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_item_display_mode_enum') THEN
        CREATE TYPE pi_item_display_mode_enum AS ENUM (
            'ITEMIZED',     -- Aberto / Discriminado no espelho do cliente
            'EMBEDDED'      -- Embutido no valor da mídia (oculto do cliente)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_display_mode_enum') THEN
        CREATE TYPE pi_display_mode_enum AS ENUM (
            'ITEMIZED',
            'EMBEDDED'
        );
    END IF;
END $$;

-- ============================================================================
-- 2. ALTERAÇÃO NA TABELA pi_items
-- ============================================================================
ALTER TABLE public.pi_items
    ADD COLUMN IF NOT EXISTS item_type pi_item_type_enum NOT NULL DEFAULT 'MEDIA',
    ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'ITEMIZED',
    ADD COLUMN IF NOT EXISTS parent_media_item_id UUID REFERENCES public.pi_items(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_commissionable BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS media_raw_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS embedded_production_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS client_facing_total NUMERIC(14,2) NOT NULL DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_pi_items_parent_media ON public.pi_items(parent_media_item_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_item_type ON public.pi_items(item_type);
CREATE INDEX IF NOT EXISTS idx_pi_items_display_mode ON public.pi_items(display_mode);

-- ============================================================================
-- 3. VIEW SQL: ESPELHO DO CLIENTE (Visão Comercial / Exibição em PDF)
--
-- Regras aplicadas:
-- a) Itens com display_mode = 'EMBEDDED' NUNCA aparecem como linhas separadas.
-- b) Itens 'MEDIA' somam automaticamente os custos de produção vinculados a eles.
-- c) Itens 'PRODUCTION' com display_mode = 'ITEMIZED' aparecem normalmente.
-- ============================================================================
CREATE OR REPLACE VIEW public.view_client_pi_items AS
WITH embedded_costs AS (
    -- Consolida o valor de produção embutido por item pai
    SELECT 
        parent_media_item_id,
        COALESCE(SUM(total_price), 0.00) AS total_embedded_production
    FROM public.pi_items
    WHERE item_type = 'PRODUCTION' 
      AND display_mode = 'EMBEDDED'
      AND parent_media_item_id IS NOT NULL
    GROUP BY parent_media_item_id
)
SELECT 
    i.id AS item_id,
    i.pi_id,
    i.vehicle_id,
    i.item_type,
    i.format_description,
    i.period_start,
    i.period_end,
    i.insertions_count,
    
    -- Se tiver produção embutida, o preço unitário e o total refletem o valor consolidado
    CASE 
        WHEN i.item_type = 'MEDIA' AND ec.total_embedded_production > 0 THEN
            ROUND((i.total_price + ec.total_embedded_production) / NULLIF(i.insertions_count, 0), 2)
        ELSE 
            i.unit_price
    END AS client_unit_price,
    
    CASE 
        WHEN i.item_type = 'MEDIA' AND ec.total_embedded_production > 0 THEN
            i.total_price + ec.total_embedded_production
        ELSE 
            i.total_price
    END AS client_total_price

FROM public.pi_items i
LEFT JOIN embedded_costs ec ON ec.parent_media_item_id = i.id
WHERE 
    -- Regra de ouro do cliente: não listar linhas que foram marcadas para serem embutidas
    i.display_mode = 'ITEMIZED';

-- Permissão de leitura na view para usuários autenticados
GRANT SELECT ON public.view_client_pi_items TO authenticated;
GRANT SELECT ON public.view_client_pi_items TO service_role;

-- ============================================================================
-- 4. ATUALIZAÇÃO DA TRIGGER DE TOTAIS DO PI (Considerando is_commissionable)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_pi_totals_from_items()
RETURNS TRIGGER AS $$
DECLARE
    target_pi_id UUID;
    total_bruto NUMERIC(14, 2);
    total_liquido NUMERIC(14, 2);
    total_comissao NUMERIC(14, 2);
    pi_comm_rate NUMERIC(5, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_pi_id := OLD.pi_id;
    ELSE
        target_pi_id := NEW.pi_id;
    END IF;

    -- Obtém a taxa padrão de comissão cadastrada no cabeçalho do PI
    SELECT representative_commission_rate 
    INTO pi_comm_rate 
    FROM public.insertion_orders 
    WHERE id = target_pi_id;

    -- Recalcula os totais respeitando itens não comissionáveis (ex: produções repassadas a custo seco)
    SELECT 
        COALESCE(SUM(total_price), 0.00),
        COALESCE(SUM(
            CASE 
                -- Se não é comissionável, o valor líquido do veículo/produtor é 100% do total
                WHEN is_commissionable = FALSE THEN total_price
                -- Se tem taxa customizada por linha
                WHEN vehicle_commission_rate IS NOT NULL THEN total_price * (1 - (vehicle_commission_rate / 100))
                -- Caso contrário, usa a taxa geral do PI
                ELSE total_price * (1 - (COALESCE(pi_comm_rate, 0) / 100))
            END
        ), 0.00),
        COALESCE(SUM(
            CASE 
                -- Sem comissão para o representante em itens não comissionáveis
                WHEN is_commissionable = FALSE THEN 0.00
                -- Comissão customizada da linha
                WHEN vehicle_commission_rate IS NOT NULL THEN total_price * (vehicle_commission_rate / 100)
                -- Comissão pela taxa geral do PI
                ELSE total_price * (COALESCE(pi_comm_rate, 0) / 100)
            END
        ), 0.00)
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
