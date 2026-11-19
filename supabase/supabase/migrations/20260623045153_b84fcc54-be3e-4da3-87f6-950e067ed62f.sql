
-- Desabilita triggers de auditoria durante o backfill (auth.uid() é NULL na migration)
SET session_replication_role = replica;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

DO $$
DECLARE
  v_default_tenant uuid := 'a711a129-330c-46bf-943a-531cedd4f2ff';
  v_tables text[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','tarefas',
    'influenciadores','produtos','projetos_especiais','eventos_calendario',
    'reunioes','metas_executivo','materiais_apoio','links_uteis',
    'midia_config','notificacoes','permuta_recebimentos',
    'solicitacoes_producao','permuta_saldos'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL', t);
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, v_default_tenant);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', t || '_tenant_id_idx', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR tenant_id IS NULL
        OR tenant_id = public.current_tenant_id()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid())
        OR tenant_id IS NULL
        OR tenant_id = public.current_tenant_id()
      )
    $p$, t);
  END LOOP;
END $$;

UPDATE public.profiles
   SET tenant_id = 'a711a129-330c-46bf-943a-531cedd4f2ff'
 WHERE tenant_id IS NULL
   AND trial_ends_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  v_tables text[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','tarefas',
    'influenciadores','produtos','projetos_especiais','eventos_calendario',
    'reunioes','metas_executivo','materiais_apoio','links_uteis',
    'midia_config','notificacoes','permuta_recebimentos',
    'solicitacoes_producao','permuta_saldos'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_trg ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_tenant_id_trg BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user()', t);
  END LOOP;
END $$;

SET session_replication_role = origin;
