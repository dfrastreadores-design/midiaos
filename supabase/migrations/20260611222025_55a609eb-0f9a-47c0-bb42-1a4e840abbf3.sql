
-- Helper: check if user can access a PI (owner, executive, or admin)
CREATE OR REPLACE FUNCTION public.can_access_pi(_pi_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = _pi_id
      AND (p.executivo_id = _user_id OR p.created_by = _user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_pi(uuid, uuid) TO authenticated, service_role;

-- ============ pi_financeiro ============
DROP POLICY IF EXISTS "Authenticated users can view pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can insert pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can update pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can delete pi_financeiro" ON public.pi_financeiro;

CREATE POLICY "pi_financeiro select owner/admin" ON public.pi_financeiro
  FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pi_financeiro insert owner/admin" ON public.pi_financeiro
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pi_financeiro update owner/admin" ON public.pi_financeiro
  FOR UPDATE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()))
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pi_financeiro delete owner/admin" ON public.pi_financeiro
  FOR DELETE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

-- ============ storage: financeiro-docs ============
-- Path convention: pi/{pi_id}/...
DROP POLICY IF EXISTS "Authenticated users can view financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete financeiro docs" ON storage.objects;

CREATE POLICY "financeiro-docs select owner/admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

CREATE POLICY "financeiro-docs insert owner/admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

CREATE POLICY "financeiro-docs update owner/admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

CREATE POLICY "financeiro-docs delete owner/admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

-- ============ solicitacoes_producao ============
DROP POLICY IF EXISTS "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao;
DROP POLICY IF EXISTS "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao;

CREATE POLICY "solicitacoes select owner/admin" ON public.solicitacoes_producao
  FOR SELECT TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()) OR public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "solicitacoes insert owner" ON public.solicitacoes_producao
  FOR INSERT TO authenticated
  WITH CHECK (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "solicitacoes update owner/admin" ON public.solicitacoes_producao
  FOR UPDATE TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "solicitacoes delete owner/admin" ON public.solicitacoes_producao
  FOR DELETE TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

-- ============ sync_cnpj_log: admin-only reads ============
DROP POLICY IF EXISTS "sync log readable by authenticated" ON public.sync_cnpj_log;

CREATE POLICY "sync log readable by admin" ON public.sync_cnpj_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ Function search_path hardening ============
CREATE OR REPLACE FUNCTION public.handle_default_layout()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.proposta_layouts SET is_default = false WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
            v_changes := v_changes || jsonb_build_object('valor_total', jsonb_build_object('old', OLD.valor_total, 'new', NEW.valor_total));
        END IF;
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$function$;
