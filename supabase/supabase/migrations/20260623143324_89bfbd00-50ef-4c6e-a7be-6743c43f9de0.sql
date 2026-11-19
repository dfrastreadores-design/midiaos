
-- 1) Tabela de planos
CREATE TABLE public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  preco_mensal numeric(12,2) NOT NULL DEFAULT 0,
  max_usuarios integer, -- NULL = ilimitado
  modulos text[] NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated le planos"
  ON public.planos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin gerencia planos"
  ON public.planos FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER planos_touch_updated_at BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Tenants ganha vínculo com plano + overrides
ALTER TABLE public.tenants
  ADD COLUMN plano_id uuid REFERENCES public.planos(id),
  ADD COLUMN max_usuarios_override integer,
  ADD COLUMN modulos_override text[];

-- 3) Planos iniciais
INSERT INTO public.planos (nome, descricao, preco_mensal, max_usuarios, modulos, is_default) VALUES
  ('Básico', 'Para times pequenos começarem', 199.00, 3,
   ARRAY['pi','propostas','briefings','calendario'], true),
  ('Pro', 'Operação completa para agências em crescimento', 499.00, 10,
   ARRAY['pi','propostas','briefings','projetos','influenciadores','crm','financeiro','calendario','metas','relatorios'], false),
  ('Enterprise', 'Tudo liberado, usuários ilimitados', 999.00, NULL,
   ARRAY['pi','propostas','briefings','projetos','influenciadores','permuta','financeiro','crm','calendario','metas','relatorios'], false);

-- 4) Helper: módulos efetivos da empresa do usuário
CREATE OR REPLACE FUNCTION public.tenant_modulos(_tenant_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    t.modulos_override,
    (SELECT p.modulos FROM public.planos p WHERE p.id = t.plano_id),
    '{}'::text[]
  )
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

CREATE OR REPLACE FUNCTION public.tenant_has_modulo(_tenant_id uuid, _modulo text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _modulo = ANY(public.tenant_modulos(_tenant_id))
$$;

-- 5) Helper: limite e contagem de usuários
CREATE OR REPLACE FUNCTION public.tenant_user_limit(_tenant_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    t.max_usuarios_override,
    (SELECT p.max_usuarios FROM public.planos p WHERE p.id = t.plano_id)
  )
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

CREATE OR REPLACE FUNCTION public.tenant_user_count(_tenant_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.profiles WHERE tenant_id = _tenant_id
$$;

-- 6) Vincula tenant existente (TV Brasília) ao plano Enterprise para não quebrar acesso
UPDATE public.tenants
SET plano_id = (SELECT id FROM public.planos WHERE nome = 'Enterprise')
WHERE plano_id IS NULL;

-- 7) handle_new_user passa a usar plano default em cadastros novos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teste');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $function$;
