ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS produtos TEXT[];
COMMENT ON COLUMN public.briefings.produtos IS 'Lista de nomes de produtos selecionados no briefing';