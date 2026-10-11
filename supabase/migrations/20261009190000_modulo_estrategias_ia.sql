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
