-- ==============================================================================
-- 1. EXTENSÕES POSTGRESQL NATIVAS E TIPOS ENUM CONSOLIDADOS (MIDIA OS v2.6.0)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'executivo', 'opec', 'financeiro', 'diretoria', 'producao', 'parceiro_comercial', 'super_admin', 'teste'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pi_status AS ENUM (
    'rascunho', 'enviado', 'aprovado', 'faturado', 'cancelado', 'substituido',
    'aguardando_aprovacao', 'reprovado', 'aguardando_assinatura', 'assinado',
    'enviar_opec', 'veiculado', 'encerrado', 'finalizado'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.projeto_status AS ENUM ('em_comercializacao', 'vendido', 'encerrado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notificacao_tipo AS ENUM (
    'novo_pi', 'pi_anexado', 'campanha_finalizando', 'projeto_finalizando', 'outro',
    'campanha_iniciando', 'campanha_progresso', 'proposta_vencendo',
    'pi_aguardando_aprovacao', 'pi_aprovado', 'pi_reprovado', 'producao_solicitada', 'pi_renovado'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.proposta_status AS ENUM ('rascunho', 'enviada', 'aprovada', 'recusada', 'convertida');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.midia_tipo AS ENUM ('TV', 'Radio', 'DOOH');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.reuniao_status AS ENUM ('agendada', 'realizada', 'cancelada', 'remarcada');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.evento_origem AS ENUM ('reuniao', 'proposta', 'pi', 'google', 'manual');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_midia AS ENUM (
    'tv', 'radio', 'portal', 'ooh', 'dooh', 'influencer', 'redes_sociais', 'outros',
    'agencia_publicidade', 'produtora', 'grafica', 'estudio', 'assessoria_imprensa',
    'marketing_digital', 'evento', 'editora'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pessoa_tipo AS ENUM ('pj', 'cpf');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comissao_escopo AS ENUM ('global', 'fornecedor', 'cliente', 'campanha', 'tipo_midia');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comissao_status AS ENUM ('prevista', 'confirmada', 'paga', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- Schema Consolidado gerado em 2026-09-18T23:17:20.073Z

-- Migration: 20260518135618_231b5d03-f2ec-41b4-b479-b7a4d2ac6868.sql

-- =====================================================
-- ENUMS
-- =====================================================
-- [Consolidado no topo] CREATE TYPE
-- [Consolidado no topo] CREATE TYPE
-- [Consolidado no topo] CREATE TYPE
-- [Consolidado no topo] CREATE TYPE

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
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
CREATE TABLE IF NOT EXISTS public.user_roles (
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
CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.role_permissions (
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
CREATE TABLE IF NOT EXISTS public.agencias (
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

CREATE TABLE IF NOT EXISTS public.clientes (
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

CREATE TABLE IF NOT EXISTS public.pis (
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
DROP TRIGGER IF EXISTS trg_pis_numero ON public.pis;
CREATE TRIGGER trg_pis_numero BEFORE INSERT ON public.pis
FOR EACH ROW EXECUTE FUNCTION public.generate_pi_numero();

CREATE TABLE IF NOT EXISTS public.pi_itens (
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
CREATE TABLE IF NOT EXISTS public.pi_historico (
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
CREATE TABLE IF NOT EXISTS public.projetos_especiais (
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
CREATE TABLE IF NOT EXISTS public.notificacoes (
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_agencias_updated ON public.agencias;
CREATE TRIGGER trg_agencias_updated BEFORE UPDATE ON public.agencias
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_clientes_updated ON public.clientes;
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_pis_updated ON public.pis;
CREATE TRIGGER trg_pis_updated BEFORE UPDATE ON public.pis
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_projetos_updated ON public.projetos_especiais;
CREATE TRIGGER trg_projetos_updated BEFORE UPDATE ON public.projetos_especiais
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- profiles
DROP POLICY IF EXISTS "users see all profiles" ON public.profiles;
CREATE POLICY "users see all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "admins update any profile" ON public.profiles;
CREATE POLICY "admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "users see own roles" ON public.user_roles;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- permissions / role_permissions
DROP POLICY IF EXISTS "auth read permissions" ON public.permissions;
CREATE POLICY "auth read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth read role_perms" ON public.role_permissions;
CREATE POLICY "auth read role_perms" ON public.role_permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin manage role_perms" ON public.role_permissions;
CREATE POLICY "admin manage role_perms" ON public.role_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- agencias / clientes
DROP POLICY IF EXISTS "auth read agencias" ON public.agencias;
CREATE POLICY "auth read agencias" ON public.agencias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth write agencias" ON public.agencias;
CREATE POLICY "auth write agencias" ON public.agencias FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update agencias" ON public.agencias;
CREATE POLICY "auth update agencias" ON public.agencias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "admin delete agencias" ON public.agencias;
CREATE POLICY "admin delete agencias" ON public.agencias FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "auth read clientes" ON public.clientes;
CREATE POLICY "auth read clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth write clientes" ON public.clientes;
CREATE POLICY "auth write clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update clientes" ON public.clientes;
CREATE POLICY "auth update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "admin delete clientes" ON public.clientes;
CREATE POLICY "admin delete clientes" ON public.clientes FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- pis
DROP POLICY IF EXISTS "auth read pis" ON public.pis;
CREATE POLICY "auth read pis" ON public.pis FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert pis" ON public.pis;
CREATE POLICY "auth insert pis" ON public.pis FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update pis" ON public.pis;
CREATE POLICY "auth update pis" ON public.pis FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "admin delete pis" ON public.pis;
CREATE POLICY "admin delete pis" ON public.pis FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "auth read pi_itens" ON public.pi_itens;
CREATE POLICY "auth read pi_itens" ON public.pi_itens FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth write pi_itens" ON public.pi_itens;
CREATE POLICY "auth write pi_itens" ON public.pi_itens FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth read pi_historico" ON public.pi_historico;
CREATE POLICY "auth read pi_historico" ON public.pi_historico FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert pi_historico" ON public.pi_historico;
CREATE POLICY "auth insert pi_historico" ON public.pi_historico FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- projetos
DROP POLICY IF EXISTS "auth read projetos" ON public.projetos_especiais;
CREATE POLICY "auth read projetos" ON public.projetos_especiais FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth write projetos" ON public.projetos_especiais;
CREATE POLICY "auth write projetos" ON public.projetos_especiais FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- notificacoes
DROP POLICY IF EXISTS "users see own notif" ON public.notificacoes;
CREATE POLICY "users see own notif" ON public.notificacoes FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "users update own notif" ON public.notificacoes;
CREATE POLICY "users update own notif" ON public.notificacoes FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "auth insert notif" ON public.notificacoes;
CREATE POLICY "auth insert notif" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);


-- Migration: 20260520183213_d8a8f9be-0cef-4d23-ba54-096fff49de7d.sql
-- ENUMs (consolidado no topo)
-- [Consolidado no topo] CREATE TYPE public.proposta_status

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
DROP TRIGGER IF EXISTS trg_proposta_numero ON public.propostas;
CREATE TRIGGER trg_proposta_numero BEFORE INSERT ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.generate_proposta_numero();

DROP TRIGGER IF EXISTS trg_proposta_touch ON public.propostas;
DROP TRIGGER IF EXISTS trg_proposta_touch ON public.propostas;
CREATE TRIGGER trg_proposta_touch BEFORE UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read propostas" ON public.propostas;
CREATE POLICY "auth read propostas" ON public.propostas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert propostas" ON public.propostas;
CREATE POLICY "auth insert propostas" ON public.propostas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update propostas" ON public.propostas;
CREATE POLICY "auth update propostas" ON public.propostas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "admin delete propostas" ON public.propostas;
CREATE POLICY "admin delete propostas" ON public.propostas FOR DELETE TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "auth read proposta_itens" ON public.proposta_itens;
CREATE POLICY "auth read proposta_itens" ON public.proposta_itens FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth write proposta_itens" ON public.proposta_itens;
CREATE POLICY "auth write proposta_itens" ON public.proposta_itens FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Migration: 20260520235154_7b10d866-2451-4996-b976-1a971cb4a930.sql
-- ====== Produtos (TV / Rádio / DOOH) ======
-- [Consolidado no topo] CREATE TYPE public.midia_tipo

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

DROP POLICY IF EXISTS "auth read produtos" ON public.produtos;
CREATE POLICY "auth read produtos" ON public.produtos
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin insert produtos" ON public.produtos;
CREATE POLICY "admin insert produtos" ON public.produtos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin update produtos" ON public.produtos;
CREATE POLICY "admin update produtos" ON public.produtos
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin delete produtos" ON public.produtos;
CREATE POLICY "admin delete produtos" ON public.produtos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS produtos_touch ON public.produtos;
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

DROP POLICY IF EXISTS "auth read metas" ON public.metas_executivo;
CREATE POLICY "auth read metas" ON public.metas_executivo
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin insert metas" ON public.metas_executivo;
CREATE POLICY "admin insert metas" ON public.metas_executivo
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin update metas" ON public.metas_executivo;
CREATE POLICY "admin update metas" ON public.metas_executivo
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin delete metas" ON public.metas_executivo;
CREATE POLICY "admin delete metas" ON public.metas_executivo
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS metas_touch ON public.metas_executivo;
CREATE TRIGGER metas_touch BEFORE UPDATE ON public.metas_executivo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Migration: 20260521001948_1731cb1e-cd60-43ac-a71c-addfa0f4bb1f.sql

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read client logos" ON storage.objects;
DROP POLICY IF EXISTS "public read client logos" ON storage.objects;
CREATE POLICY "public read client logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth upload client logos" ON storage.objects;
CREATE POLICY "auth upload client logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth update client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth update client logos" ON storage.objects;
CREATE POLICY "auth update client logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "auth delete client logos" ON storage.objects;
DROP POLICY IF EXISTS "auth delete client logos" ON storage.objects;
CREATE POLICY "auth delete client logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos');


-- Migration: 20260521010822_81d547f3-2cc7-4169-9da4-57e1f1a36159.sql
-- Reativar triggers que geram numero automático em propostas e pis
DROP TRIGGER IF EXISTS trg_propostas_numero ON public.propostas;
DROP TRIGGER IF EXISTS trg_propostas_numero ON public.propostas;
CREATE TRIGGER trg_propostas_numero
BEFORE INSERT ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.generate_proposta_numero();

DROP TRIGGER IF EXISTS trg_pis_numero ON public.pis;
DROP TRIGGER IF EXISTS trg_pis_numero ON public.pis;
CREATE TRIGGER trg_pis_numero
BEFORE INSERT ON public.pis
FOR EACH ROW EXECUTE FUNCTION public.generate_pi_numero();

-- Garantir touch_updated_at em tabelas principais
DROP TRIGGER IF EXISTS trg_propostas_updated ON public.propostas;
DROP TRIGGER IF EXISTS trg_propostas_updated ON public.propostas;
CREATE TRIGGER trg_propostas_updated
BEFORE UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_pis_updated ON public.pis;
DROP TRIGGER IF EXISTS trg_pis_updated ON public.pis;
CREATE TRIGGER trg_pis_updated
BEFORE UPDATE ON public.pis
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Migration: 20260521014419_a8680959-d7c9-4b5a-baea-9239bb47e571.sql

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE

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

DROP POLICY IF EXISTS "auth read notif_config" ON public.notificacao_config;
CREATE POLICY "auth read notif_config" ON public.notificacao_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin update notif_config" ON public.notificacao_config;
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

DROP POLICY IF EXISTS "auth read projetos files" ON storage.objects;
CREATE POLICY "auth read projetos files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'projetos-especiais');

DROP POLICY IF EXISTS "auth upload projetos files" ON storage.objects;
CREATE POLICY "auth upload projetos files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'projetos-especiais');

DROP POLICY IF EXISTS "auth update projetos files" ON storage.objects;
CREATE POLICY "auth update projetos files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'projetos-especiais');

DROP POLICY IF EXISTS "auth delete projetos files" ON storage.objects;
CREATE POLICY "auth delete projetos files" ON storage.objects FOR DELETE TO authenticated
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
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
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

DROP POLICY IF EXISTS "users see own google tokens" ON public.google_calendar_tokens;
CREATE POLICY "users see own google tokens" ON public.google_calendar_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "users insert own google tokens" ON public.google_calendar_tokens;
CREATE POLICY "users insert own google tokens" ON public.google_calendar_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "users update own google tokens" ON public.google_calendar_tokens;
CREATE POLICY "users update own google tokens" ON public.google_calendar_tokens
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "users delete own google tokens" ON public.google_calendar_tokens;
CREATE POLICY "users delete own google tokens" ON public.google_calendar_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_google_tokens_updated ON public.google_calendar_tokens;
CREATE TRIGGER trg_google_tokens_updated
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Reuniões do CRM
-- [Consolidado no topo] CREATE TYPE

CREATE TABLE IF NOT EXISTS public.reunioes (
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

CREATE INDEX IF NOT EXISTS idx_reunioes_data ON public.reunioes(data_inicio);
CREATE INDEX IF NOT EXISTS idx_reunioes_cliente ON public.reunioes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reunioes_executivo ON public.reunioes(executivo_id);

ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read reunioes" ON public.reunioes;
CREATE POLICY "auth read reunioes" ON public.reunioes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert reunioes" ON public.reunioes;
CREATE POLICY "auth insert reunioes" ON public.reunioes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "auth update reunioes" ON public.reunioes;
CREATE POLICY "auth update reunioes" ON public.reunioes FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "admin delete reunioes" ON public.reunioes;
CREATE POLICY "admin delete reunioes" ON public.reunioes FOR DELETE TO authenticated USING (is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_reunioes_updated ON public.reunioes;
CREATE TRIGGER trg_reunioes_updated
  BEFORE UPDATE ON public.reunioes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Eventos do calendário (unificados)
-- [Consolidado no topo] CREATE TYPE

CREATE TABLE IF NOT EXISTS public.eventos_calendario (
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

CREATE INDEX IF NOT EXISTS idx_eventos_user ON public.eventos_calendario(user_id);
CREATE INDEX IF NOT EXISTS idx_eventos_inicio ON public.eventos_calendario(inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_origem ON public.eventos_calendario(origem, origem_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eventos_google ON public.eventos_calendario(user_id, google_event_id) WHERE google_event_id IS NOT NULL;

ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own eventos" ON public.eventos_calendario;
CREATE POLICY "users see own eventos" ON public.eventos_calendario
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "users insert own eventos" ON public.eventos_calendario;
CREATE POLICY "users insert own eventos" ON public.eventos_calendario
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "users update own eventos" ON public.eventos_calendario;
CREATE POLICY "users update own eventos" ON public.eventos_calendario
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "users delete own eventos" ON public.eventos_calendario;
CREATE POLICY "users delete own eventos" ON public.eventos_calendario
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_eventos_updated ON public.eventos_calendario;
CREATE TRIGGER trg_eventos_updated
  BEFORE UPDATE ON public.eventos_calendario
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- Migration: 20260525033138_49b69aea-5d13-4bfd-a7d1-b6992774f984.sql

-- Fix notificacoes INSERT policy
DROP POLICY IF EXISTS "auth insert notif" ON public.notificacoes;
DROP POLICY IF EXISTS "users or admins insert notif" ON public.notificacoes;
CREATE POLICY "users or admins insert notif" ON public.notificacoes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Fix metas_executivo SELECT policy
DROP POLICY IF EXISTS "auth read metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "own or admin read metas" ON public.metas_executivo;
CREATE POLICY "own or admin read metas" ON public.metas_executivo
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
CREATE TABLE IF NOT EXISTS public.midia_config (
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

DROP POLICY IF EXISTS "auth read midia_config" ON public.midia_config;
CREATE POLICY "auth read midia_config" ON public.midia_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin upsert midia_config" ON public.midia_config;
CREATE POLICY "admin upsert midia_config" ON public.midia_config FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin update midia_config" ON public.midia_config;
CREATE POLICY "admin update midia_config" ON public.midia_config FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.midia_config (midia) VALUES ('TV'), ('Radio'), ('DOOH') ON CONFLICT DO NOTHING;
DROP TRIGGER IF EXISTS touch_midia_config ON public.midia_config;
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

-- Estende enum pi_status (idempotente - já consolidado no topo)
-- [Consolidado no topo] ALTER TYPE public.pi_status ADD VALUE 'aguardando_aprovacao'
-- [Consolidado no topo] ALTER TYPE public.pi_status ADD VALUE 'reprovado'

-- Colunas de aprovação no PI
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS motivo_reprovacao text,
  ADD COLUMN IF NOT EXISTS enviado_aprovacao_em timestamp with time zone;

-- Estende enum de tipos de notificação (idempotente - já consolidado no topo)
-- [Consolidado no topo] ALTER TYPE public.notificacao_tipo ADD VALUE 'pi_aguardando_aprovacao'
-- [Consolidado no topo] ALTER TYPE public.notificacao_tipo ADD VALUE 'pi_aprovado'
-- [Consolidado no topo] ALTER TYPE public.notificacao_tipo ADD VALUE 'pi_reprovado'


-- Migration: 20260527040217_2113b7ac-8e86-4d6d-96f6-22ce116eab15.sql

-- 1) RLS mais restritas em UPDATE
DROP POLICY IF EXISTS "auth update pis" ON public.pis;
DROP POLICY IF EXISTS "owner or admin update pis" ON public.pis;
CREATE POLICY "owner or admin update pis" ON public.pis FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update propostas" ON public.propostas;
DROP POLICY IF EXISTS "owner or admin update propostas" ON public.propostas;
CREATE POLICY "owner or admin update propostas" ON public.propostas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update clientes" ON public.clientes;
DROP POLICY IF EXISTS "owner or admin update clientes" ON public.clientes;
CREATE POLICY "owner or admin update clientes" ON public.clientes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update agencias" ON public.agencias;
DROP POLICY IF EXISTS "owner or admin update agencias" ON public.agencias;
CREATE POLICY "owner or admin update agencias" ON public.agencias FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "auth update reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin update reunioes" ON public.reunioes;
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

DROP POLICY IF EXISTS "auth read client logos" ON storage.objects;
CREATE POLICY "auth read client logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-logos');
DROP POLICY IF EXISTS "exec admin upload client logos" ON storage.objects;
CREATE POLICY "exec admin upload client logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'executivo')));
DROP POLICY IF EXISTS "exec admin update client logos" ON storage.objects;
CREATE POLICY "exec admin update client logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-logos' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'executivo')));
DROP POLICY IF EXISTS "admin delete client logos" ON storage.objects;
CREATE POLICY "admin delete client logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos' AND public.is_admin(auth.uid()));


-- Migration: 20260527040236_d2636f35-12af-432c-97fa-65d7a88a4929.sql

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_pi_numero() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_proposta_numero() FROM PUBLIC, anon, authenticated;


-- Migration: 20260527041131_b2043c95-34db-4f52-b264-9e06a2a8e040.sql

CREATE TABLE IF NOT EXISTS public.auditoria_acessos (
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

DROP POLICY IF EXISTS "admins read auditoria" ON public.auditoria_acessos;
CREATE POLICY "admins read auditoria" ON public.auditoria_acessos
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_auditoria_acessos_created_at ON public.auditoria_acessos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_acessos_target ON public.auditoria_acessos (target_user_id);


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
DROP POLICY IF EXISTS "users subscribe own notif channel" ON realtime.messages;
CREATE POLICY "users subscribe own notif channel" ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notif-' || auth.uid()::text
);

-- Block broadcasts from clients on these channels (server-side only via service role)
DROP POLICY IF EXISTS "no client writes on notif channels" ON realtime.messages;
DROP POLICY IF EXISTS "no client writes on notif channels" ON realtime.messages;
CREATE POLICY "no client writes on notif channels" ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (false);

-- ============ 2) pi_itens: scope UPDATE/DELETE to owners of parent PI ============
DROP POLICY IF EXISTS "auth write pi_itens" ON public.pi_itens;

DROP POLICY IF EXISTS "auth insert pi_itens" ON public.pi_itens;
CREATE POLICY "auth insert pi_itens" ON public.pi_itens FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "owner update pi_itens" ON public.pi_itens;
CREATE POLICY "owner update pi_itens" ON public.pi_itens FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "owner delete pi_itens" ON public.pi_itens;
CREATE POLICY "owner delete pi_itens" ON public.pi_itens FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  )
);

-- ============ 3) proposta_itens: scope UPDATE/DELETE to owners of parent proposta ============
DROP POLICY IF EXISTS "auth write proposta_itens" ON public.proposta_itens;

DROP POLICY IF EXISTS "auth insert proposta_itens" ON public.proposta_itens;
CREATE POLICY "auth insert proposta_itens" ON public.proposta_itens FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "owner update proposta_itens" ON public.proposta_itens;
CREATE POLICY "owner update proposta_itens" ON public.proposta_itens FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "owner delete proposta_itens" ON public.proposta_itens;
CREATE POLICY "owner delete proposta_itens" ON public.proposta_itens FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  )
);

-- ============ 4) projetos_especiais: split ALL into INSERT/UPDATE/DELETE ============
DROP POLICY IF EXISTS "auth write projetos" ON public.projetos_especiais;

DROP POLICY IF EXISTS "auth insert projetos" ON public.projetos_especiais;
CREATE POLICY "auth insert projetos" ON public.projetos_especiais FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "owner or admin update projetos" ON public.projetos_especiais;
CREATE POLICY "owner or admin update projetos" ON public.projetos_especiais FOR UPDATE TO authenticated
USING (
  is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid()
)
WITH CHECK (
  is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "admin delete projetos" ON public.projetos_especiais;
CREATE POLICY "admin delete projetos" ON public.projetos_especiais FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- ============ 5) reunioes: allow owner DELETE ============
DROP POLICY IF EXISTS "admin delete reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin delete reunioes" ON public.reunioes;
CREATE POLICY "owner or admin delete reunioes" ON public.reunioes FOR DELETE TO authenticated
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


-- Migration: 20260527140519_7a79c18d-abf3-41f4-abbf-a8b7dacb8a95.sql

-- Restringir leitura por proprietário (executivo/created_by) com admin vendo tudo

-- CLIENTES
DROP POLICY IF EXISTS "auth read clientes" ON public.clientes;
DROP POLICY IF EXISTS "owner or admin read clientes" ON public.clientes;
CREATE POLICY "owner or admin read clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- AGENCIAS
DROP POLICY IF EXISTS "auth read agencias" ON public.agencias;
DROP POLICY IF EXISTS "owner or admin read agencias" ON public.agencias;
CREATE POLICY "owner or admin read agencias" ON public.agencias
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PIS
DROP POLICY IF EXISTS "auth read pis" ON public.pis;
DROP POLICY IF EXISTS "owner or admin read pis" ON public.pis;
CREATE POLICY "owner or admin read pis" ON public.pis
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PI_ITENS (via PI pai)
DROP POLICY IF EXISTS "auth read pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "owner or admin read pi_itens" ON public.pi_itens;
CREATE POLICY "owner or admin read pi_itens" ON public.pi_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = pi_itens.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  ));

-- PI_HISTORICO (via PI pai)
DROP POLICY IF EXISTS "auth read pi_historico" ON public.pi_historico;
DROP POLICY IF EXISTS "owner or admin read pi_historico" ON public.pi_historico;
CREATE POLICY "owner or admin read pi_historico" ON public.pi_historico
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = pi_historico.pi_id
      AND (is_admin(auth.uid()) OR p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  ));

-- PROPOSTAS
DROP POLICY IF EXISTS "auth read propostas" ON public.propostas;
DROP POLICY IF EXISTS "owner or admin read propostas" ON public.propostas;
CREATE POLICY "owner or admin read propostas" ON public.propostas
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PROPOSTA_ITENS (via proposta pai)
DROP POLICY IF EXISTS "auth read proposta_itens" ON public.proposta_itens;
DROP POLICY IF EXISTS "owner or admin read proposta_itens" ON public.proposta_itens;
CREATE POLICY "owner or admin read proposta_itens" ON public.proposta_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.propostas pr
    WHERE pr.id = proposta_itens.proposta_id
      AND (is_admin(auth.uid()) OR pr.executivo_id = auth.uid() OR pr.created_by = auth.uid())
  ));

-- REUNIOES
DROP POLICY IF EXISTS "auth read reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin read reunioes" ON public.reunioes;
CREATE POLICY "owner or admin read reunioes" ON public.reunioes
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid());

-- PROJETOS ESPECIAIS
DROP POLICY IF EXISTS "auth read projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "owner or admin read projetos" ON public.projetos_especiais;
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

DROP POLICY IF EXISTS "admins read auditoria_alteracoes" ON public.auditoria_alteracoes;
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

CREATE TABLE IF NOT EXISTS public.materiais_apoio (
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

DROP POLICY IF EXISTS "auth read materiais_apoio" ON public.materiais_apoio;
CREATE POLICY "auth read materiais_apoio" ON public.materiais_apoio
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth insert materiais_apoio" ON public.materiais_apoio;
CREATE POLICY "auth insert materiais_apoio" ON public.materiais_apoio
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "owner or admin update materiais_apoio" ON public.materiais_apoio;
CREATE POLICY "owner or admin update materiais_apoio" ON public.materiais_apoio
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "owner or admin delete materiais_apoio" ON public.materiais_apoio;
CREATE POLICY "owner or admin delete materiais_apoio" ON public.materiais_apoio
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid());
DROP TRIGGER IF EXISTS trg_materiais_apoio_updated_at ON public.materiais_apoio;
CREATE TRIGGER trg_materiais_apoio_updated_at
  BEFORE UPDATE ON public.materiais_apoio
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- audit trigger consistent with other tables
DROP TRIGGER IF EXISTS trg_materiais_apoio_audit ON public.materiais_apoio;
CREATE TRIGGER trg_materiais_apoio_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.materiais_apoio
  FOR EACH ROW EXECUTE FUNCTION public.log_alteracao();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('materiais-apoio', 'materiais-apoio', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth read materiais-apoio files" ON storage.objects;
CREATE POLICY "auth read materiais-apoio files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'materiais-apoio');

DROP POLICY IF EXISTS "auth upload materiais-apoio files" ON storage.objects;
CREATE POLICY "auth upload materiais-apoio files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materiais-apoio');

DROP POLICY IF EXISTS "owner or admin update materiais-apoio files" ON storage.objects;
CREATE POLICY "owner or admin update materiais-apoio files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materiais-apoio' AND (owner = auth.uid() OR is_admin(auth.uid())));

DROP POLICY IF EXISTS "owner or admin delete materiais-apoio files" ON storage.objects;
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


