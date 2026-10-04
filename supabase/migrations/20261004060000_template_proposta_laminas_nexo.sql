-- ====================================================================
-- MIGRAÇÃO: Lâminas Institucionais & Layout Nexo para Template de Proposta
-- Data: Outubro de 2026
-- ====================================================================

-- 1. Adicionar colunas de controle de lâminas e métricas institucionais
ALTER TABLE public.template_proposta_config
  ADD COLUMN IF NOT EXISTS incluir_capa BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS incluir_manifesto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS incluir_como_atuamos BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS incluir_laminas_pontos BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fechamento_titulo TEXT DEFAULT 'Vamos criar o próximo nexo?',
  ADD COLUMN IF NOT EXISTS fechamento_subtitulo TEXT DEFAULT 'Conectando marcas, veículos e pessoas com inteligência estratégica.',
  ADD COLUMN IF NOT EXISTS total_populacao_impacto TEXT DEFAULT '+5,5 milhões de habitantes',
  ADD COLUMN IF NOT EXISTS total_impactos_mes TEXT DEFAULT '+18,5 milhões de impactos/mês',
  ADD COLUMN IF NOT EXISTS cobertura_pracas TEXT DEFAULT 'Distrito Federal + Goiás (Entorno)';

-- 2. Atualizar a organização Nexo existente com os novos padrões
UPDATE public.template_proposta_config
SET
  incluir_capa = true,
  incluir_manifesto = true,
  incluir_como_atuamos = true,
  incluir_laminas_pontos = true,
  fechamento_titulo = 'Vamos criar o próximo nexo?',
  fechamento_subtitulo = 'Conectando marcas, veículos e pessoas com inteligência estratégica.',
  total_populacao_impacto = '+5,5 milhões de habitantes',
  total_impactos_mes = '+18,5 milhões de impactos/mês',
  cobertura_pracas = 'Distrito Federal + Goiás (Entorno)'
WHERE organizacao_id IN (
  SELECT id FROM public.organizacoes WHERE slug = 'nexo'
);
