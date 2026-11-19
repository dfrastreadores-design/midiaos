CREATE OR REPLACE FUNCTION public.update_permuta_saldo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id UUID;
  v_agencia_id UUID;
  v_entidade_id UUID;
  v_tipo TEXT;
  v_razao TEXT;
  v_total_pi NUMERIC;
  v_total_rec NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_cliente_id := OLD.cliente_id;
    v_agencia_id := OLD.agencia_id;
  ELSE
    v_cliente_id := NEW.cliente_id;
    v_agencia_id := NEW.agencia_id;
  END IF;

  v_entidade_id := COALESCE(v_cliente_id, v_agencia_id);
  IF v_entidade_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF v_cliente_id IS NOT NULL THEN
    v_tipo := 'cliente';
    SELECT razao_social INTO v_razao FROM public.clientes WHERE id = v_entidade_id;
  ELSE
    v_tipo := 'agencia';
    SELECT razao_social INTO v_razao FROM public.agencias WHERE id = v_entidade_id;
  END IF;

  SELECT COALESCE(SUM(valor_negociado), 0)
    INTO v_total_pi
    FROM public.pis
   WHERE (cliente_id = v_entidade_id OR agencia_id = v_entidade_id)
     AND permuta = true
     AND status != 'cancelado';

  SELECT COALESCE(SUM(valor), 0)
    INTO v_total_rec
    FROM public.permuta_recebimentos
   WHERE cliente_id = v_entidade_id OR agencia_id = v_entidade_id;

  INSERT INTO public.permuta_saldos (entidade_id, razao_social, tipo, total_pi, total_recebido, updated_at)
  VALUES (v_entidade_id, v_razao, v_tipo, v_total_pi, v_total_rec, now())
  ON CONFLICT (entidade_id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    tipo = EXCLUDED.tipo,
    total_pi = EXCLUDED.total_pi,
    total_recebido = EXCLUDED.total_recebido,
    updated_at = now();

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;