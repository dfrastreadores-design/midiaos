
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS situacao_cadastral text;

ALTER TABLE public.agencias
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS situacao_cadastral text;
