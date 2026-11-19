-- ==============================================================================
-- MIDIA OS v2.6.0 — ROLLBACK DO MÓDULO MIDIA OS PROSPECT (FASE 1)
-- Migration: 20261101230001_rollback_modulo_prospect_fase1.sql
-- Descrição: Reversão estrita e segura da migration da Fase 1
-- Ambiente:  Exclusivo para Homologação / Staging (Bloqueado em Produção)
-- ==============================================================================

-- 1. Remoção de Triggers e Funções Auxiliares
DROP TRIGGER IF EXISTS trg_protect_prospect_columns ON public.prospect_companies;
DROP FUNCTION IF EXISTS public.check_executivo_update_prospect();

DROP TRIGGER IF EXISTS trg_protect_interaction_inserts ON public.prospect_interactions;
DROP FUNCTION IF EXISTS public.check_interaction_insert_security();

DROP FUNCTION IF EXISTS public.transferir_lead_carteira(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.is_lead_bloqueado(TEXT, TEXT);

-- 2. Remoção das Seis Tabelas Auxiliares (Ordem Inversa de Dependência)
DROP TABLE IF EXISTS public.prospect_blocklist CASCADE;
DROP TABLE IF EXISTS public.prospect_interactions CASCADE;
DROP TABLE IF EXISTS public.prospect_campaigns CASCADE;
DROP TABLE IF EXISTS public.prospect_companies CASCADE;
DROP TABLE IF EXISTS public.prospect_searches CASCADE;
DROP TABLE IF EXISTS public.prospect_settings CASCADE;

