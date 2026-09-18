CREATE OR REPLACE FUNCTION public.calcular_comissao_pi(_pi_id uuid, _fornecedor_id uuid)
RETURNS TABLE(regra_id uuid, percentual numeric, base numeric, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pi public.pis%ROWTYPE;
  v_tenant uuid;
  v_tipo public.tipo_midia;
  v_base numeric := 0;
  v_regra public.comissoes_regras%ROWTYPE;
  v_pct numeric;
  v_default numeric;
BEGIN
  SELECT * INTO v_pi FROM public.pis WHERE id = _pi_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_tenant := v_pi.tenant_id;

  SELECT e.tipo_midia, e.comissao_padrao_pct
    INTO v_tipo, v_default
  FROM public.emissoras e
  WHERE e.id = _fornecedor_id;

  IF v_pi.emissora_id IS NOT NULL AND v_pi.emissora_id = _fornecedor_id THEN
    SELECT COALESCE(
      SUM(
        COALESCE(
          i.valor_negociado,
          i.valor_tabela,
          COALESCE(i.valor_unit, 0) * COALESCE(i.total_insercoes, 1),
          0
        )
      ),
      0
    )
      INTO v_base
    FROM public.pi_itens i
    WHERE i.pi_id = _pi_id;
  END IF;

  IF COALESCE(v_base, 0) = 0 THEN
    v_base := COALESCE(v_pi.valor_negociado, 0);
  END IF;

  SELECT * INTO v_regra
  FROM public.comissoes_regras r
  WHERE r.tenant_id = v_tenant
    AND r.ativa
    AND (r.vigencia_inicio IS NULL OR r.vigencia_inicio <= CURRENT_DATE)
    AND (r.vigencia_fim IS NULL OR r.vigencia_fim >= CURRENT_DATE)
    AND (
      (r.escopo = 'campanha' AND r.pi_id = _pi_id)
      OR (r.escopo = 'cliente' AND r.cliente_id = v_pi.cliente_id)
      OR (r.escopo = 'fornecedor' AND r.fornecedor_id = _fornecedor_id)
      OR (r.escopo = 'tipo_midia' AND r.tipo_midia = v_tipo)
      OR r.escopo = 'global'
    )
  ORDER BY CASE r.escopo
    WHEN 'campanha' THEN 1
    WHEN 'cliente' THEN 2
    WHEN 'fornecedor' THEN 3
    WHEN 'tipo_midia' THEN 4
    ELSE 5
  END, r.prioridade ASC
  LIMIT 1;

  v_pct := COALESCE(v_regra.percentual, v_default, 0);

  regra_id := v_regra.id;
  percentual := v_pct;
  base := v_base;
  valor := round(v_base * v_pct / 100.0, 2);
  RETURN NEXT;
END
$function$;

CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_forn uuid;
  v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado', 'faturado', 'veiculado', 'encerrado') THEN
    RETURN NEW;
  END IF;

  FOR v_forn IN
    SELECT NEW.emissora_id WHERE NEW.emissora_id IS NOT NULL
  LOOP
    SELECT * INTO v_calc FROM public.calcular_comissao_pi(NEW.id, v_forn);

    IF v_calc.base IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.comissoes_apuracao
      (tenant_id, pi_id, fornecedor_id, cliente_id, executivo_id, regra_id, base_calculo, percentual, valor, status, competencia)
    VALUES
      (NEW.tenant_id, NEW.id, v_forn, NEW.cliente_id, NEW.executivo_id, v_calc.regra_id,
       v_calc.base, v_calc.percentual, v_calc.valor,
       CASE WHEN NEW.status IN ('faturado', 'veiculado', 'encerrado') THEN 'confirmada'::comissao_status ELSE 'prevista'::comissao_status END,
       COALESCE(NEW.periodo_inicio, CURRENT_DATE))
    ON CONFLICT (pi_id, fornecedor_id) DO UPDATE
      SET base_calculo = EXCLUDED.base_calculo,
          percentual = EXCLUDED.percentual,
          valor = EXCLUDED.valor,
          regra_id = EXCLUDED.regra_id,
          status = CASE WHEN public.comissoes_apuracao.status = 'paga' THEN public.comissoes_apuracao.status ELSE EXCLUDED.status END,
          updated_at = now();
  END LOOP;

  RETURN NEW;
END
$function$;