ALTER TABLE public.pis ADD COLUMN vencimento_tipo TEXT DEFAULT 'manual';
COMMENT ON COLUMN public.pis.vencimento_tipo IS 'Tipo de vencimento: manual, 15dfm ou 30dfm';
