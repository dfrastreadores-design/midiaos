-- ==============================================================================
-- MIGRATION: 20261006100000_multi_proposito_config_and_terminologia.sql
-- DESCRIÇÃO: Expansão Aditiva do Mídia.OS Multi-Propósito
--            Suporte a configurações de módulos ativos e terminologia por inquilino.
-- DIRETRIZES: 100% Aditiva, Não-Destrutiva (Zero Perda de Dados)
-- ==============================================================================

-- 1. Garantir colunas em tenant_settings
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS terminologia_veiculo TEXT DEFAULT 'Veículo de Comunicação';

-- 2. Garantir sincronia em tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'],
  ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO'];

-- 3. Atualizar registros existentes onde active_modules seja nulo
UPDATE public.tenant_settings
SET active_modules = ARRAY['OOH', 'DOOH', 'DIGITAL', 'RADIO', 'PRINT', 'TV', 'PI_FINANCEIRO']
WHERE active_modules IS NULL OR array_length(active_modules, 1) = 0;

UPDATE public.tenant_settings
SET modulos_ativos = active_modules
WHERE modulos_ativos IS NULL;

-- 4. Garantir índices úteis para consultas de perfil e módulos
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON public.tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_perfil_comercial ON public.parceiros(perfil_comercial);
