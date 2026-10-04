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
