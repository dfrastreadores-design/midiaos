-- ==============================================================================
-- MIGRATION: 20260928160000_produtos_parceiro.sql
-- DESCRIÇÃO: Suporte a produtos de parceiros comerciais e isolamento por inquilino
-- DATA: 2026-09-28
-- ==============================================================================

ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS parceiro_cnpj text,
  ADD COLUMN IF NOT EXISTS parceiro_nome text;

COMMENT ON COLUMN public.produtos.parceiro_cnpj IS 'CNPJ do parceiro comercial proprietário do produto (em branco = produto do próprio inquilino)';
COMMENT ON COLUMN public.produtos.parceiro_nome IS 'Razão Social ou Nome Fantasia do parceiro comercial proprietário do produto';

CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_cnpj ON public.produtos(parceiro_cnpj);
