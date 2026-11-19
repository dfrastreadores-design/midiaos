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
