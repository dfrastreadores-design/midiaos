-- ==============================================================================
-- MIGRATION: 20261006220000_admin_reset_user_password_rpc.sql
-- DESCRIÇÃO: Função RPC segura com SECURITY DEFINER para redefinição administrativa
-- de senhas de usuários por Administradores / Master.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  target_user_id UUID,
  new_plain_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_email TEXT;
  v_is_admin BOOLEAN := FALSE;
  v_target_email TEXT;
BEGIN
  -- Identifica o usuário chamador a partir do contexto da sessão JWT
  v_caller_id := auth.uid();
  
  -- Se chamado via service_role, auth.uid() pode ser nulo mas a role é service_role
  IF v_caller_id IS NULL AND current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Não autorizado: usuário não autenticado';
  END IF;

  -- Se for um usuário autenticado normal, valida se ele é administrador
  IF v_caller_id IS NOT NULL THEN
    SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;

    -- Master email ou perfil com permissão
    IF lower(COALESCE(v_caller_email, '')) = 'rafaelrodrigo.as@gmail.com' THEN
      v_is_admin := TRUE;
    ELSE
      -- Verifica se é superadmin ou admin em profiles
      SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = v_caller_id 
          AND (is_superadmin = true OR role IN ('admin', 'super_admin', 'MASTER', 'diretoria'))
      ) INTO v_is_admin;

      -- Se ainda não for admin, verifica em user_roles
      IF NOT v_is_admin THEN
        SELECT EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = v_caller_id AND role IN ('admin', 'super_admin')
        ) INTO v_is_admin;
      END IF;
    END IF;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Apenas administradores podem redefinir a senha de outros usuários';
    END IF;
  END IF;

  -- Validação de tamanho mínimo de senha
  IF length(new_plain_password) < 6 THEN
    RAISE EXCEPTION 'A senha deve possuir no mínimo 6 caracteres';
  END IF;

  -- Busca o email do usuário alvo
  SELECT email INTO v_target_email FROM auth.users WHERE id = target_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Atualiza com segurança a senha encriptada em auth.users utilizando bcrypt bf
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_plain_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  -- Registra auditoria
  BEGIN
    INSERT INTO public.auditoria_acessos (
      actor_id,
      actor_email,
      acao,
      target_user_id,
      target_email,
      detalhes
    ) VALUES (
      COALESCE(v_caller_id, gen_random_uuid()),
      v_caller_email,
      'senha_redefinida',
      target_user_id,
      v_target_email,
      jsonb_build_object('origem', 'admin_reset_user_password_rpc', 'redefinido_em', now())
    );
  EXCEPTION WHEN OTHERS THEN
    -- ignora erro de auditoria para não travar a operação principal
  END;

  RETURN jsonb_build_object('success', true, 'message', 'Senha redefinida com sucesso');
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;
COMMENT ON FUNCTION public.admin_reset_user_password IS 'Redefine a senha de outro usuário de forma segura, garantindo autorização de Administrador';
