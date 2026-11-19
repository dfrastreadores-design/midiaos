ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS faturamento_contra text NOT NULL DEFAULT 'cliente' CHECK (faturamento_contra IN ('cliente','agencia')),
  ADD COLUMN IF NOT EXISTS faturamento_tipo text NOT NULL DEFAULT 'bruto' CHECK (faturamento_tipo IN ('bruto','liquido')),
  ADD COLUMN IF NOT EXISTS data_faturamento date,
  ADD COLUMN IF NOT EXISTS data_envio_nota date,
  ADD COLUMN IF NOT EXISTS data_vencimento_nota date;