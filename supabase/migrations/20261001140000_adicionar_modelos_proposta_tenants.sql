-- ==============================================================================
-- MIGRAÇÃO ADITIVA: MODELOS DE PROPOSTA PERSONALIZADOS POR CLIENTE / TENANT
-- Permite até 3 modelos em PDF com editor e mapeamento visual de campos dinâmicos
-- (valores, produtos, defesa da proposta, dados do cliente e assinaturas)
-- ==============================================================================

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS modelos_proposta JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tenants.modelos_proposta IS 'Lista de até 3 modelos de proposta em PDF com mapeamento e direcionamento de campos dinâmicos (valores, produtos, defesa da proposta)';
