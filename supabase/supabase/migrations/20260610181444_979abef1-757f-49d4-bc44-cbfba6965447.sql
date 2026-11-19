ALTER TABLE public.proposta_itens ADD COLUMN dias_veiculacao INTEGER;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;