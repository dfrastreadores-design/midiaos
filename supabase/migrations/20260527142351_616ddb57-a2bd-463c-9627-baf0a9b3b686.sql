
CREATE TABLE IF NOT EXISTS public.auditoria_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tabela text NOT NULL,
  registro_id text,
  operacao text NOT NULL,
  alteracoes jsonb,
  valor_anterior jsonb,
  valor_novo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auditoria_alteracoes TO authenticated;
GRANT ALL ON public.auditoria_alteracoes TO service_role;

ALTER TABLE public.auditoria_alteracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read auditoria_alteracoes" ON public.auditoria_alteracoes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_aud_alt_created ON public.auditoria_alteracoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aud_alt_user ON public.auditoria_alteracoes(user_id);
CREATE INDEX IF NOT EXISTS idx_aud_alt_tabela ON public.auditoria_alteracoes(tabela);

CREATE OR REPLACE FUNCTION public.log_alteracao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_record_id text;
  k text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := COALESCE(v_old->>'id', '');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new->>'id', '');
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new->>'id', '');
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_new->k) IS DISTINCT FROM (v_old->k) AND k NOT IN ('updated_at') THEN
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.auditoria_alteracoes(user_id, tabela, registro_id, operacao, alteracoes, valor_anterior, valor_novo)
  VALUES (v_user, TG_TABLE_NAME, v_record_id, TG_OP, v_changes, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clientes','agencias','pis','pi_itens','propostas','proposta_itens',
    'projetos_especiais','reunioes','metas_executivo','produtos',
    'profiles','user_roles','midia_config','notificacao_config'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_alteracao()',
      t, t
    );
  END LOOP;
END $$;
