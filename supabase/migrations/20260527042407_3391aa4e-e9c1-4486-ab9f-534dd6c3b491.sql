ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS inscricao_municipal text;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS inscricao_municipal text;