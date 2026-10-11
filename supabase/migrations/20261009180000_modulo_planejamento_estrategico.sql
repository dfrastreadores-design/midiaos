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
