-- ==============================================================================
-- MIGRATION: 20261009210000_tenant_branding_imagem_comercial.sql
-- DESCRIÇÃO: Identidade Visual Comercial e Blindagem de Imagens de Mídia:
--            - Tabela public.tenant_branding (logo, marca_dagua, nome_comercial)
--            - Colunas em public.produtos: imagem_original, imagem_comercial,
--              fotos_originais, fotos_comerciais, branding_aplicado
-- DIRETRIZ: ADITIVA E RETROCOMPATÍVEL (ZERO PERDA DE DADOS)
-- ==============================================================================

-- 1. Criação da tabela de identidade visual comercial do inquilino
CREATE TABLE IF NOT EXISTS public.tenant_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID UNIQUE,
  nome_comercial TEXT NOT NULL,
  logo TEXT,
  marca_dagua TEXT,
  posicao_marca_dagua TEXT DEFAULT 'bottom-right' CHECK (posicao_marca_dagua IN ('bottom-right', 'bottom-left', 'center', 'top-right')),
  opacidade_marca_dagua NUMERIC(3,2) DEFAULT 0.65,
  remover_identificacao_fornecedor BOOLEAN DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas caso a tabela já exista
ALTER TABLE public.tenant_branding
  ADD COLUMN IF NOT EXISTS nome_comercial TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS marca_dagua TEXT,
  ADD COLUMN IF NOT EXISTS posicao_marca_dagua TEXT DEFAULT 'bottom-right',
  ADD COLUMN IF NOT EXISTS opacidade_marca_dagua NUMERIC(3,2) DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS remover_identificacao_fornecedor BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 2. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant ON public.tenant_branding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_ativo ON public.tenant_branding(ativo);

-- 3. Adicionar colunas aditivas na tabela public.produtos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'produtos'
  ) THEN
    ALTER TABLE public.produtos
      ADD COLUMN IF NOT EXISTS imagem_original TEXT,
      ADD COLUMN IF NOT EXISTS imagem_comercial TEXT,
      ADD COLUMN IF NOT EXISTS fotos_originais TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS fotos_comerciais TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS branding_aplicado BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_produtos_branding_aplicado ON public.produtos(branding_aplicado);
  END IF;
END $$;

-- 4. Retrocompatibilidade: Inicializar imagem_comercial e imagem_original a partir de foto_principal
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'produtos'
  ) THEN
    UPDATE public.produtos
    SET imagem_original = COALESCE(imagem_original, foto_principal),
        imagem_comercial = COALESCE(imagem_comercial, foto_principal)
    WHERE foto_principal IS NOT NULL 
      AND (imagem_original IS NULL OR imagem_comercial IS NULL);
  END IF;
END $$;

-- 5. Trigger de atualização de timestamp
CREATE OR REPLACE FUNCTION public.trg_tenant_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_branding_update ON public.tenant_branding;
CREATE TRIGGER trg_tenant_branding_update
  BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tenant_branding_updated_at();

-- 6. RLS (Row Level Security)
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_branding_select_policy" ON public.tenant_branding;
CREATE POLICY "tenant_branding_select_policy" ON public.tenant_branding
  FOR SELECT
  USING (
    tenant_id IS NULL 
    OR tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR (auth.jwt() ->> 'app_tenant_id')::uuid = tenant_id
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

DROP POLICY IF EXISTS "tenant_branding_all_policy" ON public.tenant_branding;
CREATE POLICY "tenant_branding_all_policy" ON public.tenant_branding
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR (auth.jwt() ->> 'app_tenant_id')::uuid = tenant_id
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

COMMENT ON TABLE public.tenant_branding IS 'Identidade visual comercial do inquilino para aplicação de logo e marca d água em mídias de clientes.';
