-- Add 'teste' role to app_role enum for site signups (trial users)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teste';

-- Update handle_new_user trigger: site demo signups now get 'teste' role instead of 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_demo boolean := COALESCE((NEW.raw_user_meta_data->>'is_demo')::boolean, false);
  v_trial_ends timestamptz := NULL;
BEGIN
  IF v_is_demo THEN
    v_trial_ends := now() + interval '48 hours';
  END IF;

  INSERT INTO public.profiles (id, nome, email, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_trial_ends
  );

  IF v_is_demo THEN
    -- Demo/site signup: recebe role 'teste' (acesso de avaliação por 48h)
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teste');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $function$;