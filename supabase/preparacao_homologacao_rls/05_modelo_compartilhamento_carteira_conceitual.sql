-- ==============================================================================
-- ETAPA 4 - HOMOLOGAÇÃO PREPARADA (NÃO EXECUTADA)
-- ARQUIVO: 05_modelo_compartilhamento_carteira_conceitual.sql
-- OBJETIVO: Modelo formal de compartilhamento de carteira por delegação autorizada.
-- REGRA MANDATÓRIA: Não executar automaticamente. Proposta para homologação futura.
-- ==============================================================================

-- 1. TABELA FORMAL DE COMPARTILHAMENTO DE CARTEIRA
CREATE TABLE IF NOT EXISTS public.carteira_compartilhamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    concedido_por UUID NOT NULL REFERENCES auth.users(id),
    executivo_origem_id UUID NOT NULL REFERENCES auth.users(id),
    executivo_destino_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Escopo da autorização
    escopo TEXT NOT NULL CHECK (escopo IN ('CLIENTE', 'PROPOSTA', 'CARTEIRA_COMPLETA')),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    proposta_id UUID REFERENCES public.propostas(id) ON DELETE CASCADE,
    permissao TEXT NOT NULL DEFAULT 'LEITURA' CHECK (permissao IN ('LEITURA', 'EDICAO')),
    
    -- Motivo e Validade
    motivo TEXT NOT NULL,
    data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_fim TIMESTAMPTZ NOT NULL,
    revogado_em TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compartilhamento_tenant ON public.carteira_compartilhamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compartilhamento_destino ON public.carteira_compartilhamentos(executivo_destino_id);
CREATE INDEX IF NOT EXISTS idx_compartilhamento_cliente ON public.carteira_compartilhamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_compartilhamento_proposta ON public.carteira_compartilhamentos(proposta_id);

-- 2. FUNÇÃO AUXILIAR PARA CONSULTAR SE HÁ DELEGAÇÃO ATIVA
CREATE OR REPLACE FUNCTION public.tem_acesso_carteira_delegada(
    _executivo_id UUID,
    _tipo TEXT,        -- 'CLIENTE' ou 'PROPOSTA'
    _registro_id UUID,
    _requer_edicao BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.carteira_compartilhamentos c
        WHERE c.executivo_destino_id = _executivo_id
          AND c.revogado_em IS NULL
          AND now() BETWEEN c.data_inicio AND c.data_fim
          AND (
              c.escopo = 'CARTEIRA_COMPLETA'
              OR (_tipo = 'CLIENTE' AND c.cliente_id = _registro_id)
              OR (_tipo = 'PROPOSTA' AND c.proposta_id = _registro_id)
          )
          AND (
              _requer_edicao IS FALSE 
              OR c.permissao = 'EDICAO'
          )
    );
END;
$$;
