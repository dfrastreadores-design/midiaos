CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_forn uuid; v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado','faturado','veiculado','encerrado') THEN RETURN NEW; END IF;
  FOR v_forn IN
    SELECT DISTINCT emissora_id FROM public.pis WHERE id = NEW.id AND emissora_id IS NOT NULL
  LOOP
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
END $function$;