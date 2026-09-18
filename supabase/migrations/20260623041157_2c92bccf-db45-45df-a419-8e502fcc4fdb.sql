
-- Helper: identifica contas demo (com trial)
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND trial_ends_at IS NOT NULL
  )
$$;

-- has_role: contas demo nunca herdam papéis elevados em policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  AND NOT public.is_demo_user(_user_id)
$$;

-- is_admin já depende de has_role, então herda o filtro automaticamente.

-- Reescreve policies de briefings que faziam SELECT direto em user_roles
DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;

CREATE POLICY "Admins and Executives can view all briefings"
ON public.briefings FOR SELECT
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'executivo'));

CREATE POLICY "Admins and Executives can update any briefing"
ON public.briefings FOR UPDATE
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'executivo'));
