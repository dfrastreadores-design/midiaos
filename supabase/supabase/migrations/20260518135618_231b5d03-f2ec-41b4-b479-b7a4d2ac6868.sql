
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
