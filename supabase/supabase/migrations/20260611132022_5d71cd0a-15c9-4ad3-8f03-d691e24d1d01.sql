ALTER TABLE public.briefings 
ADD COLUMN IF NOT EXISTS produto_interesse TEXT,
ADD COLUMN IF NOT EXISTS tempo_contrato TEXT,
ADD COLUMN IF NOT EXISTS segmento_cliente TEXT;

-- Grant permissions (though table is already granted, adding specific columns is covered by ALL)
GRANT ALL ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;
