
DO $$ BEGIN CREATE TYPE public.tipo_midia AS ENUM ('tv','radio','portal','ooh','dooh','influencer','redes_sociais','outros'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.pessoa_tipo AS ENUM ('pj','cpf'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.comissao_escopo AS ENUM ('global','fornecedor','cliente','campanha','tipo_midia'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.comissao_status AS ENUM ('prevista','confirmada','paga','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS produto_marca text NOT NULL DEFAULT 'midiaos',
  ADD COLUMN IF NOT EXISTS dominio_proprio text,
  ADD COLUMN IF NOT EXISTS cor_primaria text;

ALTER TABLE public.emissoras
  ADD COLUMN IF NOT EXISTS tipo_midia public.tipo_midia,
  ADD COLUMN IF NOT EXISTS pessoa_tipo public.pessoa_tipo NOT NULL DEFAULT 'pj',
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS nome_artistico text,
  ADD COLUMN IF NOT EXISTS comissao_padrao_pct numeric(6,3);

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS tipo_midia public.tipo_midia,
  ADD COLUMN IF NOT EXISTS quantidade_faces int,
  ADD COLUMN IF NOT EXISTS endereco_ponto text,
  ADD COLUMN IF NOT EXISTS formato_ooh text,
  ADD COLUMN IF NOT EXISTS plataforma_social text,
  ADD COLUMN IF NOT EXISTS seguidores bigint,
  ADD COLUMN IF NOT EXISTS engajamento_pct numeric(6,3),
  ADD COLUMN IF NOT EXISTS entregaveis_default jsonb;

INSERT INTO public.planos (nome, descricao, max_usuarios, modulos, preco_mensal, ativo)
SELECT 'Connect',
  'Edição white-label para representantes multi-veículo (TV, rádio, OOH, DOOH, influencers, redes sociais) com gestão de comissão.',
  25,
  ARRAY['crm','pi','propostas','briefings','tarefas','calendario','financeiro','relatorios','metas','permuta','projetos','influenciadores','pos_venda','comissoes','ooh','redes_sociais'],
  997, true
WHERE NOT EXISTS (SELECT 1 FROM public.planos WHERE nome = 'Connect');

CREATE TABLE IF NOT EXISTS public.comissoes_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  escopo public.comissao_escopo NOT NULL,
  fornecedor_id uuid REFERENCES public.emissoras(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  pi_id uuid REFERENCES public.pis(id) ON DELETE CASCADE,
  tipo_midia public.tipo_midia,
  percentual numeric(6,3) NOT NULL,
  prioridade int NOT NULL DEFAULT 100,
  vigencia_inicio date,
  vigencia_fim date,
  ativa boolean NOT NULL DEFAULT true,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes_regras TO authenticated;
GRANT ALL ON public.comissoes_regras TO service_role;
ALTER TABLE public.comissoes_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant lê regras" ON public.comissoes_regras FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "Admin gerencia regras" ON public.comissoes_regras FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria') OR public.is_super_admin(auth.uid())))
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_comissoes_regras_tenant BEFORE INSERT ON public.comissoes_regras FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_comissoes_regras_touch BEFORE UPDATE ON public.comissoes_regras FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.comissoes_apuracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.emissoras(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  executivo_id uuid,
  regra_id uuid REFERENCES public.comissoes_regras(id) ON DELETE SET NULL,
  base_calculo numeric(14,2) NOT NULL DEFAULT 0,
  percentual numeric(6,3) NOT NULL DEFAULT 0,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  status public.comissao_status NOT NULL DEFAULT 'prevista',
  competencia date,
  pago_em date,
  comprovante_path text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pi_id, fornecedor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes_apuracao TO authenticated;
GRANT ALL ON public.comissoes_apuracao TO service_role;
ALTER TABLE public.comissoes_apuracao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant lê comissões" ON public.comissoes_apuracao FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria')
    OR public.is_super_admin(auth.uid()) OR executivo_id = auth.uid()));
CREATE POLICY "Admin gerencia comissões" ON public.comissoes_apuracao FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria') OR public.is_super_admin(auth.uid())))
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE TRIGGER trg_comissoes_apuracao_tenant BEFORE INSERT ON public.comissoes_apuracao FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_comissoes_apuracao_touch BEFORE UPDATE ON public.comissoes_apuracao FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.calcular_comissao_pi(_pi_id uuid, _fornecedor_id uuid)
RETURNS TABLE(regra_id uuid, percentual numeric, base numeric, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pi public.pis%ROWTYPE; v_tenant uuid; v_tipo public.tipo_midia;
  v_base numeric; v_regra public.comissoes_regras%ROWTYPE; v_pct numeric; v_default numeric;
BEGIN
  SELECT * INTO v_pi FROM public.pis WHERE id = _pi_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_tenant := v_pi.tenant_id;
  SELECT e.tipo_midia, e.comissao_padrao_pct INTO v_tipo, v_default FROM public.emissoras e WHERE e.id = _fornecedor_id;
  SELECT COALESCE(SUM(COALESCE(i.valor_negociado, i.valor_total, 0)),0) INTO v_base
    FROM public.pi_itens i WHERE i.pi_id = _pi_id AND i.emissora_id = _fornecedor_id;
  IF v_base = 0 THEN v_base := COALESCE(v_pi.valor_negociado, 0); END IF;
  SELECT * INTO v_regra FROM public.comissoes_regras r
   WHERE r.tenant_id = v_tenant AND r.ativa
     AND (r.vigencia_inicio IS NULL OR r.vigencia_inicio <= CURRENT_DATE)
     AND (r.vigencia_fim    IS NULL OR r.vigencia_fim    >= CURRENT_DATE)
     AND ((r.escopo='campanha' AND r.pi_id=_pi_id)
       OR (r.escopo='cliente' AND r.cliente_id=v_pi.cliente_id)
       OR (r.escopo='fornecedor' AND r.fornecedor_id=_fornecedor_id)
       OR (r.escopo='tipo_midia' AND r.tipo_midia=v_tipo)
       OR  r.escopo='global')
   ORDER BY CASE r.escopo WHEN 'campanha' THEN 1 WHEN 'cliente' THEN 2 WHEN 'fornecedor' THEN 3 WHEN 'tipo_midia' THEN 4 ELSE 5 END, r.prioridade ASC
   LIMIT 1;
  v_pct := COALESCE(v_regra.percentual, v_default, 0);
  regra_id := v_regra.id; percentual := v_pct; base := v_base; valor := round(v_base * v_pct / 100.0, 2);
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_forn uuid; v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado','faturado','veiculado','encerrado') THEN RETURN NEW; END IF;
  FOR v_forn IN SELECT DISTINCT emissora_id FROM public.pi_itens WHERE pi_id = NEW.id AND emissora_id IS NOT NULL LOOP
    SELECT * INTO v_calc FROM public.calcular_comissao_pi(NEW.id, v_forn);
    INSERT INTO public.comissoes_apuracao
      (tenant_id, pi_id, fornecedor_id, cliente_id, executivo_id, regra_id, base_calculo, percentual, valor, status, competencia)
    VALUES (NEW.tenant_id, NEW.id, v_forn, NEW.cliente_id, NEW.executivo_id, v_calc.regra_id,
       v_calc.base, v_calc.percentual, v_calc.valor,
       CASE WHEN NEW.status IN ('faturado','veiculado','encerrado') THEN 'confirmada'::comissao_status ELSE 'prevista'::comissao_status END,
       COALESCE(NEW.periodo_inicio, CURRENT_DATE))
    ON CONFLICT (pi_id, fornecedor_id) DO UPDATE
      SET base_calculo=EXCLUDED.base_calculo, percentual=EXCLUDED.percentual, valor=EXCLUDED.valor, regra_id=EXCLUDED.regra_id,
          status = CASE WHEN public.comissoes_apuracao.status='paga' THEN public.comissoes_apuracao.status ELSE EXCLUDED.status END,
          updated_at = now();
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pis_refresh_comissoes ON public.pis;
CREATE TRIGGER trg_pis_refresh_comissoes AFTER INSERT OR UPDATE OF status, valor_negociado ON public.pis
  FOR EACH ROW EXECUTE FUNCTION public.refresh_comissoes_pi();

CREATE INDEX IF NOT EXISTS idx_comissoes_apuracao_tenant_competencia ON public.comissoes_apuracao (tenant_id, competencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_apuracao_executivo ON public.comissoes_apuracao (executivo_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_regras_tenant_ativa ON public.comissoes_regras (tenant_id, ativa);
CREATE INDEX IF NOT EXISTS idx_emissoras_tipo_midia ON public.emissoras (tipo_midia);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo_midia ON public.produtos (tipo_midia);
