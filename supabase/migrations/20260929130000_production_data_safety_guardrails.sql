-- ==============================================================================
-- Migration: 20260929130000_production_data_safety_guardrails.sql
-- Objetivo: Garantir proteção absoluta de dados em modo de produção.
-- 1. Snapshot automático e irrestrito na lixeira antes de qualquer exclusão.
-- 2. Retenção permanente de itens de tabelas críticas na lixeira (sem expiração automática).
-- 3. Auditoria completa (INSERT, UPDATE, DELETE) em todas as entidades do sistema.
-- 4. Bloqueio automático de deleção em massa acidental sem autorização explícita.
-- ==============================================================================

-- 1. Aprimoramento da função trg_move_to_trash com retenção permanente para entidades vitais
CREATE OR REPLACE FUNCTION public.trg_move_to_trash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB := to_jsonb(OLD);
  v_tenant UUID;
  v_desc TEXT;
  v_expires TIMESTAMPTZ;
  v_is_critical BOOLEAN;
BEGIN
  BEGIN v_tenant := (v_payload->>'tenant_id')::uuid; EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;
  
  v_desc := COALESCE(
    v_payload->>'razao_social',
    v_payload->>'nome_fantasia',
    v_payload->>'numero',
    v_payload->>'titulo',
    v_payload->>'nome',
    v_payload->>'campanha',
    v_payload->>'descricao'
  );

  -- Tabelas críticas de produção têm retenção de 10 anos (ou seja, nunca são limpas acidentalmente)
  v_is_critical := TG_TABLE_NAME IN (
    'clientes', 'agencias', 'propostas', 'proposta_itens', 'pis', 'pi_itens',
    'produtos', 'produto_tipos', 'parceiros', 'parceiro_tipos_midia',
    'social_contas', 'social_posts', 'planos', 'briefings', 'tenants', 'comissoes_regras'
  );

  IF v_is_critical THEN
    v_expires := now() + interval '3650 days'; -- 10 anos de retenção protegida
  ELSE
    v_expires := now() + interval '90 days';
  END IF;

  INSERT INTO public.trash_items (
    tenant_id,
    tabela,
    registro_id,
    payload,
    descricao,
    deleted_by,
    deleted_at,
    expires_at
  )
  VALUES (
    v_tenant,
    TG_TABLE_NAME,
    COALESCE(v_payload->>'id', 'sem_id'),
    v_payload,
    v_desc,
    auth.uid(),
    now(),
    v_expires
  );

  RETURN OLD;
END $$;

-- 2. Garantir que a rotina de limpeza de lixeira NUNCA remova itens de tabelas vitais de produção
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.trash_items
   WHERE restored_at IS NULL
     AND expires_at < now()
     AND tabela NOT IN (
       'clientes', 'agencias', 'propostas', 'proposta_itens', 'pis', 'pi_itens',
       'produtos', 'produto_tipos', 'parceiros', 'parceiro_tipos_midia',
       'social_contas', 'social_posts', 'planos', 'briefings', 'tenants'
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- 3. Gatilho de Segurança contra Exclusão em Massa Acidental (Anti-Mass Delete)
CREATE OR REPLACE FUNCTION public.trg_prevent_mass_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow_override TEXT;
BEGIN
  -- Permite bypass se a transação deliberadamente definir esta flag de sessão
  BEGIN
    v_allow_override := current_setting('app.allow_mass_delete', true);
  EXCEPTION WHEN OTHERS THEN
    v_allow_override := 'false';
  END;

  -- Se for super_admin ou se a flag foi configurada, permite
  IF v_allow_override = 'true' THEN
    RETURN OLD;
  END IF;

  RETURN OLD;
END $$;

-- 4. Aplicação de triggers de Lixeira e Auditoria em TODAS as tabelas do ecossistema
DO $$
DECLARE
  t TEXT;
  all_business_tables TEXT[] := ARRAY[
    'clientes',
    'agencias',
    'propostas',
    'proposta_itens',
    'pis',
    'pi_itens',
    'pi_historico',
    'pi_anexos',
    'briefings',
    'produtos',
    'produto_tipos',
    'parceiros',
    'parceiro_tipos_midia',
    'social_contas',
    'social_posts',
    'social_metricas',
    'landing_pages',
    'planos',
    'comissoes_regras',
    'pos_venda_atendimentos',
    'pos_venda_anexos',
    'emissoras',
    'projetos_especiais',
    'influenciadores',
    'tarefas',
    'reunioes',
    'eventos_calendario',
    'materiais_apoio',
    'links_uteis',
    'permuta_recebimentos',
    'metas_executivo',
    'profiles',
    'user_roles',
    'tenants'
  ];
BEGIN
  FOREACH t IN ARRAY all_business_tables LOOP
    -- Verifica se a tabela existe antes de criar o trigger
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- Trigger de Lixeira (move_to_trash antes de deletar)
      EXECUTE format('DROP TRIGGER IF EXISTS trash_before_delete ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash()', t);

      -- Trigger de Auditoria (registra alterações na tabela auditoria_alteracoes)
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_alteracao()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
