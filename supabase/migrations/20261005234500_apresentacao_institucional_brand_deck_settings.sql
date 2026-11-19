-- ====================================================================
-- MIGRAÇÃO: Apresentação Institucional, Brand Deck & Mídia Kit Corporativo
-- Adiciona suporte a customização do Mídia Kit Corporativo de 10 Lâminas
-- Data: Outubro de 2026
-- ====================================================================

-- 1. Criar tabela tenant_settings se não existir
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    company_name TEXT DEFAULT 'Nexo Mídia e Representação',
    company_tagline TEXT DEFAULT 'Estratégia • Mídia • Representação',
    about_text TEXT DEFAULT 'A Nexo Mídia e Representação atua como a ponte estratégica entre anunciantes e as maiores oportunidades de mídia no Distrito Federal, Goiás e praças nacionais. Conectamos marcas consagradas aos veículos de maior credibilidade e audiência.',
    leadership_info JSONB DEFAULT '[{"nome": "Rafael Rodrigo", "cargo": "Diretor Comercial & Estratégia", "telefone": "(61) 99125-7245", "email": "rafaelnexomidia@gmail.com", "bio": "Especialista em inteligência de mídia OOH/DOOH e planejamento comercial de alta performance."}]'::jsonb,
    channels_overview JSONB DEFAULT '{"total_parceiros": 15, "total_paineis": 54, "populacao_impacto": "+5,5 milhões de habitantes", "total_impactos_mes": "+18,5 milhões de impactos/mês", "cobertura": "Distrito Federal + Goiás (Entorno) e Praças Nacionais"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de tenant_settings para autenticados e publico"
ON public.tenant_settings FOR SELECT
USING (true);

CREATE POLICY "Permitir alteracao de tenant_settings para usuarios autenticados"
ON public.tenant_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Retrocompatibilidade: Adicionar colunas também em template_proposta_config e tenants
ALTER TABLE public.template_proposta_config
  ADD COLUMN IF NOT EXISTS company_tagline TEXT DEFAULT 'Estratégia • Mídia • Representação',
  ADD COLUMN IF NOT EXISTS about_text TEXT,
  ADD COLUMN IF NOT EXISTS leadership_info JSONB,
  ADD COLUMN IF NOT EXISTS channels_overview JSONB;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS company_tagline TEXT DEFAULT 'Estratégia • Mídia • Representação',
  ADD COLUMN IF NOT EXISTS about_text TEXT,
  ADD COLUMN IF NOT EXISTS leadership_info JSONB,
  ADD COLUMN IF NOT EXISTS channels_overview JSONB;

-- 3. Atualizar configurações padrão para a organização Nexo
UPDATE public.template_proposta_config
SET
  company_tagline = 'Estratégia • Mídia • Representação',
  about_text = 'A Nexo Mídia e Representação atua como a ponte estratégica entre anunciantes e as maiores oportunidades de mídia no Distrito Federal, Goiás e praças nacionais.',
  leadership_info = '[{"nome": "Rafael Rodrigo", "cargo": "Diretor Comercial & Estratégia", "telefone": "(61) 99125-7245", "email": "rafaelnexomidia@gmail.com", "bio": "Especialista em inteligência de mídia OOH/DOOH e planejamento comercial de alta performance."}]'::jsonb,
  channels_overview = '{"total_parceiros": 15, "total_paineis": 54, "populacao_impacto": "+5,5 milhões de habitantes", "total_impactos_mes": "+18,5 milhões de impactos/mês", "cobertura": "Distrito Federal + Goiás (Entorno) e Praças Nacionais"}'::jsonb
WHERE organizacao_id IN (
  SELECT id FROM public.organizacoes WHERE slug = 'nexo'
);
