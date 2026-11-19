-- Migration: 20260528161435_791132c9-d269-4a4f-8472-da41964cdda3.sql

-- Table
CREATE TABLE IF NOT EXISTS public.pi_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NULL,
  agencia_id uuid NULL,
  pi_id uuid NULL,
  titulo text NOT NULL,
  descricao text NULL,
  periodo_referencia text NULL,
  arquivo_nome text NOT NULL,
  arquivo_path text NOT NULL,
  arquivo_tipo text NULL,
  arquivo_tamanho bigint NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_anexos TO authenticated;
GRANT ALL ON public.pi_anexos TO service_role;

ALTER TABLE public.pi_anexos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pi_anexos_cliente ON public.pi_anexos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pi_anexos_agencia ON public.pi_anexos(agencia_id);
CREATE INDEX IF NOT EXISTS idx_pi_anexos_pi ON public.pi_anexos(pi_id);
DROP TRIGGER IF EXISTS trg_pi_anexos_updated_at ON public.pi_anexos;
CREATE TRIGGER trg_pi_anexos_updated_at
BEFORE UPDATE ON public.pi_anexos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Read: admin, criador, ou tem acesso ao cliente/agência/pi vinculado
DROP POLICY IF EXISTS "read pi_anexos" ON public.pi_anexos;
CREATE POLICY "read pi_anexos" ON public.pi_anexos FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (cliente_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = pi_anexos.cliente_id
      AND (c.executivo_id = auth.uid() OR c.created_by = auth.uid())
  ))
  OR (agencia_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agencias a
    WHERE a.id = pi_anexos.agencia_id
      AND (a.executivo_id = auth.uid() OR a.created_by = auth.uid())
  ))
  OR (pi_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = pi_anexos.pi_id
      AND (p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  ))
);

DROP POLICY IF EXISTS "insert pi_anexos" ON public.pi_anexos;
CREATE POLICY "insert pi_anexos" ON public.pi_anexos FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "update pi_anexos" ON public.pi_anexos;
CREATE POLICY "update pi_anexos" ON public.pi_anexos FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR created_by = auth.uid())
WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "delete pi_anexos" ON public.pi_anexos;
CREATE POLICY "delete pi_anexos" ON public.pi_anexos FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR created_by = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pi-anexos', 'pi-anexos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pi-anexos read auth" ON storage.objects;
CREATE POLICY "pi-anexos read auth" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pi-anexos');

DROP POLICY IF EXISTS "pi-anexos insert auth" ON storage.objects;
CREATE POLICY "pi-anexos insert auth" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pi-anexos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pi-anexos delete owner/admin" ON storage.objects;
CREATE POLICY "pi-anexos delete owner/admin" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pi-anexos' AND (is_admin(auth.uid()) OR owner = auth.uid()));


-- Migration: 20260602142716_f238850e-c99a-4089-aa1e-ba3fe26ed429.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assinatura_url TEXT;

CREATE TABLE IF NOT EXISTS public.pi_assinaturas_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','assinado','expirado')),
  nome_assinante TEXT,
  cpf TEXT,
  email TEXT,
  ip TEXT,
  user_agent TEXT,
  assinado_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pi_assin_pi ON public.pi_assinaturas_cliente(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_assin_token ON public.pi_assinaturas_cliente(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_assinaturas_cliente TO authenticated;
GRANT ALL ON public.pi_assinaturas_cliente TO service_role;

ALTER TABLE public.pi_assinaturas_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read pi_assin" ON public.pi_assinaturas_cliente;
CREATE POLICY "auth read pi_assin" ON public.pi_assinaturas_cliente
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert pi_assin" ON public.pi_assinaturas_cliente;
CREATE POLICY "auth insert pi_assin" ON public.pi_assinaturas_cliente
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);
DROP POLICY IF EXISTS "auth delete pi_assin" ON public.pi_assinaturas_cliente;
CREATE POLICY "auth delete pi_assin" ON public.pi_assinaturas_cliente
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "assin own read" ON storage.objects;
CREATE POLICY "assin own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "assin own write" ON storage.objects;
CREATE POLICY "assin own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "assin own update" ON storage.objects;
CREATE POLICY "assin own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "assin own delete" ON storage.objects;
CREATE POLICY "assin own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "assin admin all" ON storage.objects;
CREATE POLICY "assin admin all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'assinaturas' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'assinaturas' AND public.is_admin(auth.uid()));

-- Migration: 20260603175430_d3519897-2cd0-4afe-a18c-300079022753.sql
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS formato TEXT;
COMMENT ON COLUMN public.produtos.formato IS 'Formato do produto (ex: 30s, Página inteira, etc)';
GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.produtos TO authenticated;

-- Migration: 20260603175801_2c383449-8482-44e7-baff-bb6d62a2b935.sql
ALTER TABLE public.agencias 
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT;

COMMENT ON COLUMN public.agencias.website IS 'URL do website da agência';
COMMENT ON COLUMN public.clientes.website IS 'URL do website do cliente';

GRANT ALL ON public.agencias TO service_role;
GRANT ALL ON public.agencias TO authenticated;
GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.clientes TO authenticated;

-- Migration: 20260603205423_0a0f39ec-66d1-467f-97f7-4fc8897202ab.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS email_faturamento TEXT;
COMMENT ON COLUMN public.pis.email_faturamento IS 'E-mail para envio da nota fiscal';

-- Migration: 20260603211300_email_infra.sql
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supabase no longer grants public-schema access to service_role by default;
-- emit the grant explicitly so edge functions can reach the table via PostgREST.
GRANT ALL ON public.email_send_log TO service_role;

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state" ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

GRANT ALL ON public.suppressed_emails TO service_role;

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


-- Migration: 20260603212627_794150de-68c1-482f-a983-6403444ab997.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS permuta_detalhes TEXT;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS faturado BOOLEAN DEFAULT false;

-- Tabela para registrar o "pagamento" da permuta (o que a TV recebeu)
CREATE TABLE IF NOT EXISTS public.permuta_recebimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id),
  agencia_id UUID REFERENCES public.agencias(id),
  pi_id UUID REFERENCES public.pis(id),
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_recebimento DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de saldos consolidados para facilitar a visualização
CREATE TABLE IF NOT EXISTS public.permuta_saldos (
  entidade_id UUID NOT NULL PRIMARY KEY, -- cliente_id ou agencia_id
  razao_social TEXT,
  tipo TEXT CHECK (tipo IN ('cliente', 'agencia')),
  total_pi NUMERIC(15,2) DEFAULT 0, -- Total de PIs marcados como permuta
  total_recebido NUMERIC(15,2) DEFAULT 0, -- Total de produtos/serviços recebidos
  saldo NUMERIC(15,2) GENERATED ALWAYS AS (total_pi - total_recebido) STORED,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permuta_recebimentos TO authenticated;
GRANT ALL ON public.permuta_recebimentos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permuta_saldos TO authenticated;
GRANT ALL ON public.permuta_saldos TO service_role;

ALTER TABLE public.permuta_recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permuta_saldos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage permuta_recebimentos" ON public.permuta_recebimentos;
CREATE POLICY "Users can manage permuta_recebimentos" ON public.permuta_recebimentos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users can manage permuta_saldos" ON public.permuta_saldos;
CREATE POLICY "Users can manage permuta_saldos" ON public.permuta_saldos FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar saldos
CREATE OR REPLACE FUNCTION public.update_permuta_saldo() RETURNS TRIGGER AS $$
DECLARE
  v_entidade_id UUID;
  v_tipo TEXT;
  v_razao TEXT;
  v_total_pi NUMERIC;
  v_total_rec NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'pis' THEN
    v_entidade_id := COALESCE(NEW.cliente_id, NEW.agencia_id);
    IF NEW.cliente_id IS NOT NULL THEN v_tipo := 'cliente'; ELSE v_tipo := 'agencia'; END IF;
  ELSE
    v_entidade_id := COALESCE(NEW.cliente_id, NEW.agencia_id);
    IF NEW.cliente_id IS NOT NULL THEN v_tipo := 'cliente'; ELSE v_tipo := 'agencia'; END IF;
  END IF;

  IF v_entidade_id IS NULL THEN RETURN NEW; END IF;

  -- Busca razão social
  IF v_tipo = 'cliente' THEN
    SELECT razao_social INTO v_razao FROM public.clientes WHERE id = v_entidade_id;
  ELSE
    SELECT razao_social INTO v_razao FROM public.agencias WHERE id = v_entidade_id;
  END IF;

  -- Calcula totais
  SELECT COALESCE(SUM(valor_negociado), 0) INTO v_total_pi FROM public.pis 
  WHERE (cliente_id = v_entidade_id OR agencia_id = v_entidade_id) AND permuta = true AND status != 'cancelado';
  
  SELECT COALESCE(SUM(valor), 0) INTO v_total_rec FROM public.permuta_recebimentos 
  WHERE cliente_id = v_entidade_id OR agencia_id = v_entidade_id;

  INSERT INTO public.permuta_saldos (entidade_id, razao_social, tipo, total_pi, total_recebido, updated_at)
  VALUES (v_entidade_id, v_razao, v_tipo, v_total_pi, v_total_rec, now())
  ON CONFLICT (entidade_id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    total_pi = EXCLUDED.total_pi,
    total_recebido = EXCLUDED.total_recebido,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_saldo_pi ON public.pis;
CREATE TRIGGER trigger_update_saldo_pi AFTER INSERT OR UPDATE OR DELETE ON public.pis FOR EACH ROW EXECUTE FUNCTION public.update_permuta_saldo();
DROP TRIGGER IF EXISTS trigger_update_saldo_rec ON public.permuta_recebimentos;
CREATE TRIGGER trigger_update_saldo_rec AFTER INSERT OR UPDATE OR DELETE ON public.permuta_recebimentos FOR EACH ROW EXECUTE FUNCTION public.update_permuta_saldo();

-- Adiciona permissão
INSERT INTO public.permissions (key, label, description) 
VALUES ('/permuta', 'Controle de Permuta', 'Gerenciamento de saldos e recebimentos de permuta')
ON CONFLICT (key) DO NOTHING;


-- Migration: 20260603213713_c583d7d4-a21e-4fbe-acc0-519bda0e8c08.sql
-- [Consolidado no topo] ALTER TYPE ADD VALUE

-- Migration: 20260603213732_4ec9b569-6522-4af4-94d7-7bb094c2bc14.sql
-- Concede permissões para o novo papel 'diretoria'
INSERT INTO public.role_permissions (role, permission_key)
VALUES 
  ('diretoria', 'module.crm'),
  ('diretoria', 'module.clientes'),
  ('diretoria', 'module.agencias'),
  ('diretoria', 'module.produtos'),
  ('diretoria', 'module.pi'),
  ('diretoria', 'module.propostas'),
  ('diretoria', 'module.projetos'),
  ('diretoria', 'module.financeiro'),
  ('diretoria', 'module.calendario'),
  ('diretoria', 'module.relatorios'),
  ('diretoria', 'module.metas'),
  ('diretoria', 'pi.view_all'),
  ('diretoria', 'pi.approve'),
  ('diretoria', 'financeiro.view')
ON CONFLICT (role, permission_key) DO NOTHING;


-- Migration: 20260603220334_d6b0a5ad-8e4f-43f9-9f0b-9ffd7c3b54a1.sql
-- 1. Adiciona as colunas permitindo nulos inicialmente
ALTER TABLE public.pi_itens ADD COLUMN IF NOT EXISTS mes INTEGER;
ALTER TABLE public.pi_itens ADD COLUMN IF NOT EXISTS ano INTEGER;

-- 2. Migra os dados existentes da tabela pis para pi_itens
UPDATE public.pi_itens
SET mes = pis.mes_veiculacao,
    ano = pis.ano_veiculacao
FROM public.pis
WHERE pi_itens.pi_id = pis.id;

-- 3. Agora podemos colocar restrição de NOT NULL se desejado, 
-- mas vamos deixar opcional por enquanto para manter compatibilidade durante o deploy.
-- GRANTs já devem existir na tabela, mas garantimos para as novas colunas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_itens TO authenticated;
GRANT ALL ON public.pi_itens TO service_role;


-- Migration: 20260603220613_e1145783-3194-43c2-a73f-db75a8e097c0.sql
ALTER TABLE public.proposta_itens ADD COLUMN IF NOT EXISTS mes INTEGER;
ALTER TABLE public.proposta_itens ADD COLUMN IF NOT EXISTS ano INTEGER;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;


-- Migration: 20260603221948_5f6ff2a5-33ce-4cf1-be26-8df3c520f813.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS vencimento_tipo TEXT DEFAULT 'manual';
COMMENT ON COLUMN public.pis.vencimento_tipo IS 'Tipo de vencimento: manual, 15dfm ou 30dfm';


-- Migration: 20260603225156_ed574b34-5aca-4f82-a689-7785fd4c8795.sql

-- Fix 1: Restrict pi_assinaturas_cliente DELETE to admins or PI owner (executivo)
DROP POLICY IF EXISTS "auth delete pi_assin" ON public.pi_assinaturas_cliente;
DROP POLICY IF EXISTS "auth delete pi_assin" ON public.pi_assinaturas_cliente;
CREATE POLICY "auth delete pi_assin" ON public.pi_assinaturas_cliente
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.pis p
      WHERE p.id = pi_assinaturas_cliente.pi_id
        AND p.executivo_id = auth.uid()
    )
  );

-- Fix 2: Restrict permuta tables to authenticated users with admin/diretoria/financeiro privileges
DROP POLICY IF EXISTS "Users can manage permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Users can manage permuta_saldos" ON public.permuta_saldos;

DROP POLICY IF EXISTS "Authenticated can read permuta_recebimentos" ON public.permuta_recebimentos;
CREATE POLICY "Authenticated can read permuta_recebimentos" ON public.permuta_recebimentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can insert permuta_recebimentos" ON public.permuta_recebimentos;
CREATE POLICY "Authenticated can insert permuta_recebimentos" ON public.permuta_recebimentos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins can update permuta_recebimentos" ON public.permuta_recebimentos;
CREATE POLICY "Admins can update permuta_recebimentos" ON public.permuta_recebimentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete permuta_recebimentos" ON public.permuta_recebimentos;
CREATE POLICY "Admins can delete permuta_recebimentos" ON public.permuta_recebimentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can read permuta_saldos" ON public.permuta_saldos;
CREATE POLICY "Authenticated can read permuta_saldos" ON public.permuta_saldos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Service role manages permuta_saldos" ON public.permuta_saldos;
CREATE POLICY "Service role manages permuta_saldos" ON public.permuta_saldos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix 3: Add search_path to remaining SECURITY DEFINER / public functions
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.update_permuta_saldo() SET search_path = public;


-- Migration: 20260603225405_69bd1fc5-de1f-4adb-ab58-bf349eb13a63.sql
-- Adicionar chaves estrangeiras se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_cliente_id_fkey') THEN
        ALTER TABLE public.propostas 
        ADD CONSTRAINT propostas_cliente_id_fkey 
        FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_agencia_id_fkey') THEN
        ALTER TABLE public.propostas 
        ADD CONSTRAINT propostas_agencia_id_fkey 
        FOREIGN KEY (agencia_id) REFERENCES public.agencias(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_executivo_id_fkey') THEN
        ALTER TABLE public.propostas 
        ADD CONSTRAINT propostas_executivo_id_fkey 
        FOREIGN KEY (executivo_id) REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposta_itens_proposta_id_fkey') THEN
        ALTER TABLE public.proposta_itens 
        ADD CONSTRAINT proposta_itens_proposta_id_fkey 
        FOREIGN KEY (proposta_id) REFERENCES public.propostas(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Garantir permissões (caso necessário após alteração de estrutura)
GRANT SELECT ON public.propostas TO authenticated;
GRANT SELECT ON public.clientes TO authenticated;
GRANT SELECT ON public.agencias TO authenticated;
GRANT SELECT ON public.proposta_itens TO authenticated;


-- Migration: 20260603230145_4048be69-0d2c-4e34-8a0c-90a15dc1e1bc.sql
-- Adiciona coluna horario em proposta_itens
ALTER TABLE public.proposta_itens ADD COLUMN IF NOT EXISTS horario TEXT;

-- Adiciona coluna horario em pi_itens
ALTER TABLE public.pi_itens ADD COLUMN IF NOT EXISTS horario TEXT;

-- Garante permissões (embora já devam existir pelo GRANT ALL ON ALL TABLES)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;
GRANT ALL ON public.pi_itens TO service_role;

-- Migration: 20260603230647_9aa18d95-2eac-4fc2-95b2-d06cf1c3b41b.sql
-- Cria a tabela de tipos de produtos
CREATE TABLE IF NOT EXISTS public.produto_tipos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    midia TEXT NOT NULL CHECK (midia IN ('TV', 'Radio', 'DOOH')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(nome, midia)
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_tipos TO authenticated;
GRANT ALL ON public.produto_tipos TO service_role;

-- Habilita RLS
ALTER TABLE public.produto_tipos ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos;
CREATE POLICY "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Apenas admins podem gerenciar os tipos" ON public.produto_tipos;
CREATE POLICY "Apenas admins podem gerenciar os tipos" ON public.produto_tipos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Insere tipos padrão (sugeridos no código anterior)
INSERT INTO public.produto_tipos (nome, midia) VALUES 
('VT', 'TV'),
('Merchan', 'TV'),
('Insert', 'TV'),
('Patrocínio', 'TV'),
('Projeto Especial', 'TV'),
('Spot', 'Radio'),
('Jingle', 'Radio'),
('Painel', 'DOOH')
ON CONFLICT (nome, midia) DO NOTHING;

-- Migration: 20260603232300_a0c1411b-2a82-4749-afbc-86b78219852d.sql

-- 1) Restrict SELECT on pi_assinaturas_cliente to admin / PI owner / creator
DROP POLICY IF EXISTS "auth read pi_assin" ON public.pi_assinaturas_cliente;
DROP POLICY IF EXISTS "owner or admin read pi_assin" ON public.pi_assinaturas_cliente;
CREATE POLICY "owner or admin read pi_assin" ON public.pi_assinaturas_cliente
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pis p
      WHERE p.id = pi_assinaturas_cliente.pi_id
        AND (p.executivo_id = auth.uid() OR p.created_by = auth.uid())
    )
    OR criado_por = auth.uid()
  );

-- 2) Restrict INSERT on pi_historico to users who own / are assigned to / admin the referenced PI
DROP POLICY IF EXISTS "auth insert pi_historico" ON public.pi_historico;
DROP POLICY IF EXISTS "owner or admin insert pi_historico" ON public.pi_historico;
CREATE POLICY "owner or admin insert pi_historico" ON public.pi_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pis p
      WHERE p.id = pi_historico.pi_id
        AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- 3) Block direct INSERTs on auditoria_alteracoes from authenticated users.
--    The log_alteracao() trigger runs as SECURITY DEFINER and continues to write rows.
DROP POLICY IF EXISTS "no direct insert auditoria_alteracoes" ON public.auditoria_alteracoes;
CREATE POLICY "no direct insert auditoria_alteracoes" ON public.auditoria_alteracoes
  FOR INSERT
  TO authenticated
  WITH CHECK (false);


-- Migration: 20260608140829_313d1d8a-c1f1-473f-8dae-aef5e65cfaf8.sql
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS link_modelo text;

-- Migration: 20260608141112_aa6f90ab-8e87-473b-8478-009eee1127d3.sql
ALTER TABLE public.proposta_itens ADD COLUMN IF NOT EXISTS link_modelo text;

-- Migration: 20260608175325_f3abab49-f9ae-4dac-b3a1-8609667a7b2a.sql
CREATE OR REPLACE FUNCTION public.update_permuta_saldo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id UUID;
  v_agencia_id UUID;
  v_entidade_id UUID;
  v_tipo TEXT;
  v_razao TEXT;
  v_total_pi NUMERIC;
  v_total_rec NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_cliente_id := OLD.cliente_id;
    v_agencia_id := OLD.agencia_id;
  ELSE
    v_cliente_id := NEW.cliente_id;
    v_agencia_id := NEW.agencia_id;
  END IF;

  v_entidade_id := COALESCE(v_cliente_id, v_agencia_id);
  IF v_entidade_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF v_cliente_id IS NOT NULL THEN
    v_tipo := 'cliente';
    SELECT razao_social INTO v_razao FROM public.clientes WHERE id = v_entidade_id;
  ELSE
    v_tipo := 'agencia';
    SELECT razao_social INTO v_razao FROM public.agencias WHERE id = v_entidade_id;
  END IF;

  SELECT COALESCE(SUM(valor_negociado), 0)
    INTO v_total_pi
    FROM public.pis
   WHERE (cliente_id = v_entidade_id OR agencia_id = v_entidade_id)
     AND permuta = true
     AND status != 'cancelado';

  SELECT COALESCE(SUM(valor), 0)
    INTO v_total_rec
    FROM public.permuta_recebimentos
   WHERE cliente_id = v_entidade_id OR agencia_id = v_entidade_id;

  INSERT INTO public.permuta_saldos (entidade_id, razao_social, tipo, total_pi, total_recebido, updated_at)
  VALUES (v_entidade_id, v_razao, v_tipo, v_total_pi, v_total_rec, now())
  ON CONFLICT (entidade_id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    tipo = EXCLUDED.tipo,
    total_pi = EXCLUDED.total_pi,
    total_recebido = EXCLUDED.total_recebido,
    updated_at = now();

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Migration: 20260608175356_fde5d3b4-b998-4497-9f77-d4f18ef67058.sql
REVOKE EXECUTE ON FUNCTION public.update_permuta_saldo() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_permuta_saldo() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_permuta_saldo() FROM authenticated;

-- Migration: 20260608194837_71cc9450-00bf-4798-9449-a38fd347415d.sql
CREATE TABLE IF NOT EXISTS public.pi_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  nota_fiscal_numero text,
  nota_fiscal_path text,
  boleto_path text,
  vencimento_boleto date,
  valor numeric,
  status_pagamento text NOT NULL DEFAULT 'pendente',
  data_pagamento date,
  observacoes text,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_financeiro_pi_id ON public.pi_financeiro(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_financeiro_status ON public.pi_financeiro(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_pi_financeiro_vencimento ON public.pi_financeiro(vencimento_boleto);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_financeiro TO authenticated;
GRANT ALL ON public.pi_financeiro TO service_role;

ALTER TABLE public.pi_financeiro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view pi_financeiro" ON public.pi_financeiro;
CREATE POLICY "Authenticated users can view pi_financeiro" ON public.pi_financeiro FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert pi_financeiro" ON public.pi_financeiro;
CREATE POLICY "Authenticated users can insert pi_financeiro" ON public.pi_financeiro FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update pi_financeiro" ON public.pi_financeiro;
CREATE POLICY "Authenticated users can update pi_financeiro" ON public.pi_financeiro FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete pi_financeiro" ON public.pi_financeiro;
CREATE POLICY "Authenticated users can delete pi_financeiro" ON public.pi_financeiro FOR DELETE TO authenticated USING (true);
DROP TRIGGER IF EXISTS touch_pi_financeiro_updated_at ON public.pi_financeiro;
CREATE TRIGGER touch_pi_financeiro_updated_at
  BEFORE UPDATE ON public.pi_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for the bucket (bucket created via tool)
DROP POLICY IF EXISTS "Authenticated users can view financeiro docs" ON storage.objects;
CREATE POLICY "Authenticated users can view financeiro docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'financeiro-docs');

DROP POLICY IF EXISTS "Authenticated users can upload financeiro docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload financeiro docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'financeiro-docs');

DROP POLICY IF EXISTS "Authenticated users can update financeiro docs" ON storage.objects;
CREATE POLICY "Authenticated users can update financeiro docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'financeiro-docs');

DROP POLICY IF EXISTS "Authenticated users can delete financeiro docs" ON storage.objects;
CREATE POLICY "Authenticated users can delete financeiro docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'financeiro-docs');

-- Migration: 20260608195733_c95b34a4-010b-44fa-be2d-c32d6eaec623.sql
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS data_aniversario date;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS data_aniversario date;

-- Migration: 20260608200220_1c9bec26-9a92-43b5-9325-6d384453fed3.sql
ALTER TABLE public.clientes ALTER COLUMN data_aniversario TYPE text USING to_char(data_aniversario, 'DD/MM');
ALTER TABLE public.agencias ALTER COLUMN data_aniversario TYPE text USING to_char(data_aniversario, 'DD/MM');

-- Migration: 20260608205159_670499d5-5c56-450a-8a8a-8fc6d061cd01.sql
ALTER TABLE public.pi_anexos
  ADD COLUMN IF NOT EXISTS valor_bruto NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(14,2);

-- Migration: 20260608212036_f07f5939-09c5-4068-898f-f903f9291afe.sql
ALTER TABLE public.pi_assinaturas_cliente ADD COLUMN IF NOT EXISTS assinatura_url TEXT;

-- Migration: 20260608213013_ff3056b1-bbd2-4f48-9851-58e8845aa41b.sql
ALTER TABLE public.pi_assinaturas_cliente
  ADD COLUMN IF NOT EXISTS documento_tipo TEXT,
  ADD COLUMN IF NOT EXISTS documento_url TEXT,
  ADD COLUMN IF NOT EXISTS documento_mime TEXT;

-- Migration: 20260608214934_6c84ce58-8c7e-44aa-a896-3bb05a34e0f1.sql
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS requer_producao boolean NOT NULL DEFAULT false;

-- Migration: 20260608214957_434165b1-f481-46ce-849e-49e8f841880d.sql
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('producao'::app_role, 'module.pi'), ('producao'::app_role, 'module.calendario')
ON CONFLICT DO NOTHING;

-- Migration: 20260609133650_0c275617-1512-4bd4-8dd5-f235e9650fac.sql

CREATE TABLE IF NOT EXISTS public.sync_cnpj_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('cliente','agencia')),
  entidade_id uuid NOT NULL,
  cnpj text,
  razao_social text,
  status text NOT NULL CHECK (status IN ('atualizado','sem_alteracao','erro','ignorado')),
  campos_alterados jsonb DEFAULT '{}'::jsonb,
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sync_cnpj_log TO authenticated;
GRANT ALL ON public.sync_cnpj_log TO service_role;
ALTER TABLE public.sync_cnpj_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sync log readable by authenticated" ON public.sync_cnpj_log;
CREATE POLICY "sync log readable by authenticated" ON public.sync_cnpj_log FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_sync_cnpj_log_created ON public.sync_cnpj_log(created_at DESC);

-- Track last sync per entity for round-robin processing
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cnpj_sync_at timestamptz;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS cnpj_sync_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj_sync_at ON public.clientes(cnpj_sync_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_agencias_cnpj_sync_at ON public.agencias(cnpj_sync_at NULLS FIRST);


-- Migration: 20260609150028_d5a28c95-3ad7-48a5-82cc-1b54bb1ad70f.sql

CREATE TABLE IF NOT EXISTS public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer','fazendo','concluido')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta')),
  prazo DATE,
  responsavel TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES public.projetos_especiais(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT ALL ON public.tarefas TO service_role;

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário gerencia suas próprias tarefas" ON public.tarefas;
CREATE POLICY "Usuário gerencia suas próprias tarefas" ON public.tarefas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tarefas_user_status_ordem_idx ON public.tarefas(user_id, status, ordem);
DROP TRIGGER IF EXISTS tarefas_touch_updated_at ON public.tarefas;
CREATE TRIGGER tarefas_touch_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- Migration: 20260609192824_557c56db-7bfe-4cda-bc2a-48d7a056fed4.sql
CREATE UNIQUE INDEX IF NOT EXISTS agencias_cnpj_digits_uniq
  ON public.agencias ((regexp_replace(cnpj, '\D', '', 'g')))
  WHERE cnpj IS NOT NULL AND length(regexp_replace(cnpj, '\D', '', 'g')) = 14;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_cnpj_digits_uniq
  ON public.clientes ((regexp_replace(cnpj, '\D', '', 'g')))
  WHERE cnpj IS NOT NULL AND length(regexp_replace(cnpj, '\D', '', 'g')) = 14;

CREATE UNIQUE INDEX IF NOT EXISTS agencias_razao_social_nocnpj_uniq
  ON public.agencias ((lower(btrim(razao_social))))
  WHERE cnpj IS NULL OR length(regexp_replace(cnpj, '\D', '', 'g')) <> 14;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_razao_social_nocnpj_uniq
  ON public.clientes ((lower(btrim(razao_social))))
  WHERE cnpj IS NULL OR length(regexp_replace(cnpj, '\D', '', 'g')) <> 14;

-- Migration: 20260609204235_10c579d0-1456-4a9b-9835-e05cf58886af.sql
-- [Consolidado no topo] ALTER TYPE ADD VALUE


-- Migration: 20260609204318_0af69e30-8c4b-490f-ae42-8eacf5a3169e.sql
-- 1. Create briefings table
CREATE TABLE IF NOT EXISTS public.briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_producao, concluido, cancelado
    
    -- Client/Agency Info (to feed DB later)
    tipo_entidade TEXT NOT NULL CHECK (tipo_entidade IN ('cliente', 'agencia', 'ambos')),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT,
    contato_nome TEXT,
    contato_email TEXT,
    contato_telefone TEXT,
    
    -- Briefing Details
    campanha TEXT NOT NULL,
    objetivo TEXT,
    periodo_estimado TEXT,
    verba_estimada NUMERIC,
    detalhes_adicionais TEXT,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLS & Permissions
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;

-- Policies
DROP POLICY IF EXISTS "Users can view their own briefings" ON public.briefings;
CREATE POLICY "Users can view their own briefings" ON public.briefings
    FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
CREATE POLICY "Admins and Executives can view all briefings" ON public.briefings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'executivo')
        )
    );

DROP POLICY IF EXISTS "Users can create their own briefings" ON public.briefings;
CREATE POLICY "Users can create their own briefings" ON public.briefings
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own pending briefings" ON public.briefings;
CREATE POLICY "Users can update their own pending briefings" ON public.briefings
    FOR UPDATE USING (auth.uid() = created_by AND status = 'pendente');

DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;
CREATE POLICY "Admins and Executives can update any briefing" ON public.briefings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'executivo')
        )
    );

-- 3. Register permissions
INSERT INTO public.permissions (key, label, description) VALUES
('module.briefings', 'Briefings', 'Acesso ao módulo de Briefings')
ON CONFLICT (key) DO NOTHING;

-- 4. Role permissions setup
INSERT INTO public.role_permissions (role, permission_key) VALUES
('parceiro_comercial', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() 
RETURNS TRIGGER AS $$ 
BEGIN 
    NEW.updated_at = now(); 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_briefings_updated_at ON public.briefings;
CREATE TRIGGER update_briefings_updated_at BEFORE UPDATE ON public.briefings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260609210254_c844cc20-3b23-4fd6-873f-53312306cb86.sql
ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS produtos TEXT[];
COMMENT ON COLUMN public.briefings.produtos IS 'Lista de nomes de produtos selecionados no briefing';

-- Migration: 20260609225512_83ff399e-f43f-4c6b-87a6-a2d4b52dce7f.sql
-- Adicionar o perfil à lista de papéis permitidos (assumindo que existe uma restrição de check ou apenas para documentação se for via código)
-- Como o sistema usa uma tabela user_roles, precisamos garantir que o novo papel possa ser inserido.

-- Adicionar permissões para o novo perfil "parceiro_comercial"
-- Eles só podem acessar o módulo de briefings
INSERT INTO public.role_permissions (role, permission_key)
VALUES 
  ('parceiro_comercial', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Garantir que briefings existentes e futuros possam ser acessados por parceiros comerciais (RLS)
-- Geralmente as políticas já cobrem "authenticated", mas se houver políticas específicas por role, elas devem ser revisadas.
-- O arquivo briefings.functions.ts já filtra por userId se não for admin/executivo.


-- Migration: 20260609230316_6d348196-9692-42cb-866a-12446bf847c3.sql
-- Adicionar coluna briefing_id na tabela propostas para rastrear a origem
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS briefing_id UUID REFERENCES public.briefings(id) ON DELETE SET NULL;

-- Atualizar a tabela de briefings para incluir o ID da proposta final (opcional, já que propostas -> briefing_id resolve)
-- Mas para facilitar a listagem no frontend, briefing.proposta_id é útil.
-- Já existe proposta_id em briefings (vimos no schema anterior), vamos apenas garantir que ele seja usado.

-- Aumentar o tamanho do campo de link nas notificações se necessário (opcional)
-- ALTER TABLE public.notificacoes ALTER COLUMN link TYPE TEXT;

GRANT ALL ON public.propostas TO authenticated;
GRANT ALL ON public.propostas TO service_role;


-- Migration: 20260609230948_e50e4f4f-74d8-473b-91c5-e0dbd2d175a0.sql
ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS motivo_recusa TEXT;
ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS distribuicao_entregas TEXT;

GRANT ALL ON public.briefings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;


-- Migration: 20260609232013_d89bc1ed-45a8-4002-ae57-ea96efdb45d2.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS responsavel_negociacao_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS executivo_execucao_id UUID REFERENCES public.profiles(id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pis TO authenticated;
GRANT ALL ON public.pis TO service_role;


-- Migration: 20260610002145_ac7061f6-bfcd-4b8c-939b-6d9e7bc2566f.sql
-- Adiciona campos de produção na tabela de PIs
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_tipo TEXT CHECK (producao_tipo IN ('cliente', 'interna'));
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_contato TEXT;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_data TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_material_tipo TEXT;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_localizacao TEXT;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_observacoes TEXT;

-- Cria a tabela de solicitações de produção para histórico e gestão
CREATE TABLE IF NOT EXISTS public.solicitacoes_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
    solicitado_por UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_producao, concluida, cancelada
    contato TEXT,
    data_producao TIMESTAMP WITH TIME ZONE,
    material_tipo TEXT,
    localizacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.solicitacoes_producao ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_producao TO authenticated;
GRANT ALL ON public.solicitacoes_producao TO service_role;

-- Policies
DROP POLICY IF EXISTS "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao;
CREATE POLICY "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao;
CREATE POLICY "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao FOR ALL TO authenticated USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_solicitacoes_producao_updated_at ON public.solicitacoes_producao;
CREATE TRIGGER update_solicitacoes_producao_updated_at
BEFORE UPDATE ON public.solicitacoes_producao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260610013519_0eefa299-036f-4cf4-a69d-65e61b45059f.sql
CREATE TABLE IF NOT EXISTS public.proposal_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    modified_by UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL, -- 'create', 'update', 'status_change', etc.
    changes JSONB, -- store what changed
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT ON public.proposal_history TO authenticated;
GRANT ALL ON public.proposal_history TO service_role;

-- Enable RLS
ALTER TABLE public.proposal_history ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can view all proposal history" ON public.proposal_history;
CREATE POLICY "Admins can view all proposal history" ON public.proposal_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Owners can view their proposal history" ON public.proposal_history;
CREATE POLICY "Owners can view their proposal history" ON public.proposal_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.propostas 
        WHERE id = proposal_history.proposal_id AND created_by = auth.uid()
    )
);

-- Trigger to automatically log changes on propostas
CREATE OR REPLACE FUNCTION public.log_proposal_changes() 
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        -- Simple diff for important fields
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
            v_changes := v_changes || jsonb_build_object('valor_total', jsonb_build_object('old', OLD.valor_total, 'new', NEW.valor_total));
        END IF;
        -- Add more fields as needed or just log the whole new state if changes are complex
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_log_proposal_changes ON public.propostas;
CREATE TRIGGER trigger_log_proposal_changes
AFTER INSERT OR UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.log_proposal_changes();


-- Migration: 20260610105118_63daa2f0-ffbe-4f6b-beb3-b2606a9001c3.sql

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete their own briefings' AND polrelid = 'public.briefings'::regclass) THEN
    DROP POLICY IF EXISTS "Users can delete their own briefings" ON public.briefings;
CREATE POLICY "Users can delete their own briefings" ON public.briefings FOR DELETE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;


-- Migration: 20260610130026_00eafeb4-62d4-46ee-9905-13f69176c86c.sql
ALTER TABLE public.briefings 
DROP CONSTRAINT IF EXISTS briefings_created_by_fkey;

ALTER TABLE public.briefings
ADD CONSTRAINT briefings_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Ensure permissions are correct
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;


-- Migration: 20260610132444_8e77c0d3-a806-4c61-9b94-eed9746c61cc.sql
ALTER TABLE public.briefings 
ADD COLUMN IF NOT EXISTS historico_cliente TEXT,
ADD COLUMN IF NOT EXISTS perfil_audiencia TEXT,
ADD COLUMN IF NOT EXISTS concorrentes TEXT,
ADD COLUMN IF NOT EXISTS tom_comunicacao TEXT,
ADD COLUMN IF NOT EXISTS peças_disponiveis TEXT,
ADD COLUMN IF NOT EXISTS expectativa_resultado TEXT;

-- Migration: 20260610132732_ddb93368-49a2-4efa-89f3-d40c8da6a5ee.sql
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can view system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view system settings" ON public.system_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tabela para layouts de proposta
CREATE TABLE IF NOT EXISTS public.proposta_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_layouts TO authenticated;
GRANT ALL ON public.proposta_layouts TO service_role;

ALTER TABLE public.proposta_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage layouts" ON public.proposta_layouts;
CREATE POLICY "Admins can manage layouts" ON public.proposta_layouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can view layouts" ON public.proposta_layouts;
CREATE POLICY "Authenticated users can view layouts" ON public.proposta_layouts
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Adiciona coluna de layout_id na proposta
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS layout_id UUID REFERENCES public.proposta_layouts(id);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS custom_config JSONB; -- Para ajustes específicos de uma única proposta

-- Trigger para garantir que apenas um layout seja default
CREATE OR REPLACE FUNCTION handle_default_layout() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.proposta_layouts SET is_default = false WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_default_layout ON public.proposta_layouts;
CREATE TRIGGER trigger_default_layout
BEFORE INSERT OR UPDATE OF is_default ON public.proposta_layouts
FOR EACH ROW WHEN (NEW.is_default = true)
EXECUTE FUNCTION handle_default_layout();

-- Migration: 20260610134442_a9666a73-bfbb-4b9f-8b69-f6f8166755b4.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_email TEXT;
ALTER TABLE public.solicitacoes_producao ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.pis.producao_email IS 'Email de contato para produção de material';
COMMENT ON COLUMN public.solicitacoes_producao.email IS 'Email de contato para a solicitação de produção';

-- Migration: 20260610135439_80268db8-5740-45cd-9f24-e355b47f93be.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS permuta_uso TEXT CHECK (permuta_uso IN ('empresa', 'comercial'));
COMMENT ON COLUMN public.pis.permuta_uso IS 'Destino do uso da permuta: empresa (calcula na meta) ou comercial (não calcula na meta)';

UPDATE public.pis SET permuta_uso = 'empresa' WHERE permuta = true AND permuta_uso IS NULL;

-- Migration: 20260610165502_99525b11-f598-42a6-bd21-c5665ab52aad.sql
-- Grant permissions to parceiro_comercial for briefings
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('parceiro_comercial', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Ensure parceiro_comercial doesn't have other module permissions by default
-- (They might have others if manually added, but here we define the standard)
DELETE FROM public.role_permissions 
WHERE role = 'parceiro_comercial' 
AND permission_key NOT IN ('module.briefings');


-- Migration: 20260610170329_e852b491-c3fc-409f-a789-39e7000051ff.sql

CREATE TABLE IF NOT EXISTS public.briefing_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivo_path TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_tipo TEXT,
  arquivo_tamanho BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_anexos TO authenticated;
GRANT ALL ON public.briefing_anexos TO service_role;

ALTER TABLE public.briefing_anexos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS briefing_anexos_briefing_id_idx ON public.briefing_anexos(briefing_id);

CREATE OR REPLACE FUNCTION public.can_access_briefing(_briefing_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.briefings b
    WHERE b.id = _briefing_id
      AND (
        b.created_by = _user_id
        OR public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'executivo')
        OR public.has_role(_user_id, 'diretoria')
        OR public.has_role(_user_id, 'producao')
      )
  )
$$;

DROP POLICY IF EXISTS "briefing_anexos_select" ON public.briefing_anexos;
CREATE POLICY "briefing_anexos_select" ON public.briefing_anexos
  FOR SELECT TO authenticated
  USING (public.can_access_briefing(briefing_id, auth.uid()));

DROP POLICY IF EXISTS "briefing_anexos_insert" ON public.briefing_anexos;
CREATE POLICY "briefing_anexos_insert" ON public.briefing_anexos
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_access_briefing(briefing_id, auth.uid())
  );

DROP POLICY IF EXISTS "briefing_anexos_delete" ON public.briefing_anexos;
CREATE POLICY "briefing_anexos_delete" ON public.briefing_anexos
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );
DROP TRIGGER IF EXISTS briefing_anexos_updated_at ON public.briefing_anexos;
CREATE TRIGGER briefing_anexos_updated_at
  BEFORE UPDATE ON public.briefing_anexos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for bucket "briefing-anexos"
-- Path convention: {briefing_id}/{filename}
DROP POLICY IF EXISTS "briefing_anexos_storage_select" ON storage.objects;
CREATE POLICY "briefing_anexos_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'briefing-anexos'
    AND public.can_access_briefing(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "briefing_anexos_storage_insert" ON storage.objects;
CREATE POLICY "briefing_anexos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'briefing-anexos'
    AND public.can_access_briefing(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "briefing_anexos_storage_delete" ON storage.objects;
CREATE POLICY "briefing_anexos_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'briefing-anexos'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  );


-- Migration: 20260610175411_45b3bc2d-dd6c-486e-ad39-42624a9cc98a.sql
ALTER TABLE public.agencias ADD COLUMN logo_url TEXT;
GRANT ALL ON public.agencias TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias TO authenticated;


-- Migration: 20260610181444_979abef1-757f-49d4-bc44-cbfba6965447.sql
ALTER TABLE public.proposta_itens ADD COLUMN dias_veiculacao INTEGER;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;

-- Migration: 20260610182249_18c76bec-7210-4960-bb06-7d42d461b849.sql
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('admin', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Migration: 20260610182308_0aaf7d3e-1bf9-455b-90ee-71f6c46dc73a.sql
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('executivo', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Migration: 20260611132022_5d71cd0a-15c9-4ad3-8f03-d691e24d1d01.sql
ALTER TABLE public.briefings 
ADD COLUMN IF NOT EXISTS produto_interesse TEXT,
ADD COLUMN IF NOT EXISTS tempo_contrato TEXT,
ADD COLUMN IF NOT EXISTS segmento_cliente TEXT;

-- Grant permissions (though table is already granted, adding specific columns is covered by ALL)
GRANT ALL ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;


-- Migration: 20260611173806_625f0e4a-b3d2-4960-a0bb-e7245b5bd085.sql
-- Habilitar pg_cron se ainda não estiver
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover job anterior se existir (usando subquery segura)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-cnpj-daily') THEN
        PERFORM cron.unschedule('sync-cnpj-daily');
    END IF;
END $$;

-- Agendar novo job para rodar a cada minuto nas horas que correspondem a 00:01-05:55 BRT
-- 00:01-05:55 BRT é aproximadamente 03:01-08:55 UTC
SELECT cron.schedule(
    'sync-cnpj-daily',
    '* 3-8 * * *',
    $$
    SELECT
      net.http_post(
        url := (SELECT current_setting('app.settings.project_url') || '/api/public/hooks/sync-cnpj'),
        headers := '{"Content-Type": "application/json"}'::jsonb
      ) as request_id
    WHERE
      -- Validação extra do horário de Brasília (UTC-3)
      EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) BETWEEN 0 AND 5
      AND (
        (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) = 0 AND EXTRACT(MINUTE FROM (now() AT TIME ZONE 'UTC-3')) >= 1)
        OR (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) = 5 AND EXTRACT(MINUTE FROM (now() AT TIME ZONE 'UTC-3')) <= 55)
        OR (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) > 0 AND EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) < 5)
      )
    $$
);


-- Migration: 20260611180312_98220934-63f9-409f-bb13-aaa9b36620cb.sql
-- Adiciona coluna status à tabela de clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
COMMENT ON COLUMN public.clientes.status IS 'Status do cliente: ativo, inativo, prospect, bloqueado';

-- Adiciona coluna status à tabela de agencias
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
COMMENT ON COLUMN public.agencias.status IS 'Status da agência: ativa, inativa, bloqueada';


-- Migration: 20260611222025_55a609eb-0f9a-47c0-bb42-1a4e840abbf3.sql

-- Helper: check if user can access a PI (owner, executive, or admin)
CREATE OR REPLACE FUNCTION public.can_access_pi(_pi_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = _pi_id
      AND (p.executivo_id = _user_id OR p.created_by = _user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_pi(uuid, uuid) TO authenticated, service_role;

-- ============ pi_financeiro ============
DROP POLICY IF EXISTS "Authenticated users can view pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can insert pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can update pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can delete pi_financeiro" ON public.pi_financeiro;

DROP POLICY IF EXISTS "pi_financeiro select owner/admin" ON public.pi_financeiro;
CREATE POLICY "pi_financeiro select owner/admin" ON public.pi_financeiro
  FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pi_financeiro insert owner/admin" ON public.pi_financeiro;
CREATE POLICY "pi_financeiro insert owner/admin" ON public.pi_financeiro
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pi_financeiro update owner/admin" ON public.pi_financeiro;
CREATE POLICY "pi_financeiro update owner/admin" ON public.pi_financeiro
  FOR UPDATE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()))
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pi_financeiro delete owner/admin" ON public.pi_financeiro;
CREATE POLICY "pi_financeiro delete owner/admin" ON public.pi_financeiro
  FOR DELETE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

-- ============ storage: financeiro-docs ============
-- Path convention: pi/{pi_id}/...
DROP POLICY IF EXISTS "Authenticated users can view financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete financeiro docs" ON storage.objects;

DROP POLICY IF EXISTS "financeiro-docs select owner/admin" ON storage.objects;
CREATE POLICY "financeiro-docs select owner/admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "financeiro-docs insert owner/admin" ON storage.objects;
CREATE POLICY "financeiro-docs insert owner/admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "financeiro-docs update owner/admin" ON storage.objects;
CREATE POLICY "financeiro-docs update owner/admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "financeiro-docs delete owner/admin" ON storage.objects;
CREATE POLICY "financeiro-docs delete owner/admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

-- ============ solicitacoes_producao ============
DROP POLICY IF EXISTS "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao;
DROP POLICY IF EXISTS "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao;

DROP POLICY IF EXISTS "solicitacoes select owner/admin" ON public.solicitacoes_producao;
CREATE POLICY "solicitacoes select owner/admin" ON public.solicitacoes_producao
  FOR SELECT TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()) OR public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "solicitacoes insert owner" ON public.solicitacoes_producao;
CREATE POLICY "solicitacoes insert owner" ON public.solicitacoes_producao
  FOR INSERT TO authenticated
  WITH CHECK (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "solicitacoes update owner/admin" ON public.solicitacoes_producao;
CREATE POLICY "solicitacoes update owner/admin" ON public.solicitacoes_producao
  FOR UPDATE TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "solicitacoes delete owner/admin" ON public.solicitacoes_producao;
CREATE POLICY "solicitacoes delete owner/admin" ON public.solicitacoes_producao
  FOR DELETE TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

-- ============ sync_cnpj_log: admin-only reads ============
DROP POLICY IF EXISTS "sync log readable by authenticated" ON public.sync_cnpj_log;

DROP POLICY IF EXISTS "sync log readable by admin" ON public.sync_cnpj_log;
CREATE POLICY "sync log readable by admin" ON public.sync_cnpj_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ Function search_path hardening ============
CREATE OR REPLACE FUNCTION public.handle_default_layout()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.proposta_layouts SET is_default = false WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
            v_changes := v_changes || jsonb_build_object('valor_total', jsonb_build_object('old', OLD.valor_total, 'new', NEW.valor_total));
        END IF;
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$function$;


-- Migration: 20260612151814_79824117-29fb-4eb2-bc6a-fe0910402046.sql

CREATE TABLE IF NOT EXISTS public.proposta_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_path text NOT NULL,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_anexos TO authenticated;
GRANT ALL ON public.proposta_anexos TO service_role;

ALTER TABLE public.proposta_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth can view proposta anexos" ON public.proposta_anexos;
CREATE POLICY "auth can view proposta anexos" ON public.proposta_anexos
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth can insert proposta anexos" ON public.proposta_anexos;
CREATE POLICY "auth can insert proposta anexos" ON public.proposta_anexos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "auth can update own proposta anexos" ON public.proposta_anexos;
CREATE POLICY "auth can update own proposta anexos" ON public.proposta_anexos
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "auth can delete own proposta anexos" ON public.proposta_anexos;
CREATE POLICY "auth can delete own proposta anexos" ON public.proposta_anexos
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_proposta_anexos_updated_at ON public.proposta_anexos;
CREATE TRIGGER trg_proposta_anexos_updated_at
  BEFORE UPDATE ON public.proposta_anexos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_proposta_anexos_proposta ON public.proposta_anexos(proposta_id);

-- Storage policies for proposta-anexos bucket
DROP POLICY IF EXISTS "auth view proposta-anexos files" ON storage.objects;
CREATE POLICY "auth view proposta-anexos files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'proposta-anexos');
DROP POLICY IF EXISTS "auth upload proposta-anexos files" ON storage.objects;
CREATE POLICY "auth upload proposta-anexos files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposta-anexos');
DROP POLICY IF EXISTS "auth update proposta-anexos files" ON storage.objects;
CREATE POLICY "auth update proposta-anexos files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'proposta-anexos');
DROP POLICY IF EXISTS "auth delete proposta-anexos files" ON storage.objects;
CREATE POLICY "auth delete proposta-anexos files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'proposta-anexos');


-- Migration: 20260615141823_87b658ba-af2b-49fc-b8ea-cbe399efd0e2.sql

ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS permuta_valor_faturado NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_permuta_saldo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id UUID;
  v_agencia_id UUID;
  v_entidade_id UUID;
  v_tipo TEXT;
  v_razao TEXT;
  v_total_pi NUMERIC;
  v_total_rec NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_cliente_id := OLD.cliente_id;
    v_agencia_id := OLD.agencia_id;
  ELSE
    v_cliente_id := NEW.cliente_id;
    v_agencia_id := NEW.agencia_id;
  END IF;

  v_entidade_id := COALESCE(v_cliente_id, v_agencia_id);
  IF v_entidade_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF v_cliente_id IS NOT NULL THEN
    v_tipo := 'cliente';
    SELECT razao_social INTO v_razao FROM public.clientes WHERE id = v_entidade_id;
  ELSE
    v_tipo := 'agencia';
    SELECT razao_social INTO v_razao FROM public.agencias WHERE id = v_entidade_id;
  END IF;

  -- Considera apenas a parte NÃO faturada (valor_negociado - permuta_valor_faturado)
  SELECT COALESCE(SUM(GREATEST(valor_negociado - COALESCE(permuta_valor_faturado, 0), 0)), 0)
    INTO v_total_pi
    FROM public.pis
   WHERE (cliente_id = v_entidade_id OR agencia_id = v_entidade_id)
     AND permuta = true
     AND status != 'cancelado';

  SELECT COALESCE(SUM(valor), 0)
    INTO v_total_rec
    FROM public.permuta_recebimentos
   WHERE cliente_id = v_entidade_id OR agencia_id = v_entidade_id;

  INSERT INTO public.permuta_saldos (entidade_id, razao_social, tipo, total_pi, total_recebido, updated_at)
  VALUES (v_entidade_id, v_razao, v_tipo, v_total_pi, v_total_rec, now())
  ON CONFLICT (entidade_id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    tipo = EXCLUDED.tipo,
    total_pi = EXCLUDED.total_pi,
    total_recebido = EXCLUDED.total_recebido,
    updated_at = now();

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;


-- Migration: 20260615142603_3ef2ff26-385e-4fec-9275-ef007b2ea25f.sql
CREATE TABLE IF NOT EXISTS public.links_uteis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  icone TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.links_uteis TO authenticated;
GRANT ALL ON public.links_uteis TO service_role;

ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view links" ON public.links_uteis;
CREATE POLICY "Authenticated can view links" ON public.links_uteis
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can create links" ON public.links_uteis;
CREATE POLICY "Authenticated can create links" ON public.links_uteis
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Owner or admin can update links" ON public.links_uteis;
CREATE POLICY "Owner or admin can update links" ON public.links_uteis
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owner or admin can delete links" ON public.links_uteis;
CREATE POLICY "Owner or admin can delete links" ON public.links_uteis
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS links_uteis_updated_at ON public.links_uteis;
CREATE TRIGGER links_uteis_updated_at
  BEFORE UPDATE ON public.links_uteis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260615175418_1e9908d6-a912-4363-b6cd-47c2bb2911db.sql
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS executivo_parceiro_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Migration: 20260616191534_e3aceddf-7dae-457f-a348-e1790e0d71cf.sql
CREATE OR REPLACE FUNCTION public.log_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.valor_negociado IS DISTINCT FROM NEW.valor_negociado THEN
            v_changes := v_changes || jsonb_build_object('valor_negociado', jsonb_build_object('old', OLD.valor_negociado, 'new', NEW.valor_negociado));
        END IF;
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$function$;

-- Migration: 20260616200938_fe197fa0-8452-4230-9d30-128156ad2400.sql
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS mes_meta INTEGER,
  ADD COLUMN IF NOT EXISTS ano_meta INTEGER;

-- Migration: 20260617182226_d58a8f2c-c5a3-4c3b-b51c-61aa83249b55.sql
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS apelido text;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS apelido text;

-- Migration: 20260619203256_a8c5b0f9-3bd4-400d-9a1d-6586561a09cf.sql

CREATE TABLE IF NOT EXISTS public.influenciadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'influenciador',
  nicho TEXT,
  cidade TEXT,
  estado TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  facebook TEXT,
  twitter TEXT,
  outras_redes TEXT,
  seguidores_total BIGINT,
  cache_valor NUMERIC(14,2),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.influenciadores TO authenticated;
GRANT ALL ON public.influenciadores TO service_role;

ALTER TABLE public.influenciadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin e producao podem ver influenciadores" ON public.influenciadores;
CREATE POLICY "Admin e producao podem ver influenciadores" ON public.influenciadores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

DROP POLICY IF EXISTS "Admin e producao podem inserir influenciadores" ON public.influenciadores;
CREATE POLICY "Admin e producao podem inserir influenciadores" ON public.influenciadores FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

DROP POLICY IF EXISTS "Admin e producao podem atualizar influenciadores" ON public.influenciadores;
CREATE POLICY "Admin e producao podem atualizar influenciadores" ON public.influenciadores FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

DROP POLICY IF EXISTS "Admin e producao podem excluir influenciadores" ON public.influenciadores;
CREATE POLICY "Admin e producao podem excluir influenciadores" ON public.influenciadores FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));
DROP TRIGGER IF EXISTS influenciadores_updated_at ON public.influenciadores;
CREATE TRIGGER influenciadores_updated_at
  BEFORE UPDATE ON public.influenciadores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- Migration: 20260622190555_397869ef-cee5-4aec-93ca-37d49642148c.sql
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS logo_data_url text;

-- Migration: 20260623030853_f977e4ad-34c1-4801-af7a-f1d686785926.sql

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_trial_expired(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND trial_ends_at IS NOT NULL AND trial_ends_at < now()
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_demo boolean := COALESCE((NEW.raw_user_meta_data->>'is_demo')::boolean, false);
  v_trial_ends timestamptz := NULL;
BEGIN
  IF v_is_demo THEN
    v_trial_ends := now() + interval '48 hours';
  END IF;

  INSERT INTO public.profiles (id, nome, email, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_trial_ends
  );

  IF v_is_demo THEN
    -- Demo: recebe admin para acessar todos os módulos durante 48h
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $$;


-- Migration: 20260623034455_49c6b52b-46f5-4f20-a38c-2537a1ce8868.sql
-- [Higienização] UPDATE auth.users suprimido
-- Migration: 20260623041157_2c92bccf-db45-45df-a419-8e502fcc4fdb.sql

-- Helper: identifica contas demo (com trial)
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND trial_ends_at IS NOT NULL
  )
$$;

-- has_role: contas demo nunca herdam papéis elevados em policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  AND NOT public.is_demo_user(_user_id)
$$;

-- is_admin já depende de has_role, então herda o filtro automaticamente.

-- Reescreve policies de briefings que faziam SELECT direto em user_roles
DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;

DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
CREATE POLICY "Admins and Executives can view all briefings" ON public.briefings FOR SELECT
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'executivo'));

DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;
CREATE POLICY "Admins and Executives can update any briefing" ON public.briefings FOR UPDATE
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'executivo'));


-- Migration: 20260623041819_c5a24d08-e755-442e-97e0-bf0b04e6f5b9.sql

-- 1) Adiciona super_admin ao enum
-- [Consolidado no topo] ALTER TYPE ADD VALUE


-- Migration: 20260623041856_a412fb2c-9fe9-48a9-ba42-805145fc436b.sql

-- ============ TENANTS (SaaS Multi-Tenant com Teste Grátis de 72h) ============
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  contato_nome text,
  contato_email text,
  contato_whatsapp text,
  plano text NOT NULL DEFAULT 'essencial', -- essencial | site | profissional | enterprise | demo
  ciclo text NOT NULL DEFAULT 'mensal',    -- mensal | anual
  valor_mensal numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',    -- ativo | inadimplente | suspenso | cancelado | trial
  -- Ciclo de Vida da Assinatura SaaS
  subscription_status text NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'expired', 'past_due', 'suspended')),
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  payment_provider text,
  payment_subscription_id text,
  last_payment_at timestamptz,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  proximo_vencimento date,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bloco defensivo aditivo: assegura que se a tabela public.tenants ja existir (ex: bootstrap previo),
-- todas as 9 colunas de assinatura SaaS v2.6.0 estejam garantidamente criadas antes de qualquer operacao.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_subscription_id text,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tenants'::regclass
      AND conname = 'tenants_subscription_status_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_subscription_status_check
      CHECK (subscription_status IN ('trialing', 'active', 'expired', 'past_due', 'suspended'));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Helper super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'rafaelrodrigo.as@gmail.com'
  );
$$;

-- is_admin agora reconhece super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.is_super_admin(_user_id)
$$;

DROP POLICY IF EXISTS "super admin manages tenants" ON public.tenants;
CREATE POLICY "super admin manages tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS tg_tenants_touch ON public.tenants;
CREATE TRIGGER tg_tenants_touch BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ HISTÓRICO DE ASSINATURAS E FATURAS SAAS ============
CREATE TABLE IF NOT EXISTS public.tenant_faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ciclo text NOT NULL DEFAULT 'mensal' CHECK (ciclo IN ('mensal', 'anual')),
  valor numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'falho', 'cancelado', 'estornado')),
  data_vencimento date,
  data_pagamento timestamptz,
  metodo_pagamento text, -- pix | cartao | boleto | manual
  referencia_externa text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tenant_faturas TO authenticated;
GRANT ALL ON public.tenant_faturas TO service_role;
ALTER TABLE public.tenant_faturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super admin gerencia faturas" ON public.tenant_faturas;
CREATE POLICY "super admin gerencia faturas" ON public.tenant_faturas
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "usuarios veem faturas do proprio tenant" ON public.tenant_faturas;
CREATE POLICY "usuarios veem faturas do proprio tenant" ON public.tenant_faturas
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ============ PROFILES.tenant_id ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- ============ Seed tenant TV Brasília ============
INSERT INTO public.tenants (
  id, razao_social, nome_fantasia, plano, ciclo, valor_mensal, status, observacoes,
  subscription_status, trial_started_at, trial_ends_at, current_period_start, current_period_end
)
VALUES (
  'a711a129-330c-46bf-943a-531cedd4f2ff', 'TV Brasília', 'TV Brasília', 'enterprise', 'mensal', 0, 'ativo', 'Cliente inicial — plano sob contrato.',
  'active', now(), NULL, now(), '2030-12-31 23:59:59+00'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  subscription_status = 'active',
  trial_ends_at = NULL,
  current_period_end = '2030-12-31 23:59:59+00'::timestamptz;

-- Vincula todos os profiles sem tenant a TV Brasília (exceto contas demo e proprietário global)
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants WHERE razao_social = 'TV Brasília' LIMIT 1)
WHERE tenant_id IS NULL AND trial_ends_at IS NULL AND lower(coalesce(email, '')) <> 'rafaelrodrigo.as@gmail.com';

-- ============ Usuário super_admin ============
-- Cria o auth.user se ainda não existir
-- [Higienização] Injeção direta em auth.users suprimida; gerido via GoTrue/Signup



-- Migration: 20260623043033_f988699b-b5d6-4ed3-8cd0-17e0f7a9e142.sql
-- [Higienização] UPDATE auth.users suprimido
-- Migration: 20260623043911_f4a92f77-a56a-489c-8fbb-164d65e666d9.sql

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS max_usuarios integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS mensagem_alerta text,
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_em timestamptz,
  ADD COLUMN IF NOT EXISTS bloqueado_motivo text;

-- Permite que qualquer usuário autenticado leia APENAS a mensagem de alerta / status de bloqueio do seu próprio tenant
DROP POLICY IF EXISTS "Usuários veem o próprio tenant" ON public.tenants;
DROP POLICY IF EXISTS "Usuários veem o próprio tenant" ON public.tenants;
CREATE POLICY "Usuários veem o próprio tenant" ON public.tenants FOR SELECT
  TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));


-- Migration: 20260623045153_b84fcc54-be3e-4da3-87f6-950e067ed62f.sql

-- Desabilita triggers de auditoria durante o backfill (auth.uid() é NULL na migration)
-- [Higienização] SET session_replication_role suprimido

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

DO $$
DECLARE
  v_default_tenant uuid := 'a711a129-330c-46bf-943a-531cedd4f2ff';
  v_tables text[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','tarefas',
    'influenciadores','produtos','projetos_especiais','eventos_calendario',
    'reunioes','metas_executivo','materiais_apoio','links_uteis',
    'midia_config','notificacoes','permuta_recebimentos',
    'solicitacoes_producao','permuta_saldos'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL', t);
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, v_default_tenant);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', t || '_tenant_id_idx', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR tenant_id IS NULL
        OR tenant_id = public.current_tenant_id()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid())
        OR tenant_id IS NULL
        OR tenant_id = public.current_tenant_id()
      )
    $p$, t);
  END LOOP;
END $$;

UPDATE public.profiles
   SET tenant_id = 'a711a129-330c-46bf-943a-531cedd4f2ff'
 WHERE tenant_id IS NULL
   AND trial_ends_at IS NULL
   AND lower(coalesce(email, '')) <> 'rafaelrodrigo.as@gmail.com';

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  v_tables text[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','tarefas',
    'influenciadores','produtos','projetos_especiais','eventos_calendario',
    'reunioes','metas_executivo','materiais_apoio','links_uteis',
    'midia_config','notificacoes','permuta_recebimentos',
    'solicitacoes_producao','permuta_saldos'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_trg ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_tenant_id_trg BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user()', t);
  END LOOP;
END $$;

-- [Higienização] SET session_replication_role suprimido


-- Migration: 20260623050440_29d974b5-0d51-4130-850f-0aeec46f25a3.sql

CREATE TABLE IF NOT EXISTS public.system_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  emoji TEXT DEFAULT '✨',
  versao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_announcements TO authenticated;
GRANT ALL ON public.system_announcements TO service_role;

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer autenticado vê ativos" ON public.system_announcements;
CREATE POLICY "Qualquer autenticado vê ativos" ON public.system_announcements FOR SELECT
  TO authenticated
  USING (ativo = true OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin gerencia" ON public.system_announcements;
CREATE POLICY "Super admin gerencia" ON public.system_announcements FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_system_announcements_updated ON public.system_announcements;
CREATE TRIGGER trg_system_announcements_updated
  BEFORE UPDATE ON public.system_announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_system_announcements_ativo_created ON public.system_announcements (ativo, created_at DESC);


-- Migration: 20260623051054_e6718961-945b-46c8-97e4-e34dbdac8b95.sql

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Garante que o usuário consiga ler o próprio tenant (necessário para exibir a logo no AppShell)
DROP POLICY IF EXISTS "Usuario le seu proprio tenant" ON public.tenants;
DROP POLICY IF EXISTS "Usuario le seu proprio tenant" ON public.tenants;
CREATE POLICY "Usuario le seu proprio tenant" ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));


-- Migration: 20260623135546_8470bba8-f8d3-4c0b-a896-fb4cff5560c8.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Migration: 20260623141558_874d5054-636a-43f5-b311-5213c0b5f8c8.sql
-- Add 'teste' role to app_role enum for site signups (trial users)
-- [Consolidado no topo] ALTER TYPE ADD VALUE

-- Update handle_new_user trigger: site demo signups now get 'teste' role instead of 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_demo boolean := COALESCE((NEW.raw_user_meta_data->>'is_demo')::boolean, false);
  v_trial_ends timestamptz := NULL;
BEGIN
  IF v_is_demo THEN
    v_trial_ends := now() + interval '48 hours';
  END IF;

  INSERT INTO public.profiles (id, nome, email, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_trial_ends
  );

  IF v_is_demo THEN
    -- Demo/site signup: recebe role 'teste' (acesso de avaliação por 48h)
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teste');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $function$;

