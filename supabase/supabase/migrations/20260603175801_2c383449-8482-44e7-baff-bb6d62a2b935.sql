ALTER TABLE public.agencias 
  ADD COLUMN website TEXT,
  ADD COLUMN instagram TEXT,
  ADD COLUMN linkedin TEXT,
  ADD COLUMN facebook TEXT;

ALTER TABLE public.clientes
  ADD COLUMN website TEXT,
  ADD COLUMN instagram TEXT,
  ADD COLUMN linkedin TEXT,
  ADD COLUMN facebook TEXT;

COMMENT ON COLUMN public.agencias.website IS 'URL do website da agência';
COMMENT ON COLUMN public.clientes.website IS 'URL do website do cliente';

GRANT ALL ON public.agencias TO service_role;
GRANT ALL ON public.agencias TO authenticated;
GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.clientes TO authenticated;