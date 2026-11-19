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
