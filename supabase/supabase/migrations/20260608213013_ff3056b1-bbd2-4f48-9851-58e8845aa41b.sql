ALTER TABLE public.pi_assinaturas_cliente
  ADD COLUMN IF NOT EXISTS documento_tipo TEXT,
  ADD COLUMN IF NOT EXISTS documento_url TEXT,
  ADD COLUMN IF NOT EXISTS documento_mime TEXT;