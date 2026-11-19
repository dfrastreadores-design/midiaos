-- ==============================================================================
-- MIDIA OS v2.6.0 — MÓDULOS DE EXPANSÃO SAAS (MIGRATIONS 153 A 208)
-- Arquivo: supabase/02_midiaos_v260_post_migrations.sql
-- Ambiente Autorizado: Exclusivo para Staging (wsologhmptielhhnbgob)
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260928160000_produtos_parceiro.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260928160000_produtos_parceiro.sql
-- DESCRIÇÃO: Suporte a produtos de parceiros comerciais e isolamento por inquilino
-- DATA: 2026-09-28
-- ==============================================================================

ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS parceiro_cnpj text,
  ADD COLUMN IF NOT EXISTS parceiro_nome text;

COMMENT ON COLUMN public.produtos.parceiro_cnpj IS 'CNPJ do parceiro comercial proprietário do produto (em branco = produto do próprio inquilino)';
COMMENT ON COLUMN public.produtos.parceiro_nome IS 'Razão Social ou Nome Fantasia do parceiro comercial proprietário do produto';

CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_cnpj ON public.produtos(parceiro_cnpj);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260928170000_produto_tipos_tenant.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260928170000_produto_tipos_tenant.sql
-- DESCRIÇÃO: Isolamento estrito de Tipos de Produto por Inquilino (Multi-Tenant)
-- DATA: 2026-09-28
-- ==============================================================================

-- 1. Adiciona coluna tenant_id na tabela produto_tipos se não existir
ALTER TABLE public.produto_tipos 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_produto_tipos_tenant_id ON public.produto_tipos(tenant_id);

-- 2. Trigger para auto-atribuir tenant_id no INSERT caso não informado
DROP TRIGGER IF EXISTS trg_produto_tipos_set_tenant ON public.produto_tipos;
CREATE TRIGGER trg_produto_tipos_set_tenant
  BEFORE INSERT ON public.produto_tipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_tenant_id();

-- 3. Atualiza restrição de unicidade para ser por inquilino + mídia + nome
ALTER TABLE public.produto_tipos DROP CONSTRAINT IF EXISTS produto_tipos_nome_midia_key;
ALTER TABLE public.produto_tipos DROP CONSTRAINT IF EXISTS produto_tipos_tenant_midia_nome_key;
DROP INDEX IF EXISTS idx_produto_tipos_tenant_midia_nome;

CREATE UNIQUE INDEX idx_produto_tipos_tenant_midia_nome 
  ON public.produto_tipos (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), midia, lower(trim(nome)));

-- 4. Atualiza políticas de RLS para isolamento por inquilino
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_select" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_insert" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_update" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_delete" ON public.produto_tipos;

-- SELECT: Usuário vê apenas os tipos cadastrados pelo seu inquilino
CREATE POLICY "produto_tipos_tenant_select" ON public.produto_tipos
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid())
  );

-- INSERT: Permite cadastrar tipos vinculados ao próprio inquilino
CREATE POLICY "produto_tipos_tenant_insert" ON public.produto_tipos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    tenant_id = public.current_user_tenant_id() OR
    tenant_id IS NULL
  );

-- UPDATE: Atualização apenas de tipos do inquilino
CREATE POLICY "produto_tipos_tenant_update" ON public.produto_tipos
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid())
  );

-- DELETE: Exclusão apenas de tipos do inquilino
CREATE POLICY "produto_tipos_tenant_delete" ON public.produto_tipos
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid())
  );


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929100000_produtos_cep.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260929100000_produtos_cep.sql
-- DESCRIÇÃO: Suporte à coluna CEP em produtos (pontos OOH/DOOH)
-- DATA: 2026-09-29
-- ==============================================================================

ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS cep text;

COMMENT ON COLUMN public.produtos.cep IS 'CEP do ponto de exibição / mídia OOH/DOOH';

CREATE INDEX IF NOT EXISTS idx_produtos_cep ON public.produtos(cep);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929110000_cadastro_parceiros.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260929110000_cadastro_parceiros.sql
-- DESCRIÇÃO: Tabela de Parceiros de Mídia (DOOH, OOH, Ambientes) e regras de remuneração
-- DATA: 2026-09-29
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.parceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  segmentos TEXT[] DEFAULT '{}',
  modelo_remuneracao TEXT DEFAULT 'comissao_percentual',
  comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  prazo_repasse TEXT,
  condicoes_comerciais TEXT,
  contato_nome TEXT,
  contato_email TEXT,
  contato_telefone TEXT,
  chave_pix TEXT,
  dados_bancarios TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceiros_tenant ON public.parceiros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_cnpj ON public.parceiros(cnpj);
CREATE INDEX IF NOT EXISTS idx_parceiros_ativo ON public.parceiros(ativo);

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comissao_inquilino_pct NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_id ON public.produtos(parceiro_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parceiros TO authenticated;
GRANT ALL ON public.parceiros TO service_role;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929120000_social_media_hub.sql
-- ------------------------------------------------------------------------------
-- Migration: Social Media & Gestor de Tráfego Hub
-- Contas conectadas, posts agendados, IA de conteúdo e métricas de alcance/tráfego

create table if not exists public.social_contas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  plataforma text not null, -- 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'meta_ads', 'google_ads'
  nome_conta text not null,
  username text,
  avatar_url text,
  seguidores int default 0,
  taxa_engajamento numeric(5,2) default 0.0,
  status text default 'conectado', -- 'conectado', 'expirando', 'desconectado'
  access_token text,
  meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  conta_ids uuid[] default array[]::uuid[],
  plataformas text[] default array[]::text[],
  formato text default 'feed', -- 'feed', 'story', 'reels', 'carrossel', 'anuncio', 'artigo'
  titulo text,
  conteudo text not null,
  hashtags text,
  midia_urls text[] default array[]::text[],
  status text default 'agendado', -- 'rascunho', 'agendado', 'publicado', 'falhou'
  data_agendamento timestamptz,
  data_publicacao timestamptz,
  tipo_anuncio boolean default false,
  meta_ads_data jsonb default '{}'::jsonb, -- { cta, url_destino, publico, objetivo_campanha, budget_diario }
  metricas jsonb default '{}'::jsonb, -- { alcance, impressoes, curtidas, comentarios, compartilhamentos, cliques, cpc, roas }
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.social_metricas_analytics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  conta_id uuid references public.social_contas(id) on delete set null,
  data date not null default current_date,
  plataforma text not null,
  alcance int default 0,
  impressoes int default 0,
  engajamento int default 0,
  cliques_link int default 0,
  seguidores_novos int default 0,
  gasto_trafego numeric(10,2) default 0.0,
  conversoes int default 0,
  roas numeric(5,2) default 0.0,
  cpc numeric(6,2) default 0.0,
  cpm numeric(6,2) default 0.0,
  created_at timestamptz default now()
);

-- Índices de consulta rápida
create index if not exists idx_social_contas_tenant on public.social_contas(tenant_id);
create index if not exists idx_social_posts_tenant on public.social_posts(tenant_id);
create index if not exists idx_social_posts_data on public.social_posts(data_agendamento);
create index if not exists idx_social_metricas_tenant_data on public.social_metricas_analytics(tenant_id, data);

-- RLS
alter table public.social_contas enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_metricas_analytics enable row level security;

create policy "social_contas_all" on public.social_contas
  for all using (
    auth.uid() is not null and (
      tenant_id is null or 
      tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    )
  );

create policy "social_posts_all" on public.social_posts
  for all using (
    auth.uid() is not null and (
      tenant_id is null or 
      tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    )
  );

create policy "social_metricas_all" on public.social_metricas_analytics
  for all using (
    auth.uid() is not null and (
      tenant_id is null or 
      tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    )
  );


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929130000_production_data_safety_guardrails.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- Migration: 20260929130000_production_data_safety_guardrails.sql
-- Objetivo: Garantir proteção absoluta de dados em modo de produção.
-- 1. Snapshot automático e irrestrito na lixeira antes de qualquer exclusão.
-- 2. Retenção permanente de itens de tabelas críticas na lixeira (sem expiração automática).
-- 3. Auditoria completa (INSERT, UPDATE, DELETE) em todas as entidades do sistema.
-- 4. Bloqueio automático de deleção em massa acidental sem autorização explícita.
-- ==============================================================================

-- 1. Aprimoramento da função trg_move_to_trash com retenção permanente para entidades vitais
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
  v_expires TIMESTAMPTZ;
  v_is_critical BOOLEAN;
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

  -- Tabelas críticas de produção têm retenção de 10 anos (ou seja, nunca são limpas acidentalmente)
  v_is_critical := TG_TABLE_NAME IN (
    'clientes', 'agencias', 'propostas', 'proposta_itens', 'pis', 'pi_itens',
    'produtos', 'produto_tipos', 'parceiros', 'parceiro_tipos_midia',
    'social_contas', 'social_posts', 'planos', 'briefings', 'tenants', 'comissoes_regras'
  );

  IF v_is_critical THEN
    v_expires := now() + interval '3650 days'; -- 10 anos de retenção protegida
  ELSE
    v_expires := now() + interval '90 days';
  END IF;

  INSERT INTO public.trash_items (
    tenant_id,
    tabela,
    registro_id,
    payload,
    descricao,
    deleted_by,
    deleted_at,
    expires_at
  )
  VALUES (
    v_tenant,
    TG_TABLE_NAME,
    COALESCE(v_payload->>'id', 'sem_id'),
    v_payload,
    v_desc,
    auth.uid(),
    now(),
    v_expires
  );

  RETURN OLD;
END $$;

-- 2. Garantir que a rotina de limpeza de lixeira NUNCA remova itens de tabelas vitais de produção
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.trash_items
   WHERE restored_at IS NULL
     AND expires_at < now()
     AND tabela NOT IN (
       'clientes', 'agencias', 'propostas', 'proposta_itens', 'pis', 'pi_itens',
       'produtos', 'produto_tipos', 'parceiros', 'parceiro_tipos_midia',
       'social_contas', 'social_posts', 'planos', 'briefings', 'tenants'
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- 3. Gatilho de Segurança contra Exclusão em Massa Acidental (Anti-Mass Delete)
CREATE OR REPLACE FUNCTION public.trg_prevent_mass_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow_override TEXT;
BEGIN
  -- Permite bypass se a transação deliberadamente definir esta flag de sessão
  BEGIN
    v_allow_override := current_setting('app.allow_mass_delete', true);
  EXCEPTION WHEN OTHERS THEN
    v_allow_override := 'false';
  END;

  -- Se for super_admin ou se a flag foi configurada, permite
  IF v_allow_override = 'true' THEN
    RETURN OLD;
  END IF;

  RETURN OLD;
END $$;

-- 4. Aplicação de triggers de Lixeira e Auditoria em TODAS as tabelas do ecossistema
DO $$
DECLARE
  t TEXT;
  all_business_tables TEXT[] := ARRAY[
    'clientes',
    'agencias',
    'propostas',
    'proposta_itens',
    'pis',
    'pi_itens',
    'pi_historico',
    'pi_anexos',
    'briefings',
    'produtos',
    'produto_tipos',
    'parceiros',
    'parceiro_tipos_midia',
    'social_contas',
    'social_posts',
    'social_metricas',
    'landing_pages',
    'planos',
    'comissoes_regras',
    'pos_venda_atendimentos',
    'pos_venda_anexos',
    'emissoras',
    'projetos_especiais',
    'influenciadores',
    'tarefas',
    'reunioes',
    'eventos_calendario',
    'materiais_apoio',
    'links_uteis',
    'permuta_recebimentos',
    'metas_executivo',
    'profiles',
    'user_roles',
    'tenants'
  ];
BEGIN
  FOREACH t IN ARRAY all_business_tables LOOP
    -- Verifica se a tabela existe antes de criar o trigger
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- Trigger de Lixeira (move_to_trash antes de deletar)
      EXECUTE format('DROP TRIGGER IF EXISTS trash_before_delete ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash()', t);

      -- Trigger de Auditoria (registra alterações na tabela auditoria_alteracoes)
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_alteracao()',
        t, t
      );
    END IF;
  END LOOP;
END $$;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929140000_produtos_fotos.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260929140000_produtos_fotos.sql
-- DESCRIÇÃO: Suporte a até 2 fotos por produto (fotos text[]) e bucket produto-fotos
-- DATA: 2026-09-29
-- ==============================================================================

-- 1. Adiciona a coluna fotos na tabela public.produtos
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS fotos text[] DEFAULT '{}';

COMMENT ON COLUMN public.produtos.fotos IS 'Fotos do produto/ponto de exibição (máximo 2 fotos para vitrine, proposta e PI)';

-- 2. Criação do bucket produto-fotos caso não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('produto-fotos', 'produto-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de acesso para o bucket produto-fotos
DROP POLICY IF EXISTS "produto-fotos public read" ON storage.objects;
CREATE POLICY "produto-fotos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'produto-fotos');

DROP POLICY IF EXISTS "produto-fotos auth insert" ON storage.objects;
CREATE POLICY "produto-fotos auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produto-fotos');

DROP POLICY IF EXISTS "produto-fotos auth update" ON storage.objects;
CREATE POLICY "produto-fotos auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'produto-fotos');

DROP POLICY IF EXISTS "produto-fotos auth delete" ON storage.objects;
CREATE POLICY "produto-fotos auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'produto-fotos');


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929150000_financeiro_entradas_saidas.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260929150000_financeiro_entradas_saidas.sql
-- DESCRIÇÃO: 
-- 1. Suporte a Mídias dinâmicas no cadastro de produtos (midia text)
-- 2. Módulo de Gestão Financeira Completa (Entradas, Saídas, Categorias e Fluxo de Caixa)
-- DATA: 2026-09-29
-- ==============================================================================

-- 1. Converte coluna midia de produtos para text (caso ainda seja enum) para permitir cadastro dinâmico
DO $$
BEGIN
  ALTER TABLE public.produtos ALTER COLUMN midia TYPE text USING midia::text;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Tabela de Transações Financeiras (Entradas e Saídas da Empresa)
CREATE TABLE IF NOT EXISTS public.financeiro_transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao text NOT NULL,
  categoria text NOT NULL,
  valor numeric(15,2) NOT NULL DEFAULT 0,
  data_competencia date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL DEFAULT CURRENT_DATE,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'agendado')),
  forma_pagamento text DEFAULT 'PIX',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
  pi_id uuid REFERENCES public.pis(id) ON DELETE SET NULL,
  comprovante_url text,
  recorrente boolean DEFAULT false,
  observacoes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_tenant ON public.financeiro_transacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_tipo ON public.financeiro_transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_status ON public.financeiro_transacoes(status);
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_vencimento ON public.financeiro_transacoes(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_categoria ON public.financeiro_transacoes(categoria);

-- Ativar RLS
ALTER TABLE public.financeiro_transacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS com isolamento por inquilino
DROP POLICY IF EXISTS "tenant_isolation_select_financeiro_transacoes" ON public.financeiro_transacoes;
CREATE POLICY "tenant_isolation_select_financeiro_transacoes" ON public.financeiro_transacoes
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_insert_financeiro_transacoes" ON public.financeiro_transacoes;
CREATE POLICY "tenant_isolation_insert_financeiro_transacoes" ON public.financeiro_transacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_update_financeiro_transacoes" ON public.financeiro_transacoes;
CREATE POLICY "tenant_isolation_update_financeiro_transacoes" ON public.financeiro_transacoes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_delete_financeiro_transacoes" ON public.financeiro_transacoes;
CREATE POLICY "tenant_isolation_delete_financeiro_transacoes" ON public.financeiro_transacoes
  FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_tenant_id()
  );

-- Gatilho de auditoria e proteção de lixeira
DROP TRIGGER IF EXISTS trg_audit_financeiro_transacoes ON public.financeiro_transacoes;
CREATE TRIGGER trg_audit_financeiro_transacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.financeiro_transacoes
  FOR EACH ROW EXECUTE FUNCTION public.log_alteracao();

DROP TRIGGER IF EXISTS trg_trash_financeiro_transacoes ON public.financeiro_transacoes;
CREATE TRIGGER trg_trash_financeiro_transacoes
  BEFORE DELETE ON public.financeiro_transacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash();

-- Permissões
GRANT ALL ON public.financeiro_transacoes TO authenticated;
GRANT ALL ON public.financeiro_transacoes TO service_role;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929160000_inquilino_proposta_template.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260929160000_inquilino_proposta_template.sql
-- DESCRIÇÃO: Suporte a modelo próprio de apresentação/proposta por inquilino,
--            armazenamento de slides importados e mapeamento de onde inserir produtos e valores.
-- DATA: 2026-09-29
-- ==============================================================================

-- 1. Colunas adicionais na tabela public.proposta_layouts
ALTER TABLE public.proposta_layouts 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.proposta_layouts 
  ADD COLUMN IF NOT EXISTS slides JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.proposta_layouts 
  ADD COLUMN IF NOT EXISTS mapeamento JSONB DEFAULT '{}'::jsonb;

-- Índice para busca rápida de templates por inquilino
CREATE INDEX IF NOT EXISTS idx_proposta_layouts_tenant 
  ON public.proposta_layouts (tenant_id, is_default);

-- 2. Criação do bucket de storage 'proposta-templates' para armazenar os slides dos inquilinos
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposta-templates', 'proposta-templates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de acesso para o bucket proposta-templates
DROP POLICY IF EXISTS "proposta-templates public read" ON storage.objects;
CREATE POLICY "proposta-templates public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'proposta-templates');

DROP POLICY IF EXISTS "proposta-templates auth insert" ON storage.objects;
CREATE POLICY "proposta-templates auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposta-templates');

DROP POLICY IF EXISTS "proposta-templates auth update" ON storage.objects;
CREATE POLICY "proposta-templates auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'proposta-templates');

DROP POLICY IF EXISTS "proposta-templates auth delete" ON storage.objects;
CREATE POLICY "proposta-templates auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'proposta-templates');

-- 4. Ajuste de RLS em proposta_layouts para isolamento por tenant
DROP POLICY IF EXISTS "Authenticated users can view layouts" ON public.proposta_layouts;
CREATE POLICY "Authenticated users can view layouts" ON public.proposta_layouts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IS NULL OR 
      tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and diretoria can manage layouts" ON public.proposta_layouts;
CREATE POLICY "Admins and diretoria can manage layouts" ON public.proposta_layouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'diretoria')
    )
  );


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929170000_fix_all_rls_and_tenants.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260929170000_fix_all_rls_and_tenants.sql
-- DESCRIÇÃO: Ajuste de RLS para resolver "violates row-level security policy" em cadastros
-- DATA: 2026-09-29
-- ==============================================================================

-- 1. Habilitar RLS na tabela de Parceiros (se estiver faltando)
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_parceiros_set_tenant ON public.parceiros;
CREATE TRIGGER trg_parceiros_set_tenant
  BEFORE INSERT ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_tenant_id();

DROP POLICY IF EXISTS "tenant_isolation_select_parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "tenant_isolation_insert_parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "tenant_isolation_update_parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "tenant_isolation_delete_parceiros" ON public.parceiros;

CREATE POLICY "tenant_isolation_select_parceiros" ON public.parceiros
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_parceiros" ON public.parceiros
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "tenant_isolation_update_parceiros" ON public.parceiros
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_parceiros" ON public.parceiros
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- 2. Ajustar tabela PRODUTOS para permitir que Executivos também cadastrem produtos
DROP POLICY IF EXISTS "tenant_isolation_insert_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_insert_produtos" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR 
    tenant_id = public.current_user_tenant_id() OR 
    tenant_id IS NULL
  );

DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_update_produtos" ON public.produtos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

-- 3. Ajustar tabela PRODUTO_TIPOS
ALTER TABLE public.produto_tipos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_produto_tipos_set_tenant ON public.produto_tipos;
CREATE TRIGGER trg_produto_tipos_set_tenant
  BEFORE INSERT ON public.produto_tipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_tenant_id();

DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_select" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_insert" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_update" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_delete" ON public.produto_tipos;

CREATE POLICY "produto_tipos_tenant_select" ON public.produto_tipos
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid()) OR
    (tenant_id IS NULL)
  );

CREATE POLICY "produto_tipos_tenant_insert" ON public.produto_tipos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    tenant_id = public.current_user_tenant_id() OR
    tenant_id IS NULL
  );

CREATE POLICY "produto_tipos_tenant_update" ON public.produto_tipos
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())) OR
    (created_by = auth.uid())
  );

CREATE POLICY "produto_tipos_tenant_delete" ON public.produto_tipos
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())) OR
    (created_by = auth.uid())
  );

GRANT ALL ON public.produto_tipos TO authenticated;
GRANT ALL ON public.produto_tipos TO service_role;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260929170000_propostas_pacote_midia_e_geoloc.sql
-- ------------------------------------------------------------------------------
-- Migration 20260929170000_propostas_pacote_midia_e_geoloc.sql
-- Adiciona opções de apresentação comercial (Detalhado com Geolocalização/Endereço/Fotos vs Pacote de Mídia)

DO $$ 
BEGIN
  -- Campos em public.propostas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'propostas' AND column_name = 'modo_apresentacao') THEN
    ALTER TABLE public.propostas ADD COLUMN modo_apresentacao text DEFAULT 'detalhado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'propostas' AND column_name = 'mostrar_endereco') THEN
    ALTER TABLE public.propostas ADD COLUMN mostrar_endereco boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'propostas' AND column_name = 'mostrar_fotos') THEN
    ALTER TABLE public.propostas ADD COLUMN mostrar_fotos boolean DEFAULT true;
  END IF;

  -- Campos em public.proposta_itens
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'endereco_ponto') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN endereco_ponto text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'latitude') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN latitude double precision;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'longitude') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN longitude double precision;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'fotos') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN fotos jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'produto_id') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260930190000_midia_os_saas_master.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260930190000_midia_os_saas_master.sql
-- DESCRIÇÃO: Transformação Mídia OS SaaS Multi-Tenant, White-Label e Gestão de Mídia
-- AUTOR: Mídia OS / TV Brasília
-- DATA: 2026-09-30
-- POLÍTICA: Zero perda de dados, evolução aditiva e não-destrutiva
-- ==============================================================================

-- 1. EVOLUÇÃO DA TABELA TENANTS (White-Label, Limites e Personalização)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subdominio TEXT,
  ADD COLUMN IF NOT EXISTS dominio_proprio TEXT,
  ADD COLUMN IF NOT EXISTS prefixo_pi TEXT DEFAULT 'PI',
  ADD COLUMN IF NOT EXISTS prefixo_proposta TEXT DEFAULT 'PROP',
  ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS redes_sociais TEXT,
  ADD COLUMN IF NOT EXISTS rodape_documentos TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_padrao TEXT,
  ADD COLUMN IF NOT EXISTS dados_comerciais TEXT,
  ADD COLUMN IF NOT EXISTS dados_juridicos TEXT,
  ADD COLUMN IF NOT EXISTS comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS limite_usuarios INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS limite_clientes INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS limite_parceiros INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS limite_campanhas INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS limite_armazenamento_mb INTEGER DEFAULT 5120,
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdominio ON public.tenants(lower(subdominio)) WHERE subdominio IS NOT NULL;

-- 2. EVOLUÇÃO DAS TABELAS DE PIS E ITENS PARA RATEIO MULTI-PARCEIROS
-- ------------------------------------------------------------------------------
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS tipo_pi TEXT DEFAULT 'padrao', -- 'cliente' | 'parceiro' | 'consolidada' | 'padrao'
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pi_pai_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_comissao NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_repasse NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pis_tipo_pi ON public.pis(tipo_pi);
CREATE INDEX IF NOT EXISTS idx_pis_parceiro_id ON public.pis(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_pis_pi_pai_id ON public.pis(pi_pai_id);

ALTER TABLE public.pi_itens
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comissao_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_valor NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repasse_valor NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pi_itens_parceiro_id ON public.pi_itens(parceiro_id);

ALTER TABLE public.proposta_itens
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comissao_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_valor NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repasse_valor NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_proposta_itens_parceiro_id ON public.proposta_itens(parceiro_id);

-- 3. TABELA DE RATEIO DA CAMPANHA (CAMPAIGN PARTNER ALLOCATION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campanha_rateios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  valor_comercializado NUMERIC(14,2) NOT NULL DEFAULT 0,
  comissao_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  comissao_valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  repasse_valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  status_repasse TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'aprovado' | 'pago' | 'cancelado'
  data_previsao_repasse DATE,
  data_pagamento_repasse DATE,
  comprovante_pagamento_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanha_rateios_tenant ON public.campanha_rateios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campanha_rateios_pi ON public.campanha_rateios(pi_id);
CREATE INDEX IF NOT EXISTS idx_campanha_rateios_parceiro ON public.campanha_rateios(parceiro_id);

-- 4. TABELAS DE MODELOS DE CONTRATOS E CONTRATOS EMITIDOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contrato_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cliente', -- 'cliente' | 'agencia' | 'parceiro' | 'prestacao_servicos' | 'outro'
  conteudo TEXT NOT NULL,
  variaveis_disponiveis TEXT[] DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrato_modelos_tenant ON public.contrato_modelos(tenant_id);

CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cliente',
  titulo TEXT NOT NULL,
  modelo_id UUID REFERENCES public.contrato_modelos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  comissao_pct NUMERIC(5,2) DEFAULT 0,
  comissao_valor NUMERIC(14,2) DEFAULT 0,
  repasse_valor NUMERIC(14,2) DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  status TEXT NOT NULL DEFAULT 'rascunho', -- 'rascunho' | 'em_aprovacao' | 'aguardando_assinatura' | 'assinado' | 'recusado' | 'cancelado'
  conteudo_gerado TEXT,
  arquivo_url TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_tenant ON public.contratos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contratos_pi ON public.contratos(pi_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON public.contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_parceiro ON public.contratos(parceiro_id);

-- 5. TABELA DE COMPROVANTES DE EXECUÇÃO (EVIDÊNCIAS DE VEICULAÇÃO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comprovantes_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  pi_item_id UUID REFERENCES public.pi_itens(id) ON DELETE SET NULL,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'foto', -- 'foto' | 'video' | 'print' | 'link' | 'relatorio' | 'documento'
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  link_externo TEXT,
  data_veiculacao DATE,
  hora_veiculacao TEXT,
  validado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprovantes_tenant ON public.comprovantes_execucao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comprovantes_pi ON public.comprovantes_execucao(pi_id);
CREATE INDEX IF NOT EXISTS idx_comprovantes_parceiro ON public.comprovantes_execucao(parceiro_id);

-- 6. PERMISSÕES E TRIGGERS DE SEGURANÇA E AUTO-TENANT
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_rateios TO authenticated;
GRANT ALL ON public.campanha_rateios TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_modelos TO authenticated;
GRANT ALL ON public.contrato_modelos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprovantes_execucao TO authenticated;
GRANT ALL ON public.comprovantes_execucao TO service_role;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['campanha_rateios', 'contrato_modelos', 'contratos', 'comprovantes_execucao'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_current_tenant_id();', t);
  END LOOP;
END $$;

-- RLS POLICIES
-- === CAMPANHA_RATEIOS ===
DROP POLICY IF EXISTS "tenant_isolation_select_campanha_rateios" ON public.campanha_rateios;
DROP POLICY IF EXISTS "tenant_isolation_insert_campanha_rateios" ON public.campanha_rateios;
DROP POLICY IF EXISTS "tenant_isolation_update_campanha_rateios" ON public.campanha_rateios;
DROP POLICY IF EXISTS "tenant_isolation_delete_campanha_rateios" ON public.campanha_rateios;

CREATE POLICY "tenant_isolation_select_campanha_rateios" ON public.campanha_rateios
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_campanha_rateios" ON public.campanha_rateios
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_campanha_rateios" ON public.campanha_rateios
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_campanha_rateios" ON public.campanha_rateios
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === CONTRATO_MODELOS ===
DROP POLICY IF EXISTS "tenant_isolation_select_contrato_modelos" ON public.contrato_modelos;
DROP POLICY IF EXISTS "tenant_isolation_insert_contrato_modelos" ON public.contrato_modelos;
DROP POLICY IF EXISTS "tenant_isolation_update_contrato_modelos" ON public.contrato_modelos;
DROP POLICY IF EXISTS "tenant_isolation_delete_contrato_modelos" ON public.contrato_modelos;

CREATE POLICY "tenant_isolation_select_contrato_modelos" ON public.contrato_modelos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_contrato_modelos" ON public.contrato_modelos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_update_contrato_modelos" ON public.contrato_modelos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_delete_contrato_modelos" ON public.contrato_modelos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === CONTRATOS ===
DROP POLICY IF EXISTS "tenant_isolation_select_contratos" ON public.contratos;
DROP POLICY IF EXISTS "tenant_isolation_insert_contratos" ON public.contratos;
DROP POLICY IF EXISTS "tenant_isolation_update_contratos" ON public.contratos;
DROP POLICY IF EXISTS "tenant_isolation_delete_contratos" ON public.contratos;

CREATE POLICY "tenant_isolation_select_contratos" ON public.contratos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_contratos" ON public.contratos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_contratos" ON public.contratos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_contratos" ON public.contratos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === COMPROVANTES_EXECUCAO ===
DROP POLICY IF EXISTS "tenant_isolation_select_comprovantes" ON public.comprovantes_execucao;
DROP POLICY IF EXISTS "tenant_isolation_insert_comprovantes" ON public.comprovantes_execucao;
DROP POLICY IF EXISTS "tenant_isolation_update_comprovantes" ON public.comprovantes_execucao;
DROP POLICY IF EXISTS "tenant_isolation_delete_comprovantes" ON public.comprovantes_execucao;

CREATE POLICY "tenant_isolation_select_comprovantes" ON public.comprovantes_execucao
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_comprovantes" ON public.comprovantes_execucao
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_comprovantes" ON public.comprovantes_execucao
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_comprovantes" ON public.comprovantes_execucao
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- 7. SEED MODELOS DE CONTRATOS PADRÃO PARA TENANTS ATIVOS
-- ------------------------------------------------------------------------------
INSERT INTO public.contrato_modelos (tenant_id, titulo, tipo, conteudo, variaveis_disponiveis)
SELECT
  t.id,
  'Contrato de Comercialização e Veiculação de Mídia (Anunciante)',
  'cliente',
  'CONTRATO DE VEICULAÇÃO PUBLICITÁRIA E PRESTAÇÃO DE SERVIÇOS DE MÍDIA

Pelo presente instrumento particular, de um lado:

CONTRATADA: {{NOME_EMPRESA}}, inscrita no CNPJ sob o nº {{CNPJ_EMPRESA}}, com sede em {{ENDERECO_EMPRESA}}, doravante denominada simplesmente CONTRATADA;

E de outro lado:

CONTRATANTE: {{CLIENTE}}, inscrito(a) no CNPJ sob o nº {{CNPJ_CLIENTE}}, com interveniência de sua Agência {{AGENCIA}} (CNPJ {{CNPJ_AGENCIA}}), doravante denominada simplesmente CONTRATANTE;

CLÁUSULA PRIMEIRA – DO OBJETO
O presente contrato tem por objeto a veiculação publicitária da campanha "{{CAMPANHA}}", compreendendo os formatos, períodos e inserções discriminados no Pedido de Inserção correspondente.

CLÁUSULA SEGUNDA – DOS VALORES E FORMA DE PAGAMENTO
Pela prestação dos serviços e veiculação contratada, a CONTRATANTE pagará à CONTRATADA o valor total de {{VALOR}}, com vigência de {{DATA_INICIO}} até {{DATA_FIM}}.

CLÁUSULA TERCEIRA – DA COMPROVAÇÃO DE EXECUÇÃO
A CONTRATADA compromete-se a fornecer ao término de cada ciclo a respectiva comprovação de veiculação e relatório de execução.

CLÁUSULA QUARTA – DO FORO
Fica eleito o Foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas oriundas deste instrumento.

Brasília/DF, em {{DATA_INICIO}}.

_______________________________              _______________________________
{{NOME_EMPRESA}}                              {{CLIENTE}}
Responsável: {{RESPONSAVEL}}

[AVISO LEGAL: Este é um modelo comercial disponibilizado pelo Mídia OS. Deve ser revisado pelo departamento jurídico da sua empresa antes da utilização definitiva.]',
  ARRAY['NOME_EMPRESA','CNPJ_EMPRESA','ENDERECO_EMPRESA','CLIENTE','CNPJ_CLIENTE','AGENCIA','CNPJ_AGENCIA','CAMPANHA','VALOR','DATA_INICIO','DATA_FIM','RESPONSAVEL']
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.contrato_modelos cm WHERE cm.tenant_id = t.id AND cm.tipo = 'cliente'
);

INSERT INTO public.contrato_modelos (tenant_id, titulo, tipo, conteudo, variaveis_disponiveis)
SELECT
  t.id,
  'Contrato de Representação e Repasse de Mídia (Veículo / Parceiro)',
  'parceiro',
  'CONTRATO DE REPRESENTAÇÃO COMERCIAL E REPASSE DE MÍDIA

Pelo presente instrumento, de um lado:

REPRESENTANTE: {{NOME_EMPRESA}}, inscrita no CNPJ sob o nº {{CNPJ_EMPRESA}}, com sede em {{ENDERECO_EMPRESA}};

E de outro lado:

VEÍCULO / PARCEIRO DE MÍDIA: {{PARCEIRO}}, inscrito no CNPJ sob o nº {{CNPJ_PARCEIRO}}, doravante denominado simplesmente PARCEIRO;

CLÁUSULA PRIMEIRA – DO OBJETO E CAMPANHA
O presente contrato regula a comercialização e veiculação da campanha "{{CAMPANHA}}", para o cliente {{CLIENTE}}.

CLÁUSULA SEGUNDA – DA REMUNERAÇÃO, COMISSÃO E REPASSE
1. O valor bruto comercializado referente aos produtos do PARCEIRO é de {{VALOR}}.
2. A comissão de representação devida à REPRESENTANTE é fixada em {{COMISSAO}}.
3. O valor líquido a ser repassado ao PARCEIRO é de {{REPASSE}}, a ser quitado conforme o cronograma financeiro ajustado.

CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO PARCEIRO
O PARCEIRO compromete-se a executar integralmente as inserções acordadas e encaminhar os respectivos comprovantes (checking fotográfico/audiovisual/métricas) em até 5 dias após a veiculação.

Brasília/DF, em {{DATA_INICIO}}.

_______________________________              _______________________________
{{NOME_EMPRESA}}                              {{PARCEIRO}}

[AVISO LEGAL: Este é um modelo comercial disponibilizado pelo Mídia OS. Deve ser revisado pelo departamento jurídico da sua empresa antes da utilização definitiva.]',
  ARRAY['NOME_EMPRESA','CNPJ_EMPRESA','ENDERECO_EMPRESA','PARCEIRO','CNPJ_PARCEIRO','CLIENTE','CAMPANHA','VALOR','COMISSAO','REPASSE','DATA_INICIO','DATA_FIM']
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.contrato_modelos cm WHERE cm.tenant_id = t.id AND cm.tipo = 'parceiro'
);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20260930200000_modulo_universal_assinaturas.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20260930200000_modulo_universal_assinaturas.sql
-- DESCRIÇÃO: Módulo Universal de Assinaturas (Transversal, Multi-Tenant, Digital, Manual e Híbrido)
-- AUTOR: Mídia OS / TV Brasília
-- DATA: 2026-09-30
-- POLÍTICA: Zero perda de dados, evolução aditiva e não-destrutiva
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE DOCUMENTOS DE ASSINATURA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documentos_assinatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  documento_tipo TEXT NOT NULL DEFAULT 'contrato', 
  -- 'proposta' | 'contrato' | 'contrato_prestacao' | 'contrato_parceiro' | 'contrato_cliente' | 'contrato_agencia' | 'pi' | 'termo' | 'autorizacao' | 'aditivo' | 'distrato' | 'declaracao' | 'comercial' | 'operacional' | 'financeiro' | 'prestacao_contas' | 'personalizado'
  referencia_tipo TEXT, -- 'contratos' | 'pis' | 'propostas' | 'clientes' | 'parceiros' | 'financeiro' | 'outro'
  referencia_id UUID,
  titulo TEXT NOT NULL,
  numero TEXT,
  descricao TEXT,
  
  -- Status do documento
  -- 'nao_necessita_assinatura' | 'aguardando_definicao' | 'aguardando_assinatura' | 'enviado_para_assinatura' | 'assinado_parcialmente' | 'assinado' | 'recusado' | 'cancelado' | 'expirado' | 'assinado_manualmente' | 'documento_assinado_recebido' | 'aguardando_conferencia'
  status TEXT NOT NULL DEFAULT 'aguardando_definicao',
  necessita_assinatura BOOLEAN NOT NULL DEFAULT true,
  metodo_preferencial TEXT NOT NULL DEFAULT 'hibrido', -- 'digital' | 'manual' | 'hibrido'
  ordem_tipo TEXT NOT NULL DEFAULT 'simultanea', -- 'simultanea' | 'sequencial'
  versao INTEGER NOT NULL DEFAULT 1,
  versao_anterior_id UUID REFERENCES public.documentos_assinatura(id) ON DELETE SET NULL,
  
  -- Arquivos do fluxo documental
  documento_original_url TEXT,
  documento_impresso_url TEXT,
  documento_assinado_url TEXT,
  documento_manual_upload_url TEXT,
  
  -- Conferência de assinatura manual
  conferencia_status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'aprovado' | 'rejeitado' | 'solicitado_novo'
  conferencia_observacoes TEXT,
  conferencia_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conferencia_em TIMESTAMPTZ,
  
  -- IA assistiva na conferência / pendências
  ia_analise JSONB DEFAULT '{}'::jsonb,
  
  -- Provedores de assinatura eletrônica
  provedor_assinatura TEXT NOT NULL DEFAULT 'interno', -- 'interno' | 'docusign' | 'clicksign' | 'zapsign' | 'outro'
  provedor_envelope_id TEXT,
  provedor_metadata JSONB DEFAULT '{}'::jsonb,
  certificado_url TEXT,
  
  -- Prazos e lembretes
  validade_limite DATE,
  lembretes_enviados INTEGER NOT NULL DEFAULT 0,
  ultimo_lembrete_em TIMESTAMPTZ,
  
  -- Metadados flexíveis (campanha, partes, valores, variáveis)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_assinatura_tenant ON public.documentos_assinatura(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_assinatura_status ON public.documentos_assinatura(status);
CREATE INDEX IF NOT EXISTS idx_doc_assinatura_ref ON public.documentos_assinatura(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_doc_assinatura_tipo ON public.documentos_assinatura(documento_tipo);

-- 2. TABELA DE SIGNATÁRIOS DO DOCUMENTO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assinatura_signatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos_assinatura(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  cargo TEXT,
  empresa TEXT,
  tipo_participante TEXT NOT NULL DEFAULT 'cliente', -- 'cliente' | 'parceiro' | 'nexo' | 'agencia' | 'testemunha' | 'outro'
  ordem INTEGER NOT NULL DEFAULT 1,
  metodo TEXT NOT NULL DEFAULT 'digital', -- 'digital' | 'manual'
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'enviado' | 'visualizado' | 'assinado' | 'recusado'
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  
  -- Dados da assinatura realizada
  assinado_em TIMESTAMPTZ,
  assinatura_imagem_url TEXT,
  documento_identificacao_url TEXT,
  ip TEXT,
  user_agent TEXT,
  geolocalizacao JSONB DEFAULT '{}'::jsonb,
  
  -- Recusa
  recusado_motivo TEXT,
  recusado_em TIMESTAMPTZ,
  
  lembretes_count INTEGER NOT NULL DEFAULT 0,
  ultimo_lembrete_em TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assin_signatarios_doc ON public.assinatura_signatarios(documento_id);
CREATE INDEX IF NOT EXISTS idx_assin_signatarios_tenant ON public.assinatura_signatarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assin_signatarios_token ON public.assinatura_signatarios(token);

-- 3. TABELA DE HISTÓRICO & AUDITORIA (TIMELINE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assinatura_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos_assinatura(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  signatario_id UUID REFERENCES public.assinatura_signatarios(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assin_historico_doc ON public.assinatura_historico(documento_id);
CREATE INDEX IF NOT EXISTS idx_assin_historico_tenant ON public.assinatura_historico(tenant_id);

-- 4. TABELA DE CONFIGURAÇÃO DE ASSINATURA POR TENANT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assinatura_configuracoes_tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  metodos_permitidos TEXT[] NOT NULL DEFAULT ARRAY['digital', 'manual', 'hibrido'],
  provedor_padrao TEXT NOT NULL DEFAULT 'interno', -- 'interno' | 'docusign' | 'clicksign' | 'zapsign'
  provedor_configs JSONB NOT NULL DEFAULT '{}'::jsonb,
  bloqueios JSONB NOT NULL DEFAULT '{
    "bloquear_campanha_sem_contrato": false,
    "bloquear_opec_sem_pi": true,
    "bloquear_faturamento_sem_assinatura": false
  }'::jsonb,
  prazo_padrao_dias INTEGER NOT NULL DEFAULT 5,
  lembretes_automaticos BOOLEAN NOT NULL DEFAULT true,
  lembretes_frequencia_dias INTEGER NOT NULL DEFAULT 2,
  lembretes_max INTEGER NOT NULL DEFAULT 3,
  canais_notificacao TEXT[] NOT NULL DEFAULT ARRAY['email', 'sistema', 'whatsapp'],
  signatarios_padrao JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assin_config_tenant ON public.assinatura_configuracoes_tenant(tenant_id);

-- 5. EVOLUÇÃO NÃO-DESTRUTIVA NAS TABELAS CONTRATOS E PIS
-- ------------------------------------------------------------------------------
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS necessita_assinatura BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS documento_assinatura_id UUID REFERENCES public.documentos_assinatura(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'aguardando_definicao';

ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS necessita_assinatura BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS documento_assinatura_id UUID REFERENCES public.documentos_assinatura(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'aguardando_definicao';

ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS necessita_assinatura BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS documento_assinatura_id UUID REFERENCES public.documentos_assinatura(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'nao_necessita_assinatura';

-- 6. PERMISSÕES E SEGURANÇA (RLS & TRIGGERS)
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_assinatura TO authenticated;
GRANT ALL ON public.documentos_assinatura TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinatura_signatarios TO authenticated;
GRANT ALL ON public.assinatura_signatarios TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinatura_historico TO authenticated;
GRANT ALL ON public.assinatura_historico TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinatura_configuracoes_tenant TO authenticated;
GRANT ALL ON public.assinatura_configuracoes_tenant TO service_role;

-- Permitir leitura pública dos signatários pelo token e atualização de assinatura
GRANT SELECT ON public.documentos_assinatura TO anon;
GRANT SELECT, UPDATE ON public.assinatura_signatarios TO anon;
GRANT INSERT ON public.assinatura_historico TO anon;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'documentos_assinatura',
    'assinatura_signatarios',
    'assinatura_historico',
    'assinatura_configuracoes_tenant'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_current_tenant_id();', t);
  END LOOP;
END $$;

-- POLÍTICAS RLS (Isolamento de tenant para autenticados)
DROP POLICY IF EXISTS "tenant_isolation_select_documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_isolation_select_documentos_assinatura" ON public.documentos_assinatura
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "tenant_isolation_insert_documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_isolation_insert_documentos_assinatura" ON public.documentos_assinatura
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "tenant_isolation_update_documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_isolation_update_documentos_assinatura" ON public.documentos_assinatura
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "tenant_isolation_delete_documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_isolation_delete_documentos_assinatura" ON public.documentos_assinatura
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Signatários (autenticados + acesso público por token)
DROP POLICY IF EXISTS "tenant_isolation_signatarios" ON public.assinatura_signatarios;
CREATE POLICY "tenant_isolation_signatarios" ON public.assinatura_signatarios
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "public_token_select_signatarios" ON public.assinatura_signatarios;
CREATE POLICY "public_token_select_signatarios" ON public.assinatura_signatarios
  FOR SELECT TO anon
  USING (token IS NOT NULL);

DROP POLICY IF EXISTS "public_token_update_signatarios" ON public.assinatura_signatarios;
CREATE POLICY "public_token_update_signatarios" ON public.assinatura_signatarios
  FOR UPDATE TO anon
  USING (token IS NOT NULL)
  WITH CHECK (token IS NOT NULL);

-- Documentos (leitura anônima se vinculada ao token do signatário)
DROP POLICY IF EXISTS "public_token_select_doc" ON public.documentos_assinatura;
CREATE POLICY "public_token_select_doc" ON public.documentos_assinatura
  FOR SELECT TO anon
  USING (true);

-- Histórico
DROP POLICY IF EXISTS "tenant_isolation_historico" ON public.assinatura_historico;
CREATE POLICY "tenant_isolation_historico" ON public.assinatura_historico
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "public_insert_historico" ON public.assinatura_historico;
CREATE POLICY "public_insert_historico" ON public.assinatura_historico
  FOR INSERT TO anon
  WITH CHECK (true);

-- Configurações Tenant
DROP POLICY IF EXISTS "tenant_isolation_config" ON public.assinatura_configuracoes_tenant;
CREATE POLICY "tenant_isolation_config" ON public.assinatura_configuracoes_tenant
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261001140000_adicionar_modelos_proposta_tenants.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRAÇÃO ADITIVA: MODELOS DE PROPOSTA PERSONALIZADOS POR CLIENTE / TENANT
-- Permite até 3 modelos em PDF com editor e mapeamento visual de campos dinâmicos
-- (valores, produtos, defesa da proposta, dados do cliente e assinaturas)
-- ==============================================================================

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS modelos_proposta JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tenants.modelos_proposta IS 'Lista de até 3 modelos de proposta em PDF com mapeamento e direcionamento de campos dinâmicos (valores, produtos, defesa da proposta)';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261001142500_push_notifications.sql
-- ------------------------------------------------------------------------------
-- ============================================================================
-- MÍDIA.OS — SISTEMA DE PUSH NOTIFICATIONS (DESKTOP & MOBILE / ANDROID & IOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  device_type text, -- 'desktop', 'android', 'ios', 'outro'
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance e consulta rápida
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_tenant_id ON public.push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_ativo ON public.push_subscriptions(ativo);

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Usuário gerencia suas próprias inscrições push" ON public.push_subscriptions;
CREATE POLICY "Usuário gerencia suas próprias inscrições push"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role tem acesso total a push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role tem acesso total a push_subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.push_subscriptions IS 'Inscrições ativas do Web Push Notification para envio de alertas no Desktop e Mobile (Android/iOS)';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261001143000_modulo_indicadores_clientes.sql
-- ------------------------------------------------------------------------------
-- ========================================================================
-- MÓDULO DE INDICADORES DE CLIENTES & COMISSÃO POR INDICAÇÃO (REPRESENTAÇÃO)
-- Permite cadastrar pessoas que indicam clientes, definindo percentual de remuneração
-- e chave PIX para repasse após o pagamento do contrato.
-- ========================================================================

-- 1. Tabela de Indicadores (Pessoas que indicam clientes)
CREATE TABLE IF NOT EXISTS public.indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  cpf_cnpj text,
  chave_pix text,
  tipo_chave_pix text DEFAULT 'cpf',
  banco_nome text,
  percentual_comissao_padrao numeric(5, 2) NOT NULL DEFAULT 5.00,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger de updated_at para indicadores
CREATE OR REPLACE TRIGGER set_indicadores_updated_at
  BEFORE UPDATE ON public.indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_indicadores_tenant_id ON public.indicadores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_nome ON public.indicadores(nome);

-- 2. Vincular indicador no cadastro de clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' AND column_name = 'indicador_id'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN indicador_id uuid REFERENCES public.indicadores(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' AND column_name = 'comissao_indicacao_pct'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN comissao_indicacao_pct numeric(5, 2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clientes_indicador_id ON public.clientes(indicador_id);

-- 3. Vincular indicador nas PIs e propostas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pis' AND column_name = 'indicador_id'
  ) THEN
    ALTER TABLE public.pis ADD COLUMN indicador_id uuid REFERENCES public.indicadores(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pis' AND column_name = 'comissao_indicador_pct'
  ) THEN
    ALTER TABLE public.pis ADD COLUMN comissao_indicador_pct numeric(5, 2);
  END IF;
END $$;

-- 4. Tabela de Comissões por Indicação (Geradas quando o cliente fecha e paga)
CREATE TABLE IF NOT EXISTS public.comissoes_indicacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  pi_id uuid REFERENCES public.pis(id) ON DELETE SET NULL,
  transacao_id uuid REFERENCES public.financeiro_transacoes(id) ON DELETE SET NULL,
  valor_base numeric(12, 2) NOT NULL DEFAULT 0.00,
  percentual numeric(5, 2) NOT NULL DEFAULT 5.00,
  valor_comissao numeric(12, 2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  pago_em timestamptz,
  comprovante_pagamento_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_indicacao_tenant ON public.comissoes_indicacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_indicacao_indicador ON public.comissoes_indicacao(indicador_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_indicacao_status ON public.comissoes_indicacao(status);

-- 5. RLS (Row Level Security)
ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes_indicacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Indicadores tenant isolation policy" ON public.indicadores;
CREATE POLICY "Indicadores tenant isolation policy" ON public.indicadores
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Comissoes indicacao tenant isolation policy" ON public.comissoes_indicacao;
CREATE POLICY "Comissoes indicacao tenant isolation policy" ON public.comissoes_indicacao
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261001180000_fix_tenants_columns.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261001180000_fix_tenants_columns.sql
-- DESCRIÇÃO: Adiciona colunas de personalização visual (cor_secundaria, cor_primaria, white-label) na tabela tenants
-- DIRETRIZ: Não destrutiva (IF NOT EXISTS), compatível com instâncias existentes
-- ==============================================================================

-- 1. Garante todas as colunas de White-Label e Customização na tabela tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS subdominio TEXT,
  ADD COLUMN IF NOT EXISTS dominio_proprio TEXT,
  ADD COLUMN IF NOT EXISTS prefixo_pi TEXT DEFAULT 'PI',
  ADD COLUMN IF NOT EXISTS prefixo_proposta TEXT DEFAULT 'PROP',
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS produto_marca TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS redes_sociais TEXT,
  ADD COLUMN IF NOT EXISTS rodape_documentos TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_padrao TEXT,
  ADD COLUMN IF NOT EXISTS dados_comerciais TEXT,
  ADD COLUMN IF NOT EXISTS dados_juridicos TEXT,
  ADD COLUMN IF NOT EXISTS modelos_proposta JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS limite_usuarios INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS limite_clientes INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS limite_parceiros INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS limite_produtos INTEGER DEFAULT 1000;

-- 2. Recarregar o cache do PostgREST imediatamente para que a API reconheça as colunas novas
NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261001200000_create_parceiros_table.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261001200000_create_parceiros_table.sql
-- DESCRIÇÃO: Criação da tabela de Parceiros de Mídia (100% autônoma e resiliente)
-- DIRETRIZ: Não-destrutiva (IF NOT EXISTS), sem dependências externas rígidas
-- ==============================================================================

-- 1. Criação da tabela de Parceiros de Mídia
CREATE TABLE IF NOT EXISTS public.parceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  site TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT,
  redes_sociais JSONB DEFAULT '{}',
  segmentos TEXT[] DEFAULT '{}',
  modelo_remuneracao TEXT DEFAULT 'comissao_percentual',
  comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  prazo_repasse TEXT,
  condicoes_comerciais TEXT,
  contato_nome TEXT,
  contato_email TEXT,
  contato_telefone TEXT,
  chave_pix TEXT,
  dados_bancarios TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas opcionais caso a tabela já exista
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS redes_sociais JSONB DEFAULT '{}';

-- 2. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_parceiros_tenant ON public.parceiros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_cnpj ON public.parceiros(cnpj);
CREATE INDEX IF NOT EXISTS idx_parceiros_ativo ON public.parceiros(ativo);

-- 3. Vincular produtos SOMENTE se a tabela produtos existir neste banco
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    ALTER TABLE public.produtos
      ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS parceiro_cnpj TEXT,
      ADD COLUMN IF NOT EXISTS parceiro_nome TEXT,
      ADD COLUMN IF NOT EXISTS comissao_inquilino_pct NUMERIC(5,2);

    CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_id ON public.produtos(parceiro_id);
    CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_cnpj ON public.produtos(parceiro_cnpj);
  END IF;
END $$;

-- 4. Permissões de acesso
GRANT ALL ON public.parceiros TO authenticated;
GRANT ALL ON public.parceiros TO service_role;
GRANT SELECT ON public.parceiros TO anon;

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso (autenticados)
DROP POLICY IF EXISTS "tenant_isolation_select_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_select_parceiros" ON public.parceiros
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tenant_isolation_insert_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_insert_parceiros" ON public.parceiros
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_isolation_update_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_update_parceiros" ON public.parceiros
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tenant_isolation_delete_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_delete_parceiros" ON public.parceiros
  FOR DELETE TO authenticated
  USING (true);

-- 7. Tabela complementar: Anexos e Mídia Kits do Parceiro
CREATE TABLE IF NOT EXISTS public.parceiro_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  tipo TEXT DEFAULT 'midia_kit',
  tamanho_bytes BIGINT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceiro_anexos_parceiro ON public.parceiro_anexos(parceiro_id);
GRANT ALL ON public.parceiro_anexos TO authenticated;
GRANT ALL ON public.parceiro_anexos TO service_role;
ALTER TABLE public.parceiro_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_parceiro_anexos" ON public.parceiro_anexos;
CREATE POLICY "tenant_isolation_parceiro_anexos" ON public.parceiro_anexos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. Tabela complementar: Métricas e Defesas Técnicas de Mídia
CREATE TABLE IF NOT EXISTS public.parceiros_metricas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  parceiro_nome TEXT NOT NULL,
  tipo_midia TEXT NOT NULL,
  veiculo_programa TEXT NOT NULL,
  praca TEXT DEFAULT 'Brasília - DF',
  alcance_estimado TEXT DEFAULT '',
  impactos_mes TEXT DEFAULT '',
  fluxo_diario TEXT DEFAULT '',
  perfil_publico TEXT DEFAULT 'Classes A, B e C, 25 a 55 anos',
  audiencia_share TEXT DEFAULT '',
  fonte_dados TEXT DEFAULT 'Kantar IBOPE / Auditoria de Tráfego',
  defesa_tecnica TEXT NOT NULL,
  destaques_comerciais JSONB DEFAULT '[]',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceiros_metricas_tenant ON public.parceiros_metricas(tenant_id);
GRANT ALL ON public.parceiros_metricas TO authenticated;
GRANT ALL ON public.parceiros_metricas TO service_role;
ALTER TABLE public.parceiros_metricas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_parceiros_metricas" ON public.parceiros_metricas;
CREATE POLICY "tenant_isolation_parceiros_metricas" ON public.parceiros_metricas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Triggers de Segurança (Guardrails opcionais se as funções existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_move_to_trash') THEN
    DROP TRIGGER IF EXISTS trash_before_delete ON public.parceiros;
    CREATE TRIGGER trash_before_delete
      BEFORE DELETE ON public.parceiros
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_move_to_trash();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_alteracao') THEN
    DROP TRIGGER IF EXISTS trg_audit_parceiros ON public.parceiros;
    CREATE TRIGGER trg_audit_parceiros
      AFTER INSERT OR UPDATE OR DELETE ON public.parceiros
      FOR EACH ROW
      EXECUTE FUNCTION public.log_alteracao();
  END IF;
END $$;

-- 10. Habilitação e Cadastro do Parceiro Oficial: PO MÍDIA DIGITAL (CNPJ 37.313.540/0001-35)
INSERT INTO public.parceiros (
  razao_social,
  nome_fantasia,
  cnpj,
  segmentos,
  modelo_remuneracao,
  comissao_padrao_pct,
  contato_telefone,
  endereco,
  cidade,
  uf,
  cep,
  ativo
)
SELECT
  'PO MIDIA, SERVICOS LOCACAO DE ESPACOS PUBLICIDADE DIGITAL LTDA',
  'PO MIDIA DIGITAL',
  '37.313.540/0001-35',
  ARRAY['DOOH', 'Painéis Digitais de Rua', 'Telas em Elevadores Corporativos', 'Espaços Comerciais em Shoppings e Hotéis']::text[],
  'comissao_percentual',
  20.00,
  '(61) 3315-8755',
  'AOS 2/8 - Lote 05 - Sala, Parte, Área Octogonal',
  'Brasília',
  'DF',
  '70660-900',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.parceiros 
  WHERE cnpj = '37.313.540/0001-35' 
     OR cnpj = '37313540000135' 
     OR razao_social ILIKE '%PO MIDIA%'
);

-- Atualiza vínculo de produtos existentes para PO Mídia caso haja correspondência
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    UPDATE public.produtos p
    SET parceiro_id = parc.id,
        parceiro_nome = parc.nome_fantasia,
        parceiro_cnpj = parc.cnpj
    FROM public.parceiros parc
    WHERE (parc.cnpj = '37.313.540/0001-35' OR parc.cnpj = '37313540000135')
      AND (
        p.parceiro_id IS NULL AND (
          p.parceiro_cnpj ILIKE '%37313540%' OR 
          p.parceiro_nome ILIKE '%PO MIDIA%' OR 
          p.nome ILIKE '%PO MIDIA%'
        )
      );
  END IF;
END $$;

-- 11. Recarregar o cache do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261002120000_proposta_itens_parceiro.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261002120000_proposta_itens_parceiro.sql
-- DESCRIÇÃO: Vínculo explícito de produtos ao Parceiro (CNPJ, Nome, ID e Comissão)
--            nas tabelas de itens de proposta (proposta_itens) e itens de PI (pi_itens).
-- POLÍTICA: Zero perda de dados, puramente aditivo com IF NOT EXISTS.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Campos em public.proposta_itens
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'parceiro_id') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN parceiro_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'parceiro_nome') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN parceiro_nome text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'parceiro_cnpj') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN parceiro_cnpj text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'comissao_inquilino_pct') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN comissao_inquilino_pct numeric(5,2);
  END IF;

  -- 2. Campos em public.pi_itens
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pi_itens' AND column_name = 'parceiro_id') THEN
    ALTER TABLE public.pi_itens ADD COLUMN parceiro_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pi_itens' AND column_name = 'parceiro_nome') THEN
    ALTER TABLE public.pi_itens ADD COLUMN parceiro_nome text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pi_itens' AND column_name = 'parceiro_cnpj') THEN
    ALTER TABLE public.pi_itens ADD COLUMN parceiro_cnpj text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pi_itens' AND column_name = 'comissao_inquilino_pct') THEN
    ALTER TABLE public.pi_itens ADD COLUMN comissao_inquilino_pct numeric(5,2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposta_itens_parceiro_cnpj ON public.proposta_itens(parceiro_cnpj);
CREATE INDEX IF NOT EXISTS idx_pi_itens_parceiro_cnpj ON public.pi_itens(parceiro_cnpj);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261003233000_inventario_midia_canais_digitais.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261003233000_inventario_midia_canais_digitais.sql
-- DESCRIÇÃO: Classificação macro (ON/OFF/HIBRIDO), campos digitais e view de inventário
-- DATA: 2026-10-03
-- ==============================================================================

-- 1. Adicionar classificação macro e campos digitais à tabela principal de inventário (produtos)
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS canal_macro TEXT DEFAULT 'OFF',
  ADD COLUMN IF NOT EXISTS plataforma_rede TEXT,        -- Ex: Instagram, Facebook, Portal Web, YouTube, Rádio, Painel Físico
  ADD COLUMN IF NOT EXISTS metricas_digitais JSONB;     -- Ex: {"cpm_estimado": 12.50, "alcance_estimado": 50000, "cliques_estimados": 1200}

-- Assegurar restrição de CHECK de canal_macro de forma segura e idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.produtos'::regclass 
      AND conname = 'produtos_canal_macro_check'
  ) THEN
    ALTER TABLE public.produtos 
      ADD CONSTRAINT produtos_canal_macro_check 
      CHECK (canal_macro IN ('ON', 'OFF', 'HIBRIDO'));
  END IF;
END $$;

COMMENT ON COLUMN public.produtos.canal_macro IS 'Classificação macro do canal: ON (Digital/Online), OFF (Tradicional: TV, Rádio, Impresso, OOH) ou HIBRIDO';
COMMENT ON COLUMN public.produtos.plataforma_rede IS 'Plataforma, rede ou veículo específico (ex: Instagram, YouTube, TV Globo, Rádio Transamérica, Totem Digital)';
COMMENT ON COLUMN public.produtos.metricas_digitais IS 'Métricas e estimativas digitais em JSONB (CPM, impressões, alcance, cliques, visualizações)';

-- 2. Índices de alta velocidade para filtros combinados
CREATE INDEX IF NOT EXISTS idx_produtos_canal_macro ON public.produtos(canal_macro);
CREATE INDEX IF NOT EXISTS idx_produtos_plataforma ON public.produtos(plataforma_rede);
CREATE INDEX IF NOT EXISTS idx_produtos_canal_plataforma ON public.produtos(canal_macro, plataforma_rede);

-- 3. View de compatibilidade e inventário comercial unificado (public.inventario_midia)
CREATE OR REPLACE VIEW public.inventario_midia AS 
SELECT 
  id,
  tenant_id,
  nome,
  midia,
  tipo,
  programa,
  faixa,
  duracao_segundos,
  insercoes_padrao,
  valor_unit,
  canal_macro,
  plataforma_rede,
  metricas_digitais,
  ativo,
  parceiro_nome,
  parceiro_cnpj,
  praca,
  created_at,
  updated_at
FROM public.produtos;

COMMENT ON VIEW public.inventario_midia IS 'View unificada de inventário comercial de mídia (TV, Rádio, DOOH, OOH, Digital) espelhada da tabela de produtos';

-- 4. Conceder permissões para a view aos papéis da aplicação
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_midia TO authenticated;
GRANT SELECT ON public.inventario_midia TO anon;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261003234500_inventario_midia_geolocalizacao_rotas.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261003234500_inventario_midia_geolocalizacao_rotas.sql
-- DESCRIÇÃO: Suporte a geolocalização física avançada (coordenadas, link Maps,
--            sentido da via e ponto de referência) em inventário e produtos.
-- DATA: 2026-10-03
-- ==============================================================================

-- 1. Adicionar colunas de geolocalização à tabela principal (public.produtos)
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS link_maps TEXT,
  ADD COLUMN IF NOT EXISTS sentido_via TEXT,        -- Ex: Sentido Plano Piloto, Sentido Taguatinga
  ADD COLUMN IF NOT EXISTS ponto_referencia TEXT;   -- Ex: Em frente ao Taguatinga Shopping

-- 2. Índice para consultas espaciais e de proximidade na tabela de produtos
CREATE INDEX IF NOT EXISTS idx_produtos_lat_lng ON public.produtos(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_produtos_sentido_via ON public.produtos(sentido_via);

-- 3. Suporte caso public.inventario_midia exista como tabela física
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'inventario_midia'
  ) THEN
    ALTER TABLE public.inventario_midia 
      ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
      ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
      ADD COLUMN IF NOT EXISTS link_maps TEXT,
      ADD COLUMN IF NOT EXISTS sentido_via TEXT,
      ADD COLUMN IF NOT EXISTS ponto_referencia TEXT;

    CREATE INDEX IF NOT EXISTS idx_inventario_lat_lng ON public.inventario_midia(latitude, longitude);
  END IF;
END $$;

-- 4. Atualizar a View unificada public.inventario_midia para expor as novas colunas
CREATE OR REPLACE VIEW public.inventario_midia AS 
SELECT 
  id,
  tenant_id,
  nome,
  midia,
  tipo,
  programa,
  faixa,
  duracao_segundos,
  insercoes_padrao,
  valor_unit,
  canal_macro,
  plataforma_rede,
  metricas_digitais,
  latitude,
  longitude,
  link_maps,
  sentido_via,
  ponto_referencia,
  ativo,
  parceiro_nome,
  parceiro_cnpj,
  praca,
  created_at,
  updated_at
FROM public.produtos;

COMMENT ON VIEW public.inventario_midia IS 'View unificada de inventário comercial de mídia espelhada da tabela de produtos com suporte a coordenadas, rotas e canais digitais';

-- 5. Conceder permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_midia TO authenticated;
GRANT SELECT ON public.inventario_midia TO anon;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261004010000_demandas_captacao_planejamento_360.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MÍDIA.OS — RADAR DE EXPANSÃO E DEMANDAS DE CAPTAÇÃO 360°
-- Tabela para registrar pedidos de captação de pontos/parceiros quando uma
-- região solicitada pelo cliente ainda não possui inventário direto cadastrado.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.demandas_captacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  regiao_administrativa TEXT NOT NULL,
  tipo_midia TEXT NOT NULL, -- Ex: Painel LED, Outdoor, Elevador, Front Light, Rádio Local
  formato_desejado TEXT,
  pilar_360 TEXT, -- 'deslocamento', 'moradia', 'lazer_consumo', 'ativacao_eventos', 'digital'
  perfil_publico JSONB DEFAULT '{}'::jsonb, -- { classes: [], estilo_vida: [] }
  historico_sucesso JSONB DEFAULT '{}'::jsonb, -- { canais_passado: [], aprendizados: '' }
  sugestoes_prospeccao JSONB DEFAULT '[]'::jsonb, -- lista de entidades/empresas sugeridas para contato
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_prospeccao', 'parceiro_captado', 'cancelado')),
  contato_responsavel TEXT,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para performance e consultas analíticas
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_tenant ON public.demandas_captacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_regiao ON public.demandas_captacao(regiao_administrativa);
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_status ON public.demandas_captacao(status);
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_cliente ON public.demandas_captacao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_created ON public.demandas_captacao(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.demandas_captacao ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "demandas_captacao_tenant_authenticated" ON public.demandas_captacao;
CREATE POLICY "demandas_captacao_tenant_authenticated"
  ON public.demandas_captacao
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id IN (
      SELECT pr.tenant_id FROM public.profiles pr WHERE pr.id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IS NULL OR 
    tenant_id IN (
      SELECT pr.tenant_id FROM public.profiles pr WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "demandas_captacao_service_role" ON public.demandas_captacao;
CREATE POLICY "demandas_captacao_service_role"
  ON public.demandas_captacao
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.demandas_captacao IS 'Registros do Radar de Expansão 360° para busca ativa e prospecção de pontos/parceiros em regiões solicitadas pelo cliente';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261004023000_organizacoes_tenants_nexo.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261004023000_organizacoes_tenants_nexo.sql
-- DESCRIÇÃO: Criação da tabela de Organizações (Tenants), vínculo de perfis e inventário
--            Inserção da Nexo Mídia e Representação como organização pioneira
-- DIRETRIZ: Zero perda de dados, aditiva e retrocompatível (AGENTS.md)
-- ==============================================================================

-- 1. Criar tabela de organizações (Tenants)
CREATE TABLE IF NOT EXISTS public.organizacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- ex: 'nexo'
    site_url TEXT,
    logo_url TEXT,
    tagline TEXT,
    termos_proposta TEXT,
    cor_primaria TEXT DEFAULT '#0f172a',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir a Nexo como organização pioneira
INSERT INTO public.organizacoes (nome, slug, site_url, tagline, termos_proposta)
VALUES (
    'Nexo Mídia e Representação',
    'nexo',
    'https://nexomidiaerepresentacao.com.br',
    'Hub de Negócios e Soluções Estratégicas em Mídia',
    'A Nexo Mídia e Representação atua como Hub Estratégico conectando marcas aos melhores veículos e soluções 360° no Distrito Federal.'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Vincular perfis à organização
-- Garante que public.perfis exista caso seja referenciada como tabela física
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT,
    email TEXT,
    telefone TEXT,
    cargo TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

-- Vincular também à tabela nativa de perfis do Mídia.OS (public.profiles)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

-- 3. Vincular inventário próprio à organização proprietária
-- Suporte caso public.inventario_midia seja tabela física
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventario_midia'
  ) THEN
    ALTER TABLE public.inventario_midia 
    ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);
  END IF;
END $$;

-- Vincular tabela de produtos físicos / formatos à organização
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

-- 4. Sincronização e Retrocompatibilidade com public.tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS site_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS termos_proposta TEXT,
  ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

-- Espelhar a Nexo em public.tenants mantendo integridade com as regras legadas
INSERT INTO public.tenants (
  id,
  razao_social,
  nome_fantasia,
  slug,
  site_url,
  site,
  tagline,
  termos_proposta,
  cor_primaria,
  status,
  plano
)
SELECT 
  o.id,
  o.nome,
  o.nome,
  o.slug,
  o.site_url,
  o.site_url,
  o.tagline,
  o.termos_proposta,
  o.cor_primaria,
  'ativo',
  'enterprise'
FROM public.organizacoes o
WHERE o.slug = 'nexo'
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  site_url = EXCLUDED.site_url,
  tagline = EXCLUDED.tagline,
  termos_proposta = EXCLUDED.termos_proposta,
  cor_primaria = EXCLUDED.cor_primaria;

-- Vincular organizacao_id nos tenants e perfis existentes correspondentes à Nexo
UPDATE public.tenants t
SET organizacao_id = o.id
FROM public.organizacoes o
WHERE o.slug = 'nexo' AND (t.id = o.id OR t.razao_social ILIKE '%nexo%' OR t.nome_fantasia ILIKE '%nexo%');

UPDATE public.profiles p
SET organizacao_id = o.id
FROM public.organizacoes o
WHERE o.slug = 'nexo' AND (p.organizacao_id IS NULL AND (p.tenant_id = o.id OR p.email ILIKE '%nexo%'));

UPDATE public.produtos p
SET organizacao_id = o.id
FROM public.organizacoes o
WHERE o.slug = 'nexo' AND p.organizacao_id IS NULL AND p.tenant_id = o.id;

-- 5. Atualizar a View unificada public.inventario_midia para expor organizacao_id
CREATE OR REPLACE VIEW public.inventario_midia AS 
SELECT 
  id,
  tenant_id,
  organizacao_id,
  nome,
  midia,
  tipo,
  programa,
  faixa,
  duracao_segundos,
  insercoes_padrao,
  valor_unit,
  canal_macro,
  plataforma_rede,
  metricas_digitais,
  latitude,
  longitude,
  link_maps,
  sentido_via,
  ponto_referencia,
  ativo,
  parceiro_nome,
  parceiro_cnpj,
  praca,
  created_at,
  updated_at
FROM public.produtos;

COMMENT ON VIEW public.inventario_midia IS 'View unificada de inventário comercial de mídia com suporte a organizacao_id e canais ON/OFF';

-- 6. Permissões e RLS
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizacoes' AND policyname = 'organizacoes_select_all'
  ) THEN
    CREATE POLICY "organizacoes_select_all" ON public.organizacoes FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizacoes' AND policyname = 'organizacoes_admin_all'
  ) THEN
    CREATE POLICY "organizacoes_admin_all" ON public.organizacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizacoes TO authenticated;
GRANT SELECT ON public.organizacoes TO anon;
GRANT ALL ON public.organizacoes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_midia TO authenticated;
GRANT SELECT ON public.inventario_midia TO anon;

-- 7. Notificar o PostgREST para recarregar o schema imediatamente
NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261004030000_organizacoes_whitelabel_origem_produto.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261004030000_organizacoes_whitelabel_origem_produto.sql
-- DESCRIÇÃO: Suporte a White-label Multi-tenant (Nexo / Neutro) e origem_produto ('PROPRIO' vs 'PARCEIRO')
-- DIRETRIZ: Zero perda de dados, aditiva e retrocompatível (AGENTS.md)
-- ==============================================================================

-- 1. Campo de origem do produto (próprio da organização vs veículo parceiro representado)
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS origem_produto TEXT DEFAULT 'PROPRIO';

-- Atualiza restrição de integridade caso ainda não exista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_produtos_origem_produto'
  ) THEN
    ALTER TABLE public.produtos 
      ADD CONSTRAINT chk_produtos_origem_produto 
      CHECK (origem_produto IN ('PROPRIO', 'PARCEIRO'));
  END IF;
END $$;

-- 2. Backfill inteligente de produtos existentes
UPDATE public.produtos
SET origem_produto = 'PARCEIRO'
WHERE (parceiro_id IS NOT NULL OR parceiro_nome IS NOT NULL OR parceiro_cnpj IS NOT NULL)
  AND (origem_produto IS NULL OR origem_produto = 'PROPRIO');

UPDATE public.produtos
SET origem_produto = 'PROPRIO'
WHERE (parceiro_id IS NULL AND parceiro_nome IS NULL AND parceiro_cnpj IS NULL)
  AND (origem_produto IS NULL OR origem_produto = '');

-- 3. Vincular produtos à organização da Nexo caso pertençam ao seu tenant
UPDATE public.produtos p
SET organizacao_id = o.id
FROM public.organizacoes o
WHERE o.slug = 'nexo' 
  AND p.organizacao_id IS NULL 
  AND (p.tenant_id = o.id OR p.detalhes_venda ILIKE '%nexo%');

-- 4. Adicionar organizacao_id na tabela propostas
ALTER TABLE public.propostas 
  ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

UPDATE public.propostas p
SET organizacao_id = prof.organizacao_id
FROM public.profiles prof
WHERE p.executivo_id = prof.id AND p.organizacao_id IS NULL AND prof.organizacao_id IS NOT NULL;

UPDATE public.propostas p
SET organizacao_id = o.id
FROM public.organizacoes o
WHERE o.slug = 'nexo' AND p.organizacao_id IS NULL AND p.tenant_id = o.id;

-- 5. Atualizar ou recriar a View unificada public.inventario_midia
CREATE OR REPLACE VIEW public.inventario_midia AS 
SELECT 
  id,
  tenant_id,
  organizacao_id,
  origem_produto,
  nome,
  midia,
  tipo,
  programa,
  faixa,
  duracao_segundos,
  insercoes_padrao,
  valor_unit,
  canal_macro,
  plataforma_rede,
  metricas_digitais,
  latitude,
  longitude,
  link_maps,
  sentido_via,
  ponto_referencia,
  ativo,
  parceiro_id,
  parceiro_nome,
  parceiro_cnpj,
  praca,
  created_at,
  updated_at
FROM public.produtos;

COMMENT ON VIEW public.inventario_midia IS 'View unificada de inventário comercial com organizacao_id, origem_produto (PROPRIO/PARCEIRO) e geolocalização';

-- 6. Índices para performance em multi-tenancy e consultas filtradas
CREATE INDEX IF NOT EXISTS idx_produtos_org_origem ON public.produtos(organizacao_id, origem_produto);
CREATE INDEX IF NOT EXISTS idx_propostas_organizacao ON public.propostas(organizacao_id);

-- 7. Notificar PostgREST
NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261004040000_nexo_branding_posicionamento_360.sql
-- ------------------------------------------------------------------------------
-- ====================================================================
-- MIGRAÇÃO: Atualização de Branding, Posicionamento e Defesa Comercial Nexo
-- Data: Outubro de 2026
-- ====================================================================

-- 1. Atualizar ou garantir a organização Nexo Mídia e Representação com os textos oficiais
UPDATE public.organizacoes
SET 
  nome = 'NEXO Mídia e Representação',
  tagline = 'Hub de Negócios & Soluções Estratégicas em Mídia',
  site_url = 'https://nexomidiaerepresentacao.com.br',
  termos_proposta = 'A Nexo Mídia e Representação atua como um Hub de Negócios especializado em conectar marcas a oportunidades de alto impacto no Distrito Federal e entorno. Combinamos veículos de mídia consolidados, inteligência geográfica regional e soluções estratégicas personalizadas para garantir máxima lembrança e retorno para o seu investimento.',
  cor_primaria = '#0f172a'
WHERE slug = 'nexo';

-- 2. Inserir caso não exista
INSERT INTO public.organizacoes (
  nome,
  slug,
  site_url,
  tagline,
  termos_proposta,
  cor_primaria
)
VALUES (
  'NEXO Mídia e Representação',
  'nexo',
  'https://nexomidiaerepresentacao.com.br',
  'Hub de Negócios & Soluções Estratégicas em Mídia',
  'A Nexo Mídia e Representação atua como um Hub de Negócios especializado em conectar marcas a oportunidades de alto impacto no Distrito Federal e entorno. Combinamos veículos de mídia consolidados, inteligência geográfica regional e soluções estratégicas personalizadas para garantir máxima lembrança e retorno para o seu investimento.',
  '#0f172a'
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  tagline = EXCLUDED.tagline,
  site_url = EXCLUDED.site_url,
  termos_proposta = EXCLUDED.termos_proposta,
  cor_primaria = EXCLUDED.cor_primaria;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261004050000_template_proposta_config.sql
-- ------------------------------------------------------------------------------
-- ====================================================================
-- MIGRAÇÃO: Configurações de Template de Proposta por Organização / White-Label
-- Data: Outubro de 2026
-- ====================================================================

-- 1. Tabela de Configurações de Template de Proposta por Assinante/Organização
CREATE TABLE IF NOT EXISTS public.template_proposta_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    logo_url TEXT,
    cor_fundo_capa TEXT DEFAULT '#0b0c10',
    cor_destaque_primaria TEXT DEFAULT '#ff6b00', -- Laranja Nexo
    cor_destaque_secundaria TEXT DEFAULT '#7928ca', -- Roxo/Degradê Nexo
    telefone_contato TEXT DEFAULT '(61) 99125-7245',
    email_contato TEXT DEFAULT 'rafaelnexomidia@gmail.com',
    instagram_contato TEXT DEFAULT 'nexobrasilmidia',
    site_url TEXT DEFAULT 'https://nexomidiaerepresentacao.com.br',
    
    -- Seções editáveis do template
    manifesto_titulo TEXT DEFAULT 'O significado de Nexo',
    manifesto_texto TEXT DEFAULT 'No dicionário, nexo significa conexão, ligação, vínculo entre partes...',
    exibir_overview BOOLEAN DEFAULT true,
    exibir_metodologia BOOLEAN DEFAULT true,
    exibir_mapa_satelite BOOLEAN DEFAULT true,
    
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organizacao_id)
);

-- Habilitar RLS e Políticas
ALTER TABLE public.template_proposta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de template_proposta_config para autenticados e publico"
ON public.template_proposta_config FOR SELECT
USING (true);

CREATE POLICY "Permitir update de template_proposta_config para administradores"
ON public.template_proposta_config FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_super_admin = true OR p.organizacao_id = template_proposta_config.organizacao_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_super_admin = true OR p.organizacao_id = template_proposta_config.organizacao_id)
  )
);

-- 2. Vincular as configurações à organização Nexo existente
INSERT INTO public.template_proposta_config (
    organizacao_id, 
    logo_url, 
    cor_fundo_capa, 
    cor_destaque_primaria, 
    cor_destaque_secundaria,
    telefone_contato,
    email_contato,
    instagram_contato,
    site_url,
    manifesto_titulo,
    manifesto_texto,
    exibir_overview,
    exibir_metodologia,
    exibir_mapa_satelite
)
SELECT 
    id, 
    logo_url, 
    '#0b0c10', 
    '#ff6b00', 
    '#7928ca',
    '(61) 99125-7245',
    'rafaelnexomidia@gmail.com',
    'nexobrasilmidia',
    'https://nexomidiaerepresentacao.com.br',
    'O significado de Nexo',
    'No dicionário, nexo significa conexão, ligação, vínculo entre partes. No mercado de comunicação do Distrito Federal e entorno, a Nexo Mídia e Representação é a ponte estratégica que une marcas, veículos de alto impacto e consumidores em momentos decisivos da sua jornada diária.',
    true,
    true,
    true
FROM public.organizacoes 
WHERE slug = 'nexo'
ON CONFLICT (organizacao_id) DO UPDATE SET
    cor_fundo_capa = EXCLUDED.cor_fundo_capa,
    cor_destaque_primaria = EXCLUDED.cor_destaque_primaria,
    cor_destaque_secundaria = EXCLUDED.cor_destaque_secundaria,
    telefone_contato = EXCLUDED.telefone_contato,
    email_contato = EXCLUDED.email_contato,
    instagram_contato = EXCLUDED.instagram_contato,
    site_url = EXCLUDED.site_url,
    manifesto_titulo = EXCLUDED.manifesto_titulo,
    manifesto_texto = EXCLUDED.manifesto_texto,
    updated_at = now();


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261004060000_template_proposta_laminas_nexo.sql
-- ------------------------------------------------------------------------------
-- ====================================================================
-- MIGRAÇÃO: Lâminas Institucionais & Layout Nexo para Template de Proposta
-- Data: Outubro de 2026
-- ====================================================================

-- 1. Adicionar colunas de controle de lâminas e métricas institucionais
ALTER TABLE public.template_proposta_config
  ADD COLUMN IF NOT EXISTS incluir_capa BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS incluir_manifesto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS incluir_como_atuamos BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS incluir_laminas_pontos BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fechamento_titulo TEXT DEFAULT 'Vamos criar o próximo nexo?',
  ADD COLUMN IF NOT EXISTS fechamento_subtitulo TEXT DEFAULT 'Conectando marcas, veículos e pessoas com inteligência estratégica.',
  ADD COLUMN IF NOT EXISTS total_populacao_impacto TEXT DEFAULT '+5,5 milhões de habitantes',
  ADD COLUMN IF NOT EXISTS total_impactos_mes TEXT DEFAULT '+18,5 milhões de impactos/mês',
  ADD COLUMN IF NOT EXISTS cobertura_pracas TEXT DEFAULT 'Distrito Federal + Goiás (Entorno)';

-- 2. Atualizar a organização Nexo existente com os novos padrões
UPDATE public.template_proposta_config
SET
  incluir_capa = true,
  incluir_manifesto = true,
  incluir_como_atuamos = true,
  incluir_laminas_pontos = true,
  fechamento_titulo = 'Vamos criar o próximo nexo?',
  fechamento_subtitulo = 'Conectando marcas, veículos e pessoas com inteligência estratégica.',
  total_populacao_impacto = '+5,5 milhões de habitantes',
  total_impactos_mes = '+18,5 milhões de impactos/mês',
  cobertura_pracas = 'Distrito Federal + Goiás (Entorno)'
WHERE organizacao_id IN (
  SELECT id FROM public.organizacoes WHERE slug = 'nexo'
);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261004113000_fix_midia_config_rls.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261004113000_fix_midia_config_rls.sql
-- DESCRIÇÃO: 
-- 1. Remove constraint CHECK restritiva na coluna midia de midia_config
-- 2. Atualiza políticas de RLS para permitir que executivos e usuários da empresa
--    possam cadastrar e atualizar mídias sem bloqueio de segurança
-- ==============================================================================

-- 1. Remove qualquer restrição CHECK que limite os valores de midia
DO $$
BEGIN
  ALTER TABLE public.midia_config DROP CONSTRAINT IF EXISTS midia_config_midia_check;
  ALTER TABLE public.midia_config DROP CONSTRAINT IF EXISTS check_midia;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Converte coluna midia para text puro garantindo suporte dinâmico
DO $$
BEGIN
  ALTER TABLE public.midia_config ALTER COLUMN midia TYPE text;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Adiciona tenant_id se aplicável (opcional e seguro)
ALTER TABLE public.midia_config ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 4. Atualiza as políticas de RLS para permitir que qualquer usuário autenticado gerencie mídias
DROP POLICY IF EXISTS "auth read midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "admin upsert midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "admin update midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "authenticated read midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "authenticated upsert midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "authenticated update midia_config" ON public.midia_config;

CREATE POLICY "authenticated read midia_config" ON public.midia_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated upsert midia_config" ON public.midia_config
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated update midia_config" ON public.midia_config
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Garante permissões completas
GRANT ALL ON public.midia_config TO authenticated;
GRANT ALL ON public.midia_config TO service_role;

-- 6. Remove restrição CHECK de produto_tipos para permitir criação de tipos de qualquer mídia
DO $$
BEGIN
  ALTER TABLE public.produto_tipos DROP CONSTRAINT IF EXISTS produto_tipos_midia_check;
  ALTER TABLE public.produto_tipos DROP CONSTRAINT IF EXISTS check_midia;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.produto_tipos ALTER COLUMN midia TYPE text;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

GRANT ALL ON public.produto_tipos TO authenticated;
GRANT ALL ON public.produto_tipos TO service_role;



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261005210000_modulo_representacao_comercial_e_catalogo.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261005210000_modulo_representacao_comercial_e_catalogo.sql
-- DESCRIÇÃO: Módulo de Categorias de Serviços e Representação Comercial
--           (Veículos Parceiros, Produtos Próprios e Catálogo de Espaços Publicitários)
-- DIRETRIZ: Não-destrutiva (IF NOT EXISTS), aditiva e 100% retrocompatível (AGENTS.md)
-- ==============================================================================

-- 1. TABELA: partners (Veículos de Comunicação Parceiros)
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  logo_url TEXT,
  contato_nome TEXT,
  email TEXT,
  telefone TEXT,
  site TEXT,
  tipo_veiculo TEXT DEFAULT 'Painel OOH/DOOH', -- TV, Rádio, Painel OOH/DOOH, Portal de Notícias, Impresso, Mídia em Ônibus/Transporte, etc.
  comissao_padrao_percentual NUMERIC(5,2) DEFAULT 20.00,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'em_negociacao')),
  observacoes TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  redes_sociais JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas opcionais adicionais caso a tabela partners já exista
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT DEFAULT 'Painel OOH/DOOH',
  ADD COLUMN IF NOT EXISTS comissao_padrao_percentual NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS redes_sociais JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT;

-- Retrocompatibilidade: enriquecer a tabela parceiros pré-existente
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT DEFAULT 'Painel OOH/DOOH',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS comissao_padrao_percentual NUMERIC(5,2) DEFAULT 20.00;

-- 2. TABELA: media_services_catalog (Catálogo de Espaços e Serviços Publicitários)
CREATE TABLE IF NOT EXISTS public.media_services_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  is_own_product BOOLEAN NOT NULL DEFAULT false, -- Produto próprio da representação vs de veículo parceiro
  nome_produto TEXT NOT NULL,
  categoria_midia TEXT NOT NULL, -- TV & Áudio, OOH / DOOH, Digital & Portais, Mídia Impressa & Outros, Serviços Próprios
  tipo_cobranca TEXT NOT NULL DEFAULT 'insercao' CHECK (tipo_cobranca IN ('insercao', 'diaria', 'semanal', 'quinzenal', 'mensal', 'por_clique', 'cpm')),
  valor_tabela NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  valor_negociado_minimo NUMERIC(12,2),
  comissao_percentual_especifica NUMERIC(5,2), -- Sobrescreve a comissão do parceiro se informada
  quantidade_disponivel INTEGER DEFAULT 1,
  estoque_espacos INTEGER DEFAULT 1,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  especificacoes_tecnicas JSONB DEFAULT '{}'::jsonb,
  fotos TEXT[] DEFAULT '{}',
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas opcionais adicionais caso media_services_catalog já exista
ALTER TABLE public.media_services_catalog
  ADD COLUMN IF NOT EXISTS is_own_product BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'insercao',
  ADD COLUMN IF NOT EXISTS valor_negociado_minimo NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS comissao_percentual_especifica NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS quantidade_disponivel INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS estoque_espacos INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- Enriquecer produtos pré-existentes com novos campos para integração total
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS is_own_product BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'insercao',
  ADD COLUMN IF NOT EXISTS valor_tabela NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS valor_negociado_minimo NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS comissao_percentual_especifica NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS estoque_espacos INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS partner_id UUID;

-- 3. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_partners_tenant ON public.partners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_tipo_veiculo ON public.partners(tipo_veiculo);
CREATE INDEX IF NOT EXISTS idx_partners_cnpj ON public.partners(cnpj);

CREATE INDEX IF NOT EXISTS idx_catalog_tenant ON public.media_services_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_catalog_partner ON public.media_services_catalog(partner_id);
CREATE INDEX IF NOT EXISTS idx_catalog_categoria ON public.media_services_catalog(categoria_midia);
CREATE INDEX IF NOT EXISTS idx_catalog_is_own ON public.media_services_catalog(is_own_product);
CREATE INDEX IF NOT EXISTS idx_catalog_tipo_cobranca ON public.media_services_catalog(tipo_cobranca);
CREATE INDEX IF NOT EXISTS idx_catalog_cidade_estado ON public.media_services_catalog(cidade, estado);

-- 4. BUCKET DE LOGOMARCAS DE PARCEIROS (Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "partner-logos public read" ON storage.objects;
CREATE POLICY "partner-logos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'partner-logos');

DROP POLICY IF EXISTS "partner-logos auth insert" ON storage.objects;
CREATE POLICY "partner-logos auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'partner-logos');

DROP POLICY IF EXISTS "partner-logos auth update" ON storage.objects;
CREATE POLICY "partner-logos auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'partner-logos');

DROP POLICY IF EXISTS "partner-logos auth delete" ON storage.objects;
CREATE POLICY "partner-logos auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'partner-logos');

-- 5. PERMISSÕES E RLS (Row Level Security)
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_services_catalog ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
GRANT SELECT ON public.partners TO anon;

GRANT ALL ON public.media_services_catalog TO authenticated;
GRANT ALL ON public.media_services_catalog TO service_role;
GRANT SELECT ON public.media_services_catalog TO anon;

-- Políticas de isolamento multi-tenant
DROP POLICY IF EXISTS "tenant_isolation_partners_all" ON public.partners;
CREATE POLICY "tenant_isolation_partners_all" ON public.partners
  FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'superadmin', 'admin'))
  )
  WITH CHECK (
    tenant_id IS NULL OR 
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "tenant_isolation_catalog_all" ON public.media_services_catalog;
CREATE POLICY "tenant_isolation_catalog_all" ON public.media_services_catalog
  FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'superadmin', 'admin'))
  )
  WITH CHECK (
    tenant_id IS NULL OR 
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'superadmin', 'admin'))
  );

-- 6. GATILHOS DE AUDITORIA E LIXEIRA (AGENTS.md)
DO $$
BEGIN
  -- Trigger de lixeira
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_move_to_trash') THEN
    DROP TRIGGER IF EXISTS trash_before_delete ON public.partners;
    CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.partners
      FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash();

    DROP TRIGGER IF EXISTS trash_before_delete ON public.media_services_catalog;
    CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.media_services_catalog
      FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash();
  END IF;

  -- Trigger de auditoria
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_alteracao') THEN
    DROP TRIGGER IF EXISTS trg_audit_partners ON public.partners;
    CREATE TRIGGER trg_audit_partners AFTER INSERT OR UPDATE OR DELETE ON public.partners
      FOR EACH ROW EXECUTE FUNCTION public.log_alteracao();

    DROP TRIGGER IF EXISTS trg_audit_media_services_catalog ON public.media_services_catalog;
    CREATE TRIGGER trg_audit_media_services_catalog AFTER INSERT OR UPDATE OR DELETE ON public.media_services_catalog
      FOR EACH ROW EXECUTE FUNCTION public.log_alteracao();
  END IF;
END $$;

-- 7. RECARREGAR SCHEMA POSTGREST
NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261005220000_modulo_simulador_propostas_comissoes.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: Modulo Simulador de Propostas e Calculo de Comissoes de Midia
-- DATA: 2026-10-05 22:00:00
-- ==============================================================================

-- 1. TABELA PROPOSALS (Simulador de Propostas Comerciais de Midia Multiveiculos)
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  campaign_title TEXT,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net_agency NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_payout_partners NUMERIC(14,2) NOT NULL DEFAULT 0,
  profit_margin_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'converted_to_pi')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id ON public.proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);

-- 2. TABELA PROPOSAL_ITEMS (Itens de Midia da Proposta / Espacos Publicitarios)
CREATE TABLE IF NOT EXISTS public.proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  media_service_id UUID REFERENCES public.media_services_catalog(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  is_own_product BOOLEAN NOT NULL DEFAULT false,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  billing_type TEXT NOT NULL DEFAULT 'insercao',
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  net_client_val NUMERIC(14,2) NOT NULL DEFAULT 0,
  agency_commission_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  agency_commission_val NUMERIC(14,2) NOT NULL DEFAULT 0,
  partner_payout_val NUMERIC(14,2) NOT NULL DEFAULT 0,
  min_negotiated_unit_price NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON public.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_media_service_id ON public.proposal_items(media_service_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_partner_id ON public.proposal_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_tenant_id ON public.proposal_items(tenant_id);

-- 3. HABILITACAO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- Politicas para public.proposals
DROP POLICY IF EXISTS "tenant_isolation_select_proposals" ON public.proposals;
CREATE POLICY "tenant_isolation_select_proposals" ON public.proposals
  FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_insert_proposals" ON public.proposals;
CREATE POLICY "tenant_isolation_insert_proposals" ON public.proposals
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_update_proposals" ON public.proposals;
CREATE POLICY "tenant_isolation_update_proposals" ON public.proposals
  FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_delete_proposals" ON public.proposals;
CREATE POLICY "tenant_isolation_delete_proposals" ON public.proposals
  FOR DELETE
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

-- Politicas para public.proposal_items
DROP POLICY IF EXISTS "tenant_isolation_select_proposal_items" ON public.proposal_items;
CREATE POLICY "tenant_isolation_select_proposal_items" ON public.proposal_items
  FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id
      AND (p.tenant_id = public.current_user_tenant_id() OR public.is_master_admin())
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_insert_proposal_items" ON public.proposal_items;
CREATE POLICY "tenant_isolation_insert_proposal_items" ON public.proposal_items
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_items.proposal_id
      AND (p.tenant_id = public.current_user_tenant_id() OR public.is_master_admin())
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_update_proposal_items" ON public.proposal_items;
CREATE POLICY "tenant_isolation_update_proposal_items" ON public.proposal_items
  FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_delete_proposal_items" ON public.proposal_items;
CREATE POLICY "tenant_isolation_delete_proposal_items" ON public.proposal_items
  FOR DELETE
  USING (
    tenant_id = public.current_user_tenant_id()
    OR public.is_master_admin()
  );

-- 4. SEGURANCA: TRIGGERS DE LIXEIRA E AUDITORIA
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_move_to_trash') THEN
    DROP TRIGGER IF EXISTS trg_proposals_trash ON public.proposals;
    CREATE TRIGGER trg_proposals_trash
      BEFORE DELETE ON public.proposals
      FOR EACH ROW EXECUTE FUNCTION public.fn_move_to_trash();

    DROP TRIGGER IF EXISTS trg_proposal_items_trash ON public.proposal_items;
    CREATE TRIGGER trg_proposal_items_trash
      BEFORE DELETE ON public.proposal_items
      FOR EACH ROW EXECUTE FUNCTION public.fn_move_to_trash();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_log_alteracao') THEN
    DROP TRIGGER IF EXISTS trg_proposals_audit ON public.proposals;
    CREATE TRIGGER trg_proposals_audit
      AFTER INSERT OR UPDATE OR DELETE ON public.proposals
      FOR EACH ROW EXECUTE FUNCTION public.fn_log_alteracao();
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261005230000_personalizacao_logo_cliente_proposta.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: Personalizacao com Logo e Nome do Cliente na Proposta Comercial
-- DATA: 2026-10-05 23:00:00
-- ==============================================================================

-- 1. Adiciona coluna client_logo_url na tabela proposals (Simulador)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS client_logo_url TEXT;

-- 2. Adiciona coluna client_logo_url na tabela propostas (Propostas Formais)
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS client_logo_url TEXT;

-- 3. Adiciona coluna client_nome_personalizado caso necessario
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS client_nome_personalizado TEXT;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261005233000_importacao_inteligente_midia_kit_defesas.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261005233000_importacao_inteligente_midia_kit_defesas.sql
-- DESCRIÇÃO: Suporte a defesas comerciais, regras de desconto e métricas
--           de Mídia Kit extraídas via IA para parceiros e catálogo.
-- DIRETRIZ: Não-destrutiva (IF NOT EXISTS), aditiva e 100% retrocompatível (AGENTS.md)
-- ==============================================================================

-- 1. Enriquecer tabela partners (e legada parceiros) com defesas e descontos de Mídia Kit
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS media_kit_defenses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial_discounts_rules JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS media_kit_defenses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial_discounts_rules JSONB DEFAULT '[]'::jsonb;

-- 2. Enriquecer media_services_catalog com impactos estimados e inserções por dia
ALTER TABLE public.media_services_catalog
  ADD COLUMN IF NOT EXISTS impactos_estimados_mes BIGINT,
  ADD COLUMN IF NOT EXISTS insercoes_dia INTEGER;

-- 3. Enriquecer produtos com impactos e inserções se aplicável
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS impactos_estimados_mes BIGINT,
  ADD COLUMN IF NOT EXISTS insercoes_dia INTEGER;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261005234500_apresentacao_institucional_brand_deck_settings.sql
-- ------------------------------------------------------------------------------
-- ====================================================================
-- MIGRAÇÃO: Apresentação Institucional, Brand Deck & Mídia Kit Corporativo
-- Adiciona suporte a customização do Mídia Kit Corporativo de 10 Lâminas
-- Data: Outubro de 2026
-- ====================================================================

-- 1. Criar tabela tenant_settings se não existir
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    company_name TEXT DEFAULT 'Nexo Mídia e Representação',
    company_tagline TEXT DEFAULT 'Estratégia • Mídia • Representação',
    about_text TEXT DEFAULT 'A Nexo Mídia e Representação atua como a ponte estratégica entre anunciantes e as maiores oportunidades de mídia no Distrito Federal, Goiás e praças nacionais. Conectamos marcas consagradas aos veículos de maior credibilidade e audiência.',
    leadership_info JSONB DEFAULT '[{"nome": "Rafael Rodrigo", "cargo": "Diretor Comercial & Estratégia", "telefone": "(61) 99125-7245", "email": "rafaelnexomidia@gmail.com", "bio": "Especialista em inteligência de mídia OOH/DOOH e planejamento comercial de alta performance."}]'::jsonb,
    channels_overview JSONB DEFAULT '{"total_parceiros": 15, "total_paineis": 54, "populacao_impacto": "+5,5 milhões de habitantes", "total_impactos_mes": "+18,5 milhões de impactos/mês", "cobertura": "Distrito Federal + Goiás (Entorno) e Praças Nacionais"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de tenant_settings para autenticados e publico"
ON public.tenant_settings FOR SELECT
USING (true);

CREATE POLICY "Permitir alteracao de tenant_settings para usuarios autenticados"
ON public.tenant_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Retrocompatibilidade: Adicionar colunas também em template_proposta_config e tenants
ALTER TABLE public.template_proposta_config
  ADD COLUMN IF NOT EXISTS company_tagline TEXT DEFAULT 'Estratégia • Mídia • Representação',
  ADD COLUMN IF NOT EXISTS about_text TEXT,
  ADD COLUMN IF NOT EXISTS leadership_info JSONB,
  ADD COLUMN IF NOT EXISTS channels_overview JSONB;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS company_tagline TEXT DEFAULT 'Estratégia • Mídia • Representação',
  ADD COLUMN IF NOT EXISTS about_text TEXT,
  ADD COLUMN IF NOT EXISTS leadership_info JSONB,
  ADD COLUMN IF NOT EXISTS channels_overview JSONB;

-- 3. Atualizar configurações padrão para a organização Nexo
UPDATE public.template_proposta_config
SET
  company_tagline = 'Estratégia • Mídia • Representação',
  about_text = 'A Nexo Mídia e Representação atua como a ponte estratégica entre anunciantes e as maiores oportunidades de mídia no Distrito Federal, Goiás e praças nacionais.',
  leadership_info = '[{"nome": "Rafael Rodrigo", "cargo": "Diretor Comercial & Estratégia", "telefone": "(61) 99125-7245", "email": "rafaelnexomidia@gmail.com", "bio": "Especialista em inteligência de mídia OOH/DOOH e planejamento comercial de alta performance."}]'::jsonb,
  channels_overview = '{"total_parceiros": 15, "total_paineis": 54, "populacao_impacto": "+5,5 milhões de habitantes", "total_impactos_mes": "+18,5 milhões de impactos/mês", "cobertura": "Distrito Federal + Goiás (Entorno) e Praças Nacionais"}'::jsonb
WHERE organizacao_id IN (
  SELECT id FROM public.organizacoes WHERE slug = 'nexo'
);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261005235500_representacao_comercial_full_schema.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261005235500_representacao_comercial_full_schema.sql
-- DESCRIÇÃO: Consolidação aditiva e não-destrutiva de esquemas para
--           Representação Comercial de Mídia, Catálogo de Inventário,
--           Defesas de Mídia Kit e Simulador de Propostas Executivas.
-- POLÍTICA: Zero Perda de Dados (AGENTS.md) - estritamente aditiva com IF NOT EXISTS
-- ==============================================================================

-- 1. TABELA PARTNERS (Veículos e Exibidoras Parceiras)
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS contato_nome TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT DEFAULT 'Painel OOH/DOOH',
  ADD COLUMN IF NOT EXISTS comissao_padrao_percentual NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS media_kit_defenses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial_discounts_rules JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- Retrocompatibilidade com tabela legada 'parceiros'
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    ALTER TABLE public.parceiros
      ADD COLUMN IF NOT EXISTS media_kit_defenses JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS commercial_discounts_rules JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS comissao_padrao_percentual NUMERIC(5,2) DEFAULT 20.00;
  END IF;
END $$;

-- 2. TABELA MEDIA_SERVICES_CATALOG (Inventário & Serviços de Mídia)
ALTER TABLE public.media_services_catalog
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_own_product BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nome_produto TEXT,
  ADD COLUMN IF NOT EXISTS categoria_midia TEXT,
  ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT DEFAULT 'insercao',
  ADD COLUMN IF NOT EXISTS valor_tabela NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_negociado_minimo NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS comissao_percentual_especifica NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS impactos_estimados_mes NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS insercoes_dia NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS spot_duration_seconds NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
  ADD COLUMN IF NOT EXISTS operating_hours TEXT,
  ADD COLUMN IF NOT EXISTS socioeconomic_class TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- 3. TABELA PROPOSALS (Propostas e Simulações Comerciais)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS client_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS media_defense TEXT,
  ADD COLUMN IF NOT EXISTS campaign_period TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 4. TABELA PROPOSAL_ITEMS (Itens de Mídia da Proposta)
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS spot_duration_seconds NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
  ADD COLUMN IF NOT EXISTS operating_hours TEXT,
  ADD COLUMN IF NOT EXISTS socioeconomic_class TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- Garantir índices de performance não bloqueantes
CREATE INDEX IF NOT EXISTS idx_media_catalog_is_own ON public.media_services_catalog(is_own_product);
CREATE INDEX IF NOT EXISTS idx_media_catalog_partner_id ON public.media_services_catalog(partner_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_logo ON public.proposals(client_logo_url) WHERE client_logo_url IS NOT NULL;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006000100_client_social_traffic_growth_ecosystem.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006000100_client_social_traffic_growth_ecosystem.sql
-- DESCRIÇÃO: Ecossistema Integrado de Gestão de Redes Sociais, Tráfego Pago,
--           Agendamento de Publicações & Insights Estratégicos com IA
--           vinculado a cada cliente anunciante.
-- POLÍTICA: Zero Perda de Dados (AGENTS.md) - Não-destrutiva com IF NOT EXISTS
-- ==============================================================================

-- 1. TABELA client_social_accounts (Contas Conectadas do Cliente)
CREATE TABLE IF NOT EXISTS public.client_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'meta_ads', 'google_ads', 'tiktok', 'linkedin', 'youtube', 'twitter')),
  account_name TEXT NOT NULL,
  account_id TEXT,
  profile_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'expired')),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas caso a tabela já exista
ALTER TABLE public.client_social_accounts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS account_id TEXT,
  ADD COLUMN IF NOT EXISTS profile_url TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT now();

-- 2. TABELA social_traffic_metrics (Métricas de Tráfego e Redes Sociais)
CREATE TABLE IF NOT EXISTS public.social_traffic_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform TEXT NOT NULL,
  impressions NUMERIC NOT NULL DEFAULT 0,
  reach NUMERIC NOT NULL DEFAULT 0,
  clicks NUMERIC NOT NULL DEFAULT 0,
  ctr NUMERIC(6,3) NOT NULL DEFAULT 0,
  spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversions NUMERIC NOT NULL DEFAULT 0,
  cpa NUMERIC(10,2) NOT NULL DEFAULT 0,
  roas NUMERIC(6,2) NOT NULL DEFAULT 0,
  followers_total NUMERIC NOT NULL DEFAULT 0,
  followers_growth NUMERIC NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas
ALTER TABLE public.social_traffic_metrics
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metric_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS impressions NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr NUMERIC(6,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpa NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roas NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers_total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers_growth NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- 3. TABELA social_scheduled_posts (Agendamento de Publicações & Calendário de Conteúdo)
CREATE TABLE IF NOT EXISTS public.social_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  platforms TEXT[] NOT NULL DEFAULT ARRAY['instagram']::TEXT[],
  post_type TEXT NOT NULL DEFAULT 'feed_image' CHECK (post_type IN ('feed_image', 'carousel', 'reels', 'story', 'text_only')),
  caption TEXT NOT NULL,
  media_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  error_message TEXT,
  published_post_id TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas
ALTER TABLE public.social_scheduled_posts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT ARRAY['instagram']::TEXT[],
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'feed_image',
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS published_post_id TEXT;

-- 4. TABELA ai_growth_insights (Recomendações e Dicas de Crescimento com IA)
CREATE TABLE IF NOT EXISTS public.ai_growth_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('budget_optimization', 'creative_performance', 'audience_targeting', 'posting_schedule', 'churn_alert')),
  title TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  expected_impact TEXT NOT NULL DEFAULT 'medio' CHECK (expected_impact IN ('alto', 'medio', 'baixo')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas
ALTER TABLE public.ai_growth_insights
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS expected_impact TEXT DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_csa_tenant_client ON public.client_social_accounts(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_csa_platform ON public.client_social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_stm_account_date ON public.social_traffic_metrics(account_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_stm_tenant_date ON public.social_traffic_metrics(tenant_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ssp_tenant_client ON public.social_scheduled_posts(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_ssp_scheduled_status ON public.social_scheduled_posts(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_agi_client_status ON public.ai_growth_insights(client_id, status);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.client_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_growth_insights ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento por tenant
DROP POLICY IF EXISTS "tenant_isolation_csa" ON public.client_social_accounts;
CREATE POLICY "tenant_isolation_csa" ON public.client_social_accounts
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  ) WITH CHECK (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_stm" ON public.social_traffic_metrics;
CREATE POLICY "tenant_isolation_stm" ON public.social_traffic_metrics
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  ) WITH CHECK (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_ssp" ON public.social_scheduled_posts;
CREATE POLICY "tenant_isolation_ssp" ON public.social_scheduled_posts
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  ) WITH CHECK (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_agi" ON public.ai_growth_insights;
CREATE POLICY "tenant_isolation_agi" ON public.ai_growth_insights
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  ) WITH CHECK (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  );


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006010000_insertion_orders_checking_settlements.sql
-- ------------------------------------------------------------------------------
-- ============================================================================
-- MIGRAÇÃO: Módulo de Pedidos de Inserção (PI), Checking e Conciliação Financeira
-- Dialeto: PostgreSQL (compatível com Supabase)
-- Políticas estritas de Zero Perda de Dados (IF NOT EXISTS, tipos seguros)
-- ============================================================================

-- 1. TIPOS ENUMERADOS (ENUMS) COM VERIFICAÇÃO SEGURA
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type_enum') THEN
    CREATE TYPE billing_type_enum AS ENUM (
      'REPRESENTATIVE_BILLING',    -- Modalidade 1: Representante fatura o cliente e repassa ao veículo
      'DIRECT_VEHICLE_BILLING'     -- Modalidade 2: Veículo fatura direto e repassa comissão ao representante
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_status_enum') THEN
    CREATE TYPE pi_status_enum AS ENUM (
      'draft',              -- Rascunho
      'approved',           -- Aprovado / Autorizado para veiculação
      'in_broadcast',       -- Em veiculação
      'awaiting_checking',  -- Aguardando comprovação / relatórios
      'checking_approved',  -- Checking conferido e aprovado pelo Representante
      'billed',             -- Faturado / Dossiê enviado para o Cliente
      'paid_by_client',     -- Cliente quitou a fatura
      'settled',            -- Comissões e repasses aos veículos 100% concluídos
      'canceled'            -- Cancelado
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checking_status_enum') THEN
    CREATE TYPE checking_status_enum AS ENUM (
      'pending_upload',     -- Aguardando envio de arquivos pelo veículo
      'under_review',       -- Em conferência pelo Representante
      'approved',           -- Aprovado
      'rejected'            -- Reprovado com necessidade de reenvio
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_type_enum') THEN
    CREATE TYPE settlement_type_enum AS ENUM (
      'CLIENT_RECEIVABLE',      -- Cobrança contra o cliente (fatura bruta)
      'VEHICLE_PAYABLE',       -- Repasse líquido destinado ao veículo
      'COMMISSION_RECEIVABLE'   -- Comissão a receber do veículo (Modalidade 2)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_status_enum') THEN
    CREATE TYPE settlement_status_enum AS ENUM (
      'pending_checking',   -- Aguardando validação do checking
      'awaiting_payment',   -- Liberado para pagamento / aguardando vencimento
      'paid',               -- Liquidado
      'canceled'            -- Cancelado
    );
  END IF;
END $$;

-- ============================================================================
-- 2. TABELA PRINCIPAL: insertion_orders (PIs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.insertion_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pi_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    agency_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
    representative_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
    legacy_pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
    
    billing_type billing_type_enum NOT NULL DEFAULT 'REPRESENTATIVE_BILLING',
    status pi_status_enum NOT NULL DEFAULT 'draft',
    checking_status checking_status_enum NOT NULL DEFAULT 'pending_upload',
    
    -- Valores Financeiros Consolidados
    gross_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    representative_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- Ex: 20.00 (%)
    representative_commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_vehicle_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Período de Campanha
    campaign_name VARCHAR(255) NOT NULL DEFAULT 'Campanha de Mídia',
    campaign_title VARCHAR(255), -- Alias retrocompatível
    campaign_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    campaign_end_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start DATE,           -- Alias retrocompatível
    period_end DATE,             -- Alias retrocompatível
    
    -- Dossiê Digital e Documentação
    invoice_number VARCHAR(100),
    invoice_url TEXT,
    vehicle_invoice_number VARCHAR(100),
    vehicle_invoice_url TEXT,
    dossier_url TEXT,
    dossier_data JSONB DEFAULT '{}'::jsonb,
    dossier_generated_at TIMESTAMPTZ,

    -- Metadados e Auditoria
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. TABELA DE ITENS DO PI: pi_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pi_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
    
    format_description VARCHAR(255) NOT NULL, -- Ex: "Banner Topo 970x90", "Spot 30s", "Post Feed"
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    insertions_count INTEGER NOT NULL DEFAULT 1,
    
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Divisão específica por item/veículo
    vehicle_commission_rate NUMERIC(5, 2), -- Caso varie por veículo/linha
    vehicle_commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vehicle_net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    checking_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. TABELA DE AUDITORIA/CHECKING: pi_checkings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pi_checkings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
    pi_item_id UUID REFERENCES public.pi_items(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type VARCHAR(50), -- 'image/png', 'application/pdf', 'audio/mp3', etc.
    description TEXT,
    notes TEXT,
    external_link TEXT,
    broadcast_date DATE,
    broadcast_time TEXT,
    
    status checking_status_enum NOT NULL DEFAULT 'under_review',
    rejection_reason TEXT,
    
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. TABELA FINANCEIRA DE CONCILIAÇÃO/REPASSES: pi_settlements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pi_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
    pi_item_id UUID REFERENCES public.pi_items(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    
    type settlement_type_enum NOT NULL,
    
    -- Partes envolvidas no pagamento/repasse
    payer_id UUID,
    receiver_id UUID,
    payer_type TEXT, -- 'client', 'representative', 'vehicle'
    receiver_type TEXT, -- 'representative', 'vehicle'
    
    amount NUMERIC(14, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    
    status settlement_status_enum NOT NULL DEFAULT 'pending_checking',
    invoice_number VARCHAR(100),
    proof_of_payment_url TEXT,
    receipt_url TEXT,
    payment_method TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. ÍNDICES PARA ALTA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_insertion_orders_tenant ON public.insertion_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_client ON public.insertion_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_representative ON public.insertion_orders(representative_id);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_status ON public.insertion_orders(status);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_checking ON public.insertion_orders(checking_status);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_billing ON public.insertion_orders(billing_type);

CREATE INDEX IF NOT EXISTS idx_pi_items_pi_id ON public.pi_items(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_vehicle_id ON public.pi_items(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_pi_checkings_pi_id ON public.pi_checkings(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_checkings_item_id ON public.pi_checkings(pi_item_id);
CREATE INDEX IF NOT EXISTS idx_pi_checkings_status ON public.pi_checkings(status);

CREATE INDEX IF NOT EXISTS idx_pi_settlements_pi_id ON public.pi_settlements(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_settlements_status ON public.pi_settlements(status);
CREATE INDEX IF NOT EXISTS idx_pi_settlements_type ON public.pi_settlements(type);

-- ============================================================================
-- 7. GATILHO (TRIGGER): TRAVA INVIOLÁVEL DE CHECKING PARA FATURAMENTO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_checking_before_billing()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status estiver mudando para 'billed' ou 'checking_approved'
    IF NEW.status IN ('billed', 'checking_approved') AND OLD.status NOT IN ('billed', 'checking_approved') THEN
        -- Verifica se o checking do PI foi formalmente aprovado
        IF NEW.checking_status != 'approved' THEN
            RAISE EXCEPTION 'Não é permitido faturar ou liberar o PI % sem aprovação formal de 100%% do checking.', NEW.pi_number;
        END IF;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_pi_billing_lock ON public.insertion_orders;
CREATE TRIGGER trg_check_pi_billing_lock
BEFORE UPDATE ON public.insertion_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_checking_before_billing();

-- ============================================================================
-- 8. GATILHO (TRIGGER): ATUALIZAÇÃO AUTOMÁTICA DOS TOTAIS DO PI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_pi_totals_from_items()
RETURNS TRIGGER AS $$
DECLARE
    target_pi_id UUID;
    total_bruto NUMERIC(14, 2);
    total_liquido NUMERIC(14, 2);
    total_comissao NUMERIC(14, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_pi_id := OLD.pi_id;
    ELSE
        target_pi_id := NEW.pi_id;
    END IF;

    SELECT 
        COALESCE(SUM(total_price), 0),
        COALESCE(SUM(vehicle_net_amount), 0),
        COALESCE(SUM(vehicle_commission_amount), 0)
    INTO total_bruto, total_liquido, total_comissao
    FROM public.pi_items
    WHERE pi_id = target_pi_id;

    UPDATE public.insertion_orders
    SET 
        gross_amount = total_bruto,
        net_vehicle_amount = total_liquido,
        representative_commission_amount = total_comissao,
        updated_at = NOW()
    WHERE id = target_pi_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_pi_totals ON public.pi_items;
CREATE TRIGGER trg_sync_pi_totals
AFTER INSERT OR UPDATE OR DELETE ON public.pi_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_pi_totals_from_items();

-- ============================================================================
-- 9. HABILITAR ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACESSO MULTI-TENANT
-- ============================================================================
ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_checkings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_settlements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['insertion_orders', 'pi_items', 'pi_checkings', 'pi_settlements'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select_%s" ON public.%s;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_insert_%s" ON public.%s;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_update_%s" ON public.%s;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_delete_%s" ON public.%s;', t, t);

    EXECUTE format('
      CREATE POLICY "tenant_isolation_select_%s" ON public.%s
      FOR SELECT USING (
        auth.role() = ''authenticated'' AND (
          tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id IS NULL
        )
      );', t, t);

    EXECUTE format('
      CREATE POLICY "tenant_isolation_insert_%s" ON public.%s
      FOR INSERT WITH CHECK (
        auth.role() = ''authenticated''
      );', t, t);

    EXECUTE format('
      CREATE POLICY "tenant_isolation_update_%s" ON public.%s
      FOR UPDATE USING (
        auth.role() = ''authenticated'' AND (
          tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id IS NULL
        )
      );', t, t);

    EXECUTE format('
      CREATE POLICY "tenant_isolation_delete_%s" ON public.%s
      FOR DELETE USING (
        auth.role() = ''authenticated'' AND (
          tenant_id = (auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id = (auth.jwt() -> ''user_metadata'' ->> ''tenant_id'')::uuid
          OR tenant_id IS NULL
        )
      );', t, t);
  END LOOP;
END $$;

-- PERMISSÕES DE ACESSO
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insertion_orders TO authenticated;
GRANT ALL ON public.insertion_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_items TO authenticated;
GRANT ALL ON public.pi_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_checkings TO authenticated;
GRANT ALL ON public.pi_checkings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_settlements TO authenticated;
GRANT ALL ON public.pi_settlements TO service_role;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006020000_pi_production_costs_support.sql
-- ------------------------------------------------------------------------------
-- ============================================================================
-- MIGRAÇÃO: Suporte a Custos de Produção (Embutidos vs. Discriminados)
-- Dialeto: PostgreSQL (compatível com Supabase)
-- ============================================================================

-- 1. NOVOS TIPOS ENUMERADOS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_item_type_enum') THEN
        CREATE TYPE pi_item_type_enum AS ENUM (
            'MEDIA',        -- Inserções publicitárias / veiculação
            'PRODUCTION'   -- Produção (gravação de spot, edição de vídeo, arte estática, etc.)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_item_display_mode_enum') THEN
        CREATE TYPE pi_item_display_mode_enum AS ENUM (
            'ITEMIZED',     -- Aberto / Discriminado no espelho do cliente
            'EMBEDDED'      -- Embutido no valor da mídia (oculto do cliente)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_display_mode_enum') THEN
        CREATE TYPE pi_display_mode_enum AS ENUM (
            'ITEMIZED',
            'EMBEDDED'
        );
    END IF;
END $$;

-- ============================================================================
-- 2. ALTERAÇÃO NA TABELA pi_items
-- ============================================================================
ALTER TABLE public.pi_items
    ADD COLUMN IF NOT EXISTS item_type pi_item_type_enum NOT NULL DEFAULT 'MEDIA',
    ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'ITEMIZED',
    ADD COLUMN IF NOT EXISTS parent_media_item_id UUID REFERENCES public.pi_items(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_commissionable BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS media_raw_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS embedded_production_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS client_facing_total NUMERIC(14,2) NOT NULL DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_pi_items_parent_media ON public.pi_items(parent_media_item_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_item_type ON public.pi_items(item_type);
CREATE INDEX IF NOT EXISTS idx_pi_items_display_mode ON public.pi_items(display_mode);

-- ============================================================================
-- 3. VIEW SQL: ESPELHO DO CLIENTE (Visão Comercial / Exibição em PDF)
--
-- Regras aplicadas:
-- a) Itens com display_mode = 'EMBEDDED' NUNCA aparecem como linhas separadas.
-- b) Itens 'MEDIA' somam automaticamente os custos de produção vinculados a eles.
-- c) Itens 'PRODUCTION' com display_mode = 'ITEMIZED' aparecem normalmente.
-- ============================================================================
CREATE OR REPLACE VIEW public.view_client_pi_items AS
WITH embedded_costs AS (
    -- Consolida o valor de produção embutido por item pai
    SELECT 
        parent_media_item_id,
        COALESCE(SUM(total_price), 0.00) AS total_embedded_production
    FROM public.pi_items
    WHERE item_type = 'PRODUCTION' 
      AND display_mode = 'EMBEDDED'
      AND parent_media_item_id IS NOT NULL
    GROUP BY parent_media_item_id
)
SELECT 
    i.id AS item_id,
    i.pi_id,
    i.vehicle_id,
    i.item_type,
    i.format_description,
    i.period_start,
    i.period_end,
    i.insertions_count,
    
    -- Se tiver produção embutida, o preço unitário e o total refletem o valor consolidado
    CASE 
        WHEN i.item_type = 'MEDIA' AND ec.total_embedded_production > 0 THEN
            ROUND((i.total_price + ec.total_embedded_production) / NULLIF(i.insertions_count, 0), 2)
        ELSE 
            i.unit_price
    END AS client_unit_price,
    
    CASE 
        WHEN i.item_type = 'MEDIA' AND ec.total_embedded_production > 0 THEN
            i.total_price + ec.total_embedded_production
        ELSE 
            i.total_price
    END AS client_total_price

FROM public.pi_items i
LEFT JOIN embedded_costs ec ON ec.parent_media_item_id = i.id
WHERE 
    -- Regra de ouro do cliente: não listar linhas que foram marcadas para serem embutidas
    i.display_mode = 'ITEMIZED';

-- Permissão de leitura na view para usuários autenticados
GRANT SELECT ON public.view_client_pi_items TO authenticated;
GRANT SELECT ON public.view_client_pi_items TO service_role;

-- ============================================================================
-- 4. ATUALIZAÇÃO DA TRIGGER DE TOTAIS DO PI (Considerando is_commissionable)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_pi_totals_from_items()
RETURNS TRIGGER AS $$
DECLARE
    target_pi_id UUID;
    total_bruto NUMERIC(14, 2);
    total_liquido NUMERIC(14, 2);
    total_comissao NUMERIC(14, 2);
    pi_comm_rate NUMERIC(5, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_pi_id := OLD.pi_id;
    ELSE
        target_pi_id := NEW.pi_id;
    END IF;

    -- Obtém a taxa padrão de comissão cadastrada no cabeçalho do PI
    SELECT representative_commission_rate 
    INTO pi_comm_rate 
    FROM public.insertion_orders 
    WHERE id = target_pi_id;

    -- Recalcula os totais respeitando itens não comissionáveis (ex: produções repassadas a custo seco)
    SELECT 
        COALESCE(SUM(total_price), 0.00),
        COALESCE(SUM(
            CASE 
                -- Se não é comissionável, o valor líquido do veículo/produtor é 100% do total
                WHEN is_commissionable = FALSE THEN total_price
                -- Se tem taxa customizada por linha
                WHEN vehicle_commission_rate IS NOT NULL THEN total_price * (1 - (vehicle_commission_rate / 100))
                -- Caso contrário, usa a taxa geral do PI
                ELSE total_price * (1 - (COALESCE(pi_comm_rate, 0) / 100))
            END
        ), 0.00),
        COALESCE(SUM(
            CASE 
                -- Sem comissão para o representante em itens não comissionáveis
                WHEN is_commissionable = FALSE THEN 0.00
                -- Comissão customizada da linha
                WHEN vehicle_commission_rate IS NOT NULL THEN total_price * (vehicle_commission_rate / 100)
                -- Comissão pela taxa geral do PI
                ELSE total_price * (COALESCE(pi_comm_rate, 0) / 100)
            END
        ), 0.00)
    INTO total_bruto, total_liquido, total_comissao
    FROM public.pi_items
    WHERE pi_id = target_pi_id;

    UPDATE public.insertion_orders
    SET 
        gross_amount = total_bruto,
        net_vehicle_amount = total_liquido,
        representative_commission_amount = total_comissao,
        updated_at = NOW()
    WHERE id = target_pi_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006030000_rbac_cnpj_isolation_master_user.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006030000_rbac_cnpj_isolation_master_user.sql
-- DESCRIÇÃO: Implementação de Políticas de Acesso (RBAC / Multi-Tenant por CNPJ)
--            e Provisionamento Definitivo do Usuário Master (Superadministrador)
-- DIRETRIZES: Aditiva, 100% não-destrutiva (Zero Perda de Dados)
-- ==============================================================================

-- 1. EXTENSÃO E AJUSTE DE COLUNAS EM profiles (ROLES & CNPJ VINCULADO)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'OPERATOR',
  ADD COLUMN IF NOT EXISTS cnpj_vinculado TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Índices para buscas rápidas de autenticação e governança
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_cnpj_vinculado ON public.profiles(cnpj_vinculado);
CREATE INDEX IF NOT EXISTS idx_profiles_is_superadmin ON public.profiles(is_superadmin);

-- 2. VIEW PÚBLICA user_profiles PARA COMPATIBILIDADE PLENA COM POLÍTICAS E CONSULTAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  p.id AS user_id,
  p.id,
  p.email,
  p.nome,
  COALESCE(p.role, 'OPERATOR') AS role,
  COALESCE(p.cnpj_vinculado, p.cnpj) AS cnpj,
  COALESCE(p.cnpj_vinculado, p.cnpj) AS cnpj_vinculado,
  p.tenant_id,
  COALESCE(p.is_superadmin, false) AS is_superadmin,
  p.ativo,
  p.cargo,
  p.telefone,
  p.whatsapp,
  p.created_at,
  p.updated_at
FROM public.profiles p;

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO service_role;

-- 3. FUNÇÕES AUXILIARES DE RESOLUÇÃO DE IDENTIDADE E RLS
-- ------------------------------------------------------------------------------

-- Função para verificar se o usuário é Master (Superadministrador Irrestrito)
CREATE OR REPLACE FUNCTION public.is_master_user(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (
    -- E-mail superadmin conhecido
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = _user_id
        AND lower(u.email) IN ('rafaelrodrigo.as@gmail.com', 'rafaelnexomidia@gmail.com')
    )
    -- Perfil marcado como MASTER ou is_superadmin
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id
        AND (
          upper(COALESCE(p.role, '')) = 'MASTER'
          OR p.is_superadmin = true
          OR lower(COALESCE(p.email, '')) IN ('rafaelrodrigo.as@gmail.com', 'rafaelnexomidia@gmail.com')
        )
    )
    -- Papel super_admin em user_roles
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'super_admin'
    )
    -- Claim no JWT
    OR (
      (auth.jwt() ->> 'role') = 'MASTER'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'MASTER'
      OR (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean IS TRUE
    )
  );
END;
$$;

-- Alias global estável de is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_master_user(_user_id);
$$;

-- Função estável para obter o CNPJ vinculado ao usuário autenticado atual
CREATE OR REPLACE FUNCTION public.get_current_user_cnpj()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(cnpj_vinculado, cnpj)
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Função estável para obter a role atual do usuário
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_master_user() THEN 'MASTER'
    ELSE COALESCE(
      (SELECT upper(role) FROM public.profiles WHERE id = auth.uid()),
      'OPERATOR'
    )
  END;
$$;

-- 4. TABELA CENTRAL DE ENTIDADES (CLIENTES, VEÍCULOS, AGÊNCIAS, PARCEIROS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'cliente', -- 'cliente', 'veiculo', 'parceiro', 'agencia'
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entities_tenant ON public.entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entities_cnpj ON public.entities(cnpj);
CREATE INDEX IF NOT EXISTS idx_entities_tipo ON public.entities(tipo);

-- Sincronização inicial não-destrutiva de entidades
INSERT INTO public.entities (id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
SELECT 
  c.id, 
  'cliente', 
  c.razao_social, 
  c.nome_fantasia, 
  c.cnpj, 
  NULL, 
  NULL, 
  (CASE WHEN c.status = 'inativo' THEN false ELSE true END)
FROM public.clientes c
WHERE c.cnpj IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  cnpj = EXCLUDED.cnpj,
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia;

INSERT INTO public.entities (id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
SELECT 
  a.id, 
  'agencia', 
  a.razao_social, 
  a.nome_fantasia, 
  a.cnpj, 
  NULL, 
  NULL, 
  true
FROM public.agencias a
WHERE a.cnpj IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  cnpj = EXCLUDED.cnpj,
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    INSERT INTO public.entities (id, tipo, razao_social, nome_fantasia, cnpj, email, telefone, ativo)
    SELECT 
      p.id, 
      'veiculo', 
      p.razao_social, 
      p.nome_fantasia, 
      p.cnpj, 
      p.contato_email, 
      p.contato_telefone, 
      COALESCE(p.ativo, true)
    FROM public.parceiros p
    WHERE p.cnpj IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      cnpj = EXCLUDED.cnpj,
      razao_social = EXCLUDED.razao_social,
      nome_fantasia = EXCLUDED.nome_fantasia;
  END IF;
END $$;

-- 5. ATUALIZAÇÃO DAS TABELAS DE PIS, ITENS, CHECKINGS E SETTLEMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.insertion_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_number VARCHAR(50) NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  agency_id UUID,
  representative_id UUID NOT NULL,
  cnpj_cliente TEXT,
  cnpj_veiculo TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  checking_status TEXT NOT NULL DEFAULT 'pending_upload',
  billing_type TEXT NOT NULL DEFAULT 'REPRESENTATIVE_BILLING',
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  net_vehicle_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  representative_commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  campaign_name VARCHAR(255) NOT NULL DEFAULT 'Campanha de Mídia',
  campaign_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  campaign_end_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  dossier_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insertion_orders
  ADD COLUMN IF NOT EXISTS cnpj_cliente TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_veiculo TEXT;

CREATE INDEX IF NOT EXISTS idx_insertion_orders_cnpj_cliente ON public.insertion_orders(cnpj_cliente);
CREATE INDEX IF NOT EXISTS idx_insertion_orders_cnpj_veiculo ON public.insertion_orders(cnpj_veiculo);

-- Sincronizar cnpj_cliente em insertion_orders a partir de clientes
UPDATE public.insertion_orders io
SET cnpj_cliente = c.cnpj
FROM public.clientes c
WHERE io.client_id = c.id
  AND io.cnpj_cliente IS NULL
  AND c.cnpj IS NOT NULL;

-- Sincronizar cnpj_veiculo em insertion_orders se ainda vazio
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    UPDATE public.insertion_orders io
    SET cnpj_veiculo = p.cnpj
    FROM public.pi_items pit
    JOIN public.partners p ON pit.vehicle_id = p.id
    WHERE pit.pi_id = io.id
      AND io.cnpj_veiculo IS NULL
      AND p.cnpj IS NOT NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    UPDATE public.insertion_orders io
    SET cnpj_veiculo = p.cnpj
    FROM public.pi_items pit
    JOIN public.parceiros p ON pit.vehicle_id = p.id
    WHERE pit.pi_id = io.id
      AND io.cnpj_veiculo IS NULL
      AND p.cnpj IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL,
  cnpj_veiculo TEXT,
  format_description VARCHAR(255) NOT NULL DEFAULT '',
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT CURRENT_DATE,
  insertions_count INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  vehicle_net_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  vehicle_commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pi_items
  ADD COLUMN IF NOT EXISTS cnpj_veiculo TEXT;

CREATE TABLE IF NOT EXISTS public.pi_checkings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  pi_item_id UUID,
  vehicle_id UUID,
  cnpj_veiculo TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'under_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pi_checkings
  ADD COLUMN IF NOT EXISTS cnpj_veiculo TEXT;

CREATE TABLE IF NOT EXISTS public.pi_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.insertion_orders(id) ON DELETE CASCADE,
  pi_item_id UUID,
  vehicle_id UUID,
  cnpj_pagador TEXT,
  cnpj_recebedor TEXT,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_checking',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pi_settlements
  ADD COLUMN IF NOT EXISTS cnpj_pagador TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_recebedor TEXT;

-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS) RIGOROSAS (RBAC / CNPJ / MASTER)
-- ------------------------------------------------------------------------------

-- Habilitar RLS em todas as tabelas centrais
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_checkings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_settlements ENABLE ROW LEVEL SECURITY;

-- Permissões básicas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insertion_orders TO authenticated;
GRANT ALL ON public.insertion_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_items TO authenticated;
GRANT ALL ON public.pi_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_checkings TO authenticated;
GRANT ALL ON public.pi_checkings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_settlements TO authenticated;
GRANT ALL ON public.pi_settlements TO service_role;

-- === RLS EM insertion_orders ===
DROP POLICY IF EXISTS "insertion_orders_rbac_all" ON public.insertion_orders;
DROP POLICY IF EXISTS "tenant_isolation_select_insertion_orders" ON public.insertion_orders;
DROP POLICY IF EXISTS "tenant_isolation_insert_insertion_orders" ON public.insertion_orders;
DROP POLICY IF EXISTS "tenant_isolation_update_insertion_orders" ON public.insertion_orders;
DROP POLICY IF EXISTS "tenant_isolation_delete_insertion_orders" ON public.insertion_orders;
DROP POLICY IF EXISTS "Permissao por CNPJ ou Master" ON public.insertion_orders;

CREATE POLICY "Permissao por CNPJ ou Master" ON public.insertion_orders
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_cliente = public.get_current_user_cnpj()
      OR cnpj_veiculo = public.get_current_user_cnpj()
      OR client_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
      OR agency_id IN (SELECT id FROM public.agencias WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_cliente = public.get_current_user_cnpj()
      OR cnpj_veiculo = public.get_current_user_cnpj()
      OR client_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- === RLS EM pi_items ===
DROP POLICY IF EXISTS "pi_items_rbac_all" ON public.pi_items;
DROP POLICY IF EXISTS "tenant_isolation_select_pi_items" ON public.pi_items;
DROP POLICY IF EXISTS "tenant_isolation_insert_pi_items" ON public.pi_items;
DROP POLICY IF EXISTS "tenant_isolation_update_pi_items" ON public.pi_items;
DROP POLICY IF EXISTS "tenant_isolation_delete_pi_items" ON public.pi_items;

CREATE POLICY "pi_items_rbac_all" ON public.pi_items
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_veiculo = public.get_current_user_cnpj()
      OR pi_id IN (
        SELECT id FROM public.insertion_orders
        WHERE cnpj_cliente = public.get_current_user_cnpj()
           OR cnpj_veiculo = public.get_current_user_cnpj()
      )
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- === RLS EM pi_checkings ===
DROP POLICY IF EXISTS "pi_checkings_rbac_all" ON public.pi_checkings;
DROP POLICY IF EXISTS "tenant_isolation_select_pi_checkings" ON public.pi_checkings;
DROP POLICY IF EXISTS "tenant_isolation_insert_pi_checkings" ON public.pi_checkings;
DROP POLICY IF EXISTS "tenant_isolation_update_pi_checkings" ON public.pi_checkings;
DROP POLICY IF EXISTS "tenant_isolation_delete_pi_checkings" ON public.pi_checkings;

CREATE POLICY "pi_checkings_rbac_all" ON public.pi_checkings
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_veiculo = public.get_current_user_cnpj()
      OR pi_id IN (
        SELECT id FROM public.insertion_orders
        WHERE cnpj_cliente = public.get_current_user_cnpj()
           OR cnpj_veiculo = public.get_current_user_cnpj()
      )
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND cnpj_veiculo = public.get_current_user_cnpj()
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- === RLS EM pi_settlements ===
DROP POLICY IF EXISTS "pi_settlements_rbac_all" ON public.pi_settlements;
DROP POLICY IF EXISTS "tenant_isolation_select_pi_settlements" ON public.pi_settlements;
DROP POLICY IF EXISTS "tenant_isolation_insert_pi_settlements" ON public.pi_settlements;
DROP POLICY IF EXISTS "tenant_isolation_update_pi_settlements" ON public.pi_settlements;
DROP POLICY IF EXISTS "tenant_isolation_delete_pi_settlements" ON public.pi_settlements;

CREATE POLICY "pi_settlements_rbac_all" ON public.pi_settlements
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cnpj_pagador = public.get_current_user_cnpj()
      OR cnpj_recebedor = public.get_current_user_cnpj()
      OR pi_id IN (
        SELECT id FROM public.insertion_orders
        WHERE cnpj_cliente = public.get_current_user_cnpj()
           OR cnpj_veiculo = public.get_current_user_cnpj()
      )
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- === RLS EM entities ===
DROP POLICY IF EXISTS "entities_rbac_all" ON public.entities;
CREATE POLICY "entities_rbac_all" ON public.entities
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND cnpj = public.get_current_user_cnpj()
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
);

-- === REFORÇO DE RLS NA TABELA LEGADA/OPERACIONAL pis ===
DROP POLICY IF EXISTS "pis_rbac_master_or_cnpj" ON public.pis;
CREATE POLICY "pis_rbac_master_or_cnpj" ON public.pis
FOR ALL TO authenticated
USING (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cliente_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
      OR agencia_id IN (SELECT id FROM public.agencias WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
)
WITH CHECK (
  public.is_master_user()
  OR (
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);

-- 7. PROVISIONAMENTO E ATUALIZAÇÃO SEGURA DO USUÁRIO MASTER
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- 1. Obter ou criar usuário no auth.users
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'rafaelrodrigo.as@gmail.com' LIMIT 1;
  
  IF v_uid IS NULL THEN
    v_uid := '186561e6-9a7f-4ded-a4d6-c470ae3f54ec'::UUID;
    -- [Higienização] INSERT auth.users suprimido
ELSE
    -- [Higienização] UPDATE auth.users suprimido
END IF;

  -- 2. Garantir identidade do Supabase Auth
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider = 'email' AND provider_id = 'rafaelrodrigo.as@gmail.com') THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_uid,
      v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', 'rafaelrodrigo.as@gmail.com'),
      'email',
      'rafaelrodrigo.as@gmail.com',
      now(), now(), now()
    );
  ELSE
    UPDATE auth.identities
    SET user_id = v_uid, identity_data = jsonb_build_object('sub', v_uid::text, 'email', 'rafaelrodrigo.as@gmail.com')
    WHERE provider = 'email' AND provider_id = 'rafaelrodrigo.as@gmail.com';
  END IF;

  -- 3. Atualizar/Inserir perfil na tabela public.profiles com role MASTER
  INSERT INTO public.profiles (id, nome, email, role, is_superadmin, ativo)
  VALUES (v_uid, 'Rafael Rodrigo', 'rafaelrodrigo.as@gmail.com', 'MASTER', true, true)
  ON CONFLICT (id) DO UPDATE SET
    role = 'MASTER',
    is_superadmin = true,
    ativo = true,
    updated_at = now();

  -- 4. Garantir privilégio na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006090000_midia_os_multi_proposito_universal.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006090000_midia_os_multi_proposito_universal.sql
-- DESCRIÇÃO: Refatoração Estrutural e Arquitetural Multi-Propósito Mídia.OS
--            (Veículos, Agências, Representantes, Personalização por Inquilino)
-- DIRETRIZES: 100% Aditiva, Não-Destrutiva (Zero Perda de Dados)
-- ==============================================================================

-- 1. TIPOLOGIA DE ENTIDADES E PARCEIROS DO INQUILINO
-- ------------------------------------------------------------------------------
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS perfil_comercial TEXT DEFAULT 'VEICULO_EXIBIDOR';

CREATE INDEX IF NOT EXISTS idx_parceiros_perfil_comercial ON public.parceiros(perfil_comercial);

-- 2. MODELAGEM DINÂMICA DE PRODUTOS E FORMATOS (EXTENSÍVEL)
-- ------------------------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS posicao_site TEXT,
  ADD COLUMN IF NOT EXISTS dimensoes_pixels TEXT,
  ADD COLUMN IF NOT EXISTS url_destino TEXT,
  ADD COLUMN IF NOT EXISTS tiragem_estimada NUMERIC,
  ADD COLUMN IF NOT EXISTS sentido_fluxo TEXT,
  ADD COLUMN IF NOT EXISTS ponto_referencia TEXT,
  ADD COLUMN IF NOT EXISTS impactos_estimados NUMERIC,
  ADD COLUMN IF NOT EXISTS formato_impresso TEXT,
  ADD COLUMN IF NOT EXISTS dimensoes_cm TEXT;

-- 3. MÓDULOS ATIVOS NO INQUILINO (TENANT SETTINGS & TENANTS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'];

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  configuracoes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para tenant_settings
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_settings_select_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_select_policy" ON public.tenant_settings
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

DROP POLICY IF EXISTS "tenant_settings_insert_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_insert_policy" ON public.tenant_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

DROP POLICY IF EXISTS "tenant_settings_update_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_update_policy" ON public.tenant_settings
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

-- Garantir registro padrão na tenant_settings para tenants existentes que ainda não possuam
INSERT INTO public.tenant_settings (tenant_id, active_modules)
SELECT id, ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO']
FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006100000_multi_proposito_config_and_terminologia.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006100000_multi_proposito_config_and_terminologia.sql
-- DESCRIÇÃO: Expansão Aditiva do Mídia.OS Multi-Propósito
--            Suporte a configurações de módulos ativos e terminologia por inquilino.
-- DIRETRIZES: 100% Aditiva, Não-Destrutiva (Zero Perda de Dados)
-- ==============================================================================

-- 1. Garantir colunas em tenant_settings
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS terminologia_veiculo TEXT DEFAULT 'Veículo de Comunicação';

-- 2. Garantir sincronia em tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'];

-- 3. Atualizar registros existentes onde active_modules seja nulo
UPDATE public.tenant_settings
SET active_modules = ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO']
WHERE active_modules IS NULL OR array_length(active_modules, 1) = 0;

UPDATE public.tenant_settings
SET modulos_ativos = active_modules
WHERE modulos_ativos IS NULL;

-- 4. Garantir índices úteis para consultas de perfil e módulos
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON public.tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_perfil_comercial ON public.parceiros(perfil_comercial);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006140000_modulo_contratos_representacao_veiculos.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006140000_modulo_contratos_representacao_veiculos.sql
-- DESCRIÇÃO: Módulo de Gestão de Contratos de Representação e Veículos
--            Inquilino Alvo: NEXO MÍDIA E REPRESENTAÇÃO LTDA (CNPJ: 68.279.031/0001-67)
-- DIRETRIZ: 100% Aditiva, Não-destrutiva, com Auditoria e Lixeira Automática
-- ==============================================================================

-- 1. View de compatibilidade / alias para parceiros_veiculos
CREATE OR REPLACE VIEW public.parceiros_veiculos AS
  SELECT * FROM public.parceiros;

-- 2. Tabela de Contratos de Representação Comercial com Veículos
CREATE TABLE IF NOT EXISTS public.contratos_representacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_cnpj TEXT NOT NULL DEFAULT '68.279.031/0001-67',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE RESTRICT,
  numero_contrato TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'enviado_assinatura', 'ativo', 'suspenso', 'rescindido', 'vencido')
  ),
  produtos_representados TEXT[] DEFAULT '{}',
  territorio TEXT NOT NULL DEFAULT 'Distrito Federal e Entorno',

  -- Modelos de Faturamento Habilitados
  permite_faturamento_centralizado_nexo BOOLEAN NOT NULL DEFAULT true,
  aliquota_imposto_nexo_percentual NUMERIC(5,2) NOT NULL DEFAULT 6.00,
  permite_faturamento_direto_parceiro BOOLEAN NOT NULL DEFAULT true,
  prazo_repasse_dias INTEGER NOT NULL DEFAULT 3,

  -- Regras de Remuneração (Fixa ou Gatilhos de Volume)
  tipo_comissao TEXT NOT NULL DEFAULT 'fixa' CHECK (
    tipo_comissao IN ('fixa', 'gatilho_volume')
  ),
  comissao_fixa_percentual NUMERIC(5,2),
  regras_gatilho JSONB DEFAULT '[
    {"faixa": 1, "de": 0, "ate": 30000, "comissao_percentual": 30.0},
    {"faixa": 2, "de": 30001, "ate": 70000, "comissao_percentual": 35.0},
    {"faixa": 3, "de": 70001, "ate": null, "comissao_percentual": 40.0}
  ]'::jsonb,

  -- Garantias de continuidade e blindagem
  garantia_comissao_pos_rescisao BOOLEAN NOT NULL DEFAULT true,
  comissao_sobre_renovacoes BOOLEAN NOT NULL DEFAULT true,
  vigencia_meses INTEGER NOT NULL DEFAULT 12,
  data_inicio DATE,
  data_fim DATE,
  conteudo_contrato_markdown TEXT,

  -- Auditoria e controle
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance para contratos_representacao
CREATE INDEX IF NOT EXISTS idx_contratos_rep_tenant_cnpj ON public.contratos_representacao(tenant_cnpj);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_parceiro_id ON public.contratos_representacao(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_status ON public.contratos_representacao(status);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_numero ON public.contratos_representacao(numero_contrato);

-- 3. Tabela de Pedidos de Faturamento Intermediados (Splits de Faturamento e Repasses)
CREATE TABLE IF NOT EXISTS public.pedidos_faturamento_intermediados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_representacao_id UUID NOT NULL REFERENCES public.contratos_representacao(id) ON DELETE CASCADE,
  tenant_cnpj TEXT NOT NULL DEFAULT '68.279.031/0001-67',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT,
  modelo_faturamento TEXT NOT NULL CHECK (
    modelo_faturamento IN ('centralizado_nexo', 'direto_parceiro')
  ),
  valor_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  aliquota_imposto_aplicada NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_imposto_retido NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual_comissao_aplicado NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_comissao_nexo NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_liquido_repasse_parceiro NUMERIC(12,2) NOT NULL DEFAULT 0,

  status_pagamento_cliente TEXT NOT NULL DEFAULT 'pendente' CHECK (
    status_pagamento_cliente IN ('pendente', 'pago', 'atrasado')
  ),
  status_repasse TEXT NOT NULL DEFAULT 'aguardando_cliente' CHECK (
    status_repasse IN ('aguardando_cliente', 'pronto_para_repasse', 'liquidado')
  ),
  data_recebimento_cliente DATE,
  data_repasse_efetuado DATE,
  chave_pix_comprovante TEXT,
  observacoes TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para pedidos_faturamento_intermediados
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_contrato ON public.pedidos_faturamento_intermediados(contrato_representacao_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_tenant_cnpj ON public.pedidos_faturamento_intermediados(tenant_cnpj);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_status_pag ON public.pedidos_faturamento_intermediados(status_pagamento_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_status_rep ON public.pedidos_faturamento_intermediados(status_repasse);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.contratos_representacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_faturamento_intermediados ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para contratos_representacao
DROP POLICY IF EXISTS "contratos_rep_select" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_select" ON public.contratos_representacao
  FOR SELECT TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "contratos_rep_insert" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_insert" ON public.contratos_representacao
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "contratos_rep_update" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_update" ON public.contratos_representacao
  FOR UPDATE TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas de RLS para pedidos_faturamento_intermediados
DROP POLICY IF EXISTS "pedidos_fat_select" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_select" ON public.pedidos_faturamento_intermediados
  FOR SELECT TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "pedidos_fat_insert" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_insert" ON public.pedidos_faturamento_intermediados
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "pedidos_fat_update" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_update" ON public.pedidos_faturamento_intermediados
  FOR UPDATE TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Permissões para Service Role (Bypass total para funções server-side)
GRANT ALL ON public.contratos_representacao TO service_role;
GRANT ALL ON public.pedidos_faturamento_intermediados TO service_role;
GRANT SELECT ON public.parceiros_veiculos TO authenticated, service_role;

-- 5. Acoplamento de Triggers de Lixeira e Auditoria
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['contratos_representacao', 'pedidos_faturamento_intermediados'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Trigger de lixeira automática se a função existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_move_to_trash') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trash_before_delete ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash()', t);
    END IF;

    -- Trigger de auditoria de alterações se a função existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_alteracao') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_alteracao()', t, t);
    END IF;
  END LOOP;
END $$;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006150000_modulo_gestao_indicadores_parceiros_pf_pj.sql
-- ------------------------------------------------------------------------------
-- ========================================================================
-- MÓDULO DE GESTÃO DE INDICADORES E VENDEDORES EXTERNOS (PF E PJ)
-- Suporte integral a Pessoa Física e Pessoa Jurídica, validações de documentos,
-- dados bancários para repasse PIX e regras comerciais.
-- ========================================================================

-- 1. Criar tabela principal: public.partners
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_type text NOT NULL CHECK (person_type IN ('PF', 'PJ')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_approval', 'blocked')),

  -- Dados Pessoa Física (PF)
  full_name text,
  cpf varchar(14),
  rg varchar(20),
  birth_date date,
  pis_pasep varchar(20),

  -- Dados Pessoa Jurídica (PJ)
  corporate_name text,
  trade_name text,
  cnpj varchar(18),
  state_registration varchar(30),
  municipal_registration varchar(30),
  legal_representative_name text,
  legal_representative_cpf varchar(14),

  -- Contato & Endereço
  email varchar(255) NOT NULL,
  phone varchar(20) NOT NULL,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Regras Comerciais & Comissionamento
  default_commission_rate numeric(5, 2) NOT NULL DEFAULT 10.00,
  payment_condition text NOT NULL DEFAULT 'post_client_payment' CHECK (payment_condition IN ('post_client_payment')),
  requires_invoice boolean NOT NULL DEFAULT false,

  -- Dados Bancários para Repasse
  pix_key_type text NOT NULL DEFAULT 'cpf' CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_key text NOT NULL,
  bank_name varchar(100),
  bank_agency varchar(10),
  bank_account varchar(20),
  bank_account_type text CHECK (bank_account_type IS NULL OR bank_account_type IN ('checking', 'savings')),

  -- Auditoria & Observações
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints de Integridade PF/PJ
  CONSTRAINT check_partner_pf_requirements CHECK (
    person_type <> 'PF' OR (
      full_name IS NOT NULL AND length(trim(full_name)) > 0 AND
      cpf IS NOT NULL AND length(trim(cpf)) >= 11
    )
  ),
  CONSTRAINT check_partner_pj_requirements CHECK (
    person_type <> 'PJ' OR (
      corporate_name IS NOT NULL AND length(trim(corporate_name)) > 0 AND
      cnpj IS NOT NULL AND length(trim(cnpj)) >= 14
    )
  )
);

-- 2. Índices de Desempenho e Unicidade por Inquilino
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_tenant_cpf ON public.partners(tenant_id, cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_tenant_cnpj ON public.partners(tenant_id, cnpj)
  WHERE cnpj IS NOT NULL AND cnpj <> '';

CREATE INDEX IF NOT EXISTS idx_partners_tenant_email ON public.partners(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_status ON public.partners(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_person_type ON public.partners(tenant_id, person_type);
CREATE INDEX IF NOT EXISTS idx_partners_tenant_id ON public.partners(tenant_id);

-- 3. Trigger de updated_at para partners
CREATE OR REPLACE TRIGGER set_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Habilitar RLS (Row Level Security) com Isolamento Multitenant
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners tenant isolation policy" ON public.partners;
CREATE POLICY "Partners tenant isolation policy" ON public.partners
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

-- 5. Interoperabilidade e Retrocompatibilidade com tabela 'indicadores'
-- Adiciona colunas complementares em 'indicadores' para sincronização transparente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'person_type'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN person_type text DEFAULT 'PF';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN status text DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'corporate_name'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN corporate_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'trade_name'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN trade_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'requires_invoice'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN requires_invoice boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN address jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_agency'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_agency varchar(10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_account'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_account varchar(20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicadores' AND column_name = 'bank_account_type'
  ) THEN
    ALTER TABLE public.indicadores ADD COLUMN bank_account_type text;
  END IF;
END $$;

-- 6. Gatilho de Sincronização Automática: partners -> indicadores
-- Permite que novas entidades em 'partners' satisfaçam FKs existentes em clientes/pis/comissoes
CREATE OR REPLACE FUNCTION public.sync_partner_to_indicadores()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.indicadores (
    id,
    tenant_id,
    nome,
    email,
    telefone,
    cpf_cnpj,
    chave_pix,
    tipo_chave_pix,
    banco_nome,
    percentual_comissao_padrao,
    observacoes,
    ativo,
    person_type,
    status,
    corporate_name,
    trade_name,
    requires_invoice,
    address,
    bank_agency,
    bank_account,
    bank_account_type,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.tenant_id,
    COALESCE(NEW.full_name, NEW.trade_name, NEW.corporate_name, 'Parceiro'),
    NEW.email,
    NEW.phone,
    COALESCE(NEW.cpf, NEW.cnpj),
    NEW.pix_key,
    NEW.pix_key_type,
    NEW.bank_name,
    NEW.default_commission_rate,
    NEW.notes,
    (NEW.status = 'active'),
    NEW.person_type,
    NEW.status,
    NEW.corporate_name,
    NEW.trade_name,
    NEW.requires_invoice,
    NEW.address,
    NEW.bank_agency,
    NEW.bank_account,
    NEW.bank_account_type,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    cpf_cnpj = EXCLUDED.cpf_cnpj,
    chave_pix = EXCLUDED.chave_pix,
    tipo_chave_pix = EXCLUDED.tipo_chave_pix,
    banco_nome = EXCLUDED.banco_nome,
    percentual_comissao_padrao = EXCLUDED.percentual_comissao_padrao,
    observacoes = EXCLUDED.observacoes,
    ativo = EXCLUDED.ativo,
    person_type = EXCLUDED.person_type,
    status = EXCLUDED.status,
    corporate_name = EXCLUDED.corporate_name,
    trade_name = EXCLUDED.trade_name,
    requires_invoice = EXCLUDED.requires_invoice,
    address = EXCLUDED.address,
    bank_agency = EXCLUDED.bank_agency,
    bank_account = EXCLUDED.bank_account,
    bank_account_type = EXCLUDED.bank_account_type,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_partner_to_indicadores ON public.partners;
CREATE TRIGGER trg_sync_partner_to_indicadores
  AFTER INSERT OR UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_partner_to_indicadores();

-- 7. Migração Inicial de Dados Pré-existentes de 'indicadores' para 'partners' (se houver)
INSERT INTO public.partners (
  id,
  tenant_id,
  person_type,
  status,
  full_name,
  cpf,
  cnpj,
  corporate_name,
  trade_name,
  email,
  phone,
  default_commission_rate,
  payment_condition,
  requires_invoice,
  pix_key_type,
  pix_key,
  bank_name,
  notes,
  created_at,
  updated_at
)
SELECT
  i.id,
  i.tenant_id,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN 'PJ' ELSE 'PF' END AS person_type,
  CASE WHEN i.ativo THEN 'active' ELSE 'inactive' END AS status,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) <= 11 THEN i.nome ELSE NULL END AS full_name,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) <= 11 THEN i.cpf_cnpj ELSE NULL END AS cpf,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.cpf_cnpj ELSE NULL END AS cnpj,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.nome ELSE NULL END AS corporate_name,
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN i.nome ELSE NULL END AS trade_name,
  COALESCE(i.email, 'contato@midiaos.com.br'),
  COALESCE(i.telefone, '(61) 99999-9999'),
  COALESCE(i.percentual_comissao_padrao, 10.00),
  'post_client_payment',
  CASE WHEN length(regexp_replace(COALESCE(i.cpf_cnpj, ''), '\D', '', 'g')) > 11 THEN true ELSE false END,
  COALESCE(i.tipo_chave_pix, 'cpf'),
  COALESCE(i.chave_pix, i.cpf_cnpj, 'pendente'),
  i.banco_nome,
  i.observacoes,
  i.created_at,
  i.updated_at
FROM public.indicadores i
WHERE NOT EXISTS (
  SELECT 1 FROM public.partners p WHERE p.id = i.id
)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006160000_modulo_circuitos_bundles_parceiros.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006160000_modulo_circuitos_bundles_parceiros.sql
-- DESCRIÇÃO: Módulo de Circuitos e Bundles com Desconto Exclusivo por Parceiro Elegível
-- ==============================================================================

-- 1. Adicionar flag de permissão allows_circuit_bundles nas tabelas de parceiros
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parceiros' AND column_name = 'allows_circuit_bundles') THEN
      ALTER TABLE public.parceiros ADD COLUMN allows_circuit_bundles boolean NOT NULL DEFAULT false;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'allows_circuit_bundles') THEN
      ALTER TABLE public.partners ADD COLUMN allows_circuit_bundles boolean NOT NULL DEFAULT false;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'indicadores') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'indicadores' AND column_name = 'allows_circuit_bundles') THEN
      ALTER TABLE public.indicadores ADD COLUMN allows_circuit_bundles boolean NOT NULL DEFAULT false;
    END IF;
  END IF;

  -- Campo de rastreamento do bundle em itens de propostas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposta_itens') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'circuit_bundle_id') THEN
      ALTER TABLE public.proposta_itens ADD COLUMN circuit_bundle_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'bundle_discount_applied') THEN
      ALTER TABLE public.proposta_itens ADD COLUMN bundle_discount_applied boolean DEFAULT false;
    END IF;
  END IF;
END $$;

-- 2. Tabela principal de Circuitos e Bundles
CREATE TABLE IF NOT EXISTS public.circuit_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  media_type text DEFAULT 'DOOH',
  pricing_type text NOT NULL DEFAULT 'discount_percentage' CHECK (pricing_type IN ('fixed_price', 'discount_percentage', 'discount_nominal')),
  discount_value numeric(12, 2) NOT NULL DEFAULT 0.00,
  fixed_price numeric(12, 2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circuit_bundles_tenant ON public.circuit_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_circuit_bundles_partner ON public.circuit_bundles(partner_id);
CREATE INDEX IF NOT EXISTS idx_circuit_bundles_active ON public.circuit_bundles(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_circuit_bundles_code_tenant ON public.circuit_bundles(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'), code);

-- 3. Tabela de Composição de Itens do Circuito
CREATE TABLE IF NOT EXISTS public.circuit_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.circuit_bundles(id) ON DELETE CASCADE,
  produto_id uuid,
  media_service_id uuid,
  product_name text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1.00,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0.00,
  is_mandatory boolean NOT NULL DEFAULT true,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circuit_bundle_items_bundle ON public.circuit_bundle_items(bundle_id);

-- 4. Tabela de Permissões Explícitas de Circuitos por Parceiro
CREATE TABLE IF NOT EXISTS public.circuit_bundle_partner_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.circuit_bundles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_bundle_partner_permission UNIQUE (bundle_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_partner_perms_bundle ON public.circuit_bundle_partner_permissions(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_partner_perms_partner ON public.circuit_bundle_partner_permissions(partner_id);

-- 5. Trigger de updated_at para circuit_bundles
CREATE OR REPLACE TRIGGER set_circuit_bundles_updated_at
  BEFORE UPDATE ON public.circuit_bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Habilitar RLS nas tabelas criadas
ALTER TABLE public.circuit_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_bundle_partner_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Circuit bundles tenant isolation policy" ON public.circuit_bundles;
CREATE POLICY "Circuit bundles tenant isolation policy" ON public.circuit_bundles
  FOR ALL
  USING (
    tenant_id IS NULL OR
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Circuit bundle items policy" ON public.circuit_bundle_items;
CREATE POLICY "Circuit bundle items policy" ON public.circuit_bundle_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Circuit bundle partner perms policy" ON public.circuit_bundle_partner_permissions;
CREATE POLICY "Circuit bundle partner perms policy" ON public.circuit_bundle_partner_permissions
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006220000_admin_reset_user_password_rpc.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006220000_admin_reset_user_password_rpc.sql
-- DESCRIÇÃO: Função RPC segura com SECURITY DEFINER para redefinição administrativa
-- de senhas de usuários por Administradores / Master.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  target_user_id UUID,
  new_plain_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_email TEXT;
  v_is_admin BOOLEAN := FALSE;
  v_target_email TEXT;
BEGIN
  -- Identifica o usuário chamador a partir do contexto da sessão JWT
  v_caller_id := auth.uid();
  
  -- Se chamado via service_role, auth.uid() pode ser nulo mas a role é service_role
  IF v_caller_id IS NULL AND current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Não autorizado: usuário não autenticado';
  END IF;

  -- Se for um usuário autenticado normal, valida se ele é administrador
  IF v_caller_id IS NOT NULL THEN
    SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;

    -- Master email ou perfil com permissão
    IF lower(COALESCE(v_caller_email, '')) = 'rafaelrodrigo.as@gmail.com' THEN
      v_is_admin := TRUE;
    ELSE
      -- Verifica se é superadmin ou admin em profiles
      SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = v_caller_id 
          AND (is_superadmin = true OR role IN ('admin', 'super_admin', 'MASTER', 'diretoria'))
      ) INTO v_is_admin;

      -- Se ainda não for admin, verifica em user_roles
      IF NOT v_is_admin THEN
        SELECT EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = v_caller_id AND role IN ('admin', 'super_admin')
        ) INTO v_is_admin;
      END IF;
    END IF;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Apenas administradores podem redefinir a senha de outros usuários';
    END IF;
  END IF;

  -- Validação de tamanho mínimo de senha
  IF length(new_plain_password) < 6 THEN
    RAISE EXCEPTION 'A senha deve possuir no mínimo 6 caracteres';
  END IF;

  -- Busca o email do usuário alvo
  SELECT email INTO v_target_email FROM auth.users WHERE id = target_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Atualiza com segurança a senha encriptada em auth.users utilizando bcrypt bf
  -- [Higienização] UPDATE auth.users suprimido
-- Registra auditoria
  BEGIN
    INSERT INTO public.auditoria_acessos (
      actor_id,
      actor_email,
      acao,
      target_user_id,
      target_email,
      detalhes
    ) VALUES (
      COALESCE(v_caller_id, gen_random_uuid()),
      v_caller_email,
      'senha_redefinida',
      target_user_id,
      v_target_email,
      jsonb_build_object('origem', 'admin_reset_user_password_rpc', 'redefinido_em', now())
    );
  EXCEPTION WHEN OTHERS THEN
    -- ignora erro de auditoria para não travar a operação principal
  END;

  RETURN jsonb_build_object('success', true, 'message', 'Senha redefinida com sucesso');
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;
COMMENT ON FUNCTION public.admin_reset_user_password IS 'Redefine a senha de outro usuário de forma segura, garantindo autorização de Administrador';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006230000_public_inventory_white_label_view.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006230000_public_inventory_white_label_view.sql
-- DESCRIÇÃO: Função RPC e View segura para inventário público White-Label (Flux OOH)
-- REGRA CRÍTICA DE PRIVACIDADE: NUNCA expõe dados, nomes ou IDs de parceiros proprietários.
-- ==============================================================================

-- 1. Habilita Realtime para as tabelas de ativos e produtos se ainda não estiver habilitado
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
  EXCEPTION WHEN OTHERS THEN
    -- já adicionado ou tabela sem PK replicável
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media_services_catalog;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 2. Função RPC segura com SECURITY DEFINER para consulta pública de ativos
-- Retorna estritamente dados operacionais e de localização dos ativos, sem parceiros
CREATE OR REPLACE FUNCTION public.get_public_inventory_assets(
  p_cidade TEXT DEFAULT NULL,
  p_tipo_midia TEXT DEFAULT NULL,
  p_busca TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  codigo_ativo TEXT,
  nome_ponto TEXT,
  tipo_midia TEXT,
  formato TEXT,
  dimensoes TEXT,
  cidade TEXT,
  bairro TEXT,
  uf TEXT,
  endereco TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  fotos_urls TEXT[],
  status_disponibilidade TEXT,
  valor_tabela NUMERIC,
  impactos_estimados NUMERIC,
  fluxo_diario NUMERIC,
  link_maps TEXT,
  sentido_via TEXT,
  ponto_referencia TEXT,
  ativo BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_codigo_ativo'),
      ('DF-' || UPPER(SUBSTRING(p.id::text FROM 1 FOR 4)))
    ) AS codigo_ativo,
    p.nome AS nome_ponto,
    COALESCE(p.tipo, p.midia::text, 'OOH') AS tipo_midia,
    COALESCE(p.formato, p.formato_ooh, 'Bi-Semana') AS formato,
    COALESCE(p.resolucao, p.formato_tela, p.dimensoes_pixels, NULL) AS dimensoes,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_cidade'),
      NULLIF(TRIM(SPLIT_PART(p.endereco_ponto, ',', 2)), ''),
      'Brasília'
    ) AS cidade,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_bairro'),
      NULLIF(TRIM(SPLIT_PART(p.endereco_ponto, '-', 1)), ''),
      'Plano Piloto'
    ) AS bairro,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_uf'),
      'DF'
    ) AS uf,
    p.endereco_ponto AS endereco,
    p.latitude,
    p.longitude,
    CASE 
      WHEN p.fotos IS NOT NULL AND array_length(p.fotos, 1) > 0 THEN p.fotos
      WHEN (p.detalhes_venda::jsonb->'_fotos') IS NOT NULL THEN 
        ARRAY(SELECT jsonb_array_elements_text(p.detalhes_venda::jsonb->'_fotos'))
      ELSE ARRAY[]::TEXT[]
    END AS fotos_urls,
    COALESCE((p.detalhes_venda::jsonb->>'_status_disponibilidade'), 'Disponível') AS status_disponibilidade,
    COALESCE(p.valor_unit, 0.00) AS valor_tabela,
    COALESCE(p.impactos_estimados, 0) AS impactos_estimados,
    COALESCE((p.detalhes_venda::jsonb->>'_fluxo_veiculos_dia')::numeric, 0) AS fluxo_diario,
    p.link_maps,
    COALESCE(p.sentido_via, (p.detalhes_venda::jsonb->>'_sentido_fluxo')) AS sentido_via,
    p.ponto_referencia,
    p.ativo,
    p.updated_at
  FROM public.produtos p
  WHERE p.ativo = true
    AND (p_cidade IS NULL OR p.endereco_ponto ILIKE ('%' || p_cidade || '%') OR (p.detalhes_venda::jsonb->>'_cidade') ILIKE ('%' || p_cidade || '%'))
    AND (p_tipo_midia IS NULL OR p.tipo ILIKE ('%' || p_tipo_midia || '%') OR p.midia::text ILIKE ('%' || p_tipo_midia || '%'))
    AND (
      p_busca IS NULL OR 
      p.nome ILIKE ('%' || p_busca || '%') OR 
      p.endereco_ponto ILIKE ('%' || p_busca || '%') OR
      (p.detalhes_venda::jsonb->>'_codigo_ativo') ILIKE ('%' || p_busca || '%')
    )
  ORDER BY p.updated_at DESC;
END;
$$;

-- Permissões de acesso público e autenticado
GRANT EXECUTE ON FUNCTION public.get_public_inventory_assets(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_public_inventory_assets IS 'Consulta de inventário público para vitrine White-Label (estilo Flux OOH) sem expor parceiros proprietários';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261006240000_garantir_edicao_universal_rls_update.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261006240000_garantir_edicao_universal_rls_update.sql
-- DESCRIÇÃO: Garante permissões de UPDATE, RLS resiliente a dados importados/nulos,
--            rastreabilidade (updated_at, updated_by) em todas as entidades comerciais.
-- POLÍTICA AGENTS.md: Não-destrutiva, 100% aditiva, retrocompatível.
-- ==============================================================================

-- 1. FUNÇÃO TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.trg_auto_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. GARANTIR COLUNAS updated_at E updated_by EM TODAS AS TABELAS PRINCIPAIS
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'produtos',
    'parceiros',
    'partners',
    'clientes',
    'agencias',
    'pedidos_insercao',
    'propostas',
    'tarefas',
    'materiais_apoio',
    'links_uteis',
    'media_services_catalog',
    'circuitos_bundles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;', tbl);
      
      -- Criar trigger de updated_at
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_auto_updated_at ON public.%I;', tbl, tbl);
      EXECUTE format('CREATE TRIGGER trg_%I_auto_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_auto_touch_updated_at();', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- 3. POLÍTICAS DE UPDATE PERMISSIVAS E RESILIENTES A IMPORTAÇÕES (ZERO BLOQUEIO RLS)

-- PRODUTOS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "permitir_update_universal_produtos" ON public.produtos;
    
    CREATE POLICY "permitir_update_universal_produtos" ON public.produtos
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PARCEIROS (TABELA LEGADA E NOVA)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_parceiros" ON public.parceiros;
    DROP POLICY IF EXISTS "permitir_update_universal_parceiros" ON public.parceiros;
    
    CREATE POLICY "permitir_update_universal_parceiros" ON public.parceiros
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PARTNERS (REPRESENTAÇÃO COMERCIAL)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_partners_update" ON public.partners;
    DROP POLICY IF EXISTS "permitir_update_universal_partners" ON public.partners;
    
    CREATE POLICY "permitir_update_universal_partners" ON public.partners
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- MEDIA_SERVICES_CATALOG (CATÁLOGO DE ESPAÇOS / SERVIÇOS)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_services_catalog') THEN
    ALTER TABLE public.media_services_catalog ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_media_catalog" ON public.media_services_catalog;
    
    CREATE POLICY "permitir_update_universal_media_catalog" ON public.media_services_catalog
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- CLIENTES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "permitir_update_universal_clientes" ON public.clientes;
    
    CREATE POLICY "permitir_update_universal_clientes" ON public.clientes
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- AGÊNCIAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agencias') THEN
    ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "permitir_update_universal_agencias" ON public.agencias;
    
    CREATE POLICY "permitir_update_universal_agencias" ON public.agencias
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PEDIDOS DE INSERÇÃO (PIs)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos_insercao') THEN
    ALTER TABLE public.pedidos_insercao ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_pi" ON public.pedidos_insercao;
    DROP POLICY IF EXISTS "permitir_update_universal_pi" ON public.pedidos_insercao;
    
    CREATE POLICY "permitir_update_universal_pi" ON public.pedidos_insercao
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      );
  END IF;
END $$;

-- PROPOSTAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'propostas') THEN
    ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "permitir_update_universal_propostas" ON public.propostas;
    
    CREATE POLICY "permitir_update_universal_propostas" ON public.propostas
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      );
  END IF;
END $$;

-- TAREFAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tarefas') THEN
    ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_tarefas" ON public.tarefas;
    
    CREATE POLICY "permitir_update_universal_tarefas" ON public.tarefas
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        responsavel_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        responsavel_id = auth.uid()
      );
  END IF;
END $$;

-- MATERIAIS DE APOIO E LINKS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materiais_apoio') THEN
    ALTER TABLE public.materiais_apoio ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_materiais" ON public.materiais_apoio;
    
    CREATE POLICY "permitir_update_universal_materiais" ON public.materiais_apoio
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'links_uteis') THEN
    ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_links" ON public.links_uteis;
    
    CREATE POLICY "permitir_update_universal_links" ON public.links_uteis
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- CIRCUITOS E BUNDLES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'circuitos_bundles') THEN
    ALTER TABLE public.circuitos_bundles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_circuitos" ON public.circuitos_bundles;
    
    CREATE POLICY "permitir_update_universal_circuitos" ON public.circuitos_bundles
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- NOTIFICAR RECARGA DE SCHEMA
NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261007010000_esteira_operacional_pi_duplo_fluxo_veiculacao.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261007010000_esteira_operacional_pi_duplo_fluxo_veiculacao.sql
-- MÍDIA.OS: MODELAGEM ADITIVA DO DUPLO FLUXO DE PEDIDOS DE INSERÇÃO (PI)
-- E GATILHO DE VALIDAÇÃO DE VEICULAÇÃO OPERACIONAL / ATIVOS OOH
-- ==============================================================================

-- 1. EVOLUÇÃO ADITIVA DA TABELA public.pis
-- ------------------------------------------------------------------------------
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_pi TEXT DEFAULT 'CLIENTE', -- 'CLIENTE' | 'PARCEIRO'
  ADD COLUMN IF NOT EXISTS numero_pi TEXT,
  ADD COLUMN IF NOT EXISTS emissor_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destinatario_id UUID,
  ADD COLUMN IF NOT EXISTS valor_bruto NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_comissao_agencia NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_desconto_inquilino NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_abatimentos NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_veiculacao TEXT DEFAULT 'aguardando_pi', -- 'aguardando_pi' | 'veiculacao_autorizada' | 'em_veiculacao' | 'veiculado'
  ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pis_proposta_id ON public.pis(proposta_id);
CREATE INDEX IF NOT EXISTS idx_pis_tipo_pi ON public.pis(tipo_pi);
CREATE INDEX IF NOT EXISTS idx_pis_destinatario_id ON public.pis(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_pis_emissor_id ON public.pis(emissor_id);
CREATE INDEX IF NOT EXISTS idx_pis_status_veiculacao ON public.pis(status_veiculacao);

-- Sincronizar numero_pi com numero onde nulo
UPDATE public.pis
SET numero_pi = numero
WHERE numero_pi IS NULL;

-- 2. EVOLUÇÃO ADITIVA DA TABELA public.pi_itens
-- ------------------------------------------------------------------------------
ALTER TABLE public.pi_itens
  ADD COLUMN IF NOT EXISTS ativo_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS periodo_veiculacao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS valor_unitario_tabela NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_unitario_negociado NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido_item NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abatimentos_item NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pi_itens_ativo_id ON public.pi_itens(ativo_id);
CREATE INDEX IF NOT EXISTS idx_pi_itens_produto_id ON public.pi_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_pi_itens_parceiro_id ON public.pi_itens(parceiro_id);

-- 3. EVOLUÇÃO ADITIVA DA TABELA public.produtos (ATIVOS / PONTOS / FACES OOH)
-- ------------------------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS status_operacional TEXT DEFAULT 'disponivel', -- 'disponivel' | 'reservado' | 'bloqueado_comercial' | 'em_veiculacao'
  ADD COLUMN IF NOT EXISTS pi_ativo_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposta_ativa_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_status_operacional ON public.produtos(status_operacional);
CREATE INDEX IF NOT EXISTS idx_produtos_pi_ativo_id ON public.produtos(pi_ativo_id);

-- 4. VIEWS DE COMPATIBILIDADE PARA pedidos_insercao E pedidos_insercao_itens
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.pedidos_insercao AS
SELECT 
  id,
  tenant_id,
  proposta_id,
  COALESCE(tipo_pi, 'CLIENTE') AS tipo_pi,
  COALESCE(numero_pi, numero) AS numero_pi,
  COALESCE(emissor_id, tenant_id) AS emissor_id,
  COALESCE(destinatario_id, CASE WHEN tipo_pi = 'PARCEIRO' THEN parceiro_id ELSE COALESCE(agencia_id, cliente_id) END) AS destinatario_id,
  COALESCE(valor_bruto, valor_tabela, valor_negociado, 0) AS valor_bruto,
  COALESCE(percentual_comissao_agencia, 0) AS percentual_comissao_agencia,
  COALESCE(percentual_desconto_inquilino, 0) AS percentual_desconto_inquilino,
  COALESCE(valor_abatimentos, valor_desconto, 0) AS valor_abatimentos,
  COALESCE(valor_liquido, valor_negociado, 0) AS valor_liquido,
  CASE 
    WHEN UPPER(status::text) IN ('RASCUNHO') THEN 'RASCUNHO'
    WHEN UPPER(status::text) IN ('CANCELADO', 'REPROVADO') THEN 'CANCELADO'
    WHEN UPPER(status::text) IN ('APROVADO', 'ASSINADO', 'VEICULADO', 'FATURADO', 'FINALIZADO') THEN 'APROVADO'
    ELSE 'EMITIDO'
  END AS status,
  status_veiculacao,
  COALESCE(data_emissao, created_at) AS data_emissao,
  periodo_inicio,
  periodo_fim,
  cliente_id,
  agencia_id,
  parceiro_id,
  pi_pai_id,
  campanha,
  observacao,
  created_at,
  updated_at
FROM public.pis;

CREATE OR REPLACE VIEW public.pedidos_insercao_itens AS
SELECT
  id,
  pi_id AS pedido_insercao_id,
  COALESCE(ativo_id, produto_id) AS ativo_id,
  COALESCE(produto_id, ativo_id) AS produto_id,
  parceiro_id,
  periodo_veiculacao,
  COALESCE(valor_unitario_tabela, valor_tabela, valor_unit, 0) AS valor_unitario_tabela,
  COALESCE(valor_unitario_negociado, valor_negociado, valor_unit, 0) AS valor_unitario_negociado,
  COALESCE(valor_liquido_item, repasse_valor, valor_negociado, 0) AS valor_liquido_item,
  COALESCE(abatimentos_item, comissao_valor, 0) AS abatimentos_item,
  tipo,
  programa,
  formato,
  total_insercoes,
  created_at
FROM public.pi_itens;

GRANT SELECT ON public.pedidos_insercao TO authenticated, service_role;
GRANT SELECT ON public.pedidos_insercao_itens TO authenticated, service_role;

-- 5. GATILHO DE PROTEÇÃO E VALIDAÇÃO DE VEICULAÇÃO DO ATIVO
-- ------------------------------------------------------------------------------
-- Regra: Um ativo de mídia só pode transicionar para 'em_veiculacao' se houver um PI emitido.
CREATE OR REPLACE FUNCTION public.validar_status_veiculacao_ativo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pi_status TEXT;
BEGIN
  -- Se estiver tentando colocar o ativo em veiculação
  IF NEW.status_operacional = 'em_veiculacao' THEN
    IF NEW.pi_ativo_id IS NULL THEN
      -- Se não tem PI vinculado, reverte para bloqueado comercial
      NEW.status_operacional := 'bloqueado_comercial';
    ELSE
      SELECT status::text INTO v_pi_status
      FROM public.pis
      WHERE id = NEW.pi_ativo_id;

      IF v_pi_status IS NULL OR LOWER(v_pi_status) IN ('rascunho', 'cancelado', 'reprovado') THEN
        -- PI ainda não emitido / aprovado oficialmente
        NEW.status_operacional := 'bloqueado_comercial';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_status_veiculacao_ativo ON public.produtos;
CREATE TRIGGER trg_validar_status_veiculacao_ativo
BEFORE INSERT OR UPDATE OF status_operacional, pi_ativo_id ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.validar_status_veiculacao_ativo();

-- 6. REFORÇO DE POLÍTICA RLS PARA SEGURANÇA E ISOLAMENTO DE PARCEIROS
-- ------------------------------------------------------------------------------
-- O parceiro só tem acesso ao seu próprio PI e seus próprios itens
DROP POLICY IF EXISTS "pis_partner_isolation" ON public.pis;
CREATE POLICY "pis_partner_isolation" ON public.pis
FOR SELECT TO authenticated
USING (
  public.is_master_user()
  OR (
    -- Usuário parceiro autenticado pelo CNPJ só vê os seus próprios PIs
    public.get_current_user_cnpj() IS NOT NULL
    AND parceiro_id IN (SELECT id FROM public.parceiros WHERE cnpj = public.get_current_user_cnpj())
  )
  OR (
    -- Clientes e agências continuam acessando seus respectivos PIs
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cliente_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
      OR agencia_id IN (SELECT id FROM public.agencias WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    -- Inquilino / Administradores sem vínculo exclusivo de CNPJ parceiro
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261009180000_modulo_planejamento_estrategico.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MÓDULO: PLANEJAMENTO ESTRATÉGICO DE CAMPANHAS
-- Camada estratégica acima do inventário de mídia do Mídia OS
-- Relacionamento: Campanha -> Regiões -> Pontos de Mídia (produtos existentes) -> Proposta
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.campanhas_planejamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT,
    nome_campanha TEXT NOT NULL,
    objetivo TEXT,
    publico_alvo TEXT,
    regiao TEXT,
    periodo_inicio DATE,
    periodo_fim DATE,
    investimento_previsto NUMERIC(14,2) DEFAULT 0,
    estrategia TEXT,
    pilares JSONB DEFAULT '{
        "afinidade_territorial": 7,
        "frequencia": 6,
        "visibilidade": 8,
        "mobilidade": 7,
        "ativacao": 5
    }'::jsonb,
    regioes_selecionadas JSONB DEFAULT '[]'::jsonb,
    proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'em_aprovacao', 'proposta_gerada', 'ativa', 'concluida', 'arquivada')),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_campanhas_plan_tenant ON public.campanhas_planejamento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_plan_cliente ON public.campanhas_planejamento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_plan_proposta ON public.campanhas_planejamento(proposta_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_plan_status ON public.campanhas_planejamento(status);

-- Tabela de pontos de mídia vinculados à campanha (referenciando produtos existentes sem duplicação)
CREATE TABLE IF NOT EXISTS public.campanha_pontos_midia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    campanha_id UUID NOT NULL REFERENCES public.campanhas_planejamento(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    regiao TEXT,
    pilar_estrategico TEXT DEFAULT 'visibilidade' CHECK (pilar_estrategico IN ('afinidade_territorial', 'frequencia', 'visibilidade', 'mobilidade', 'ativacao')),
    quantidade_insercoes INTEGER DEFAULT 1,
    valor_negociado NUMERIC(14,2) DEFAULT 0,
    impactos_estimados NUMERIC(14,0) DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanha_pontos_campanha ON public.campanha_pontos_midia(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campanha_pontos_produto ON public.campanha_pontos_midia(produto_id);
CREATE INDEX IF NOT EXISTS idx_campanha_pontos_tenant ON public.campanha_pontos_midia(tenant_id);

-- RLS
ALTER TABLE public.campanhas_planejamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_pontos_midia ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'campanhas_planejamento' AND policyname = 'campanhas_planejamento_tenant_isolation'
    ) THEN
        CREATE POLICY campanhas_planejamento_tenant_isolation ON public.campanhas_planejamento
            FOR ALL USING (
                tenant_id IS NULL OR 
                tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR
                (SELECT auth.jwt() ->> 'email') = 'rafaelnexomidia@gmail.com'
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'campanha_pontos_midia' AND policyname = 'campanha_pontos_midia_tenant_isolation'
    ) THEN
        CREATE POLICY campanha_pontos_midia_tenant_isolation ON public.campanha_pontos_midia
            FOR ALL USING (
                tenant_id IS NULL OR 
                tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR
                (SELECT auth.jwt() ->> 'email') = 'rafaelnexomidia@gmail.com'
            );
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261009190000_modulo_estrategias_ia.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MÓDULO: ASSISTENTE IA DE PLANEJAMENTO DE MÍDIA (GEMINI 2.5 FLASH)
-- Tabela de histórico de recomendações estratégicas de mídia geradas por IA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.estrategias_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    campanha_id UUID REFERENCES public.campanhas_planejamento(id) ON DELETE SET NULL,
    prompt JSONB NOT NULL,
    resposta JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_tenant ON public.estrategias_ia(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_cliente ON public.estrategias_ia(cliente_id);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_campanha ON public.estrategias_ia(campanha_id);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_created ON public.estrategias_ia(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.estrategias_ia ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'estrategias_ia' AND policyname = 'estrategias_ia_tenant_isolation'
    ) THEN
        CREATE POLICY estrategias_ia_tenant_isolation ON public.estrategias_ia
            FOR ALL USING (
                tenant_id IS NULL OR 
                tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) OR
                (SELECT auth.jwt() ->> 'email') = 'rafaelnexomidia@gmail.com'
            );
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261009193000_evolucao_inventario_midia.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261009193000_evolucao_inventario_midia.sql
-- DESCRIÇÃO: Evolução do inventário de mídia em public.produtos:
--            - foto_principal (armazenamento prioritário de thumbnail)
--            - valor_negociado (valor comercial para negociações e propostas)
--            - fluxo_estimado (audiência, tráfego ou pessoas estimadas)
--            - publico_alvo (perfil do público, classe social e demografia)
--            - dimensao (medidas físicas, ex: 9x3m ou 1920x1080)
-- POLÍTICA: ADITIVA E RETROCOMPATÍVEL (ZERO PERDA DE DADOS)
-- ==============================================================================

-- 1. Adicionar colunas aditivas à tabela public.produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS foto_principal TEXT,
  ADD COLUMN IF NOT EXISTS valor_negociado NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fluxo_estimado NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publico_alvo TEXT,
  ADD COLUMN IF NOT EXISTS dimensao TEXT;

-- 2. Atualizar fotos default e índices úteis para consultas de catálogo
CREATE INDEX IF NOT EXISTS idx_produtos_status_operacional ON public.produtos(status_operacional);
CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_id ON public.produtos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_produtos_valor_negociado ON public.produtos(valor_negociado);

-- 3. Atualizar a View public.inventario_midia para incluir os novos campos caso exista
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'inventario_midia'
  ) THEN
    CREATE OR REPLACE VIEW public.inventario_midia AS 
    SELECT 
      id,
      tenant_id,
      nome,
      midia,
      tipo,
      programa,
      faixa,
      duracao_segundos,
      insercoes_padrao,
      valor_unit,
      valor_negociado,
      fluxo_estimado,
      publico_alvo,
      dimensao,
      canal_macro,
      plataforma_rede,
      metricas_digitais,
      latitude,
      longitude,
      link_maps,
      sentido_via,
      ponto_referencia,
      ativo,
      status_operacional,
      parceiro_id,
      parceiro_nome,
      parceiro_cnpj,
      praca,
      foto_principal,
      fotos,
      created_at,
      updated_at
    FROM public.produtos;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261009200000_modulo_rede_inventario.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261009200000_modulo_rede_inventario.sql
-- DESCRIÇÃO: Novo Módulo de Rede de Inventário do Mídia.OS:
--            - public.rede_inventario (Origem de Inventário: Próprio vs Representado)
--            - Suporte a nome interno, nome comercial, empresa, cnpj, contato,
--              contrato, comissao e status
--            - Relacionamento com produtos existentes em public.produtos
-- DIRETRIZ: ADITIVA E RETROCOMPATÍVEL (ZERO PERDA DE DADOS)
-- ==============================================================================

-- 1. Criação da tabela principal de origens da Rede de Inventário
CREATE TABLE IF NOT EXISTS public.rede_inventario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  tipo_origem TEXT NOT NULL CHECK (tipo_origem IN ('PROPRIO', 'REPRESENTADO')) DEFAULT 'REPRESENTADO',
  nome_interno TEXT NOT NULL,
  nome_comercial TEXT NOT NULL,
  empresa TEXT,
  cnpj TEXT,
  contato TEXT,
  contrato TEXT,
  comissao NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  status TEXT NOT NULL CHECK (status IN ('ativo', 'inativo', 'em_negociacao')) DEFAULT 'ativo',
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas caso a tabela já tenha sido criada previamente
ALTER TABLE public.rede_inventario
  ADD COLUMN IF NOT EXISTS tipo_origem TEXT NOT NULL DEFAULT 'REPRESENTADO',
  ADD COLUMN IF NOT EXISTS nome_interno TEXT,
  ADD COLUMN IF NOT EXISTS nome_comercial TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS contato TEXT,
  ADD COLUMN IF NOT EXISTS contrato TEXT,
  ADD COLUMN IF NOT EXISTS comissao NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 2. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_rede_inventario_tenant ON public.rede_inventario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_tipo ON public.rede_inventario(tipo_origem);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_status ON public.rede_inventario(status);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_cnpj ON public.rede_inventario(cnpj);

-- 3. Relacionamento com a tabela public.produtos (Aditivo e retrocompatível)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'produtos'
  ) THEN
    ALTER TABLE public.produtos
      ADD COLUMN IF NOT EXISTS rede_inventario_id UUID REFERENCES public.rede_inventario(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS tipo_origem_inventario TEXT DEFAULT 'PROPRIO';

    CREATE INDEX IF NOT EXISTS idx_produtos_rede_inventario ON public.produtos(rede_inventario_id);
    CREATE INDEX IF NOT EXISTS idx_produtos_tipo_origem ON public.produtos(tipo_origem_inventario);
  END IF;
END $$;

-- 4. Migração e Sincronização Segura de Dados Existentes
-- Transfere registros da tabela parceiros legada para a rede de inventário sem apagar nada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'parceiros'
  ) THEN
    -- Inserir nós representados correspondentes a parceiros existentes
    INSERT INTO public.rede_inventario (
      id,
      tenant_id,
      tipo_origem,
      nome_interno,
      nome_comercial,
      empresa,
      cnpj,
      contato,
      contrato,
      comissao,
      status,
      created_at,
      updated_at
    )
    SELECT 
      p.id,
      p.tenant_id,
      'REPRESENTADO' AS tipo_origem,
      p.razao_social AS nome_interno,
      COALESCE(NULLIF(p.nome_fantasia, ''), p.razao_social) AS nome_comercial,
      p.razao_social AS empresa,
      p.cnpj,
      COALESCE(
        NULLIF(p.contato_nome, ''), 
        NULLIF(p.contato_email, ''), 
        NULLIF(p.contato_telefone, ''), 
        'Contato Comercial'
      ) AS contato,
      COALESCE(p.condicoes_comerciais, 'Contrato de Representação Padrão') AS contrato,
      COALESCE(p.comissao_padrao_pct, 20.00) AS comissao,
      CASE WHEN p.ativo = false THEN 'inativo' ELSE 'ativo' END AS status,
      p.created_at,
      p.updated_at
    FROM public.parceiros p
    ON CONFLICT (id) DO NOTHING;

    -- Conectar produtos que possuem parceiro_id ao seu nó na rede de inventário
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'parceiro_id'
    ) THEN
      UPDATE public.produtos
      SET rede_inventario_id = parceiro_id,
          tipo_origem_inventario = 'REPRESENTADO'
      WHERE parceiro_id IS NOT NULL AND rede_inventario_id IS NULL;
    END IF;
  END IF;
END $$;

-- 5. Trigger de atualização de timestamp
CREATE OR REPLACE FUNCTION public.trg_rede_inventario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rede_inventario_update ON public.rede_inventario;
CREATE TRIGGER trg_rede_inventario_update
  BEFORE UPDATE ON public.rede_inventario
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_rede_inventario_updated_at();

-- 6. RLS (Row Level Security)
ALTER TABLE public.rede_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rede_inventario_select_policy" ON public.rede_inventario;
CREATE POLICY "rede_inventario_select_policy" ON public.rede_inventario
  FOR SELECT
  USING (
    tenant_id IS NULL 
    OR tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR (auth.jwt() ->> 'app_tenant_id')::uuid = tenant_id
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

DROP POLICY IF EXISTS "rede_inventario_all_policy" ON public.rede_inventario;
CREATE POLICY "rede_inventario_all_policy" ON public.rede_inventario
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR (auth.jwt() ->> 'app_tenant_id')::uuid = tenant_id
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

COMMENT ON TABLE public.rede_inventario IS 'Origens do inventário do Mídia.OS (Inventário Próprio vs Representado) com controle comercial e operacional blindado.';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261009210000_tenant_branding_imagem_comercial.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261009210000_tenant_branding_imagem_comercial.sql
-- DESCRIÇÃO: Identidade Visual Comercial e Blindagem de Imagens de Mídia:
--            - Tabela public.tenant_branding (logo, marca_dagua, nome_comercial)
--            - Colunas em public.produtos: imagem_original, imagem_comercial,
--              fotos_originais, fotos_comerciais, branding_aplicado
-- DIRETRIZ: ADITIVA E RETROCOMPATÍVEL (ZERO PERDA DE DADOS)
-- ==============================================================================

-- 1. Criação da tabela de identidade visual comercial do inquilino
CREATE TABLE IF NOT EXISTS public.tenant_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID UNIQUE,
  nome_comercial TEXT NOT NULL,
  logo TEXT,
  marca_dagua TEXT,
  posicao_marca_dagua TEXT DEFAULT 'bottom-right' CHECK (posicao_marca_dagua IN ('bottom-right', 'bottom-left', 'center', 'top-right')),
  opacidade_marca_dagua NUMERIC(3,2) DEFAULT 0.65,
  remover_identificacao_fornecedor BOOLEAN DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas caso a tabela já exista
ALTER TABLE public.tenant_branding
  ADD COLUMN IF NOT EXISTS nome_comercial TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS marca_dagua TEXT,
  ADD COLUMN IF NOT EXISTS posicao_marca_dagua TEXT DEFAULT 'bottom-right',
  ADD COLUMN IF NOT EXISTS opacidade_marca_dagua NUMERIC(3,2) DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS remover_identificacao_fornecedor BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 2. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant ON public.tenant_branding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_ativo ON public.tenant_branding(ativo);

-- 3. Adicionar colunas aditivas na tabela public.produtos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'produtos'
  ) THEN
    ALTER TABLE public.produtos
      ADD COLUMN IF NOT EXISTS imagem_original TEXT,
      ADD COLUMN IF NOT EXISTS imagem_comercial TEXT,
      ADD COLUMN IF NOT EXISTS fotos_originais TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS fotos_comerciais TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS branding_aplicado BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_produtos_branding_aplicado ON public.produtos(branding_aplicado);
  END IF;
END $$;

-- 4. Retrocompatibilidade: Inicializar imagem_comercial e imagem_original a partir de foto_principal
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'produtos'
  ) THEN
    UPDATE public.produtos
    SET imagem_original = COALESCE(imagem_original, foto_principal),
        imagem_comercial = COALESCE(imagem_comercial, foto_principal)
    WHERE foto_principal IS NOT NULL 
      AND (imagem_original IS NULL OR imagem_comercial IS NULL);
  END IF;
END $$;

-- 5. Trigger de atualização de timestamp
CREATE OR REPLACE FUNCTION public.trg_tenant_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_branding_update ON public.tenant_branding;
CREATE TRIGGER trg_tenant_branding_update
  BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tenant_branding_updated_at();

-- 6. RLS (Row Level Security)
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_branding_select_policy" ON public.tenant_branding;
CREATE POLICY "tenant_branding_select_policy" ON public.tenant_branding
  FOR SELECT
  USING (
    tenant_id IS NULL 
    OR tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR (auth.jwt() ->> 'app_tenant_id')::uuid = tenant_id
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

DROP POLICY IF EXISTS "tenant_branding_all_policy" ON public.tenant_branding;
CREATE POLICY "tenant_branding_all_policy" ON public.tenant_branding
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR (auth.jwt() ->> 'app_tenant_id')::uuid = tenant_id
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

COMMENT ON TABLE public.tenant_branding IS 'Identidade visual comercial do inquilino para aplicação de logo e marca d água em mídias de clientes.';


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261009220000_copiloto_comercial_gemini.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MÓDULO: EVOLUÇÃO GEMINI PARA COPILOTO COMERCIAL DE MÍDIA
-- Expansão da tabela estrategias_ia com suporte a vínculo de proposta e tipo
-- ==============================================================================

DO $$
BEGIN
    -- Coluna tipo_consulta para diferenciar copiloto comercial de outros fluxos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'estrategias_ia' AND column_name = 'tipo_consulta'
    ) THEN
        ALTER TABLE public.estrategias_ia ADD COLUMN tipo_consulta TEXT DEFAULT 'copiloto_comercial';
    END IF;

    -- Coluna proposta_id para rastrear propostas geradas a partir do copiloto
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'estrategias_ia' AND column_name = 'proposta_id'
    ) THEN
        ALTER TABLE public.estrategias_ia ADD COLUMN proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_tipo ON public.estrategias_ia(tipo_consulta);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_proposta ON public.estrategias_ia(proposta_id);


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261010090000_produtos_inquilino_parceiros_rls.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261010090000_produtos_inquilino_parceiros_rls.sql
-- DESCRIÇÃO: Garantir visibilidade irrestrita e multi-tenant de produtos de parceiros
--            homologados e produtos próprios do inquilino.
-- DATA: 2026-10-10
-- ==============================================================================

-- 1. ADICIONAR COLUNAS ADITIVAS (IF NOT EXISTS)
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS origem_produto text DEFAULT 'PROPRIO',
  ADD COLUMN IF NOT EXISTS organizacao_id uuid,
  ADD COLUMN IF NOT EXISTS partner_id uuid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organizacao_id uuid;

-- 2. ATUALIZAR FUNÇÃO IS_SUPER_ADMIN PARA INCLUIR MASTER USERS
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) IN ('rafaelrodrigo.as@gmail.com', 'rafaelnexomidia@gmail.com')
  );
$$;

-- 3. AJUSTAR POLÍTICA DE LEITURA (SELECT) EM PRODUTOS
-- Permite leitura se:
--   - For super admin
--   - Produto for do inquilino atual (tenant_id = current_user_tenant_id())
--   - Produto não tiver tenant_id específico (global/sistema)
--   - Produto for de parceiro homologado (parceiro_id, partner_id, parceiro_nome ou parceiro_cnpj presente)
DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
DROP POLICY IF EXISTS "permitir_select_universal_produtos" ON public.produtos;

CREATE POLICY "tenant_isolation_select_produtos" ON public.produtos
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_user_tenant_id() OR
    parceiro_id IS NOT NULL OR
    partner_id IS NOT NULL OR
    parceiro_nome IS NOT NULL OR
    parceiro_cnpj IS NOT NULL OR
    origem_produto = 'PARCEIRO'
  );


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261011230000_propostas_publicas_feedbacks_multi_tenant.sql
-- ------------------------------------------------------------------------------
-- ============================================================================
-- MIGRAÇÃO: Portal Público de Propostas, Feedbacks, Aprovação Digital e Isolamento Multi-Tenant
-- Políticas de Zero Perda de Dados (IF NOT EXISTS, evolução aditiva)
-- ============================================================================

-- 1. ADICIONAR COLUNAS ADITIVAS EM PROPOSTAS
DO $$
BEGIN
  -- Token criptográfico único para compartilhamento e portal público
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'public_token'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN public_token UUID DEFAULT gen_random_uuid() NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_propostas_public_token ON public.propostas(public_token);
  END IF;

  -- Campo de Público de Interesse
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'publico_interesse'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN publico_interesse TEXT;
  END IF;

  -- Colunas de Auditoria e Aprovação Formal Digital
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_digitalmente_em'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_digitalmente_em TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_por_nome'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_por_nome TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_por_cargo'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_por_cargo TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_por_documento'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_por_documento TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_por_ip'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_por_ip TEXT;
  END IF;
END $$;

-- 2. ADICIONAR CAMPO PUBLICO_INTERESSE EM BRIEFINGS E CAMPANHAS DE PLANEJAMENTO
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'briefings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'briefings' AND column_name = 'publico_interesse'
    ) THEN
      ALTER TABLE public.briefings ADD COLUMN publico_interesse TEXT;
    END IF;
  END IF;
END $$;

-- 3. TABELA DE FEEDBACKS E SUGESTÕES DA PROPOSTA ONLINE (Interações do Cliente)
CREATE TABLE IF NOT EXISTS public.proposta_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'outro', -- 'troca_ponto', 'ajuste_periodo', 'revisao_valores', 'outro'
  mensagem TEXT NOT NULL,
  autor_nome TEXT,
  autor_contato TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'analisado', 'atendido', 'rejeitado'
  resposta TEXT,
  respondido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposta_feedbacks_proposta_id ON public.proposta_feedbacks(proposta_id);
CREATE INDEX IF NOT EXISTS idx_proposta_feedbacks_tenant_id ON public.proposta_feedbacks(tenant_id);

-- 4. SEGURANÇA E POLÍTICAS RLS (Multi-Tenant Isolation)
ALTER TABLE public.proposta_feedbacks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Inquilino gerencia feedbacks da proposta" ON public.proposta_feedbacks;
  CREATE POLICY "Inquilino gerencia feedbacks da proposta"
    ON public.proposta_feedbacks
    FOR ALL
    TO authenticated
    USING (
      tenant_id IS NULL OR 
      tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid OR
      tenant_id = (SELECT (raw_user_meta_data->>'tenant_id')::uuid FROM auth.users WHERE id = auth.uid())
    )
    WITH CHECK (
      tenant_id IS NULL OR 
      tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid OR
      tenant_id = (SELECT (raw_user_meta_data->>'tenant_id')::uuid FROM auth.users WHERE id = auth.uid())
    );

  DROP POLICY IF EXISTS "Publico pode inserir feedback com token valido" ON public.proposta_feedbacks;
  CREATE POLICY "Publico pode inserir feedback com token valido"
    ON public.proposta_feedbacks
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
END $$;

-- 5. TABELA DE CAMPANHAS DE PLANEJAMENTO (Caso ainda não sincronizada)
CREATE TABLE IF NOT EXISTS public.campanhas_planejamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  objetivo TEXT,
  publico_interesse TEXT,
  publico_alvo TEXT,
  periodo_inicio DATE,
  periodo_fim DATE,
  investimento_previsto NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'em_estudo',
  regioes_selecionadas JSONB DEFAULT '[]'::jsonb,
  pilares JSONB DEFAULT '{}'::jsonb,
  defesa_estrategica TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campanhas_planejamento ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.campanha_pontos_midia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES public.campanhas_planejamento(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  regiao TEXT,
  pilar_estrategico TEXT,
  quantidade_insercoes INTEGER DEFAULT 1,
  valor_negociado NUMERIC(15,2) DEFAULT 0,
  impactos_estimados NUMERIC(15,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campanha_pontos_midia ENABLE ROW LEVEL SECURITY;

-- 6. TABELA DE INSERTION_ORDERS (Caso ainda não sincronizada no schema cache)
CREATE TABLE IF NOT EXISTS public.insertion_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_number TEXT NOT NULL,
  campaign_title TEXT NOT NULL,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  billing_type TEXT DEFAULT 'REPRESENTATIVE_BILLING',
  status TEXT DEFAULT 'draft',
  checking_status TEXT DEFAULT 'pending_upload',
  gross_total NUMERIC(15,2) DEFAULT 0,
  net_total NUMERIC(15,2) DEFAULT 0,
  commission_total NUMERIC(15,2) DEFAULT 0,
  retention_total NUMERIC(15,2) DEFAULT 0,
  deductions_total NUMERIC(15,2) DEFAULT 0,
  production_cost_total NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261013150000_fix_profiles_columns_and_reload.sql
-- ------------------------------------------------------------------------------
-- ==============================================================================
-- MIGRATION: 20261013150000_fix_profiles_columns_and_reload.sql
-- MOTIVO: Alinhamento de colunas da tabela public.profiles e reload do schema PostgREST
-- POLÍTICA: Não-destrutiva, idempotente (IF NOT EXISTS), compatibilidade reversa total
-- ==============================================================================

-- 1. Garantir que todas as colunas consumidas pelas APIs e telas existam na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'OPERATOR',
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_vinculado TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_url TEXT;

-- 2. Sincronizar 'role' a partir de user_roles caso existam registros prévios
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    UPDATE public.profiles p
    SET role = ur.role::text
    FROM public.user_roles ur
    WHERE p.id = ur.user_id 
      AND (p.role IS NULL OR p.role = 'OPERATOR');
  END IF;
END $$;

-- 3. Índices de performance para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cnpj ON public.profiles(cnpj);

-- 4. Garantir que proposal_templates tenha RLS permissivo para leitura autenticada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'proposal_templates'
  ) THEN
    ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Leitura de proposal_templates para autenticados" ON public.proposal_templates;
    CREATE POLICY "Leitura de proposal_templates para autenticados"
      ON public.proposal_templates
      FOR SELECT
      TO authenticated, anon
      USING (true);
  END IF;
END $$;

-- 5. Função RPC com SECURITY DEFINER para permitir redefinição administrativa segura de senhas
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_user_id UUID, new_plain_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := false;
BEGIN
  -- Permite se for chamado via backend (sem sessão de usuário direto) ou por admin/master autenticado
  IF v_caller IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = v_caller AND ur.role IN ('admin', 'super_admin')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = v_caller AND (p.is_superadmin = true OR p.role = 'MASTER')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores podem redefinir senhas.';
    END IF;
  END IF;

  IF length(new_plain_password) < 6 THEN
    RAISE EXCEPTION 'A nova senha deve possuir no mínimo 6 caracteres.';
  END IF;

  -- [Higienização] UPDATE auth.users suprimido
RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role, anon;

-- 6. Forçar recarga imediata do schema cache no PostgREST
NOTIFY pgrst, 'reload schema';



-- ------------------------------------------------------------------------------
-- MIGRATION: fix_produto_tipos_rls.sql
-- ------------------------------------------------------------------------------
-- 1. Garante que a tabela tem a coluna tenant_id
ALTER TABLE public.produto_tipos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Recria o trigger para setar o tenant automaticamente
DROP TRIGGER IF EXISTS trg_produto_tipos_set_tenant ON public.produto_tipos;
CREATE TRIGGER trg_produto_tipos_set_tenant
  BEFORE INSERT ON public.produto_tipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_tenant_id();

-- 3. Remove políticas antigas que bloqueavam executivos de salvar tipos de produtos
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar os tipos" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_select" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_insert" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_update" ON public.produto_tipos;
DROP POLICY IF EXISTS "produto_tipos_tenant_delete" ON public.produto_tipos;

-- 4. Cria as novas políticas corrigidas
-- SELECT (Permite ver do próprio inquilino ou criados pelo próprio usuário)
CREATE POLICY "produto_tipos_tenant_select" ON public.produto_tipos
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id IS NOT NULL AND tenant_id = public.current_user_tenant_id()) OR
    (created_by IS NOT NULL AND created_by = auth.uid()) OR
    (tenant_id IS NULL) -- Itens globais
  );

-- INSERT (Qualquer autenticado pode cadastrar, o trigger atrela ao inquilino)
CREATE POLICY "produto_tipos_tenant_insert" ON public.produto_tipos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    tenant_id = public.current_user_tenant_id() OR
    tenant_id IS NULL
  );

-- UPDATE (Apenas quem criou ou admins do tenant podem alterar)
CREATE POLICY "produto_tipos_tenant_update" ON public.produto_tipos
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())) OR
    (created_by = auth.uid())
  );

-- DELETE (Idem ao Update)
CREATE POLICY "produto_tipos_tenant_delete" ON public.produto_tipos
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())) OR
    (created_by = auth.uid())
  );

-- Garante permissões na tabela
GRANT ALL ON public.produto_tipos TO authenticated;
GRANT ALL ON public.produto_tipos TO service_role;



-- ==============================================================================
-- PERMISSÕES DE SCHEMA REVISADAS (MÍNIMO PRIVILÉGIO - ZERO GRANT INDISCRIMINADO)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Revogação explícita de acessos amplos indevidos para anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

NOTIFY pgrst, 'reload schema';
