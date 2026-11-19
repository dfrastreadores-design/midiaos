ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS dias_semana_fixos int[] NOT NULL DEFAULT '{}';