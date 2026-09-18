
-- Tabela principal de Pós-Venda
CREATE TABLE public.pos_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviada','visualizada')),
  mensagem text,
  link_provas text,
  gerado_automaticamente boolean NOT NULL DEFAULT false,
  enviada_em timestamptz,
  visualizada_em timestamptz,
  tenant_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_vendas TO authenticated;
GRANT SELECT ON public.pos_vendas TO anon;
GRANT ALL ON public.pos_vendas TO service_role;

ALTER TABLE public.pos_vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_vendas read by pi access"
  ON public.pos_vendas FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pos_vendas anon read by token"
  ON public.pos_vendas FOR SELECT TO anon
  USING (true);

CREATE POLICY "pos_vendas insert by pi access"
  ON public.pos_vendas FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pos_vendas update by pi access"
  ON public.pos_vendas FOR UPDATE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()))
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pos_vendas delete by pi access"
  ON public.pos_vendas FOR DELETE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE INDEX pos_vendas_pi_idx ON public.pos_vendas(pi_id);
CREATE INDEX pos_vendas_token_idx ON public.pos_vendas(token);
CREATE INDEX pos_vendas_tenant_idx ON public.pos_vendas(tenant_id);

CREATE TRIGGER trg_pos_vendas_updated
  BEFORE UPDATE ON public.pos_vendas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_pos_vendas_tenant
  BEFORE INSERT ON public.pos_vendas
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Anexos (provas) da Pós-Venda
CREATE TABLE public.pos_venda_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id uuid NOT NULL REFERENCES public.pos_vendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  path text NOT NULL,
  mime text,
  tamanho integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_venda_anexos TO authenticated;
GRANT SELECT ON public.pos_venda_anexos TO anon;
GRANT ALL ON public.pos_venda_anexos TO service_role;

ALTER TABLE public.pos_venda_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_venda_anexos read by pi access"
  ON public.pos_venda_anexos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

CREATE POLICY "pos_venda_anexos anon read"
  ON public.pos_venda_anexos FOR SELECT TO anon USING (true);

CREATE POLICY "pos_venda_anexos write by pi access"
  ON public.pos_venda_anexos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

CREATE POLICY "pos_venda_anexos delete by pi access"
  ON public.pos_venda_anexos FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

CREATE INDEX pos_venda_anexos_pos_venda_idx ON public.pos_venda_anexos(pos_venda_id);

-- Função que gera Pós-Vendas automaticamente para PIs com período encerrado
CREATE OR REPLACE FUNCTION public.gerar_pos_vendas_pendentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.pos_vendas (pi_id, token, status, gerado_automaticamente, tenant_id, created_by)
  SELECT
    p.id,
    replace(gen_random_uuid()::text,'-','') || substring(md5(random()::text),1,10),
    'pendente',
    true,
    p.tenant_id,
    COALESCE(p.executivo_id, p.created_by)
  FROM public.pis p
  WHERE p.periodo_fim IS NOT NULL
    AND p.periodo_fim < (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND p.status NOT IN ('cancelado','substituido','reprovado','rascunho')
    AND NOT EXISTS (SELECT 1 FROM public.pos_vendas pv WHERE pv.pi_id = p.id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Agendamento horário para gerar pós-vendas automaticamente
SELECT cron.schedule(
  'gerar-pos-vendas-hourly',
  '15 * * * *',
  $cron$ SELECT public.gerar_pos_vendas_pendentes(); $cron$
);
