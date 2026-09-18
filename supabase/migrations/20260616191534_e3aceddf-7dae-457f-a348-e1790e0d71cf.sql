CREATE OR REPLACE FUNCTION public.log_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.valor_negociado IS DISTINCT FROM NEW.valor_negociado THEN
            v_changes := v_changes || jsonb_build_object('valor_negociado', jsonb_build_object('old', OLD.valor_negociado, 'new', NEW.valor_negociado));
        END IF;
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$function$;