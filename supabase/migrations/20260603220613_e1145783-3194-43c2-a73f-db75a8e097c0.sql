ALTER TABLE public.proposta_itens ADD COLUMN mes INTEGER;
ALTER TABLE public.proposta_itens ADD COLUMN ano INTEGER;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;
