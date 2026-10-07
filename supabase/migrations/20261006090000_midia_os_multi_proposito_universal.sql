-- ==============================================================================
-- MIGRATION: 20261006090000_midia_os_multi_proposito_universal.sql
-- DESCRIÇÃO: Refatoração Estrutural e Arquitetural Multi-Propósito Mídia.OS
--            (Veículos, Agências, Representantes, Personalização por Inquilino)
-- DIRETRIZES: 100% Aditiva, Não-Destrutiva (Zero Perda de Dados)
-- ==============================================================================

-- 1. TIPOLOGIA DE ENTIDADES E PARCEIROS DO INQUILINO
-- ------------------------------------------------------------------------------
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS perfil_comercial TEXT DEFAULT 'VEICULO_EXIBIDOR';

CREATE INDEX IF NOT EXISTS idx_parceiros_perfil_comercial ON public.parceiros(perfil_comercial);

-- 2. MODELAGEM DINÂMICA DE PRODUTOS E FORMATOS (EXTENSÍVEL)
-- ------------------------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS posicao_site TEXT,
  ADD COLUMN IF NOT EXISTS dimensoes_pixels TEXT,
  ADD COLUMN IF NOT EXISTS url_destino TEXT,
  ADD COLUMN IF NOT EXISTS tiragem_estimada NUMERIC,
  ADD COLUMN IF NOT EXISTS sentido_fluxo TEXT,
  ADD COLUMN IF NOT EXISTS ponto_referencia TEXT,
  ADD COLUMN IF NOT EXISTS impactos_estimados NUMERIC,
  ADD COLUMN IF NOT EXISTS formato_impresso TEXT,
  ADD COLUMN IF NOT EXISTS dimensoes_cm TEXT;

-- 3. MÓDULOS ATIVOS NO INQUILINO (TENANT SETTINGS & TENANTS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'];

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  configuracoes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para tenant_settings
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_settings_select_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_select_policy" ON public.tenant_settings
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

DROP POLICY IF EXISTS "tenant_settings_insert_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_insert_policy" ON public.tenant_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

DROP POLICY IF EXISTS "tenant_settings_update_policy" ON public.tenant_settings;
CREATE POLICY "tenant_settings_update_policy" ON public.tenant_settings
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_superadmin = true OR role = 'MASTER')
    )
  );

-- Garantir registro padrão na tenant_settings para tenants existentes que ainda não possuam
INSERT INTO public.tenant_settings (tenant_id, active_modules)
SELECT id, ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO']
FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;
