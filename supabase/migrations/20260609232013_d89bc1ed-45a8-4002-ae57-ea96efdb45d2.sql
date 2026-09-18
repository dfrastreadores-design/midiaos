ALTER TABLE public.pis ADD COLUMN responsavel_negociacao_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.pis ADD COLUMN executivo_execucao_id UUID REFERENCES public.profiles(id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pis TO authenticated;
GRANT ALL ON public.pis TO service_role;
