ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS permuta_uso TEXT CHECK (permuta_uso IN ('empresa', 'comercial'));
COMMENT ON COLUMN public.pis.permuta_uso IS 'Destino do uso da permuta: empresa (calcula na meta) ou comercial (não calcula na meta)';

UPDATE public.pis SET permuta_uso = 'empresa' WHERE permuta = true AND permuta_uso IS NULL;