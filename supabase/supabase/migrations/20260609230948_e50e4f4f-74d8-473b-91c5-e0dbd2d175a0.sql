ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS motivo_recusa TEXT;
ALTER TABLE public.briefings ADD COLUMN IF NOT EXISTS distribuicao_entregas TEXT;

GRANT ALL ON public.briefings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
