
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_trial_expired(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND trial_ends_at IS NOT NULL AND trial_ends_at < now()
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    -- Demo: recebe admin para acessar todos os módulos durante 48h
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $$;
