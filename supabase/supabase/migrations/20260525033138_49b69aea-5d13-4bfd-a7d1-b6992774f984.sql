
-- Fix notificacoes INSERT policy
DROP POLICY IF EXISTS "auth insert notif" ON public.notificacoes;
CREATE POLICY "users or admins insert notif"
ON public.notificacoes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Fix metas_executivo SELECT policy
DROP POLICY IF EXISTS "auth read metas" ON public.metas_executivo;
CREATE POLICY "own or admin read metas"
ON public.metas_executivo
FOR SELECT
TO authenticated
USING (executivo_id = auth.uid() OR public.is_admin(auth.uid()));

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.generate_pi_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  yr TEXT := to_char(now(), 'YYYY');
  n BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    n := nextval('public.pi_seq');
    NEW.numero := 'PI-' || yr || '-' || lpad(n::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.generate_proposta_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE yr TEXT := to_char(now(),'YYYY'); n BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    n := nextval('public.proposta_seq');
    NEW.numero := 'PROP-' || yr || '-' || lpad(n::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END $function$;
