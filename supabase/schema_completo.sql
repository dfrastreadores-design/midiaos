-- Schema Consolidado gerado em 2026-09-18T23:17:20.073Z

-- Migration: 20260518135618_231b5d03-f2ec-41b4-b479-b7a4d2ac6868.sql

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'executivo', 'opec', 'financeiro');
CREATE TYPE public.pi_status AS ENUM ('rascunho', 'enviado', 'aprovado', 'faturado', 'cancelado', 'substituido');
CREATE TYPE public.projeto_status AS ENUM ('em_comercializacao', 'vendido', 'encerrado');
CREATE TYPE public.notificacao_tipo AS ENUM ('novo_pi', 'pi_anexado', 'campanha_finalizando', 'projeto_finalizando', 'outro');

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  cargo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER ROLES
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- =====================================================
-- PERMISSIONS (configurable per role)
-- =====================================================
CREATE TABLE public.permissions (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.permissions (key, label, description) VALUES
  ('pi.create', 'Criar PI', 'Criar novos Pedidos de Inserção'),
  ('pi.approve', 'Aprovar PI', 'Aprovar PIs enviados'),
  ('pi.cancel', 'Cancelar PI', 'Cancelar/substituir PIs'),
  ('pi.view_all', 'Ver todos os PIs', 'Visualizar PIs de outros executivos'),
  ('clientes.manage', 'Gerenciar clientes', 'Criar e editar clientes'),
  ('agencias.manage', 'Gerenciar agências', 'Criar e editar agências'),
  ('financeiro.view', 'Ver financeiro', 'Acessar relatórios financeiros'),
  ('opec.programacao', 'Programação OPEC', 'Acesso ao módulo de programação'),
  ('users.manage', 'Gerenciar usuários', 'Criar/editar usuários e perfis'),
  ('projetos.manage', 'Projetos Especiais', 'Gerenciar projetos especiais');

INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('admin', 'pi.create'), ('admin', 'pi.approve'), ('admin', 'pi.cancel'),
  ('admin', 'pi.view_all'), ('admin', 'clientes.manage'), ('admin', 'agencias.manage'),
  ('admin', 'financeiro.view'), ('admin', 'opec.programacao'), ('admin', 'users.manage'),
  ('admin', 'projetos.manage'),
  ('executivo', 'pi.create'), ('executivo', 'clientes.manage'), ('executivo', 'agencias.manage'),
  ('executivo', 'projetos.manage'),
  ('opec', 'opec.programacao'), ('opec', 'pi.view_all'),
  ('financeiro', 'financeiro.view'), ('financeiro', 'pi.view_all');

-- =====================================================
-- AGENCIAS / CLIENTES
-- =====================================================
CREATE TABLE public.agencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  contatos JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  contatos JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacao TEXT,
  executivo_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PIs com numeração única
-- =====================================================
CREATE SEQUENCE public.pi_seq START 1;

CREATE TABLE public.pis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  campanha TEXT NOT NULL,
  mes_veiculacao INT NOT NULL CHECK (mes_veiculacao BETWEEN 1 AND 12),
  ano_veiculacao INT NOT NULL CHECK (ano_veiculacao BETWEEN 2020 AND 2100),
  periodo_inicio DATE,
  periodo_fim DATE,
  observacao TEXT,
  status pi_status NOT NULL DEFAULT 'rascunho',
  substitui_pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  motivo_cancelamento TEXT,
  valor_tabela NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_negociado NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_insercoes INT NOT NULL DEFAULT 0,
  executivo_id UUID REFERENCES auth.users(id),
  pdf_url TEXT,
  origem TEXT NOT NULL DEFAULT 'manual',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pis ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_pi_numero()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  yr TEXT := to_char(now(), 'YYYY');
  n BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    n := nextval('public.pi_seq');
    NEW.numero := 'PI-' || yr || '-' || lpad(n::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pis_numero BEFORE INSERT ON public.pis
FOR EACH ROW EXECUTE FUNCTION public.generate_pi_numero();

CREATE TABLE public.pi_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  programa TEXT,
  formato TEXT,
  insercoes_dia INT NOT NULL DEFAULT 1,
  dias_semana TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  dias_mes INT[] NOT NULL DEFAULT ARRAY[]::INT[],
  desconto NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_unit NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_tabela NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_negociado NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_insercoes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pi_itens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HISTÓRICO / AUDITORIA
-- =====================================================
CREATE TABLE public.pi_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  detalhes JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pi_historico ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROJETOS ESPECIAIS
-- =====================================================
CREATE TABLE public.projetos_especiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cliente_alvo TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES auth.users(id),
  comercializacao_inicio DATE,
  comercializacao_fim DATE NOT NULL,
  valor_estimado NUMERIC(14,2),
  materiais TEXT,
  observacao TEXT,
  status projeto_status NOT NULL DEFAULT 'em_comercializacao',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projetos_especiais ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- NOTIFICAÇÕES
-- =====================================================
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo notificacao_tipo NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  link TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TRIGGER: criar profile no signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  -- primeiro usuário vira admin automaticamente
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_agencias_updated BEFORE UPDATE ON public.agencias
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_pis_updated BEFORE UPDATE ON public.pis
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_projetos_updated BEFORE UPDATE ON public.projetos_especiais
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- profiles
CREATE POLICY "users see all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- permissions / role_permissions
CREATE POLICY "auth read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read role_perms" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage role_perms" ON public.role_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- agencias / clientes
CREATE POLICY "auth read agencias" ON public.agencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write agencias" ON public.agencias FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update agencias" ON public.agencias FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete agencias" ON public.agencias FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "auth read clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete clientes" ON public.clientes FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- pis
CREATE POLICY "auth read pis" ON public.pis FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert pis" ON public.pis FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update pis" ON public.pis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete pis" ON public.pis FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "auth read pi_itens" ON public.pi_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write pi_itens" ON public.pi_itens FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth read pi_historico" ON public.pi_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert pi_historico" ON public.pi_historico FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- projetos
CREATE POLICY "auth read projetos" ON public.projetos_especiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write projetos" ON public.projetos_especiais FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- notificacoes
CREATE POLICY "users see own notif" ON public.notificacoes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users update own notif" ON public.notificacoes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth insert notif" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);


-- Migration: 20260520183213_d8a8f9be-0cef-4d23-ba54-096fff49de7d.sql
-- ENUMs
DO $$ BEGIN
  CREATE TYPE public.proposta_status AS ENUM ('rascunho','enviada','aprovada','recusada','convertida');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Sequência para numeração
CREATE SEQUENCE IF NOT EXISTS public.proposta_seq START 1;

-- Tabela principal
CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID,
  agencia_id UUID,
  campanha TEXT NOT NULL,
  validade DATE,
  observacao TEXT,
  status public.proposta_status NOT NULL DEFAULT 'rascunho',
  valor_tabela NUMERIC NOT NULL DEFAULT 0,
  valor_desconto NUMERIC NOT NULL DEFAULT 0,
  valor_negociado NUMERIC NOT NULL DEFAULT 0,
  total_insercoes INT NOT NULL DEFAULT 0,
  comissao_pct NUMERIC NOT NULL DEFAULT 0,
  pi_id UUID,
  executivo_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens da proposta
CREATE TABLE IF NOT EXISTS public.proposta_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  programa TEXT,
  formato TEXT,
  insercoes_dia INT NOT NULL DEFAULT 1,
  dias_semana TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  dias_mes INT[] NOT NULL DEFAULT ARRAY[]::int[],
  desconto NUMERIC NOT NULL DEFAULT 0,
  valor_unit NUMERIC NOT NULL DEFAULT 0,
  valor_tabela NUMERIC NOT NULL DEFAULT 0,
  valor_negociado NUMERIC NOT NULL DEFAULT 0,
  total_insercoes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger de numeração
CREATE OR REPLACE FUNCTION public.generate_proposta_numero()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE yr TEXT := to_char(now(),'YYYY'); n BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    n := nextval('public.proposta_seq');
    NEW.numero := 'PROP-' || yr || '-' || lpad(n::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proposta_numero ON public.propostas;
CREATE TRIGGER trg_proposta_numero BEFORE INSERT ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.generate_proposta_numero();

DROP TRIGGER IF EXISTS trg_proposta_touch ON public.propostas;
CREATE TRIGGER trg_proposta_touch BEFORE UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read propostas" ON public.propostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert propostas" ON public.propostas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update propostas" ON public.propostas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete propostas" ON public.propostas FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "auth read proposta_itens" ON public.proposta_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write proposta_itens" ON public.proposta_itens FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Migration: 20260520235154_7b10d866-2451-4996-b976-1a971cb4a930.sql
-- ====== Produtos (TV / Rádio / DOOH) ======
DO $$ BEGIN
  CREATE TYPE public.midia_tipo AS ENUM ('TV', 'Radio', 'DOOH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  midia public.midia_tipo NOT NULL,
  tipo text,
  programa text,
  faixa text,
  duracao_segundos integer NOT NULL DEFAULT 30,
  insercoes_padrao integer NOT NULL DEFAULT 1,
  valor_unit numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read produtos" ON public.produtos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert produtos" ON public.produtos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin update produtos" ON public.produtos
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin delete produtos" ON public.produtos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER produtos_touch BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ====== Metas por executivo ======
CREATE TABLE IF NOT EXISTS public.metas_executivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executivo_id uuid NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_meta numeric NOT NULL DEFAULT 0,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (executivo_id, ano, mes)
);

ALTER TABLE public.metas_executivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read metas" ON public.metas_executivo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert metas" ON public.metas_executivo
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin update metas" ON public.metas_executivo
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin delete metas" ON public.metas_executivo
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER metas_touch BEFORE UPDATE ON public.metas_executivo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Migration: 20260521001948_1731cb1e-cd60-43ac-a71c-addfa0f4bb1f.sql

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read client logos" ON storage.objects;
CREATE POLICY "public read client logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth upload client logos" ON storage.objects;
CREATE POLICY "auth upload client logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth update client logos" ON storage.objects;
CREATE POLICY "auth update client logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth delete client logos" ON storage.objects;
CREATE POLICY "auth delete client logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos');


-- Migration: 20260521010822_81d547f3-2cc7-4169-9da4-57e1f1a36159.sql
-- Reativar triggers que geram numero automático em propostas e pis
DROP TRIGGER IF EXISTS trg_propostas_numero ON public.propostas;
CREATE TRIGGER trg_propostas_numero
BEFORE INSERT ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.generate_proposta_numero();

DROP TRIGGER IF EXISTS trg_pis_numero ON public.pis;
CREATE TRIGGER trg_pis_numero
BEFORE INSERT ON public.pis
FOR EACH ROW EXECUTE FUNCTION public.generate_pi_numero();

-- Garantir touch_updated_at em tabelas principais
DROP TRIGGER IF EXISTS trg_propostas_updated ON public.propostas;
CREATE TRIGGER trg_propostas_updated
BEFORE UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_pis_updated ON public.pis;
CREATE TRIGGER trg_pis_updated
BEFORE UPDATE ON public.pis
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Migration: 20260521014419_a8680959-d7c9-4b5a-baea-9239bb47e571.sql

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


-- Migration: 20260521014735_9038fe7b-2b32-47ad-92de-a21c488807e2.sql

ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;


-- Migration: 20260521014914_ab282047-a3d3-48d3-a8ca-3af78647a895.sql

ALTER TABLE public.projetos_especiais
  ADD COLUMN IF NOT EXISTS arquivo_url text,
  ADD COLUMN IF NOT EXISTS arquivo_nome text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('projetos-especiais', 'projetos-especiais', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read projetos files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'projetos-especiais');

CREATE POLICY "auth upload projetos files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'projetos-especiais');

CREATE POLICY "auth update projetos files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'projetos-especiais');

CREATE POLICY "auth delete projetos files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'projetos-especiais');


-- Migration: 20260521020002_97413b64-0bfd-49b0-adaa-f322aa8911f2.sql
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS executivo_id uuid;

-- Migration: 20260521025900_341738b2-2aff-4eb0-9638-a3f341b73787.sql
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS cliente_avulso text;

-- Migration: 20260521031623_b2810cd1-be7a-4a1a-a16f-adc6a712dc91.sql
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS faturamento_contra text NOT NULL DEFAULT 'cliente' CHECK (faturamento_contra IN ('cliente','agencia')),
  ADD COLUMN IF NOT EXISTS faturamento_tipo text NOT NULL DEFAULT 'bruto' CHECK (faturamento_tipo IN ('bruto','liquido')),
  ADD COLUMN IF NOT EXISTS data_faturamento date,
  ADD COLUMN IF NOT EXISTS data_envio_nota date,
  ADD COLUMN IF NOT EXISTS data_vencimento_nota date;

-- Migration: 20260521040901_95d9a11e-897b-4d2d-a315-eb2b04ac23d6.sql
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS segmento TEXT;

-- Migration: 20260521110723_4ccb6de8-1880-4394-bb65-fb6351dd6606.sql

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


-- Migration: 20260525033138_49b69aea-5d13-4bfd-a7d1-b6992774f984.sql

-- Fix notificacoes INSERT policy
DROP POLICY IF EXISTS "auth insert notif" ON public.notificacoes;
CREATE POLICY "users or admins insert notif"
ON public.notificacoes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Fix metas_executivo SELECT policy
DROP POLICY IF EXISTS "auth read metas" ON public.metas_executivo;
CREATE POLICY "own or admin read metas"
ON public.metas_executivo
FOR SELECT
TO authenticated
USING (executivo_id = auth.uid() OR public.is_admin(auth.uid()));

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.generate_pi_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  yr TEXT := to_char(now(), 'YYYY');
  n BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    n := nextval('public.pi_seq');
    NEW.numero := 'PI-' || yr || '-' || lpad(n::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.generate_proposta_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE yr TEXT := to_char(now(),'YYYY'); n BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    n := nextval('public.proposta_seq');
    NEW.numero := 'PROP-' || yr || '-' || lpad(n::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END $function$;


-- Migration: 20260526143757_d3fd2115-28b6-406e-bbe8-b78a669ce1fb.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS permuta boolean NOT NULL DEFAULT false;

-- Migration: 20260526180322_3162ce8c-ebaf-4121-a528-02dbe3b1c9ab.sql
CREATE TABLE public.midia_config (
  midia text PRIMARY KEY CHECK (midia IN ('TV','Radio','DOOH')),
  cnpj text,
  razao_social text,
  nome_fantasia text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  inscricao_estadual text,
  inscricao_municipal text,
  observacao text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.midia_config TO authenticated;
GRANT ALL ON public.midia_config TO service_role;

ALTER TABLE public.midia_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read midia_config" ON public.midia_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin upsert midia_config" ON public.midia_config FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "admin update midia_config" ON public.midia_config FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.midia_config (midia) VALUES ('TV'), ('Radio'), ('DOOH') ON CONFLICT DO NOTHING;

CREATE TRIGGER touch_midia_config BEFORE UPDATE ON public.midia_config FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Migration: 20260526192353_c14be9c8-11af-4f32-b659-6c7120be93bf.sql
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS inscricao_estadual text;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS inscricao_estadual text;

-- Migration: 20260526192616_472a3ad5-0a0b-45d5-8eaf-e20d830c6cbe.sql
ALTER TABLE public.midia_config
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS site text;

-- Migration: 20260527015054_03f9b977-cf88-4845-9f3b-25651be5614a.sql

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


-- Migration: 20260527040217_2113b7ac-8e86-4d6d-96f6-22ce116eab15.sql

-- 1) RLS mais restritas em UPDATE
DROP POLICY IF EXISTS "auth update pis" ON public.pis;
CREATE POLICY "owner or admin update pis" ON public.pis FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update propostas" ON public.propostas;
CREATE POLICY "owner or admin update propostas" ON public.propostas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update clientes" ON public.clientes;
CREATE POLICY "owner or admin update clientes" ON public.clientes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update agencias" ON public.agencias;
CREATE POLICY "owner or admin update agencias" ON public.agencias FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update reunioes" ON public.reunioes;
CREATE POLICY "owner or admin update reunioes" ON public.reunioes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- 2) Fechar SECURITY DEFINER para anônimo / público
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_pi_numero() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_proposta_numero() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 3) Bucket client-logos: privado + sem listagem pública
UPDATE storage.buckets SET public = false WHERE id = 'client-logos';

DROP POLICY IF EXISTS "public read client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth update client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth delete client logos" ON storage.objects;

CREATE POLICY "auth read client logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-logos');
CREATE POLICY "exec admin upload client logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'executivo')));
CREATE POLICY "exec admin update client logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'executivo')));
CREATE POLICY "admin delete client logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos' AND public.is_admin(auth.uid()));


-- Migration: 20260527040236_d2636f35-12af-432c-97fa-65d7a88a4929.sql

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_pi_numero() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_proposta_numero() FROM PUBLIC, anon, authenticated;


-- Migration: 20260527041131_b2043c95-34db-4f52-b264-9e06a2a8e040.sql

CREATE TABLE public.auditoria_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao TEXT NOT NULL,
  target_user_id UUID,
  target_email TEXT,
  role TEXT,
  detalhes JSONB,
  actor_id UUID,
  actor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auditoria_acessos TO authenticated;
GRANT ALL ON public.auditoria_acessos TO service_role;

ALTER TABLE public.auditoria_acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read auditoria"
  ON public.auditoria_acessos
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_auditoria_acessos_created_at ON public.auditoria_acessos (created_at DESC);
CREATE INDEX idx_auditoria_acessos_target ON public.auditoria_acessos (target_user_id);


-- Migration: 20260527042407_3391aa4e-e9c1-4486-ab9f-534dd6c3b491.sql
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS inscricao_municipal text;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS inscricao_municipal text;

-- Migration: 20260527050618_10f9c90b-8d6d-4ad2-8ca7-6cae1138e430.sql

-- Insere permissões de módulo
INSERT INTO public.permissions (key, label, description) VALUES
  ('module.crm', 'Módulo: Funil CRM', 'Acesso ao Funil CRM'),
  ('module.clientes', 'Módulo: Clientes', 'Acesso ao módulo Clientes'),
  ('module.agencias', 'Módulo: Agências', 'Acesso ao módulo Agências'),
  ('module.produtos', 'Módulo: Produtos', 'Acesso ao módulo Produtos (TV/Rádio/DOOH)'),
  ('module.pi', 'Módulo: Pedidos de Inserção', 'Acesso ao módulo PI'),
  ('module.propostas', 'Módulo: Propostas', 'Acesso ao módulo Propostas'),
  ('module.projetos', 'Módulo: Projetos Especiais', 'Acesso ao módulo Projetos Especiais'),
  ('module.financeiro', 'Módulo: Financeiro', 'Acesso ao módulo Financeiro'),
  ('module.calendario', 'Módulo: Calendário', 'Acesso ao módulo Calendário'),
  ('module.relatorios', 'Módulo: Relatórios', 'Acesso ao módulo Relatórios'),
  ('module.metas', 'Módulo: Metas', 'Acesso ao módulo Metas')
ON CONFLICT (key) DO NOTHING;

-- Seed defaults baseados no MODULE_ACCESS atual (admin é tratado via is_admin, não precisa popular)
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('executivo', 'module.crm'),
  ('executivo', 'module.clientes'),
  ('executivo', 'module.agencias'),
  ('executivo', 'module.produtos'),
  ('executivo', 'module.pi'),
  ('executivo', 'module.propostas'),
  ('executivo', 'module.projetos'),
  ('executivo', 'module.calendario'),
  ('executivo', 'module.relatorios'),
  ('opec', 'module.produtos'),
  ('opec', 'module.pi'),
  ('opec', 'module.calendario'),
  ('financeiro', 'module.financeiro'),
  ('financeiro', 'module.relatorios')
ON CONFLICT DO NOTHING;


-- Migration: 20260527051412_d980f23e-f6c9-495f-bf64-b9714cc1e52a.sql

-- ============ 1) Realtime authorization for notification channels ============
-- The bell subscribes to channel `notif-<user_id>`; restrict realtime topic access.
DO $$ BEGIN
  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "users subscribe own notif channel" ON realtime.messages;
CREATE POLICY "users subscribe own notif channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notif-' || auth.uid()::text
);

-- Block broadcasts from clients on these channels (server-side only via service role)
DROP POLICY IF EXISTS "no client writes on notif channels" ON realtime.messages;
CREATE POLICY "no client writes on notif channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (false);

-- ============ 2) pi_itens: scope UPDATE/DELETE to owners of parent PI ============
DROP POLICY IF EXISTS "auth write pi_itens" ON public.pi_itens;

CREATE POLICY "auth insert pi_itens"
ON public.pi_itens FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "owner update pi_itens"
ON public.pi_itens FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY "owner delete pi_itens"
ON public.pi_itens FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
);

-- ============ 3) proposta_itens: scope UPDATE/DELETE to owners of parent proposta ============
DROP POLICY IF EXISTS "auth write proposta_itens" ON public.proposta_itens;

CREATE POLICY "auth insert proposta_itens"
ON public.proposta_itens FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
);

CREATE POLICY "owner update proposta_itens"
ON public.proposta_itens FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
);

CREATE POLICY "owner delete proposta_itens"
ON public.proposta_itens FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
);

-- ============ 4) projetos_especiais: split ALL into INSERT/UPDATE/DELETE ============
DROP POLICY IF EXISTS "auth write projetos" ON public.projetos_especiais;

CREATE POLICY "auth insert projetos"
ON public.projetos_especiais FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner or admin update projetos"
ON public.projetos_especiais FOR UPDATE TO authenticated
USING (
  is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid()
);

CREATE POLICY "admin delete projetos"
ON public.projetos_especiais FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- ============ 5) reunioes: allow owner DELETE ============
DROP POLICY IF EXISTS "admin delete reunioes" ON public.reunioes;
CREATE POLICY "owner or admin delete reunioes"
ON public.reunioes FOR DELETE TO authenticated
USING (
  is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid()
);


-- Migration: 20260527051659_email_infra.sql
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
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
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
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
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
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
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
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
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


-- Migration: 20260527051714_email_infra.sql
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
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
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
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
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
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
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
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
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


-- Migration: 20260527052411_email_infra.sql
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
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
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
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
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
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
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
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
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


-- Migration: 20260527140519_7a79c18d-abf3-41f4-abbf-a8b7dacb8a95.sql

-- Restringir leitura por proprietário (executivo/created_by) com admin vendo tudo

-- CLIENTES
DROP POLICY IF EXISTS "auth read clientes" ON public.clientes;
CREATE POLICY "owner or admin read clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- AGENCIAS
DROP POLICY IF EXISTS "auth read agencias" ON public.agencias;
CREATE POLICY "owner or admin read agencias" ON public.agencias
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PIS
DROP POLICY IF EXISTS "auth read pis" ON public.pis;
CREATE POLICY "owner or admin read pis" ON public.pis
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PI_ITENS (via PI pai)
DROP POLICY IF EXISTS "auth read pi_itens" ON public.pi_itens;
CREATE POLICY "owner or admin read pi_itens" ON public.pi_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  ));

-- PI_HISTORICO (via PI pai)
DROP POLICY IF EXISTS "auth read pi_historico" ON public.pi_historico;
CREATE POLICY "owner or admin read pi_historico" ON public.pi_historico
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = pi_historico.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  ));

-- PROPOSTAS
DROP POLICY IF EXISTS "auth read propostas" ON public.propostas;
CREATE POLICY "owner or admin read propostas" ON public.propostas
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PROPOSTA_ITENS (via proposta pai)
DROP POLICY IF EXISTS "auth read proposta_itens" ON public.proposta_itens;
CREATE POLICY "owner or admin read proposta_itens" ON public.proposta_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.propostas pr
    WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  ));

-- REUNIOES
DROP POLICY IF EXISTS "auth read reunioes" ON public.reunioes;
CREATE POLICY "owner or admin read reunioes" ON public.reunioes
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PROJETOS ESPECIAIS
DROP POLICY IF EXISTS "auth read projetos" ON public.projetos_especiais;
CREATE POLICY "owner or admin read projetos" ON public.projetos_especiais
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid());


-- Migration: 20260527142351_616ddb57-a2bd-463c-9627-baf0a9b3b686.sql

CREATE TABLE IF NOT EXISTS public.auditoria_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tabela text NOT NULL,
  registro_id text,
  operacao text NOT NULL,
  alteracoes jsonb,
  valor_anterior jsonb,
  valor_novo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auditoria_alteracoes TO authenticated;
GRANT ALL ON public.auditoria_alteracoes TO service_role;

ALTER TABLE public.auditoria_alteracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read auditoria_alteracoes" ON public.auditoria_alteracoes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_aud_alt_created ON public.auditoria_alteracoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aud_alt_user ON public.auditoria_alteracoes(user_id);
CREATE INDEX IF NOT EXISTS idx_aud_alt_tabela ON public.auditoria_alteracoes(tabela);

CREATE OR REPLACE FUNCTION public.log_alteracao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_record_id text;
  k text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := COALESCE(v_old->>'id', '');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new->>'id', '');
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new->>'id', '');
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_new->k) IS DISTINCT FROM (v_old->k) AND k NOT IN ('updated_at') THEN
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.auditoria_alteracoes(user_id, tabela, registro_id, operacao, alteracoes, valor_anterior, valor_novo)
  VALUES (v_user, TG_TABLE_NAME, v_record_id, TG_OP, v_changes, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clientes','agencias','pis','pi_itens','propostas','proposta_itens',
    'projetos_especiais','reunioes','metas_executivo','produtos',
    'profiles','user_roles','midia_config','notificacao_config'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_alteracao()',
      t, t
    );
  END LOOP;
END $$;


-- Migration: 20260527142956_11a1c228-063f-49d0-9b20-8fd577b66546.sql

CREATE TABLE public.materiais_apoio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  categoria text,
  arquivo_path text NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais_apoio TO authenticated;
GRANT ALL ON public.materiais_apoio TO service_role;

ALTER TABLE public.materiais_apoio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read materiais_apoio" ON public.materiais_apoio
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert materiais_apoio" ON public.materiais_apoio
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner or admin update materiais_apoio" ON public.materiais_apoio
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "owner or admin delete materiais_apoio" ON public.materiais_apoio
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE TRIGGER trg_materiais_apoio_updated_at
  BEFORE UPDATE ON public.materiais_apoio
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- audit trigger consistent with other tables
CREATE TRIGGER trg_materiais_apoio_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.materiais_apoio
  FOR EACH ROW EXECUTE FUNCTION public.log_alteracao();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('materiais-apoio', 'materiais-apoio', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read materiais-apoio files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'materiais-apoio');

CREATE POLICY "auth upload materiais-apoio files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materiais-apoio');

CREATE POLICY "owner or admin update materiais-apoio files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materiais-apoio' AND (owner = auth.uid() OR is_admin(auth.uid())));

CREATE POLICY "owner or admin delete materiais-apoio files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materiais-apoio' AND (owner = auth.uid() OR is_admin(auth.uid())));


-- Migration: 20260527143301_759ca4ae-c22a-4b0f-8d61-6f833f98f88c.sql

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS situacao_cadastral text;

ALTER TABLE public.agencias
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS situacao_cadastral text;


-- Migration: 20260528161435_791132c9-d269-4a4f-8472-da41964cdda3.sql

-- Table
CREATE TABLE public.pi_anexos (
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

CREATE INDEX idx_pi_anexos_cliente ON public.pi_anexos(cliente_id);
CREATE INDEX idx_pi_anexos_agencia ON public.pi_anexos(agencia_id);
CREATE INDEX idx_pi_anexos_pi ON public.pi_anexos(pi_id);

CREATE TRIGGER trg_pi_anexos_updated_at
BEFORE UPDATE ON public.pi_anexos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Read: admin, criador, ou tem acesso ao cliente/agência/pi vinculado
CREATE POLICY "read pi_anexos"
ON public.pi_anexos FOR SELECT TO authenticated
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

CREATE POLICY "insert pi_anexos"
ON public.pi_anexos FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update pi_anexos"
ON public.pi_anexos FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR created_by = auth.uid())
WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "delete pi_anexos"
ON public.pi_anexos FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR created_by = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pi-anexos', 'pi-anexos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pi-anexos read auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pi-anexos');

CREATE POLICY "pi-anexos insert auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pi-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "pi-anexos delete owner/admin"
ON storage.objects FOR DELETE TO authenticated
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

CREATE POLICY "auth read pi_assin" ON public.pi_assinaturas_cliente
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert pi_assin" ON public.pi_assinaturas_cliente
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);
CREATE POLICY "auth delete pi_assin" ON public.pi_assinaturas_cliente
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "assin own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "assin own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "assin own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "assin own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "assin admin all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'assinaturas' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'assinaturas' AND public.is_admin(auth.uid()));

-- Migration: 20260603175430_d3519897-2cd0-4afe-a18c-300079022753.sql
ALTER TABLE public.produtos ADD COLUMN formato TEXT;
COMMENT ON COLUMN public.produtos.formato IS 'Formato do produto (ex: 30s, Página inteira, etc)';
GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.produtos TO authenticated;

-- Migration: 20260603175801_2c383449-8482-44e7-baff-bb6d62a2b935.sql
ALTER TABLE public.agencias 
  ADD COLUMN website TEXT,
  ADD COLUMN instagram TEXT,
  ADD COLUMN linkedin TEXT,
  ADD COLUMN facebook TEXT;

ALTER TABLE public.clientes
  ADD COLUMN website TEXT,
  ADD COLUMN instagram TEXT,
  ADD COLUMN linkedin TEXT,
  ADD COLUMN facebook TEXT;

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
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
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
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
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
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
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
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
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

CREATE POLICY "Users can manage permuta_recebimentos" ON public.permuta_recebimentos FOR ALL USING (true) WITH CHECK (true);
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

CREATE TRIGGER trigger_update_saldo_pi AFTER INSERT OR UPDATE OR DELETE ON public.pis FOR EACH ROW EXECUTE FUNCTION public.update_permuta_saldo();
CREATE TRIGGER trigger_update_saldo_rec AFTER INSERT OR UPDATE OR DELETE ON public.permuta_recebimentos FOR EACH ROW EXECUTE FUNCTION public.update_permuta_saldo();

-- Adiciona permissão
INSERT INTO public.permissions (key, label, description) 
VALUES ('/permuta', 'Controle de Permuta', 'Gerenciamento de saldos e recebimentos de permuta')
ON CONFLICT (key) DO NOTHING;


-- Migration: 20260603213713_c583d7d4-a21e-4fbe-acc0-519bda0e8c08.sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretoria';

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
ALTER TABLE public.pi_itens ADD COLUMN mes INTEGER;
ALTER TABLE public.pi_itens ADD COLUMN ano INTEGER;

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
ALTER TABLE public.proposta_itens ADD COLUMN mes INTEGER;
ALTER TABLE public.proposta_itens ADD COLUMN ano INTEGER;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;


-- Migration: 20260603221948_5f6ff2a5-33ce-4cf1-be26-8df3c520f813.sql
ALTER TABLE public.pis ADD COLUMN vencimento_tipo TEXT DEFAULT 'manual';
COMMENT ON COLUMN public.pis.vencimento_tipo IS 'Tipo de vencimento: manual, 15dfm ou 30dfm';


-- Migration: 20260603225156_ed574b34-5aca-4f82-a689-7785fd4c8795.sql

-- Fix 1: Restrict pi_assinaturas_cliente DELETE to admins or PI owner (executivo)
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

CREATE POLICY "Authenticated can read permuta_recebimentos"
  ON public.permuta_recebimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert permuta_recebimentos"
  ON public.permuta_recebimentos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update permuta_recebimentos"
  ON public.permuta_recebimentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete permuta_recebimentos"
  ON public.permuta_recebimentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read permuta_saldos"
  ON public.permuta_saldos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages permuta_saldos"
  ON public.permuta_saldos FOR ALL TO service_role USING (true) WITH CHECK (true);

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
ALTER TABLE public.proposta_itens ADD COLUMN horario TEXT;

-- Adiciona coluna horario em pi_itens
ALTER TABLE public.pi_itens ADD COLUMN horario TEXT;

-- Garante permissões (embora já devam existir pelo GRANT ALL ON ALL TABLES)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;
GRANT ALL ON public.pi_itens TO service_role;

-- Migration: 20260603230647_9aa18d95-2eac-4fc2-95b2-d06cf1c3b41b.sql
-- Cria a tabela de tipos de produtos
CREATE TABLE public.produto_tipos (
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
CREATE POLICY "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos
    FOR SELECT USING (auth.role() = 'authenticated');

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
('Painel', 'DOOH');

-- Migration: 20260603232300_a0c1411b-2a82-4749-afbc-86b78219852d.sql

-- 1) Restrict SELECT on pi_assinaturas_cliente to admin / PI owner / creator
DROP POLICY IF EXISTS "auth read pi_assin" ON public.pi_assinaturas_cliente;
CREATE POLICY "owner or admin read pi_assin"
  ON public.pi_assinaturas_cliente
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
CREATE POLICY "owner or admin insert pi_historico"
  ON public.pi_historico
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
CREATE POLICY "no direct insert auditoria_alteracoes"
  ON public.auditoria_alteracoes
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
CREATE TABLE public.pi_financeiro (
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

CREATE INDEX idx_pi_financeiro_pi_id ON public.pi_financeiro(pi_id);
CREATE INDEX idx_pi_financeiro_status ON public.pi_financeiro(status_pagamento);
CREATE INDEX idx_pi_financeiro_vencimento ON public.pi_financeiro(vencimento_boleto);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_financeiro TO authenticated;
GRANT ALL ON public.pi_financeiro TO service_role;

ALTER TABLE public.pi_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pi_financeiro"
  ON public.pi_financeiro FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pi_financeiro"
  ON public.pi_financeiro FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update pi_financeiro"
  ON public.pi_financeiro FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete pi_financeiro"
  ON public.pi_financeiro FOR DELETE TO authenticated USING (true);

CREATE TRIGGER touch_pi_financeiro_updated_at
  BEFORE UPDATE ON public.pi_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for the bucket (bucket created via tool)
CREATE POLICY "Authenticated users can view financeiro docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'financeiro-docs');

CREATE POLICY "Authenticated users can upload financeiro docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'financeiro-docs');

CREATE POLICY "Authenticated users can update financeiro docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'financeiro-docs');

CREATE POLICY "Authenticated users can delete financeiro docs"
  ON storage.objects FOR DELETE TO authenticated
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
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'producao';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'producao_solicitada';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS requer_producao boolean NOT NULL DEFAULT false;

-- Migration: 20260608214957_434165b1-f481-46ce-849e-49e8f841880d.sql
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('producao'::app_role, 'module.pi'), ('producao'::app_role, 'module.calendario')
ON CONFLICT DO NOTHING;

-- Migration: 20260609133650_0c275617-1512-4bd4-8dd5-f235e9650fac.sql

CREATE TABLE public.sync_cnpj_log (
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
CREATE POLICY "sync log readable by authenticated" ON public.sync_cnpj_log FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_sync_cnpj_log_created ON public.sync_cnpj_log(created_at DESC);

-- Track last sync per entity for round-robin processing
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cnpj_sync_at timestamptz;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS cnpj_sync_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj_sync_at ON public.clientes(cnpj_sync_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_agencias_cnpj_sync_at ON public.agencias(cnpj_sync_at NULLS FIRST);


-- Migration: 20260609150028_d5a28c95-3ad7-48a5-82cc-1b54bb1ad70f.sql

CREATE TABLE public.tarefas (
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

CREATE POLICY "Usuário gerencia suas próprias tarefas"
  ON public.tarefas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX tarefas_user_status_ordem_idx ON public.tarefas(user_id, status, ordem);

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
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parceiro_comercial';


-- Migration: 20260609204318_0af69e30-8c4b-490f-ae42-8eacf5a3169e.sql
-- 1. Create briefings table
CREATE TABLE public.briefings (
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
CREATE POLICY "Users can view their own briefings" ON public.briefings
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Admins and Executives can view all briefings" ON public.briefings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'executivo')
        )
    );

CREATE POLICY "Users can create their own briefings" ON public.briefings
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own pending briefings" ON public.briefings
    FOR UPDATE USING (auth.uid() = created_by AND status = 'pendente');

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
ALTER TABLE public.pis ADD COLUMN responsavel_negociacao_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.pis ADD COLUMN executivo_execucao_id UUID REFERENCES public.profiles(id);

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
CREATE POLICY "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao FOR ALL TO authenticated USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_solicitacoes_producao_updated_at
BEFORE UPDATE ON public.solicitacoes_producao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260610013519_0eefa299-036f-4cf4-a69d-65e61b45059f.sql
CREATE TABLE public.proposal_history (
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
CREATE POLICY "Admins can view all proposal history" 
ON public.proposal_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Owners can view their proposal history" 
ON public.proposal_history FOR SELECT 
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

CREATE TRIGGER trigger_log_proposal_changes
AFTER INSERT OR UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.log_proposal_changes();


-- Migration: 20260610105118_63daa2f0-ffbe-4f6b-beb3-b2606a9001c3.sql

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete their own briefings' AND polrelid = 'public.briefings'::regclass) THEN
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

CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

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

CREATE POLICY "Admins can manage layouts" ON public.proposta_layouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

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

CREATE TABLE public.briefing_anexos (
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

CREATE INDEX briefing_anexos_briefing_id_idx ON public.briefing_anexos(briefing_id);

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

CREATE POLICY "briefing_anexos_select" ON public.briefing_anexos
  FOR SELECT TO authenticated
  USING (public.can_access_briefing(briefing_id, auth.uid()));

CREATE POLICY "briefing_anexos_insert" ON public.briefing_anexos
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_access_briefing(briefing_id, auth.uid())
  );

CREATE POLICY "briefing_anexos_delete" ON public.briefing_anexos
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER briefing_anexos_updated_at
  BEFORE UPDATE ON public.briefing_anexos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for bucket "briefing-anexos"
-- Path convention: {briefing_id}/{filename}
CREATE POLICY "briefing_anexos_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'briefing-anexos'
    AND public.can_access_briefing(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "briefing_anexos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'briefing-anexos'
    AND public.can_access_briefing(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

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

CREATE POLICY "pi_financeiro select owner/admin" ON public.pi_financeiro
  FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pi_financeiro insert owner/admin" ON public.pi_financeiro
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pi_financeiro update owner/admin" ON public.pi_financeiro
  FOR UPDATE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()))
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pi_financeiro delete owner/admin" ON public.pi_financeiro
  FOR DELETE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

-- ============ storage: financeiro-docs ============
-- Path convention: pi/{pi_id}/...
DROP POLICY IF EXISTS "Authenticated users can view financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete financeiro docs" ON storage.objects;

CREATE POLICY "financeiro-docs select owner/admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

CREATE POLICY "financeiro-docs insert owner/admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

CREATE POLICY "financeiro-docs update owner/admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

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

CREATE POLICY "solicitacoes select owner/admin" ON public.solicitacoes_producao
  FOR SELECT TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()) OR public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "solicitacoes insert owner" ON public.solicitacoes_producao
  FOR INSERT TO authenticated
  WITH CHECK (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "solicitacoes update owner/admin" ON public.solicitacoes_producao
  FOR UPDATE TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "solicitacoes delete owner/admin" ON public.solicitacoes_producao
  FOR DELETE TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

-- ============ sync_cnpj_log: admin-only reads ============
DROP POLICY IF EXISTS "sync log readable by authenticated" ON public.sync_cnpj_log;

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

CREATE TABLE public.proposta_anexos (
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

CREATE POLICY "auth can view proposta anexos" ON public.proposta_anexos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth can insert proposta anexos" ON public.proposta_anexos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth can update own proposta anexos" ON public.proposta_anexos
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "auth can delete own proposta anexos" ON public.proposta_anexos
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_proposta_anexos_updated_at
  BEFORE UPDATE ON public.proposta_anexos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_proposta_anexos_proposta ON public.proposta_anexos(proposta_id);

-- Storage policies for proposta-anexos bucket
CREATE POLICY "auth view proposta-anexos files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'proposta-anexos');
CREATE POLICY "auth upload proposta-anexos files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposta-anexos');
CREATE POLICY "auth update proposta-anexos files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'proposta-anexos');
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
CREATE TABLE public.links_uteis (
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

CREATE POLICY "Authenticated can view links" ON public.links_uteis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create links" ON public.links_uteis
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin can update links" ON public.links_uteis
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin can delete links" ON public.links_uteis
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

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

CREATE TABLE public.influenciadores (
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

CREATE POLICY "Admin e producao podem ver influenciadores"
  ON public.influenciadores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

CREATE POLICY "Admin e producao podem inserir influenciadores"
  ON public.influenciadores FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

CREATE POLICY "Admin e producao podem atualizar influenciadores"
  ON public.influenciadores FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

CREATE POLICY "Admin e producao podem excluir influenciadores"
  ON public.influenciadores FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

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
UPDATE auth.users SET encrypted_password = extensions.crypt('Midiaos@2026', extensions.gen_salt('bf')), updated_at = now() WHERE email='rafaelrodrigotv6@gmail.com';

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

CREATE POLICY "Admins and Executives can view all briefings"
ON public.briefings FOR SELECT
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'executivo'));

CREATE POLICY "Admins and Executives can update any briefing"
ON public.briefings FOR UPDATE
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'executivo'));


-- Migration: 20260623041819_c5a24d08-e755-442e-97e0-bf0b04e6f5b9.sql

-- 1) Adiciona super_admin ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';


-- Migration: 20260623041856_a412fb2c-9fe9-48a9-ba42-805145fc436b.sql

-- ============ TENANTS ============
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
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  proximo_vencimento date,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Helper super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  ) AND NOT public.is_demo_user(_user_id)
$$;

-- is_admin agora reconhece super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.is_super_admin(_user_id)
$$;

CREATE POLICY "super admin manages tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER tg_tenants_touch BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ PROFILES.tenant_id ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- ============ Seed tenant TV Brasília ============
INSERT INTO public.tenants (razao_social, nome_fantasia, plano, ciclo, valor_mensal, status, observacoes)
SELECT 'TV Brasília', 'TV Brasília', 'enterprise', 'mensal', 0, 'ativo', 'Cliente inicial — plano sob contrato.'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE razao_social = 'TV Brasília');

-- Vincula todos os profiles sem tenant a TV Brasília (exceto contas demo)
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants WHERE razao_social = 'TV Brasília' LIMIT 1)
WHERE tenant_id IS NULL AND trial_ends_at IS NULL;

-- ============ Usuário super_admin ============
-- Cria o auth.user se ainda não existir
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'rafaelrodrigo.as@gmail.com';
  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'rafaelrodrigo.as@gmail.com',
      extensions.crypt('MidiaOS@Owner2026!', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome','Rafael Rodrigo','is_owner',true),
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', 'rafaelrodrigo.as@gmail.com'),
      'email', now(), now(), now());
    -- profile (caso o trigger handle_new_user não tenha rodado a tempo, garante consistência)
    INSERT INTO public.profiles (id, nome, email)
    VALUES (v_uid, 'Rafael Rodrigo', 'rafaelrodrigo.as@gmail.com')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Garante papel super_admin (e remove o 'executivo' padrão se existir)
  DELETE FROM public.user_roles WHERE user_id = v_uid AND role IN ('executivo');
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;


-- Migration: 20260623043033_f988699b-b5d6-4ed3-8cd0-17e0f7a9e142.sql
UPDATE auth.users SET banned_until = NULL WHERE email = 'rafaelrodrigo.as@gmail.com';

-- Migration: 20260623043911_f4a92f77-a56a-489c-8fbb-164d65e666d9.sql

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS max_usuarios integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS mensagem_alerta text,
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_em timestamptz,
  ADD COLUMN IF NOT EXISTS bloqueado_motivo text;

-- Permite que qualquer usuário autenticado leia APENAS a mensagem de alerta / status de bloqueio do seu próprio tenant
DROP POLICY IF EXISTS "Usuários veem o próprio tenant" ON public.tenants;
CREATE POLICY "Usuários veem o próprio tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));


-- Migration: 20260623045153_b84fcc54-be3e-4da3-87f6-950e067ed62f.sql

-- Desabilita triggers de auditoria durante o backfill (auth.uid() é NULL na migration)
SET session_replication_role = replica;

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
   AND trial_ends_at IS NULL;

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

SET session_replication_role = origin;


-- Migration: 20260623050440_29d974b5-0d51-4130-850f-0aeec46f25a3.sql

CREATE TABLE public.system_announcements (
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

CREATE POLICY "Qualquer autenticado vê ativos"
  ON public.system_announcements FOR SELECT
  TO authenticated
  USING (ativo = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin gerencia"
  ON public.system_announcements FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_system_announcements_updated
  BEFORE UPDATE ON public.system_announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_system_announcements_ativo_created ON public.system_announcements (ativo, created_at DESC);


-- Migration: 20260623051054_e6718961-945b-46c8-97e4-e34dbdac8b95.sql

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Garante que o usuário consiga ler o próprio tenant (necessário para exibir a logo no AppShell)
DROP POLICY IF EXISTS "Usuario le seu proprio tenant" ON public.tenants;
CREATE POLICY "Usuario le seu proprio tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));


-- Migration: 20260623135546_8470bba8-f8d3-4c0b-a896-fb4cff5560c8.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Migration: 20260623141558_874d5054-636a-43f5-b311-5213c0b5f8c8.sql
-- Add 'teste' role to app_role enum for site signups (trial users)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teste';

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

-- Migration: 20260623143324_89bfbd00-50ef-4c6e-a7be-6743c43f9de0.sql

-- 1) Tabela de planos
CREATE TABLE public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  preco_mensal numeric(12,2) NOT NULL DEFAULT 0,
  max_usuarios integer, -- NULL = ilimitado
  modulos text[] NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated le planos"
  ON public.planos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin gerencia planos"
  ON public.planos FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER planos_touch_updated_at BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Tenants ganha vínculo com plano + overrides
ALTER TABLE public.tenants
  ADD COLUMN plano_id uuid REFERENCES public.planos(id),
  ADD COLUMN max_usuarios_override integer,
  ADD COLUMN modulos_override text[];

-- 3) Planos iniciais
INSERT INTO public.planos (nome, descricao, preco_mensal, max_usuarios, modulos, is_default) VALUES
  ('Básico', 'Para times pequenos começarem', 199.00, 3,
   ARRAY['pi','propostas','briefings','calendario'], true),
  ('Pro', 'Operação completa para agências em crescimento', 499.00, 10,
   ARRAY['pi','propostas','briefings','projetos','influenciadores','crm','financeiro','calendario','metas','relatorios'], false),
  ('Enterprise', 'Tudo liberado, usuários ilimitados', 999.00, NULL,
   ARRAY['pi','propostas','briefings','projetos','influenciadores','permuta','financeiro','crm','calendario','metas','relatorios'], false);

-- 4) Helper: módulos efetivos da empresa do usuário
CREATE OR REPLACE FUNCTION public.tenant_modulos(_tenant_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    t.modulos_override,
    (SELECT p.modulos FROM public.planos p WHERE p.id = t.plano_id),
    '{}'::text[]
  )
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

CREATE OR REPLACE FUNCTION public.tenant_has_modulo(_tenant_id uuid, _modulo text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _modulo = ANY(public.tenant_modulos(_tenant_id))
$$;

-- 5) Helper: limite e contagem de usuários
CREATE OR REPLACE FUNCTION public.tenant_user_limit(_tenant_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    t.max_usuarios_override,
    (SELECT p.max_usuarios FROM public.planos p WHERE p.id = t.plano_id)
  )
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

CREATE OR REPLACE FUNCTION public.tenant_user_count(_tenant_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.profiles WHERE tenant_id = _tenant_id
$$;

-- 6) Vincula tenant existente (TV Brasília) ao plano Enterprise para não quebrar acesso
UPDATE public.tenants
SET plano_id = (SELECT id FROM public.planos WHERE nome = 'Enterprise')
WHERE plano_id IS NULL;

-- 7) handle_new_user passa a usar plano default em cadastros novos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teste');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $function$;


-- Migration: 20260623150554_6b7bd554-2439-4ca5-8bff-f3d9c0fbdaaa.sql
DROP POLICY IF EXISTS "Owners can view their proposal history" ON public.proposal_history;
CREATE POLICY "Proposal viewers can view history" ON public.proposal_history
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposal_history.proposal_id
      AND (
        p.created_by = auth.uid()
        OR p.executivo_id = auth.uid()
        OR p.executivo_parceiro_id = auth.uid()
        OR public.has_role(auth.uid(), 'executivo')
        OR public.has_role(auth.uid(), 'diretoria')
        OR public.has_role(auth.uid(), 'financeiro')
      )
  )
);

-- Migration: 20260623180508_c9e780ee-6702-4771-b5d2-f9e39947112c.sql

-- Tabela principal de Pós-Venda
CREATE TABLE public.pos_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviada','visualizada')),
  mensagem text,
  link_provas text,
  gerado_automaticamente boolean NOT NULL DEFAULT false,
  enviada_em timestamptz,
  visualizada_em timestamptz,
  tenant_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_vendas TO authenticated;
GRANT SELECT ON public.pos_vendas TO anon;
GRANT ALL ON public.pos_vendas TO service_role;

ALTER TABLE public.pos_vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_vendas read by pi access"
  ON public.pos_vendas FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pos_vendas anon read by token"
  ON public.pos_vendas FOR SELECT TO anon
  USING (true);

CREATE POLICY "pos_vendas insert by pi access"
  ON public.pos_vendas FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pos_vendas update by pi access"
  ON public.pos_vendas FOR UPDATE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()))
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pos_vendas delete by pi access"
  ON public.pos_vendas FOR DELETE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE INDEX pos_vendas_pi_idx ON public.pos_vendas(pi_id);
CREATE INDEX pos_vendas_token_idx ON public.pos_vendas(token);
CREATE INDEX pos_vendas_tenant_idx ON public.pos_vendas(tenant_id);

CREATE TRIGGER trg_pos_vendas_updated
  BEFORE UPDATE ON public.pos_vendas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_pos_vendas_tenant
  BEFORE INSERT ON public.pos_vendas
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Anexos (provas) da Pós-Venda
CREATE TABLE public.pos_venda_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id uuid NOT NULL REFERENCES public.pos_vendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  path text NOT NULL,
  mime text,
  tamanho integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_venda_anexos TO authenticated;
GRANT SELECT ON public.pos_venda_anexos TO anon;
GRANT ALL ON public.pos_venda_anexos TO service_role;

ALTER TABLE public.pos_venda_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_venda_anexos read by pi access"
  ON public.pos_venda_anexos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

CREATE POLICY "pos_venda_anexos anon read"
  ON public.pos_venda_anexos FOR SELECT TO anon USING (true);

CREATE POLICY "pos_venda_anexos write by pi access"
  ON public.pos_venda_anexos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

CREATE POLICY "pos_venda_anexos delete by pi access"
  ON public.pos_venda_anexos FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

CREATE INDEX pos_venda_anexos_pos_venda_idx ON public.pos_venda_anexos(pos_venda_id);

-- Função que gera Pós-Vendas automaticamente para PIs com período encerrado
CREATE OR REPLACE FUNCTION public.gerar_pos_vendas_pendentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.pos_vendas (pi_id, token, status, gerado_automaticamente, tenant_id, created_by)
  SELECT
    p.id,
    replace(gen_random_uuid()::text,'-','') || substring(md5(random()::text),1,10),
    'pendente',
    true,
    p.tenant_id,
    COALESCE(p.executivo_id, p.created_by)
  FROM public.pis p
  WHERE p.periodo_fim IS NOT NULL
    AND p.periodo_fim < (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND p.status NOT IN ('cancelado','substituido','reprovado','rascunho')
    AND NOT EXISTS (SELECT 1 FROM public.pos_vendas pv WHERE pv.pi_id = p.id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Agendamento horário para gerar pós-vendas automaticamente
SELECT cron.schedule(
  'gerar-pos-vendas-hourly',
  '15 * * * *',
  $cron$ SELECT public.gerar_pos_vendas_pendentes(); $cron$
);


-- Migration: 20260623180552_b0595527-1863-417c-bbaa-993b98f92555.sql

CREATE POLICY "pos-venda-anexos auth read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );

CREATE POLICY "pos-venda-anexos auth insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );

CREATE POLICY "pos-venda-anexos auth delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );


-- Migration: 20260624134656_da76f092-1678-4df4-bc9e-aad398f745b9.sql

-- Tabela de emissoras (CNPJs emissores do PI)
CREATE TABLE public.emissoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX emissoras_tenant_idx ON public.emissoras(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emissoras TO authenticated;
GRANT ALL ON public.emissoras TO service_role;

ALTER TABLE public.emissoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view emissoras" ON public.emissoras
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "admin can manage emissoras" ON public.emissoras
  FOR ALL USING (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_emissoras_updated
  BEFORE UPDATE ON public.emissoras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Novas colunas em pis
ALTER TABLE public.pis
  ADD COLUMN emissora_id UUID REFERENCES public.emissoras(id) ON DELETE SET NULL,
  ADD COLUMN sem_comissao BOOLEAN NOT NULL DEFAULT false;


-- Migration: 20260624141812_851c537b-1291-44b3-b7a8-005f156603f3.sql
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS emissora_id uuid REFERENCES public.emissoras(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_emissora ON public.produtos(emissora_id);

-- Migration: 20260624150052_18bb80d8-2cf8-40ae-aa51-85d753835f9f.sql
ALTER TABLE public.emissoras ADD COLUMN IF NOT EXISTS logo_url text;

-- Migration: 20260624150923_f77d8a02-291a-4546-9b35-d2b0d0e35ec4.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS valor_manual NUMERIC;
NOTIFY pgrst, 'reload schema';

-- Migration: 20260624151647_3a0c52ec-4150-4d01-943b-81be77f61476.sql
ALTER TABLE public.emissoras ADD COLUMN IF NOT EXISTS observacoes text;

-- Migration: 20260624153855_39d4e11b-630a-4fdc-a01f-643ba4d2b1e4.sql
ALTER TABLE public.emissoras ADD COLUMN IF NOT EXISTS entrega_material TEXT;

-- Migration: 20260624161522_95116df9-6b07-4f47-a15f-36a88f4c5d25.sql

CREATE TABLE public.pi_share_links (
  token text PRIMARY KEY,
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  signed_url text NOT NULL,
  storage_path text,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_access_at timestamptz,
  access_count integer NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE ON public.pi_share_links TO authenticated;
GRANT ALL ON public.pi_share_links TO service_role;

ALTER TABLE public.pi_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pi share links read by owner or admin" ON public.pi_share_links
  FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pi share links insert by owner or admin" ON public.pi_share_links
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE INDEX pi_share_links_pi_id_idx ON public.pi_share_links(pi_id);


-- Migration: 20260624162103_8ab632b3-fe2a-4923-bc4c-2b5fea739df2.sql
CREATE INDEX IF NOT EXISTS pi_historico_acao_created_at_idx ON public.pi_historico (acao, created_at DESC);
CREATE INDEX IF NOT EXISTS pi_historico_pi_id_created_at_idx ON public.pi_historico (pi_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pi_historico_created_at_idx ON public.pi_historico (created_at DESC);
CREATE INDEX IF NOT EXISTS pi_share_links_created_at_idx ON public.pi_share_links (created_at DESC);

-- Migration: 20260624165858_633497ac-e1d5-4ac2-a5da-82c00747f8a4.sql

CREATE TABLE public.pi_aprovacoes_diretoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  tenant_id UUID,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',
  aprovador_nome TEXT,
  aprovador_cargo TEXT,
  assinatura_url TEXT,
  ip TEXT,
  user_agent TEXT,
  motivo_reprovacao TEXT,
  decidido_em TIMESTAMPTZ,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pi_aprov_dir_pi ON public.pi_aprovacoes_diretoria(pi_id);
CREATE INDEX idx_pi_aprov_dir_token ON public.pi_aprovacoes_diretoria(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_aprovacoes_diretoria TO authenticated;
GRANT ALL ON public.pi_aprovacoes_diretoria TO service_role;

ALTER TABLE public.pi_aprovacoes_diretoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant view aprov dir" ON public.pi_aprovacoes_diretoria
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "tenant insert aprov dir" ON public.pi_aprovacoes_diretoria
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_pi_aprov_dir_updated
  BEFORE UPDATE ON public.pi_aprovacoes_diretoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_pi_aprov_dir_tenant
  BEFORE INSERT ON public.pi_aprovacoes_diretoria
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();


-- Migration: 20260624174905_90daac87-9d01-4dd3-8c55-59b7adf3b619.sql

DO $$ BEGIN CREATE TYPE public.tipo_midia AS ENUM ('tv','radio','portal','ooh','dooh','influencer','redes_sociais','outros'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.pessoa_tipo AS ENUM ('pj','cpf'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.comissao_escopo AS ENUM ('global','fornecedor','cliente','campanha','tipo_midia'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.comissao_status AS ENUM ('prevista','confirmada','paga','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS produto_marca text NOT NULL DEFAULT 'midiaos',
  ADD COLUMN IF NOT EXISTS dominio_proprio text,
  ADD COLUMN IF NOT EXISTS cor_primaria text;

ALTER TABLE public.emissoras
  ADD COLUMN IF NOT EXISTS tipo_midia public.tipo_midia,
  ADD COLUMN IF NOT EXISTS pessoa_tipo public.pessoa_tipo NOT NULL DEFAULT 'pj',
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS nome_artistico text,
  ADD COLUMN IF NOT EXISTS comissao_padrao_pct numeric(6,3);

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS tipo_midia public.tipo_midia,
  ADD COLUMN IF NOT EXISTS quantidade_faces int,
  ADD COLUMN IF NOT EXISTS endereco_ponto text,
  ADD COLUMN IF NOT EXISTS formato_ooh text,
  ADD COLUMN IF NOT EXISTS plataforma_social text,
  ADD COLUMN IF NOT EXISTS seguidores bigint,
  ADD COLUMN IF NOT EXISTS engajamento_pct numeric(6,3),
  ADD COLUMN IF NOT EXISTS entregaveis_default jsonb;

INSERT INTO public.planos (nome, descricao, max_usuarios, modulos, preco_mensal, ativo)
SELECT 'Connect',
  'Edição white-label para representantes multi-veículo (TV, rádio, OOH, DOOH, influencers, redes sociais) com gestão de comissão.',
  25,
  ARRAY['crm','pi','propostas','briefings','tarefas','calendario','financeiro','relatorios','metas','permuta','projetos','influenciadores','pos_venda','comissoes','ooh','redes_sociais'],
  997, true
WHERE NOT EXISTS (SELECT 1 FROM public.planos WHERE nome = 'Connect');

CREATE TABLE IF NOT EXISTS public.comissoes_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  escopo public.comissao_escopo NOT NULL,
  fornecedor_id uuid REFERENCES public.emissoras(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  pi_id uuid REFERENCES public.pis(id) ON DELETE CASCADE,
  tipo_midia public.tipo_midia,
  percentual numeric(6,3) NOT NULL,
  prioridade int NOT NULL DEFAULT 100,
  vigencia_inicio date,
  vigencia_fim date,
  ativa boolean NOT NULL DEFAULT true,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes_regras TO authenticated;
GRANT ALL ON public.comissoes_regras TO service_role;
ALTER TABLE public.comissoes_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant lê regras" ON public.comissoes_regras FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "Admin gerencia regras" ON public.comissoes_regras FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria') OR public.is_super_admin(auth.uid())))
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_comissoes_regras_tenant BEFORE INSERT ON public.comissoes_regras FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_comissoes_regras_touch BEFORE UPDATE ON public.comissoes_regras FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.comissoes_apuracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.emissoras(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  executivo_id uuid,
  regra_id uuid REFERENCES public.comissoes_regras(id) ON DELETE SET NULL,
  base_calculo numeric(14,2) NOT NULL DEFAULT 0,
  percentual numeric(6,3) NOT NULL DEFAULT 0,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  status public.comissao_status NOT NULL DEFAULT 'prevista',
  competencia date,
  pago_em date,
  comprovante_path text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pi_id, fornecedor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes_apuracao TO authenticated;
GRANT ALL ON public.comissoes_apuracao TO service_role;
ALTER TABLE public.comissoes_apuracao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant lê comissões" ON public.comissoes_apuracao FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria')
    OR public.is_super_admin(auth.uid()) OR executivo_id = auth.uid()));
CREATE POLICY "Admin gerencia comissões" ON public.comissoes_apuracao FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria') OR public.is_super_admin(auth.uid())))
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_comissoes_apuracao_tenant BEFORE INSERT ON public.comissoes_apuracao FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_comissoes_apuracao_touch BEFORE UPDATE ON public.comissoes_apuracao FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.calcular_comissao_pi(_pi_id uuid, _fornecedor_id uuid)
RETURNS TABLE(regra_id uuid, percentual numeric, base numeric, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pi public.pis%ROWTYPE; v_tenant uuid; v_tipo public.tipo_midia;
  v_base numeric; v_regra public.comissoes_regras%ROWTYPE; v_pct numeric; v_default numeric;
BEGIN
  SELECT * INTO v_pi FROM public.pis WHERE id = _pi_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_tenant := v_pi.tenant_id;
  SELECT e.tipo_midia, e.comissao_padrao_pct INTO v_tipo, v_default FROM public.emissoras e WHERE e.id = _fornecedor_id;
  SELECT COALESCE(SUM(COALESCE(i.valor_negociado, i.valor_total, 0)),0) INTO v_base
    FROM public.pi_itens i WHERE i.pi_id = _pi_id AND i.emissora_id = _fornecedor_id;
  IF v_base = 0 THEN v_base := COALESCE(v_pi.valor_negociado, 0); END IF;
  SELECT * INTO v_regra FROM public.comissoes_regras r
   WHERE r.tenant_id = v_tenant AND r.ativa
     AND (r.vigencia_inicio IS NULL OR r.vigencia_inicio <= CURRENT_DATE)
     AND (r.vigencia_fim    IS NULL OR r.vigencia_fim    >= CURRENT_DATE)
     AND ((r.escopo='campanha' AND r.pi_id=_pi_id)
       OR (r.escopo='cliente' AND r.cliente_id=v_pi.cliente_id)
       OR (r.escopo='fornecedor' AND r.fornecedor_id=_fornecedor_id)
       OR (r.escopo='tipo_midia' AND r.tipo_midia=v_tipo)
       OR  r.escopo='global')
   ORDER BY CASE r.escopo WHEN 'campanha' THEN 1 WHEN 'cliente' THEN 2 WHEN 'fornecedor' THEN 3 WHEN 'tipo_midia' THEN 4 ELSE 5 END, r.prioridade ASC
   LIMIT 1;
  v_pct := COALESCE(v_regra.percentual, v_default, 0);
  regra_id := v_regra.id; percentual := v_pct; base := v_base; valor := round(v_base * v_pct / 100.0, 2);
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_forn uuid; v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado','faturado','veiculado','encerrado') THEN RETURN NEW; END IF;
  FOR v_forn IN SELECT DISTINCT emissora_id FROM public.pi_itens WHERE pi_id = NEW.id AND emissora_id IS NOT NULL LOOP
    SELECT * INTO v_calc FROM public.calcular_comissao_pi(NEW.id, v_forn);
    INSERT INTO public.comissoes_apuracao
      (tenant_id, pi_id, fornecedor_id, cliente_id, executivo_id, regra_id, base_calculo, percentual, valor, status, competencia)
    VALUES (NEW.tenant_id, NEW.id, v_forn, NEW.cliente_id, NEW.executivo_id, v_calc.regra_id,
       v_calc.base, v_calc.percentual, v_calc.valor,
       CASE WHEN NEW.status IN ('faturado','veiculado','encerrado') THEN 'confirmada'::comissao_status ELSE 'prevista'::comissao_status END,
       COALESCE(NEW.periodo_inicio, CURRENT_DATE))
    ON CONFLICT (pi_id, fornecedor_id) DO UPDATE
      SET base_calculo=EXCLUDED.base_calculo, percentual=EXCLUDED.percentual, valor=EXCLUDED.valor, regra_id=EXCLUDED.regra_id,
          status = CASE WHEN public.comissoes_apuracao.status='paga' THEN public.comissoes_apuracao.status ELSE EXCLUDED.status END,
          updated_at = now();
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pis_refresh_comissoes ON public.pis;
CREATE TRIGGER trg_pis_refresh_comissoes AFTER INSERT OR UPDATE OF status, valor_negociado ON public.pis
  FOR EACH ROW EXECUTE FUNCTION public.refresh_comissoes_pi();

CREATE INDEX IF NOT EXISTS idx_comissoes_apuracao_tenant_competencia ON public.comissoes_apuracao (tenant_id, competencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_apuracao_executivo ON public.comissoes_apuracao (executivo_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_regras_tenant_ativa ON public.comissoes_regras (tenant_id, ativa);
CREATE INDEX IF NOT EXISTS idx_emissoras_tipo_midia ON public.emissoras (tipo_midia);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo_midia ON public.produtos (tipo_midia);


-- Migration: 20260626005508_025b5a4c-196e-457f-99b8-9cb4f7065ecd.sql

ALTER TABLE public.propostas DROP CONSTRAINT propostas_cliente_id_fkey;
ALTER TABLE public.propostas ADD CONSTRAINT propostas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.permuta_recebimentos DROP CONSTRAINT permuta_recebimentos_cliente_id_fkey;
ALTER TABLE public.permuta_recebimentos ADD CONSTRAINT permuta_recebimentos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


-- Migration: 20260626011537_d1dde9e3-8044-445e-94d5-9e47a9627a2d.sql

-- Tighten EXECUTE privileges on SECURITY DEFINER functions (Supabase linter 0028/0029)

-- Trigger-only / server-only: revoke from all client roles
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'generate_pi_numero()',
    'generate_proposta_numero()',
    'touch_updated_at()',
    'update_updated_at_column()',
    'handle_new_user()',
    'log_alteracao()',
    'log_proposal_changes()',
    'refresh_comissoes_pi()',
    'set_tenant_id_from_user()',
    'handle_default_layout()',
    'update_permuta_saldo()',
    'read_email_batch(text,integer,integer)',
    'enqueue_email(text,jsonb)',
    'delete_email(text,bigint)',
    'move_to_dlq(text,text,bigint,jsonb)',
    'trigger_sync_cnpj_burst()',
    'gerar_pos_vendas_pendentes()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- RLS helpers / tenant helpers: keep authenticated, drop public+anon
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'has_role(uuid,app_role)',
    'is_admin(uuid)',
    'is_super_admin(uuid)',
    'is_demo_user(uuid)',
    'is_trial_expired(uuid)',
    'can_access_pi(uuid,uuid)',
    'can_access_briefing(uuid,uuid)',
    'current_tenant_id()',
    'tenant_modulos(uuid)',
    'tenant_has_modulo(uuid,text)',
    'tenant_user_count(uuid)',
    'tenant_user_limit(uuid)',
    'calcular_comissao_pi(uuid,uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;


-- Migration: 20260626011742_07d9dff7-5f70-48ca-aaf5-486b8813cd01.sql

CREATE OR REPLACE FUNCTION public.admin_cron_runs(_limit int DEFAULT 50)
RETURNS TABLE(jobid bigint, jobname text, status text, return_message text, start_time timestamptz, end_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT d.jobid, j.jobname, d.status, d.return_message, d.start_time, d.end_time
    FROM cron.job_run_details d
    LEFT JOIN cron.job j ON j.jobid = d.jobid
    ORDER BY d.start_time DESC
    LIMIT _limit;
EXCEPTION WHEN undefined_table THEN
  RETURN;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_cron_runs(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cron_runs(int) TO authenticated, service_role;


-- Migration: 20260627154519_69e99d49-0ff6-4f47-a4ee-9af583f3d120.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consentimento_lgpd_at timestamptz,
  ADD COLUMN IF NOT EXISTS consentimento_versao text;

CREATE TABLE IF NOT EXISTS public.lgpd_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('exportacao','exclusao','correcao')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','rejeitada')),
  observacoes text,
  resposta text,
  processado_em timestamptz,
  processado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lgpd_solicitacoes TO authenticated;
GRANT ALL ON public.lgpd_solicitacoes TO service_role;

ALTER TABLE public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas próprias solicitações LGPD"
  ON public.lgpd_solicitacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Usuário cria suas próprias solicitações LGPD"
  ON public.lgpd_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_lgpd_solicitacoes_updated
  BEFORE UPDATE ON public.lgpd_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lgpd_solicitacoes_user ON public.lgpd_solicitacoes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lgpd_solicitacoes_status ON public.lgpd_solicitacoes(status) WHERE status = 'pendente';


-- Migration: 20260628162752_c91ce6dc-36e0-45cb-840a-cbaac5b8e49a.sql

-- Índices para acelerar relatórios filtrando por período, executivo, cliente, agência e datas fiscais
CREATE INDEX IF NOT EXISTS pis_tenant_created_at_idx ON public.pis (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_executivo_created_at_idx ON public.pis (executivo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_cliente_created_at_idx ON public.pis (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_agencia_created_at_idx ON public.pis (agencia_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_status_idx ON public.pis (status);
CREATE INDEX IF NOT EXISTS pis_ano_mes_veiculacao_idx ON public.pis (ano_veiculacao, mes_veiculacao);
CREATE INDEX IF NOT EXISTS pis_periodo_idx ON public.pis (periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS pis_data_faturamento_idx ON public.pis (data_faturamento) WHERE data_faturamento IS NOT NULL;
CREATE INDEX IF NOT EXISTS pis_data_envio_nota_idx ON public.pis (data_envio_nota) WHERE data_envio_nota IS NOT NULL;
CREATE INDEX IF NOT EXISTS pis_data_vencimento_nota_idx ON public.pis (data_vencimento_nota) WHERE data_vencimento_nota IS NOT NULL;

CREATE INDEX IF NOT EXISTS propostas_executivo_created_at_idx ON public.propostas (executivo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS propostas_cliente_created_at_idx ON public.propostas (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS propostas_status_idx ON public.propostas (status);

CREATE INDEX IF NOT EXISTS metas_executivo_ano_idx ON public.metas_executivo (ano, executivo_id);


-- Migration: 20260701160855_19ba71d3-5af6-448f-bded-bff21ad52487.sql
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'pi_renovado';

-- Migration: 20260701175346_6635ba91-8265-404e-92d3-f44becce6f0e.sql

-- 1) Tabela de datas comemorativas
CREATE TABLE IF NOT EXISTS public.datas_comemorativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dia smallint NOT NULL CHECK (dia BETWEEN 1 AND 31),
  mes smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  categoria text NOT NULL DEFAULT 'comemorativa',
  segmentos_alvo text[] NOT NULL DEFAULT '{}',
  sugestoes_projetos text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nome, dia, mes)
);

GRANT SELECT ON public.datas_comemorativas TO authenticated;
GRANT ALL ON public.datas_comemorativas TO service_role;

ALTER TABLE public.datas_comemorativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "datas_read_all" ON public.datas_comemorativas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "datas_admin_write" ON public.datas_comemorativas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_datas_comemorativas_updated
  BEFORE UPDATE ON public.datas_comemorativas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Seed de datas brasileiras principais
INSERT INTO public.datas_comemorativas (nome, dia, mes, categoria, segmentos_alvo, sugestoes_projetos) VALUES
('Ano Novo', 1, 1, 'sazonal', ARRAY['varejo','alimentacao','turismo'], 'Campanhas de retrospectiva, saudação de ano novo e promoções de recomeço.'),
('Dia do Consumidor', 15, 3, 'sazonal', ARRAY['varejo','ecommerce','servicos'], 'Ofertas relâmpago, cashback, cupons e descontos exclusivos.'),
('Páscoa', 20, 4, 'sazonal', ARRAY['alimentacao','varejo','confeitaria'], 'Kits de páscoa, chocolates, cestas e ações infantis.'),
('Dia das Mães', 12, 5, 'sazonal', ARRAY['varejo','moda','beleza','joias','floricultura','alimentacao'], 'Combos presente, campanhas emocionais e brindes especiais.'),
('Dia dos Namorados', 12, 6, 'sazonal', ARRAY['moda','joias','restaurantes','turismo','beleza'], 'Ações de casal, jantares, hotéis, joias e experiências.'),
('Festa Junina', 24, 6, 'sazonal', ARRAY['alimentacao','varejo','eventos'], 'Ativações regionais, kits temáticos e ações em bairros.'),
('Dia dos Pais', 10, 8, 'sazonal', ARRAY['varejo','automotivo','tecnologia','moda'], 'Ferramentas, tech, moda masculina e experiências para o pai.'),
('Dia do Cliente', 15, 9, 'sazonal', ARRAY['varejo','servicos','ecommerce'], 'Campanhas de fidelização, brindes e descontos exclusivos.'),
('Dia das Crianças', 12, 10, 'sazonal', ARRAY['brinquedos','varejo','alimentacao','entretenimento'], 'Brinquedos, parques, kits infantis e ações lúdicas.'),
('Black Friday', 28, 11, 'sazonal', ARRAY['varejo','ecommerce','tecnologia','automotivo','moda'], 'Grande volume de mídia, teasers e ofertas por categoria.'),
('Natal', 25, 12, 'sazonal', ARRAY['varejo','alimentacao','moda','joias','tecnologia','decoracao'], 'Campanha institucional de fim de ano, presentes e ceia.'),
('Volta às Aulas', 20, 1, 'sazonal', ARRAY['papelaria','educacao','moda','tecnologia'], 'Material escolar, uniformes, cursos e eletrônicos.'),
('Carnaval', 17, 2, 'sazonal', ARRAY['bebidas','turismo','moda','entretenimento'], 'Blocos, camarotes, patrocínios e ações de bebida.'),
('Dia da Mulher', 8, 3, 'sazonal', ARRAY['beleza','moda','saude','joias'], 'Homenagens, promoções e conteúdo institucional.'),
('Dia do Trabalho', 1, 5, 'sazonal', ARRAY['varejo','servicos','automotivo'], 'Feirões, promoções relâmpago e ações institucionais.'),
('Dia do Meio Ambiente', 5, 6, 'comemorativa', ARRAY['sustentabilidade','energia','saude'], 'Campanhas ESG, produtos sustentáveis e institucionais verdes.'),
('Independência do Brasil', 7, 9, 'sazonal', ARRAY['varejo','automotivo'], 'Semana da Pátria, feirões e ações patrióticas.'),
('Dia do Professor', 15, 10, 'comemorativa', ARRAY['educacao','livrarias','varejo'], 'Homenagens, cursos e presentes para docentes.'),
('Halloween', 31, 10, 'sazonal', ARRAY['entretenimento','alimentacao','varejo'], 'Fantasias, promoções temáticas e ações infantis.'),
('Copa do Mundo', 15, 6, 'comemorativa', ARRAY['bebidas','eletronicos','varejo'], 'TVs, cervejas, ativações esportivas (aplicável em anos de Copa).'),
('Réveillon', 31, 12, 'sazonal', ARRAY['turismo','bebidas','moda','restaurantes'], 'Pacotes, festas, moda branca e restaurantes.')
ON CONFLICT (nome, dia, mes) DO NOTHING;

-- 3) Função que gera notificações 45 dias antes
CREATE OR REPLACE FUNCTION public.notificar_datas_comemorativas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_alvo date := v_hoje + 45;
  v_data record;
  v_user record;
  v_clientes text;
  v_qtd_clientes int;
  v_mensagem text;
  v_count int := 0;
  v_target_year int;
BEGIN
  FOR v_data IN
    SELECT * FROM public.datas_comemorativas WHERE ativo
  LOOP
    -- calcula a próxima ocorrência da data
    v_target_year := EXTRACT(YEAR FROM v_alvo)::int;
    BEGIN
      IF make_date(v_target_year, v_data.mes, v_data.dia) <> v_alvo THEN
        CONTINUE;
      END IF;
    EXCEPTION WHEN OTHERS THEN CONTINUE;
    END;

    -- para cada usuário do sistema (por tenant), monta clientes-alvo
    FOR v_user IN
      SELECT p.id AS user_id, p.tenant_id
      FROM public.profiles p
      WHERE p.tenant_id IS NOT NULL
    LOOP
      SELECT string_agg(razao_social, ', ' ORDER BY razao_social), COUNT(*)
        INTO v_clientes, v_qtd_clientes
      FROM (
        SELECT razao_social FROM public.clientes
        WHERE tenant_id = v_user.tenant_id
          AND ativo = true
          AND (
            array_length(v_data.segmentos_alvo,1) IS NULL
            OR segmento = ANY(v_data.segmentos_alvo)
          )
        LIMIT 8
      ) sub;

      v_mensagem := format(
        '📅 %s em %s dias (%s). %s%sSugestões de projeto: %s',
        v_data.nome,
        (make_date(v_target_year, v_data.mes, v_data.dia) - v_hoje),
        to_char(make_date(v_target_year, v_data.mes, v_data.dia), 'DD/MM/YYYY'),
        CASE WHEN COALESCE(v_qtd_clientes,0) > 0
             THEN format('Clientes potenciais (%s): %s. ', v_qtd_clientes, v_clientes)
             ELSE 'Nenhum cliente cadastrado com segmento compatível. ' END,
        E'\n',
        COALESCE(v_data.sugestoes_projetos, 'Monte uma proposta temática dedicada.')
      );

      INSERT INTO public.notificacoes (user_id, tenant_id, tipo, titulo, mensagem, link, metadata)
      VALUES (
        v_user.user_id,
        v_user.tenant_id,
        'outro',
        'Oportunidade: ' || v_data.nome,
        v_mensagem,
        '/calendario',
        jsonb_build_object(
          'ref_id', v_data.id::text || '-' || v_target_year::text,
          'evento', 'data_comemorativa_45d',
          'data_id', v_data.id,
          'data_alvo', make_date(v_target_year, v_data.mes, v_data.dia),
          'segmentos', v_data.segmentos_alvo,
          'clientes_qtd', COALESCE(v_qtd_clientes,0)
        )
      )
      ON CONFLICT (user_id, tipo, (metadata->>'ref_id'), (metadata->>'evento')) DO NOTHING;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.notificar_datas_comemorativas() TO service_role;


-- Migration: 20260701192912_90dfa017-eaf2-4f5f-9796-7db9f70f9fd0.sql
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'aguardando_assinatura';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'assinado';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'enviar_opec';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'veiculado';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'encerrado';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'finalizado';

-- Migration: 20260701204739_5210eb06-f945-4d16-acc7-b450cd10f870.sql
CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_forn uuid; v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado','faturado','veiculado','encerrado') THEN RETURN NEW; END IF;
  FOR v_forn IN
    SELECT DISTINCT emissora_id FROM public.pis WHERE id = NEW.id AND emissora_id IS NOT NULL
  LOOP
    SELECT * INTO v_calc FROM public.calcular_comissao_pi(NEW.id, v_forn);
    INSERT INTO public.comissoes_apuracao
      (tenant_id, pi_id, fornecedor_id, cliente_id, executivo_id, regra_id, base_calculo, percentual, valor, status, competencia)
    VALUES (NEW.tenant_id, NEW.id, v_forn, NEW.cliente_id, NEW.executivo_id, v_calc.regra_id,
       v_calc.base, v_calc.percentual, v_calc.valor,
       CASE WHEN NEW.status IN ('faturado','veiculado','encerrado') THEN 'confirmada'::comissao_status ELSE 'prevista'::comissao_status END,
       COALESCE(NEW.periodo_inicio, CURRENT_DATE))
    ON CONFLICT (pi_id, fornecedor_id) DO UPDATE
      SET base_calculo=EXCLUDED.base_calculo, percentual=EXCLUDED.percentual, valor=EXCLUDED.valor, regra_id=EXCLUDED.regra_id,
          status = CASE WHEN public.comissoes_apuracao.status='paga' THEN public.comissoes_apuracao.status ELSE EXCLUDED.status END,
          updated_at = now();
  END LOOP;
  RETURN NEW;
END $function$;

-- Migration: 20260701205123_8549c6bc-1fb2-448a-8983-187417f710e6.sql
CREATE OR REPLACE FUNCTION public.calcular_comissao_pi(_pi_id uuid, _fornecedor_id uuid)
RETURNS TABLE(regra_id uuid, percentual numeric, base numeric, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pi public.pis%ROWTYPE;
  v_tenant uuid;
  v_tipo public.tipo_midia;
  v_base numeric := 0;
  v_regra public.comissoes_regras%ROWTYPE;
  v_pct numeric;
  v_default numeric;
BEGIN
  SELECT * INTO v_pi FROM public.pis WHERE id = _pi_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_tenant := v_pi.tenant_id;

  SELECT e.tipo_midia, e.comissao_padrao_pct
    INTO v_tipo, v_default
  FROM public.emissoras e
  WHERE e.id = _fornecedor_id;

  IF v_pi.emissora_id IS NOT NULL AND v_pi.emissora_id = _fornecedor_id THEN
    SELECT COALESCE(
      SUM(
        COALESCE(
          i.valor_negociado,
          i.valor_tabela,
          COALESCE(i.valor_unit, 0) * COALESCE(i.total_insercoes, 1),
          0
        )
      ),
      0
    )
      INTO v_base
    FROM public.pi_itens i
    WHERE i.pi_id = _pi_id;
  END IF;

  IF COALESCE(v_base, 0) = 0 THEN
    v_base := COALESCE(v_pi.valor_negociado, 0);
  END IF;

  SELECT * INTO v_regra
  FROM public.comissoes_regras r
  WHERE r.tenant_id = v_tenant
    AND r.ativa
    AND (r.vigencia_inicio IS NULL OR r.vigencia_inicio <= CURRENT_DATE)
    AND (r.vigencia_fim IS NULL OR r.vigencia_fim >= CURRENT_DATE)
    AND (
      (r.escopo = 'campanha' AND r.pi_id = _pi_id)
      OR (r.escopo = 'cliente' AND r.cliente_id = v_pi.cliente_id)
      OR (r.escopo = 'fornecedor' AND r.fornecedor_id = _fornecedor_id)
      OR (r.escopo = 'tipo_midia' AND r.tipo_midia = v_tipo)
      OR r.escopo = 'global'
    )
  ORDER BY CASE r.escopo
    WHEN 'campanha' THEN 1
    WHEN 'cliente' THEN 2
    WHEN 'fornecedor' THEN 3
    WHEN 'tipo_midia' THEN 4
    ELSE 5
  END, r.prioridade ASC
  LIMIT 1;

  v_pct := COALESCE(v_regra.percentual, v_default, 0);

  regra_id := v_regra.id;
  percentual := v_pct;
  base := v_base;
  valor := round(v_base * v_pct / 100.0, 2);
  RETURN NEXT;
END
$function$;

CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_forn uuid;
  v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado', 'faturado', 'veiculado', 'encerrado') THEN
    RETURN NEW;
  END IF;

  FOR v_forn IN
    SELECT NEW.emissora_id WHERE NEW.emissora_id IS NOT NULL
  LOOP
    SELECT * INTO v_calc FROM public.calcular_comissao_pi(NEW.id, v_forn);

    IF v_calc.base IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.comissoes_apuracao
      (tenant_id, pi_id, fornecedor_id, cliente_id, executivo_id, regra_id, base_calculo, percentual, valor, status, competencia)
    VALUES
      (NEW.tenant_id, NEW.id, v_forn, NEW.cliente_id, NEW.executivo_id, v_calc.regra_id,
       v_calc.base, v_calc.percentual, v_calc.valor,
       CASE WHEN NEW.status IN ('faturado', 'veiculado', 'encerrado') THEN 'confirmada'::comissao_status ELSE 'prevista'::comissao_status END,
       COALESCE(NEW.periodo_inicio, CURRENT_DATE))
    ON CONFLICT (pi_id, fornecedor_id) DO UPDATE
      SET base_calculo = EXCLUDED.base_calculo,
          percentual = EXCLUDED.percentual,
          valor = EXCLUDED.valor,
          regra_id = EXCLUDED.regra_id,
          status = CASE WHEN public.comissoes_apuracao.status = 'paga' THEN public.comissoes_apuracao.status ELSE EXCLUDED.status END,
          updated_at = now();
  END LOOP;

  RETURN NEW;
END
$function$;

-- Migration: 20260702171154_c1a0911b-4ab5-4732-a5c4-69900789ac7c.sql
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS veiculacao_tipo TEXT NOT NULL DEFAULT 'livre'
    CHECK (veiculacao_tipo IN ('livre','dias_uteis','dias_fixos')),
  ADD COLUMN IF NOT EXISTS dias_fixos INTEGER[] NOT NULL DEFAULT '{}';

-- Migration: 20260703194132_27ff4dc2-e721-4254-bb36-1ed5d987cf8e.sql

-- 1) Trash table
CREATE TABLE IF NOT EXISTS public.trash_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  descricao TEXT,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '45 days'),
  restored_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trash_items_tenant ON public.trash_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trash_items_expires ON public.trash_items(expires_at) WHERE restored_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trash_items_tabela ON public.trash_items(tabela);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trash_items TO authenticated;
GRANT ALL ON public.trash_items TO service_role;

ALTER TABLE public.trash_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver lixeira do tenant"
ON public.trash_items FOR SELECT TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Admins podem atualizar lixeira"
ON public.trash_items FOR UPDATE TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Admins podem apagar lixeira"
ON public.trash_items FOR DELETE TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

-- Insert bypass: só via SECURITY DEFINER trigger (nenhuma policy de INSERT)

-- 2) Trigger genérico BEFORE DELETE
CREATE OR REPLACE FUNCTION public.trg_move_to_trash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB := to_jsonb(OLD);
  v_tenant UUID;
  v_desc TEXT;
BEGIN
  BEGIN v_tenant := (v_payload->>'tenant_id')::uuid; EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;
  v_desc := COALESCE(
    v_payload->>'razao_social',
    v_payload->>'nome_fantasia',
    v_payload->>'numero',
    v_payload->>'titulo',
    v_payload->>'nome',
    v_payload->>'campanha',
    v_payload->>'descricao'
  );
  INSERT INTO public.trash_items (tenant_id, tabela, registro_id, payload, descricao, deleted_by)
  VALUES (v_tenant, TG_TABLE_NAME, (v_payload->>'id'), v_payload, v_desc, auth.uid());
  RETURN OLD;
END $$;

-- 3) Attach nas tabelas principais
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','produtos',
    'projetos_especiais','influenciadores','tarefas','emissoras',
    'reunioes','eventos_calendario','materiais_apoio','links_uteis',
    'permuta_recebimentos','metas_executivo'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trash_before_delete ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash()', t);
  END LOOP;
END $$;

-- 4) Restore function
CREATE OR REPLACE FUNCTION public.restore_trash_item(_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.trash_items%ROWTYPE;
  v_cols TEXT;
  v_vals TEXT;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_item FROM public.trash_items WHERE id = _id AND restored_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'item não encontrado'; END IF;

  -- Reinsere a partir do JSON, deixando o Postgres cuidar do casting via jsonb_populate_record
  EXECUTE format(
    'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT (id) DO NOTHING',
    v_item.tabela, v_item.tabela
  ) USING v_item.payload;

  UPDATE public.trash_items SET restored_at = now() WHERE id = _id;
END $$;

-- 5) Purge expired (chamado por cron)
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.trash_items
   WHERE restored_at IS NULL AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- 6) Cron diário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-expired-trash')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-trash');
    PERFORM cron.schedule('purge-expired-trash', '15 3 * * *', $cron$ SELECT public.purge_expired_trash(); $cron$);
  END IF;
END $$;


-- Migration: 20260706143415_4b996089-cc65-4563-9557-29ce42515e77.sql
ALTER TYPE public.tipo_midia ADD VALUE IF NOT EXISTS 'agencia_publicidade';
ALTER TYPE public.tipo_midia ADD VALUE IF NOT EXISTS 'produtora';
ALTER TYPE public.tipo_midia ADD VALUE IF NOT EXISTS 'grafica';
ALTER TYPE public.tipo_midia ADD VALUE IF NOT EXISTS 'estudio';
ALTER TYPE public.tipo_midia ADD VALUE IF NOT EXISTS 'assessoria_imprensa';
ALTER TYPE public.tipo_midia ADD VALUE IF NOT EXISTS 'marketing_digital';
ALTER TYPE public.tipo_midia ADD VALUE IF NOT EXISTS 'evento';
ALTER TYPE public.tipo_midia ADD VALUE IF NOT EXISTS 'editora';

-- Migration: 20260706143603_743603c2-4e51-4884-b113-d40d3a35f897.sql
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7);

-- Migration: 20260706144715_9843fed4-f80e-473f-a346-9fdad3b808f2.sql
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS investimentos_mensais JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pis.investimentos_mensais IS
  'Mapa "YYYY-MM" -> valor (numeric) com o investimento mensal do cliente para cada mês do contrato. Se ausente, o rodapé do mapa de inserção usa a soma automática das entregas do mês.';

-- Migration: 20260706200344_2ab37d13-b8d4-4e4e-8840-2ea729c37f94.sql
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        pi_id,
        tipo,
        coalesce(programa, ''),
        coalesce(formato, ''),
        coalesce(horario, ''),
        coalesce(mes, 0),
        coalesce(ano, 0),
        insercoes_dia,
        coalesce(desconto, 0),
        coalesce(valor_unit, 0),
        coalesce(valor_tabela, 0),
        coalesce(valor_negociado, 0),
        total_insercoes,
        coalesce(dias_mes, '{}'::integer[]),
        coalesce(dias_semana, '{}'::text[])
      ORDER BY created_at NULLS LAST, id
    ) AS rn
  FROM public.pi_itens
)
DELETE FROM public.pi_itens i
USING ranked r
WHERE i.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pi_itens_no_exact_duplicates_idx
ON public.pi_itens (
  pi_id,
  tipo,
  coalesce(programa, ''),
  coalesce(formato, ''),
  coalesce(horario, ''),
  coalesce(mes, 0),
  coalesce(ano, 0),
  insercoes_dia,
  coalesce(desconto, 0),
  coalesce(valor_unit, 0),
  coalesce(valor_tabela, 0),
  coalesce(valor_negociado, 0),
  total_insercoes,
  coalesce(dias_mes, '{}'::integer[]),
  coalesce(dias_semana, '{}'::text[])
);

-- Migration: 20260707144758_83ee45a3-6e57-4151-93be-c03dd9a2a61d.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS valor_opec numeric;
COMMENT ON COLUMN public.pis.valor_opec IS 'Valor interno para OPEC/uso interno em PIs de permuta. Não aparece no PI enviado ao cliente.';

-- Migration: 20260707182912_5bdb0a44-e364-482a-9fcf-d1067f0ab7c7.sql

DROP POLICY IF EXISTS "admin insert metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin update metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin delete metas" ON public.metas_executivo;

CREATE POLICY "admin or diretoria insert metas" ON public.metas_executivo
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));

CREATE POLICY "admin or diretoria update metas" ON public.metas_executivo
  FOR UPDATE USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));

CREATE POLICY "admin or diretoria delete metas" ON public.metas_executivo
  FOR DELETE USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));


-- Migration: 20260709142451_0fe24083-a0c7-4859-9a6e-6bb84cb69c50.sql
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS dias_semana_fixos int[] NOT NULL DEFAULT '{}';

-- Migration: 20260714152605_a09f553b-4e7c-4baa-9c8c-1e06dae9e4e2.sql
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_veiculacao_tipo_check;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_veiculacao_tipo_check CHECK (veiculacao_tipo IN ('livre','dias_uteis','seg_sab','dias_fixos','dias_semana'));

-- Migration: 20260715143153_9173f13f-d5cc-4b49-85bf-e3026796d3cd.sql
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS categorias_servicos text[] NOT NULL DEFAULT '{}'::text[];

-- Migration: 20260715231830_825b05f6-01bd-4446-b77a-41a5a7e76804.sql

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS quantidade_telas integer,
  ADD COLUMN IF NOT EXISTS ambientes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS formato_tela text,
  ADD COLUMN IF NOT EXISTS resolucao text,
  ADD COLUMN IF NOT EXISTS tempo_exibicao_segundos integer,
  ADD COLUMN IF NOT EXISTS loop_minutos integer,
  ADD COLUMN IF NOT EXISTS insercoes_por_hora integer,
  ADD COLUMN IF NOT EXISTS horas_operacao_dia integer,
  ADD COLUMN IF NOT EXISTS detalhes_venda text;


-- Migration: 20260721173103_acfd1134-4ea8-45c9-b019-ea32f3208f58.sql

-- =========================================================
-- LANDING PAGES
-- =========================================================
CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','arquivada')),
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  cor_primaria text,
  cor_texto text,
  logo_url text,
  hero_image_url text,
  meta_title text,
  meta_description text,
  meta_og_image text,
  executivo_id uuid,
  views_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX landing_pages_tenant_idx ON public.landing_pages (tenant_id);
CREATE INDEX landing_pages_status_idx ON public.landing_pages (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT SELECT ON public.landing_pages TO anon;
GRANT ALL ON public.landing_pages TO service_role;

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_pages tenant read"
  ON public.landing_pages FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "landing_pages tenant write"
  ON public.landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "landing_pages tenant update"
  ON public.landing_pages FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "landing_pages tenant delete"
  ON public.landing_pages FOR DELETE
  TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria')))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "landing_pages public read published"
  ON public.landing_pages FOR SELECT
  TO anon
  USING (status = 'publicada');

CREATE TRIGGER landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER landing_pages_set_tenant
  BEFORE INSERT ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- =========================================================
-- LANDING PAGE LEADS
-- =========================================================
CREATE TABLE public.landing_page_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  mensagem text,
  campos_extras jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  origem text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  converted_at timestamptz,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','contato','convertido','descartado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX landing_page_leads_tenant_idx ON public.landing_page_leads (tenant_id);
CREATE INDEX landing_page_leads_page_idx ON public.landing_page_leads (landing_page_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_leads TO authenticated;
GRANT INSERT ON public.landing_page_leads TO anon;
GRANT ALL ON public.landing_page_leads TO service_role;

ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_leads tenant read"
  ON public.landing_page_leads FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "landing_leads tenant update"
  ON public.landing_page_leads FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "landing_leads tenant delete"
  ON public.landing_page_leads FOR DELETE
  TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria')))
    OR public.is_super_admin(auth.uid())
  );

-- Anônimos podem inserir lead apenas se a landing estiver publicada
CREATE POLICY "landing_leads public insert"
  ON public.landing_page_leads FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.landing_pages lp
       WHERE lp.id = landing_page_id
         AND lp.status = 'publicada'
         AND lp.tenant_id = landing_page_leads.tenant_id
    )
  );

CREATE TRIGGER landing_page_leads_updated_at
  BEFORE UPDATE ON public.landing_page_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Contador atômico de views
-- =========================================================
CREATE OR REPLACE FUNCTION public.landing_page_increment_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.landing_pages
     SET views_count = views_count + 1
   WHERE slug = _slug AND status = 'publicada';
$$;

GRANT EXECUTE ON FUNCTION public.landing_page_increment_view(text) TO anon, authenticated;


-- Migration: 20260721173513_7f10fab6-43ce-426f-9530-4d70ac606f97.sql
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'modern';

-- Migration: 20260728170403_b486162b-6eee-4ea2-b534-9ea862a2e0c8.sql

-- 1. Remove blanket anon read on post-sale tables (public page uses the service-role server function)
DROP POLICY IF EXISTS "pos_vendas anon read by token" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_venda_anexos anon read" ON public.pos_venda_anexos;

-- 2. Scope proposta_anexos table reads to the proposal's tenant
DROP POLICY IF EXISTS "auth can view proposta anexos" ON public.proposta_anexos;
CREATE POLICY "view proposta anexos by proposta access"
ON public.proposta_anexos FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposta_anexos.proposta_id
      AND (p.tenant_id IS NULL OR p.tenant_id = current_tenant_id())
  )
);

-- 3. Security-definer helpers for storage policies
CREATE OR REPLACE FUNCTION public.can_access_storage_pi_anexo(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.pi_anexos a
    WHERE a.arquivo_path = _name
      AND (
        a.created_by = _uid
        OR (a.pi_id IS NOT NULL AND can_access_pi(a.pi_id, _uid))
        OR (a.cliente_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = a.cliente_id AND (c.executivo_id = _uid OR c.created_by = _uid)))
        OR (a.agencia_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agencias g WHERE g.id = a.agencia_id AND (g.executivo_id = _uid OR g.created_by = _uid)))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_material(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.materiais_apoio m
    WHERE m.arquivo_path = _name
      AND (m.created_by = _uid OR m.tenant_id IS NULL OR m.tenant_id = current_tenant_id())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_projeto(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.projetos_especiais p
    WHERE p.arquivo_url = _name
      AND (p.created_by = _uid OR p.responsavel_id = _uid OR p.tenant_id IS NULL OR p.tenant_id = current_tenant_id())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_proposta_anexo(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id::text = split_part(_name, '/', 1)
      AND (p.created_by = _uid OR p.executivo_id = _uid OR p.tenant_id IS NULL OR p.tenant_id = current_tenant_id())
  );
$$;

-- 4. Storage policies: pi-anexos
DROP POLICY IF EXISTS "pi-anexos read auth" ON storage.objects;
CREATE POLICY "pi-anexos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pi-anexos'
  AND (owner = auth.uid() OR public.can_access_storage_pi_anexo(name, auth.uid()))
);

-- 5. Storage policies: materiais-apoio
DROP POLICY IF EXISTS "auth read materiais-apoio files" ON storage.objects;
CREATE POLICY "materiais-apoio read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'materiais-apoio'
  AND (owner = auth.uid() OR public.can_access_storage_material(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth upload materiais-apoio files" ON storage.objects;
CREATE POLICY "materiais-apoio upload own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materiais-apoio'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 6. Storage policies: projetos-especiais
DROP POLICY IF EXISTS "auth read projetos files" ON storage.objects;
CREATE POLICY "projetos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR public.can_access_storage_projeto(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth update projetos files" ON storage.objects;
CREATE POLICY "projetos update scoped" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_projeto(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth delete projetos files" ON storage.objects;
CREATE POLICY "projetos delete scoped" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR is_admin(auth.uid()))
);

-- 7. Storage policies: proposta-anexos
DROP POLICY IF EXISTS "auth view proposta-anexos files" ON storage.objects;
CREATE POLICY "proposta-anexos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth update proposta-anexos files" ON storage.objects;
CREATE POLICY "proposta-anexos update scoped" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth delete proposta-anexos files" ON storage.objects;
CREATE POLICY "proposta-anexos delete scoped" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth upload proposta-anexos files" ON storage.objects;
CREATE POLICY "proposta-anexos upload scoped" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proposta-anexos'
  AND public.can_access_storage_proposta_anexo(name, auth.uid())
);


-- Migration: 20260728170444_4b1bbc1e-3cd5-4a71-935f-b711a6323927.sql

REVOKE ALL ON FUNCTION public.can_access_storage_pi_anexo(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_material(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_projeto(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_proposta_anexo(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_storage_pi_anexo(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_material(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_projeto(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_proposta_anexo(text, uuid) TO authenticated, service_role;


-- Migration: 20260817141141_ecf4ffbe-a554-4a9f-a44c-867837ba2a87.sql
-- migration for tenant-specific proposal models and isolated visibility
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS proposta_layout_padrao text DEFAULT 'padrao';

-- Ensure all public tables have proper RLS for multi-tenancy
DROP POLICY IF EXISTS "Usuario ve propostas do seu tenant" ON public.propostas;
CREATE POLICY "Usuario ve propostas do seu tenant" ON public.propostas
FOR SELECT TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuario gerencia propostas do seu tenant" ON public.propostas;
CREATE POLICY "Usuario gerencia propostas do seu tenant" ON public.propostas
FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Repeat for proposal_history (correct column name is proposal_id)
DROP POLICY IF EXISTS "Usuario ve historico do seu tenant" ON public.proposal_history;
CREATE POLICY "Usuario ve historico do seu tenant" ON public.proposal_history
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.propostas p
  WHERE p.id = proposal_history.proposal_id
  AND p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
));

GRANT SELECT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;


