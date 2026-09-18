
-- Estende enum pi_status (idempotente)
DO $$ BEGIN
  ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'aguardando_aprovacao';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'reprovado';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Colunas de aprovação no PI
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS motivo_reprovacao text,
  ADD COLUMN IF NOT EXISTS enviado_aprovacao_em timestamp with time zone;

-- Estende enum de tipos de notificação (idempotente)
DO $$ BEGIN
  ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'pi_aguardando_aprovacao';
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'pi_aprovado';
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'pi_reprovado';
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_object THEN NULL; END $$;
