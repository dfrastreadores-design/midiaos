-- ==============================================================================
-- MIDIA OS v2.6.0 — BOOTSTRAP DO SCHEMA-BASE PARA HOMOLOGAÇÃO / STAGING
-- Arquivo: supabase/bootstrap_staging_base.sql
-- Ambiente Autorizado: Exclusivo para Staging (wsologhmptielhhnbgob)
-- Descrição: Criação atômica, ordenada e idempotente de todas as estruturas fundamentais:
--            extensões, tipos enum consolidados, tabelas de autenticação, multi-tenancy,
--            perfis, RBAC, clientes, auditoria, funções auxiliares, triggers e RLS.
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSÕES POSTGRESQL NATIVAS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TIPOS ENUM CANÔNICOS (Com todos os valores consolidados v2.6.0)
-- ==============================================================================
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

-- ==============================================================================
-- 3. TABELA RAIZ MULTI-TENANT: public.tenants
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  contato_nome TEXT,
  contato_email TEXT,
  contato_whatsapp TEXT,
  plano TEXT NOT NULL DEFAULT 'essencial',
  ciclo TEXT NOT NULL DEFAULT 'mensal',
  valor_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  proximo_vencimento DATE,
  observacoes TEXT,
  max_usuarios INTEGER NOT NULL DEFAULT 5,
  mensagem_alerta TEXT,
  cor_primaria TEXT DEFAULT '#0f172a',
  cor_secundaria TEXT DEFAULT '#3b82f6',
  subdominio TEXT,
  dominio_proprio TEXT,
  prefixo_pi TEXT DEFAULT 'PI',
  prefixo_proposta TEXT DEFAULT 'PROP',
  is_demo BOOLEAN DEFAULT false,
  favicon_url TEXT,
  logo_url TEXT,
  produto_marca TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  site TEXT,
  redes_sociais TEXT,
  rodape_documentos TEXT,
  assinatura_padrao TEXT,
  dados_comerciais TEXT,
  dados_juridicos TEXT,
  modelos_proposta JSONB DEFAULT '[]'::jsonb,
  comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  limite_usuarios INTEGER DEFAULT 10,
  limite_clientes INTEGER DEFAULT 500,
  limite_parceiros INTEGER DEFAULT 100,
  limite_produtos INTEGER DEFAULT 1000,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed obrigatório do Tenant Padrão (TV Brasília) com UUID canônico fixo
INSERT INTO public.tenants (
  id, razao_social, nome_fantasia, plano, ciclo, valor_mensal, status, observacoes
) VALUES (
  'a711a129-330c-46bf-943a-531cedd4f2ff',
  'TV Brasília',
  'TV Brasília',
  'enterprise',
  'mensal',
  0,
  'ativo',
  'Tenant Principal / Homologação Midia OS'
)
ON CONFLICT (id) DO UPDATE SET
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia;

-- ==============================================================================
-- 4. TABELA DE PERFIS DE USUÁRIO: public.profiles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  whatsapp TEXT,
  cargo TEXT,
  role TEXT DEFAULT 'OPERATOR',
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_superadmin BOOLEAN DEFAULT false,
  cnpj TEXT,
  cnpj_vinculado TEXT,
  logo_url TEXT,
  assinatura_url TEXT,
  trial_ends_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- 5. CONTROLE DE ACESSO RBAC: user_roles, permissions, role_permissions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

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
  ('projetos.manage', 'Projetos Especiais', 'Gerenciar projetos especiais')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('admin', 'pi.create'), ('admin', 'pi.approve'), ('admin', 'pi.cancel'),
  ('admin', 'pi.view_all'), ('admin', 'clientes.manage'), ('admin', 'agencias.manage'),
  ('admin', 'financeiro.view'), ('admin', 'opec.programacao'), ('admin', 'users.manage'),
  ('admin', 'projetos.manage'),
  ('executivo', 'pi.create'), ('executivo', 'clientes.manage'), ('executivo', 'agencias.manage'),
  ('executivo', 'projetos.manage'),
  ('opec', 'opec.programacao'), ('opec', 'pi.view_all'),
  ('financeiro', 'financeiro.view'), ('financeiro', 'pi.view_all')
ON CONFLICT (role, permission_key) DO NOTHING;

-- ==============================================================================
-- 6. FUNÇÕES CANÔNICAS DE CONTEXTO, MULTI-TENANT E SEGURANÇA
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::public.app_role
  ) OR EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id AND lower(u.email) = 'rafaelrodrigo.as@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role) OR public.is_super_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.set_current_tenant_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF public.is_super_admin(auth.uid()) AND NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  v_tenant_id := public.current_tenant_id();
  IF v_tenant_id IS NOT NULL THEN
    NEW.tenant_id := v_tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger automático para novos cadastros do Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_default_tenant_id uuid := 'a711a129-330c-46bf-943a-531cedd4f2ff';
BEGIN
  INSERT INTO public.profiles (id, nome, email, tenant_id, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_default_tenant_id,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'executivo'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. TABELA DE AUDITORIA TRANSACIONAL: public.auditoria_alteracoes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.auditoria_alteracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tabela TEXT NOT NULL,
  registro_id TEXT,
  operacao TEXT NOT NULL,
  alteracoes JSONB,
  valor_anterior JSONB,
  valor_novo JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aud_alt_created ON public.auditoria_alteracoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aud_alt_user ON public.auditoria_alteracoes(user_id);
CREATE INDEX IF NOT EXISTS idx_aud_alt_tabela ON public.auditoria_alteracoes(tabela);

CREATE OR REPLACE FUNCTION public.log_alteracao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_record_id text;
  v_changes jsonb := '{}'::jsonb;
  v_old jsonb := null;
  v_new jsonb := null;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::text;
    v_old := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id::text;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_changes := (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(v_new)
      WHERE v_old -> key IS DISTINCT FROM value
    );
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id::text;
    v_new := to_jsonb(NEW);
  END IF;

  INSERT INTO public.auditoria_alteracoes(user_id, tabela, registro_id, operacao, alteracoes, valor_anterior, valor_novo)
  VALUES (v_user, TG_TABLE_NAME, v_record_id, TG_OP, v_changes, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 8. TABELAS DE NEGÓCIO ESSENCIAIS: agencias, clientes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.agencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
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

CREATE INDEX IF NOT EXISTS idx_agencias_tenant_id ON public.agencias(tenant_id);

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
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

CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id ON public.clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON public.clientes(cnpj);

-- ==============================================================================
-- 9. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_tenant" ON public.tenants;
CREATE POLICY "users_read_own_tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR id = public.current_tenant_id());

DROP POLICY IF EXISTS "super_admin_manage_tenants" ON public.tenants;
CREATE POLICY "super_admin_manage_tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_profiles_select" ON public.profiles;
CREATE POLICY "tenant_isolation_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR auth.uid() = id OR tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_profiles_update" ON public.profiles;
CREATE POLICY "tenant_isolation_profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR auth.uid() = id OR (tenant_id = public.current_tenant_id() AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR auth.uid() = id OR (tenant_id = public.current_tenant_id() AND public.is_admin(auth.uid())));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_user_roles" ON public.user_roles;
CREATE POLICY "read_user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_manage_user_roles" ON public.user_roles;
CREATE POLICY "admin_manage_user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_clientes_select" ON public.clientes;
CREATE POLICY "tenant_clientes_select" ON public.clientes
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "tenant_clientes_manage" ON public.clientes;
CREATE POLICY "tenant_clientes_manage" ON public.clientes
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_agencias_select" ON public.agencias;
CREATE POLICY "tenant_agencias_select" ON public.agencias
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "tenant_agencias_manage" ON public.agencias;
CREATE POLICY "tenant_agencias_manage" ON public.agencias
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

ALTER TABLE public.auditoria_alteracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read auditoria_alteracoes" ON public.auditoria_alteracoes;
CREATE POLICY "admins read auditoria_alteracoes" ON public.auditoria_alteracoes
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "no direct insert auditoria_alteracoes" ON public.auditoria_alteracoes;
CREATE POLICY "no direct insert auditoria_alteracoes" ON public.auditoria_alteracoes
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- ==============================================================================
-- 10. PERMISSÕES DE SCHEMA E RECARREGAMENTO DO POSTGREST
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

