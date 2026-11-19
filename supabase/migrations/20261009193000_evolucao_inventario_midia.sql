-- ==============================================================================
-- MIGRATION: 20261009193000_evolucao_inventario_midia.sql
-- DESCRIÇÃO: Evolução do inventário de mídia em public.produtos:
--            - foto_principal (armazenamento prioritário de thumbnail)
--            - valor_negociado (valor comercial para negociações e propostas)
--            - fluxo_estimado (audiência, tráfego ou pessoas estimadas)
--            - publico_alvo (perfil do público, classe social e demografia)
--            - dimensao (medidas físicas, ex: 9x3m ou 1920x1080)
-- POLÍTICA: ADITIVA E RETROCOMPATÍVEL (ZERO PERDA DE DADOS)
-- ==============================================================================

-- 1. Adicionar colunas aditivas à tabela public.produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS foto_principal TEXT,
  ADD COLUMN IF NOT EXISTS valor_negociado NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fluxo_estimado NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publico_alvo TEXT,
  ADD COLUMN IF NOT EXISTS dimensao TEXT;

-- 2. Atualizar fotos default e índices úteis para consultas de catálogo
CREATE INDEX IF NOT EXISTS idx_produtos_status_operacional ON public.produtos(status_operacional);
CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_id ON public.produtos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_produtos_valor_negociado ON public.produtos(valor_negociado);

-- 3. Atualizar a View public.inventario_midia para incluir os novos campos caso exista
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'inventario_midia'
  ) THEN
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
      valor_negociado,
      fluxo_estimado,
      publico_alvo,
      dimensao,
      canal_macro,
      plataforma_rede,
      metricas_digitais,
      latitude,
      longitude,
      link_maps,
      sentido_via,
      ponto_referencia,
      ativo,
      status_operacional,
      parceiro_id,
      parceiro_nome,
      parceiro_cnpj,
      praca,
      foto_principal,
      fotos,
      created_at,
      updated_at
    FROM public.produtos;
  END IF;
END $$;
