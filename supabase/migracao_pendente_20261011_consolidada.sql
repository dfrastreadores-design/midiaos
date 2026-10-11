-- ==============================================================================
-- MÍDIA.OS — MIGRATION CONSOLIDADA DE PRODUÇÃO (OUTUBRO/2026)
-- PROJETO SUPABASE: tvniawyweymutjiybxyo
-- POLÍTICA DE ZERO PERDA DE DADOS: ADITIVA, SEGURA E RETROCOMPATÍVEL
-- Módulos:
--   1. Planejamento Estratégico (campanhas_planejamento, campanha_pontos_midia)
--   2. Assistente e Estratégias IA (estrategias_ia)
--   3. Evolução de Atributos do Inventário (foto_principal, valor_negociado, etc.)
--   4. Rede de Inventário (rede_inventario: Próprio vs Representado)
--   5. Identidade Visual Comercial (tenant_branding, blindagem de imagens)
--   6. Copiloto Comercial Gemini (histórico e vínculos de propostas)
--   7. RLS e Visibilidade de Produtos Homologados
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. MÓDULO: PLANEJAMENTO ESTRATÉGICO DE CAMPANHAS
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

CREATE INDEX IF NOT EXISTS idx_campanhas_plan_tenant ON public.campanhas_planejamento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_plan_cliente ON public.campanhas_planejamento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_plan_proposta ON public.campanhas_planejamento(proposta_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_plan_status ON public.campanhas_planejamento(status);

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

-- ==============================================================================
-- 2. MÓDULO: ASSISTENTE IA DE PLANEJAMENTO & COPILOTO (estrategias_ia)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.estrategias_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    campanha_id UUID REFERENCES public.campanhas_planejamento(id) ON DELETE SET NULL,
    prompt JSONB NOT NULL,
    resposta JSONB NOT NULL,
    tipo_consulta TEXT DEFAULT 'copiloto_comercial',
    proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas adicionais caso tabela já exista
ALTER TABLE public.estrategias_ia
  ADD COLUMN IF NOT EXISTS tipo_consulta TEXT DEFAULT 'copiloto_comercial',
  ADD COLUMN IF NOT EXISTS proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estrategias_ia_tenant ON public.estrategias_ia(tenant_id);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_cliente ON public.estrategias_ia(cliente_id);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_campanha ON public.estrategias_ia(campanha_id);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_created ON public.estrategias_ia(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_tipo ON public.estrategias_ia(tipo_consulta);
CREATE INDEX IF NOT EXISTS idx_estrategias_ia_proposta ON public.estrategias_ia(proposta_id);

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

-- ==============================================================================
-- 3. EVOLUÇÃO DO INVENTÁRIO DE MÍDIA (public.produtos)
-- ==============================================================================

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS foto_principal TEXT,
  ADD COLUMN IF NOT EXISTS valor_negociado NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fluxo_estimado NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publico_alvo TEXT,
  ADD COLUMN IF NOT EXISTS dimensao TEXT,
  ADD COLUMN IF NOT EXISTS imagem_original TEXT,
  ADD COLUMN IF NOT EXISTS imagem_comercial TEXT,
  ADD COLUMN IF NOT EXISTS fotos_originais TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fotos_comerciais TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS branding_aplicado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS origem_produto TEXT DEFAULT 'PROPRIO',
  ADD COLUMN IF NOT EXISTS organizacao_id UUID,
  ADD COLUMN IF NOT EXISTS partner_id UUID,
  ADD COLUMN IF NOT EXISTS rede_inventario_id UUID,
  ADD COLUMN IF NOT EXISTS tipo_origem_inventario TEXT DEFAULT 'PROPRIO';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organizacao_id UUID;

CREATE INDEX IF NOT EXISTS idx_produtos_status_operacional ON public.produtos(status_operacional);
CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_id ON public.produtos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_produtos_valor_negociado ON public.produtos(valor_negociado);
CREATE INDEX IF NOT EXISTS idx_produtos_branding_aplicado ON public.produtos(branding_aplicado);

-- Inicializar imagem_comercial e imagem_original a partir de foto_principal/fotos
UPDATE public.produtos
SET imagem_original = COALESCE(imagem_original, foto_principal),
    imagem_comercial = COALESCE(imagem_comercial, foto_principal)
WHERE foto_principal IS NOT NULL 
  AND (imagem_original IS NULL OR imagem_comercial IS NULL);

-- ==============================================================================
-- 4. MÓDULO: REDE DE INVENTÁRIO (PRÓPRIO VS REPRESENTADO)
-- ==============================================================================

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

CREATE INDEX IF NOT EXISTS idx_rede_inventario_tenant ON public.rede_inventario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_tipo ON public.rede_inventario(tipo_origem);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_status ON public.rede_inventario(status);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_cnpj ON public.rede_inventario(cnpj);

-- Vincular constraint de chave estrangeira em produtos se rede_inventario existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_produtos_rede_inventario' AND table_name = 'produtos'
  ) THEN
    ALTER TABLE public.produtos
      ADD CONSTRAINT fk_produtos_rede_inventario 
      FOREIGN KEY (rede_inventario_id) REFERENCES public.rede_inventario(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_produtos_rede_inventario ON public.produtos(rede_inventario_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo_origem ON public.produtos(tipo_origem_inventario);

-- Sincronizar parceiros legados para a rede de inventário (preservando tudo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'parceiros'
  ) THEN
    INSERT INTO public.rede_inventario (
      id, tenant_id, tipo_origem, nome_interno, nome_comercial,
      empresa, cnpj, contato, contrato, comissao, status, created_at, updated_at
    )
    SELECT 
      p.id, p.tenant_id, 'REPRESENTADO' AS tipo_origem,
      p.razao_social AS nome_interno,
      COALESCE(NULLIF(p.nome_fantasia, ''), p.razao_social) AS nome_comercial,
      p.razao_social AS empresa, p.cnpj,
      COALESCE(NULLIF(p.contato_nome, ''), NULLIF(p.contato_email, ''), NULLIF(p.contato_telefone, ''), 'Contato Comercial') AS contato,
      COALESCE(p.condicoes_comerciais, 'Contrato de Representação Padrão') AS contrato,
      COALESCE(p.comissao_padrao_pct, 20.00) AS comissao,
      CASE WHEN p.ativo = false THEN 'inativo' ELSE 'ativo' END AS status,
      p.created_at, p.updated_at
    FROM public.parceiros p
    ON CONFLICT (id) DO NOTHING;

    -- Conectar produtos ao seu parceiro na rede
    UPDATE public.produtos
    SET rede_inventario_id = parceiro_id,
        tipo_origem_inventario = 'REPRESENTADO'
    WHERE parceiro_id IS NOT NULL AND rede_inventario_id IS NULL;
  END IF;
END $$;

-- Trigger updated_at para rede_inventario
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

ALTER TABLE public.rede_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rede_inventario_all_policy" ON public.rede_inventario;
CREATE POLICY "rede_inventario_all_policy" ON public.rede_inventario
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR (SELECT auth.jwt() ->> 'email') = 'rafaelnexomidia@gmail.com'
  );

-- ==============================================================================
-- 5. MÓDULO: IDENTIDADE VISUAL COMERCIAL (tenant_branding)
-- ==============================================================================

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

ALTER TABLE public.tenant_branding
  ADD COLUMN IF NOT EXISTS nome_comercial TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS marca_dagua TEXT,
  ADD COLUMN IF NOT EXISTS posicao_marca_dagua TEXT DEFAULT 'bottom-right',
  ADD COLUMN IF NOT EXISTS opacidade_marca_dagua NUMERIC(3,2) DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS remover_identificacao_fornecedor BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant ON public.tenant_branding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_ativo ON public.tenant_branding(ativo);

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

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_branding_all_policy" ON public.tenant_branding;
CREATE POLICY "tenant_branding_all_policy" ON public.tenant_branding
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR (SELECT auth.jwt() ->> 'email') = 'rafaelnexomidia@gmail.com'
  );

-- ==============================================================================
-- 6. AJUSTE DE RLS E PRIVILÉGIOS DE PRODUTOS
-- ==============================================================================

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

-- ==============================================================================
-- FIM DA MIGRATION CONSOLIDADA
-- ==============================================================================
