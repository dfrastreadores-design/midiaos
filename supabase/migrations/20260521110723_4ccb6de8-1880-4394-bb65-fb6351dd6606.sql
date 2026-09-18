
-- Tokens do Google Calendar por usuário
CREATE TABLE public.google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  google_email text,
  sync_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own google tokens" ON public.google_calendar_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own google tokens" ON public.google_calendar_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own google tokens" ON public.google_calendar_tokens
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users delete own google tokens" ON public.google_calendar_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_google_tokens_updated
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Reuniões do CRM
CREATE TYPE public.reuniao_status AS ENUM ('agendada','realizada','cancelada','remarcada');

CREATE TABLE public.reunioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  cliente_id uuid,
  agencia_id uuid,
  proposta_id uuid,
  executivo_id uuid,
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz NOT NULL,
  local text,
  link_video text,
  status public.reuniao_status NOT NULL DEFAULT 'agendada',
  observacao text,
  resultado text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reunioes_data ON public.reunioes(data_inicio);
CREATE INDEX idx_reunioes_cliente ON public.reunioes(cliente_id);
CREATE INDEX idx_reunioes_executivo ON public.reunioes(executivo_id);

ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read reunioes" ON public.reunioes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert reunioes" ON public.reunioes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update reunioes" ON public.reunioes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete reunioes" ON public.reunioes FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER trg_reunioes_updated
  BEFORE UPDATE ON public.reunioes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Eventos do calendário (unificados)
CREATE TYPE public.evento_origem AS ENUM ('reuniao','proposta','pi','google','manual');

CREATE TABLE public.eventos_calendario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  dia_inteiro boolean NOT NULL DEFAULT false,
  local text,
  origem public.evento_origem NOT NULL DEFAULT 'manual',
  origem_id uuid,
  origem_subtipo text,
  cliente_id uuid,
  agencia_id uuid,
  google_event_id text,
  cor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_eventos_user ON public.eventos_calendario(user_id);
CREATE INDEX idx_eventos_inicio ON public.eventos_calendario(inicio);
CREATE INDEX idx_eventos_origem ON public.eventos_calendario(origem, origem_id);
CREATE UNIQUE INDEX idx_eventos_google ON public.eventos_calendario(user_id, google_event_id) WHERE google_event_id IS NOT NULL;

ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own eventos" ON public.eventos_calendario
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "users insert own eventos" ON public.eventos_calendario
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own eventos" ON public.eventos_calendario
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users delete own eventos" ON public.eventos_calendario
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE TRIGGER trg_eventos_updated
  BEFORE UPDATE ON public.eventos_calendario
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
