ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS valor_manual NUMERIC;
NOTIFY pgrst, 'reload schema';