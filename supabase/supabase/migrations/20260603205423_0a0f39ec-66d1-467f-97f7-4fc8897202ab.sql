ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS email_faturamento TEXT;
COMMENT ON COLUMN public.pis.email_faturamento IS 'E-mail para envio da nota fiscal';