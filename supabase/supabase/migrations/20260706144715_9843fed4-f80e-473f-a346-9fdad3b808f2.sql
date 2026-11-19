ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS investimentos_mensais JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pis.investimentos_mensais IS
  'Mapa "YYYY-MM" -> valor (numeric) com o investimento mensal do cliente para cada mês do contrato. Se ausente, o rodapé do mapa de inserção usa a soma automática das entregas do mês.';