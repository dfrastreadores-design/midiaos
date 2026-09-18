ALTER TABLE public.produtos ADD COLUMN formato TEXT;
COMMENT ON COLUMN public.produtos.formato IS 'Formato do produto (ex: 30s, Página inteira, etc)';
GRANT ALL ON public.produtos TO service_role;
GRANT ALL ON public.produtos TO authenticated;