-- Adiciona coluna horario em proposta_itens
ALTER TABLE public.proposta_itens ADD COLUMN horario TEXT;

-- Adiciona coluna horario em pi_itens
ALTER TABLE public.pi_itens ADD COLUMN horario TEXT;

-- Garante permissões (embora já devam existir pelo GRANT ALL ON ALL TABLES)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;
GRANT ALL ON public.pi_itens TO service_role;