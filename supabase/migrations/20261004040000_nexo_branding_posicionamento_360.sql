-- ====================================================================
-- MIGRAÇÃO: Atualização de Branding, Posicionamento e Defesa Comercial Nexo
-- Data: Outubro de 2026
-- ====================================================================

-- 1. Atualizar ou garantir a organização Nexo Mídia e Representação com os textos oficiais
UPDATE public.organizacoes
SET 
  nome = 'NEXO Mídia e Representação',
  tagline = 'Hub de Negócios & Soluções Estratégicas em Mídia',
  site_url = 'https://nexomidiaerepresentacao.com.br',
  termos_proposta = 'A Nexo Mídia e Representação atua como um Hub de Negócios especializado em conectar marcas a oportunidades de alto impacto no Distrito Federal e entorno. Combinamos veículos de mídia consolidados, inteligência geográfica regional e soluções estratégicas personalizadas para garantir máxima lembrança e retorno para o seu investimento.',
  cor_primaria = '#0f172a'
WHERE slug = 'nexo';

-- 2. Inserir caso não exista
INSERT INTO public.organizacoes (
  nome,
  slug,
  site_url,
  tagline,
  termos_proposta,
  cor_primaria
)
VALUES (
  'NEXO Mídia e Representação',
  'nexo',
  'https://nexomidiaerepresentacao.com.br',
  'Hub de Negócios & Soluções Estratégicas em Mídia',
  'A Nexo Mídia e Representação atua como um Hub de Negócios especializado em conectar marcas a oportunidades de alto impacto no Distrito Federal e entorno. Combinamos veículos de mídia consolidados, inteligência geográfica regional e soluções estratégicas personalizadas para garantir máxima lembrança e retorno para o seu investimento.',
  '#0f172a'
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  tagline = EXCLUDED.tagline,
  site_url = EXCLUDED.site_url,
  termos_proposta = EXCLUDED.termos_proposta,
  cor_primaria = EXCLUDED.cor_primaria;
