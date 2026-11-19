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
