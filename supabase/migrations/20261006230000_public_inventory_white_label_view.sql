-- ==============================================================================
-- MIGRATION: 20261006230000_public_inventory_white_label_view.sql
-- DESCRIÇÃO: Função RPC e View segura para inventário público White-Label (Flux OOH)
-- REGRA CRÍTICA DE PRIVACIDADE: NUNCA expõe dados, nomes ou IDs de parceiros proprietários.
-- ==============================================================================

-- 1. Habilita Realtime para as tabelas de ativos e produtos se ainda não estiver habilitado
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
  EXCEPTION WHEN OTHERS THEN
    -- já adicionado ou tabela sem PK replicável
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media_services_catalog;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 2. Função RPC segura com SECURITY DEFINER para consulta pública de ativos
-- Retorna estritamente dados operacionais e de localização dos ativos, sem parceiros
CREATE OR REPLACE FUNCTION public.get_public_inventory_assets(
  p_cidade TEXT DEFAULT NULL,
  p_tipo_midia TEXT DEFAULT NULL,
  p_busca TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  codigo_ativo TEXT,
  nome_ponto TEXT,
  tipo_midia TEXT,
  formato TEXT,
  dimensoes TEXT,
  cidade TEXT,
  bairro TEXT,
  uf TEXT,
  endereco TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  fotos_urls TEXT[],
  status_disponibilidade TEXT,
  valor_tabela NUMERIC,
  impactos_estimados NUMERIC,
  fluxo_diario NUMERIC,
  link_maps TEXT,
  sentido_via TEXT,
  ponto_referencia TEXT,
  ativo BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_codigo_ativo'),
      ('DF-' || UPPER(SUBSTRING(p.id::text FROM 1 FOR 4)))
    ) AS codigo_ativo,
    p.nome AS nome_ponto,
    COALESCE(p.tipo, p.midia::text, 'OOH') AS tipo_midia,
    COALESCE(p.formato, p.formato_ooh, 'Bi-Semana') AS formato,
    COALESCE(p.resolucao, p.formato_tela, p.dimensoes_pixels, NULL) AS dimensoes,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_cidade'),
      NULLIF(TRIM(SPLIT_PART(p.endereco_ponto, ',', 2)), ''),
      'Brasília'
    ) AS cidade,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_bairro'),
      NULLIF(TRIM(SPLIT_PART(p.endereco_ponto, '-', 1)), ''),
      'Plano Piloto'
    ) AS bairro,
    COALESCE(
      (p.detalhes_venda::jsonb->>'_uf'),
      'DF'
    ) AS uf,
    p.endereco_ponto AS endereco,
    p.latitude,
    p.longitude,
    CASE 
      WHEN p.fotos IS NOT NULL AND array_length(p.fotos, 1) > 0 THEN p.fotos
      WHEN (p.detalhes_venda::jsonb->'_fotos') IS NOT NULL THEN 
        ARRAY(SELECT jsonb_array_elements_text(p.detalhes_venda::jsonb->'_fotos'))
      ELSE ARRAY[]::TEXT[]
    END AS fotos_urls,
    COALESCE((p.detalhes_venda::jsonb->>'_status_disponibilidade'), 'Disponível') AS status_disponibilidade,
    COALESCE(p.valor_unit, 0.00) AS valor_tabela,
    COALESCE(p.impactos_estimados, 0) AS impactos_estimados,
    COALESCE((p.detalhes_venda::jsonb->>'_fluxo_veiculos_dia')::numeric, 0) AS fluxo_diario,
    p.link_maps,
    COALESCE(p.sentido_via, (p.detalhes_venda::jsonb->>'_sentido_fluxo')) AS sentido_via,
    p.ponto_referencia,
    p.ativo,
    p.updated_at
  FROM public.produtos p
  WHERE p.ativo = true
    AND (p_cidade IS NULL OR p.endereco_ponto ILIKE ('%' || p_cidade || '%') OR (p.detalhes_venda::jsonb->>'_cidade') ILIKE ('%' || p_cidade || '%'))
    AND (p_tipo_midia IS NULL OR p.tipo ILIKE ('%' || p_tipo_midia || '%') OR p.midia::text ILIKE ('%' || p_tipo_midia || '%'))
    AND (
      p_busca IS NULL OR 
      p.nome ILIKE ('%' || p_busca || '%') OR 
      p.endereco_ponto ILIKE ('%' || p_busca || '%') OR
      (p.detalhes_venda::jsonb->>'_codigo_ativo') ILIKE ('%' || p_busca || '%')
    )
  ORDER BY p.updated_at DESC;
END;
$$;

-- Permissões de acesso público e autenticado
GRANT EXECUTE ON FUNCTION public.get_public_inventory_assets(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_public_inventory_assets IS 'Consulta de inventário público para vitrine White-Label (estilo Flux OOH) sem expor parceiros proprietários';
