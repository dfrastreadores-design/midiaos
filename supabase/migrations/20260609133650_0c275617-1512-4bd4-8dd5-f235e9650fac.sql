
CREATE TABLE public.sync_cnpj_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('cliente','agencia')),
  entidade_id uuid NOT NULL,
  cnpj text,
  razao_social text,
  status text NOT NULL CHECK (status IN ('atualizado','sem_alteracao','erro','ignorado')),
  campos_alterados jsonb DEFAULT '{}'::jsonb,
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sync_cnpj_log TO authenticated;
GRANT ALL ON public.sync_cnpj_log TO service_role;
ALTER TABLE public.sync_cnpj_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync log readable by authenticated" ON public.sync_cnpj_log FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_sync_cnpj_log_created ON public.sync_cnpj_log(created_at DESC);

-- Track last sync per entity for round-robin processing
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cnpj_sync_at timestamptz;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS cnpj_sync_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj_sync_at ON public.clientes(cnpj_sync_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_agencias_cnpj_sync_at ON public.agencias(cnpj_sync_at NULLS FIRST);
