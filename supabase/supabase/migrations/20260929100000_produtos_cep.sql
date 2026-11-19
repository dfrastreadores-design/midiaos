-- ==============================================================================
-- MIGRATION: 20260929100000_produtos_cep.sql
-- DESCRIÇÃO: Suporte à coluna CEP em produtos (pontos OOH/DOOH)
-- DATA: 2026-09-29
-- ==============================================================================

ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS cep text;

COMMENT ON COLUMN public.produtos.cep IS 'CEP do ponto de exibição / mídia OOH/DOOH';

CREATE INDEX IF NOT EXISTS idx_produtos_cep ON public.produtos(cep);
