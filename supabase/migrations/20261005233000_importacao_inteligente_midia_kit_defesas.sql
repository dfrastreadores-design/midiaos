-- ==============================================================================
-- MIGRATION: 20261005233000_importacao_inteligente_midia_kit_defesas.sql
-- DESCRIÇÃO: Suporte a defesas comerciais, regras de desconto e métricas
--           de Mídia Kit extraídas via IA para parceiros e catálogo.
-- DIRETRIZ: Não-destrutiva (IF NOT EXISTS), aditiva e 100% retrocompatível (AGENTS.md)
-- ==============================================================================

-- 1. Enriquecer tabela partners (e legada parceiros) com defesas e descontos de Mídia Kit
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS media_kit_defenses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial_discounts_rules JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS media_kit_defenses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial_discounts_rules JSONB DEFAULT '[]'::jsonb;

-- 2. Enriquecer media_services_catalog com impactos estimados e inserções por dia
ALTER TABLE public.media_services_catalog
  ADD COLUMN IF NOT EXISTS impactos_estimados_mes BIGINT,
  ADD COLUMN IF NOT EXISTS insercoes_dia INTEGER;

-- 3. Enriquecer produtos com impactos e inserções se aplicável
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS impactos_estimados_mes BIGINT,
  ADD COLUMN IF NOT EXISTS insercoes_dia INTEGER;
