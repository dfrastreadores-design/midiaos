ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS veiculacao_tipo TEXT NOT NULL DEFAULT 'livre'
    CHECK (veiculacao_tipo IN ('livre','dias_uteis','dias_fixos')),
  ADD COLUMN IF NOT EXISTS dias_fixos INTEGER[] NOT NULL DEFAULT '{}';