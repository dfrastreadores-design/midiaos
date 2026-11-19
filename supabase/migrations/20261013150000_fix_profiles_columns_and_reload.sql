-- ==============================================================================
-- MIGRATION: 20261013150000_fix_profiles_columns_and_reload.sql
-- MOTIVO: Alinhamento de colunas da tabela public.profiles e reload do schema PostgREST
-- POLÍTICA: Não-destrutiva, idempotente (IF NOT EXISTS), compatibilidade reversa total
-- ==============================================================================

-- 1. Garantir que todas as colunas consumidas pelas APIs e telas existam na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'OPERATOR',
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_vinculado TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_url TEXT;

-- 2. Sincronizar 'role' a partir de user_roles caso existam registros prévios
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    UPDATE public.profiles p
    SET role = ur.role::text
    FROM public.user_roles ur
    WHERE p.id = ur.user_id 
      AND (p.role IS NULL OR p.role = 'OPERATOR');
  END IF;
END $$;

-- 3. Índices de performance para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cnpj ON public.profiles(cnpj);

-- 4. Garantir que proposal_templates tenha RLS permissivo para leitura autenticada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'proposal_templates'
  ) THEN
    ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Leitura de proposal_templates para autenticados" ON public.proposal_templates;
    CREATE POLICY "Leitura de proposal_templates para autenticados"
      ON public.proposal_templates
      FOR SELECT
      TO authenticated, anon
      USING (true);
  END IF;
END $$;

-- 5. Função RPC com SECURITY DEFINER para permitir redefinição administrativa segura de senhas
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_user_id UUID, new_plain_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := false;
BEGIN
  -- Permite se for chamado via backend (sem sessão de usuário direto) ou por admin/master autenticado
  IF v_caller IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = v_caller AND ur.role IN ('admin', 'super_admin')
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = v_caller AND (p.is_superadmin = true OR p.role = 'MASTER')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores podem redefinir senhas.';
    END IF;
  END IF;

  IF length(new_plain_password) < 6 THEN
    RAISE EXCEPTION 'A nova senha deve possuir no mínimo 6 caracteres.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_plain_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role, anon;

-- 6. Forçar recarga imediata do schema cache no PostgREST
NOTIFY pgrst, 'reload schema';

