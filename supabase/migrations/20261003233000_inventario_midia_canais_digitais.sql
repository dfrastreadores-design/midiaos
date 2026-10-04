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
