
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'campanha_iniciando';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'campanha_progresso';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'proposta_vencendo';

CREATE TABLE IF NOT EXISTS public.notificacao_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  ativo_inicio boolean NOT NULL DEFAULT true,
  dias_antes_inicio int NOT NULL DEFAULT 7,
  ativo_fim boolean NOT NULL DEFAULT true,
  dias_antes_fim int NOT NULL DEFAULT 7,
  ativo_progresso boolean NOT NULL DEFAULT true,
  marcos_percentual int[] NOT NULL DEFAULT ARRAY[50,75,90],
  ativo_validade boolean NOT NULL DEFAULT true,
  dias_antes_validade int NOT NULL DEFAULT 7,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.notificacao_config (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.notificacao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read notif_config" ON public.notificacao_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update notif_config" ON public.notificacao_config FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_dedup_idx
  ON public.notificacoes (user_id, tipo, (metadata->>'ref_id'), (metadata->>'evento'))
  WHERE metadata ? 'ref_id' AND metadata ? 'evento';
