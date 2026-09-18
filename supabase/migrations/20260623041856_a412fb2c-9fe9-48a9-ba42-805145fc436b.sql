
-- ============ TENANTS ============
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  contato_nome text,
  contato_email text,
  contato_whatsapp text,
  plano text NOT NULL DEFAULT 'essencial', -- essencial | site | profissional | enterprise | demo
  ciclo text NOT NULL DEFAULT 'mensal',    -- mensal | anual
  valor_mensal numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',    -- ativo | inadimplente | suspenso | cancelado | trial
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  proximo_vencimento date,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Helper super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  ) AND NOT public.is_demo_user(_user_id)
$$;

-- is_admin agora reconhece super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.is_super_admin(_user_id)
$$;

CREATE POLICY "super admin manages tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER tg_tenants_touch BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ PROFILES.tenant_id ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- ============ Seed tenant TV Brasília ============
INSERT INTO public.tenants (razao_social, nome_fantasia, plano, ciclo, valor_mensal, status, observacoes)
SELECT 'TV Brasília', 'TV Brasília', 'enterprise', 'mensal', 0, 'ativo', 'Cliente inicial — plano sob contrato.'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE razao_social = 'TV Brasília');

-- Vincula todos os profiles sem tenant a TV Brasília (exceto contas demo)
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants WHERE razao_social = 'TV Brasília' LIMIT 1)
WHERE tenant_id IS NULL AND trial_ends_at IS NULL;

-- ============ Usuário super_admin ============
-- Cria o auth.user se ainda não existir
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'rafaelrodrigo.as@gmail.com';
  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'rafaelrodrigo.as@gmail.com',
      extensions.crypt('MidiaOS@Owner2026!', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome','Rafael Rodrigo','is_owner',true),
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', 'rafaelrodrigo.as@gmail.com'),
      'email', now(), now(), now());
    -- profile (caso o trigger handle_new_user não tenha rodado a tempo, garante consistência)
    INSERT INTO public.profiles (id, nome, email)
    VALUES (v_uid, 'Rafael Rodrigo', 'rafaelrodrigo.as@gmail.com')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Garante papel super_admin (e remove o 'executivo' padrão se existir)
  DELETE FROM public.user_roles WHERE user_id = v_uid AND role IN ('executivo');
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
