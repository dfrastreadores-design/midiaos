
-- 1) Trash table
CREATE TABLE IF NOT EXISTS public.trash_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  descricao TEXT,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '45 days'),
  restored_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trash_items_tenant ON public.trash_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trash_items_expires ON public.trash_items(expires_at) WHERE restored_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trash_items_tabela ON public.trash_items(tabela);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trash_items TO authenticated;
GRANT ALL ON public.trash_items TO service_role;

ALTER TABLE public.trash_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver lixeira do tenant"
ON public.trash_items FOR SELECT TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Admins podem atualizar lixeira"
ON public.trash_items FOR UPDATE TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Admins podem apagar lixeira"
ON public.trash_items FOR DELETE TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

-- Insert bypass: só via SECURITY DEFINER trigger (nenhuma policy de INSERT)

-- 2) Trigger genérico BEFORE DELETE
CREATE OR REPLACE FUNCTION public.trg_move_to_trash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB := to_jsonb(OLD);
  v_tenant UUID;
  v_desc TEXT;
BEGIN
  BEGIN v_tenant := (v_payload->>'tenant_id')::uuid; EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;
  v_desc := COALESCE(
    v_payload->>'razao_social',
    v_payload->>'nome_fantasia',
    v_payload->>'numero',
    v_payload->>'titulo',
    v_payload->>'nome',
    v_payload->>'campanha',
    v_payload->>'descricao'
  );
  INSERT INTO public.trash_items (tenant_id, tabela, registro_id, payload, descricao, deleted_by)
  VALUES (v_tenant, TG_TABLE_NAME, (v_payload->>'id'), v_payload, v_desc, auth.uid());
  RETURN OLD;
END $$;

-- 3) Attach nas tabelas principais
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','produtos',
    'projetos_especiais','influenciadores','tarefas','emissoras',
    'reunioes','eventos_calendario','materiais_apoio','links_uteis',
    'permuta_recebimentos','metas_executivo'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trash_before_delete ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash()', t);
  END LOOP;
END $$;

-- 4) Restore function
CREATE OR REPLACE FUNCTION public.restore_trash_item(_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.trash_items%ROWTYPE;
  v_cols TEXT;
  v_vals TEXT;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_item FROM public.trash_items WHERE id = _id AND restored_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'item não encontrado'; END IF;

  -- Reinsere a partir do JSON, deixando o Postgres cuidar do casting via jsonb_populate_record
  EXECUTE format(
    'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT (id) DO NOTHING',
    v_item.tabela, v_item.tabela
  ) USING v_item.payload;

  UPDATE public.trash_items SET restored_at = now() WHERE id = _id;
END $$;

-- 5) Purge expired (chamado por cron)
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.trash_items
   WHERE restored_at IS NULL AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- 6) Cron diário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-expired-trash')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-trash');
    PERFORM cron.schedule('purge-expired-trash', '15 3 * * *', $cron$ SELECT public.purge_expired_trash(); $cron$);
  END IF;
END $$;
