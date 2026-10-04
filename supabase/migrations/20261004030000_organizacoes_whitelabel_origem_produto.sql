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
