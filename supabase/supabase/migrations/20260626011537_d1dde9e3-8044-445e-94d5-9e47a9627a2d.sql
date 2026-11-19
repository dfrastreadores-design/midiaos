
-- Tighten EXECUTE privileges on SECURITY DEFINER functions (Supabase linter 0028/0029)

-- Trigger-only / server-only: revoke from all client roles
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'generate_pi_numero()',
    'generate_proposta_numero()',
    'touch_updated_at()',
    'update_updated_at_column()',
    'handle_new_user()',
    'log_alteracao()',
    'log_proposal_changes()',
    'refresh_comissoes_pi()',
    'set_tenant_id_from_user()',
    'handle_default_layout()',
    'update_permuta_saldo()',
    'read_email_batch(text,integer,integer)',
    'enqueue_email(text,jsonb)',
    'delete_email(text,bigint)',
    'move_to_dlq(text,text,bigint,jsonb)',
    'trigger_sync_cnpj_burst()',
    'gerar_pos_vendas_pendentes()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- RLS helpers / tenant helpers: keep authenticated, drop public+anon
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'has_role(uuid,app_role)',
    'is_admin(uuid)',
    'is_super_admin(uuid)',
    'is_demo_user(uuid)',
    'is_trial_expired(uuid)',
    'can_access_pi(uuid,uuid)',
    'can_access_briefing(uuid,uuid)',
    'current_tenant_id()',
    'tenant_modulos(uuid)',
    'tenant_has_modulo(uuid,text)',
    'tenant_user_count(uuid)',
    'tenant_user_limit(uuid)',
    'calcular_comissao_pi(uuid,uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;
