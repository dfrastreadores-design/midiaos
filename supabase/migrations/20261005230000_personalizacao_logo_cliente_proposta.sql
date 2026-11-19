-- ==============================================================================
-- MIGRATION: Personalizacao com Logo e Nome do Cliente na Proposta Comercial
-- DATA: 2026-10-05 23:00:00
-- ==============================================================================

-- 1. Adiciona coluna client_logo_url na tabela proposals (Simulador)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS client_logo_url TEXT;

-- 2. Adiciona coluna client_logo_url na tabela propostas (Propostas Formais)
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS client_logo_url TEXT;

-- 3. Adiciona coluna client_nome_personalizado caso necessario
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS client_nome_personalizado TEXT;
