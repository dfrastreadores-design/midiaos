ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'producao';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'producao_solicitada';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS requer_producao boolean NOT NULL DEFAULT false;