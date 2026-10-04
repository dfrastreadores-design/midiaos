-- ==============================================================================
-- MIGRATION: 20261004023000_organizacoes_tenants_nexo.sql
-- DESCRIÇÃO: Criação da tabela de Organizações (Tenants), vínculo de perfis e inventário
--            Inserção da Nexo Mídia e Representação como organização pioneira
-- DIRETRIZ: Zero perda de dados, aditiva e retrocompatível (AGENTS.md)
-- ==============================================================================

-- 1. Criar tabela de organizações (Tenants)
CREATE TABLE IF NOT EXISTS public.organizacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- ex: 'nexo'
    site_url TEXT,
    logo_url TEXT,
    tagline TEXT,
    termos_proposta TEXT,
    cor_primaria TEXT DEFAULT '#0f172a',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir a Nexo como organização pioneira
INSERT INTO public.organizacoes (nome, slug, site_url, tagline, termos_proposta)
VALUES (
    'Nexo Mídia e Representação',
    'nexo',
    'https://nexomidiaerepresentacao.com.br',
    'Hub de Negócios e Soluções Estratégicas em Mídia',
    'A Nexo Mídia e Representação atua como Hub Estratégico conectando marcas aos melhores veículos e soluções 360° no Distrito Federal.'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Vincular perfis à organização
-- Garante que public.perfis exista caso seja referenciada como tabela física
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT,
    email TEXT,
    telefone TEXT,
    cargo TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

-- Vincular também à tabela nativa de perfis do Mídia.OS (public.profiles)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

-- 3. Vincular inventário próprio à organização proprietária
-- Suporte caso public.inventario_midia seja tabela física
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventario_midia'
  ) THEN
    ALTER TABLE public.inventario_midia 
    ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);
  END IF;
END $$;

-- Vincular tabela de produtos físicos / formatos à organização
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

-- 4. Sincronização e Retrocompatibilidade com public.tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS site_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS termos_proposta TEXT,
  ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id);

-- Espelhar a Nexo em public.tenants mantendo integridade com as regras legadas
INSERT INTO public.tenants (
  id,
  razao_social,
  nome_fantasia,
  slug,
  site_url,
  site,
  tagline,
  termos_proposta,
  cor_primaria,
  status,
  plano
)
SELECT 
  o.id,
  o.nome,
  o.nome,
  o.slug,
  o.site_url,
  o.site_url,
  o.tagline,
  o.termos_proposta,
  o.cor_primaria,
  'ativo',
  'enterprise'
FROM public.organizacoes o
WHERE o.slug = 'nexo'
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  site_url = EXCLUDED.site_url,
  tagline = EXCLUDED.tagline,
  termos_proposta = EXCLUDED.termos_proposta,
  cor_primaria = EXCLUDED.cor_primaria;

-- Vincular organizacao_id nos tenants e perfis existentes correspondentes à Nexo
UPDATE public.tenants t
SET organizacao_id = o.id
FROM public.organizacoes o
WHERE o.slug = 'nexo' AND (t.id = o.id OR t.razao_social ILIKE '%nexo%' OR t.nome_fantasia ILIKE '%nexo%');

UPDATE public.profiles p
SET organizacao_id = o.id
FROM public.organizacoes o
WHERE o.slug = 'nexo' AND (p.organizacao_id IS NULL AND (p.tenant_id = o.id OR p.email ILIKE '%nexo%'));

UPDATE public.produtos p
SET organizacao_id = o.id
FROM public.organizacoes o
WHERE o.slug = 'nexo' AND p.organizacao_id IS NULL AND p.tenant_id = o.id;

-- 5. Atualizar a View unificada public.inventario_midia para expor organizacao_id
CREATE OR REPLACE VIEW public.inventario_midia AS 
SELECT 
  id,
  tenant_id,
  organizacao_id,
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

COMMENT ON VIEW public.inventario_midia IS 'View unificada de inventário comercial de mídia com suporte a organizacao_id e canais ON/OFF';

-- 6. Permissões e RLS
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizacoes' AND policyname = 'organizacoes_select_all'
  ) THEN
    CREATE POLICY "organizacoes_select_all" ON public.organizacoes FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizacoes' AND policyname = 'organizacoes_admin_all'
  ) THEN
    CREATE POLICY "organizacoes_admin_all" ON public.organizacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizacoes TO authenticated;
GRANT SELECT ON public.organizacoes TO anon;
GRANT ALL ON public.organizacoes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_midia TO authenticated;
GRANT SELECT ON public.inventario_midia TO anon;

-- 7. Notificar o PostgREST para recarregar o schema imediatamente
NOTIFY pgrst, 'reload schema';
