ALTER TABLE public.agencias ADD COLUMN logo_url TEXT;
GRANT ALL ON public.agencias TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias TO authenticated;
