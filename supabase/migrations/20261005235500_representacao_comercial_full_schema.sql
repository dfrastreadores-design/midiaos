-- ==============================================================================
-- MIGRATION: 20261005235500_representacao_comercial_full_schema.sql
-- DESCRIÇÃO: Consolidação aditiva e não-destrutiva de esquemas para
--           Representação Comercial de Mídia, Catálogo de Inventário,
--           Defesas de Mídia Kit e Simulador de Propostas Executivas.
-- POLÍTICA: Zero Perda de Dados (AGENTS.md) - estritamente aditiva com IF NOT EXISTS
-- ==============================================================================

-- 1. TABELA PARTNERS (Veículos e Exibidoras Parceiras)
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS contato_nome TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT DEFAULT 'Painel OOH/DOOH',
  ADD COLUMN IF NOT EXISTS comissao_padrao_percentual NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS media_kit_defenses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial_discounts_rules JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- Retrocompatibilidade com tabela legada 'parceiros'
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    ALTER TABLE public.parceiros
      ADD COLUMN IF NOT EXISTS media_kit_defenses JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS commercial_discounts_rules JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS comissao_padrao_percentual NUMERIC(5,2) DEFAULT 20.00;
  END IF;
END $$;

-- 2. TABELA MEDIA_SERVICES_CATALOG (Inventário & Serviços de Mídia)
ALTER TABLE public.media_services_catalog
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_own_product BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nome_produto TEXT,
  ADD COLUMN IF NOT EXISTS categoria_midia TEXT,
  ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'insercao',
  ADD COLUMN IF NOT EXISTS valor_tabela NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_negociado_minimo NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS comissao_percentual_especifica NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS impactos_estimados_mes NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS insercoes_dia NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS spot_duration_seconds NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
  ADD COLUMN IF NOT EXISTS operating_hours TEXT,
  ADD COLUMN IF NOT EXISTS socioeconomic_class TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- 3. TABELA PROPOSALS (Propostas e Simulações Comerciais)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS client_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS media_defense TEXT,
  ADD COLUMN IF NOT EXISTS campaign_period TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 4. TABELA PROPOSAL_ITEMS (Itens de Mídia da Proposta)
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS spot_duration_seconds NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
  ADD COLUMN IF NOT EXISTS operating_hours TEXT,
  ADD COLUMN IF NOT EXISTS socioeconomic_class TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- Garantir índices de performance não bloqueantes
CREATE INDEX IF NOT EXISTS idx_media_catalog_is_own ON public.media_services_catalog(is_own_product);
CREATE INDEX IF NOT EXISTS idx_media_catalog_partner_id ON public.media_services_catalog(partner_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_logo ON public.proposals(client_logo_url) WHERE client_logo_url IS NOT NULL;
