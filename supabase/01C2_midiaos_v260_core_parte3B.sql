-- ==============================================================================
-- MIGRATION: 20260923120000_multi_tenant_isolation.sql
-- DESCRIÇÃO: Implementação definitiva de Isolamento Multi-Tenant e Super Admin
-- AUTOR: Sistema mídia.OS
-- DATA: 2026-09-23
-- ==============================================================================

-- 1. SUPER ADMIN EXCLUSIVO (rafaelrodrigo.as@gmail.com)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'rafaelrodrigo.as@gmail.com'
  );
$$;

-- 2. FUNÇÃO AUXILIAR: Obter tenant_id do usuário autenticado atual
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2.1 VALIDAÇÃO DE ASSINATURA SAAS & TESTE GRÁTIS DE 72 HORAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tenant_operational(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant_id
      AND NOT COALESCE(t.bloqueado, false)
      AND (
        (t.subscription_status = 'active' AND (t.current_period_end IS NULL OR t.current_period_end >= now()))
        OR
        (t.subscription_status = 'trialing' AND (t.trial_ends_at IS NULL OR t.trial_ends_at >= now()))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_subscription_status(_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN COALESCE(t.bloqueado, false) THEN 'suspended'
      WHEN t.subscription_status = 'suspended' THEN 'suspended'
      WHEN t.subscription_status = 'active' THEN
        CASE
          WHEN t.current_period_end IS NOT NULL AND t.current_period_end < now() THEN 'past_due'
          ELSE 'active'
        END
      WHEN t.subscription_status = 'trialing' THEN
        CASE
          WHEN t.trial_ends_at IS NOT NULL AND t.trial_ends_at < now() THEN 'expired'
          ELSE 'trialing'
        END
      ELSE COALESCE(t.subscription_status, 'expired')
    END
  FROM public.tenants t
  WHERE t.id = _tenant_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_activate_tenant_subscription(
  _tenant_id uuid,
  _plano_id uuid DEFAULT NULL,
  _ciclo text DEFAULT 'mensal',
  _dias_vigencia integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o Super Admin pode ativar assinaturas.';
  END IF;

  UPDATE public.tenants
  SET
    plano_id = COALESCE(_plano_id, plano_id),
    ciclo = COALESCE(_ciclo, ciclo),
    subscription_status = 'active',
    status = 'ativo',
    bloqueado = false,
    bloqueado_motivo = NULL,
    current_period_start = now(),
    current_period_end = now() + (_dias_vigencia || ' days')::interval,
    last_payment_at = now(),
    updated_at = now()
  WHERE id = _tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extend_tenant_trial(
  _tenant_id uuid,
  _horas_adicionais integer DEFAULT 72
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o Super Admin pode estender periodos de teste.';
  END IF;

  UPDATE public.tenants
  SET
    subscription_status = 'trialing',
    status = 'ativo',
    bloqueado = false,
    bloqueado_motivo = NULL,
    trial_ends_at = GREATEST(now(), COALESCE(trial_ends_at, now())) + (_horas_adicionais || ' hours')::interval,
    updated_at = now()
  WHERE id = _tenant_id;
END;
$$;

-- 3. TRIGGER FUNCTION: Auto-atribuir tenant_id no INSERT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Se for super admin e forneceu tenant_id explicitamente, mantém
  IF public.is_super_admin(auth.uid()) AND NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Busca o tenant_id do usuário logado
  v_tenant_id := public.current_user_tenant_id();

  -- Se o usuário possui um tenant, força no registro inserido
  IF v_tenant_id IS NOT NULL THEN
    NEW.tenant_id := v_tenant_id;
  END IF;
  -- Bloqueio operacional se teste de 72h expirou ou assinatura suspensa
  IF NOT public.is_super_admin(auth.uid()) AND NOT public.is_tenant_operational(NEW.tenant_id) THEN
    RAISE EXCEPTION 'Operacao bloqueada: O periodo de teste de 72 horas expirou ou a assinatura esta suspensa.';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. GARANTIR PRIVILÉGIOS DE SUPER_ADMIN PARA rafaelrodrigo.as@gmail.com
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'rafaelrodrigo.as@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Remove super_admin de qualquer outra conta para blindagem total
DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND ur.role = 'super_admin'
  AND lower(u.email) <> 'rafaelrodrigo.as@gmail.com';

-- 4.1 BLINDAGEM DE ATRIBUIÇÃO DE ROLES (PROPOSTA B - SAAS MULTITENANT)
-- Impede que administradores de empresas concedam ou alterem a role super_admin
CREATE OR REPLACE FUNCTION public.check_role_assignment_security()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin' AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Apenas o proprio Super Admin pode remover seus privilegios.';
    END IF;
    RETURN OLD;
  END IF;

  -- Somente Rafael Rodrigo pode receber a role super_admin
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin(NEW.user_id) THEN
    RAISE EXCEPTION 'A role super_admin e exclusiva do proprietario da plataforma (Rafael Rodrigo).';
  END IF;

  -- Apenas o super_admin pode conceder super_admin
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o super_admin pode conceder privilegios globais.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_role_assignment_security ON public.user_roles;
CREATE TRIGGER trg_role_assignment_security
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.check_role_assignment_security();

-- 5. ATIVAR TRIGGERS DE AUTO-TENANT NAS TABELAS PRINCIPAIS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'agencias', 'clientes', 'pis', 'propostas', 'produtos', 'briefings',
    'metas_executivo', 'reunioes', 'eventos_calendario', 'tarefas',
    'landing_pages', 'landing_page_leads', 'permuta_saldos', 'permuta_recebimentos',
    'emissoras', 'comissoes_regras', 'comissoes_apuracao', 'pos_vendas',
    'links_uteis', 'materiais_apoio', 'influenciadores', 'projetos_especiais',
    'notificacoes', 'midia_config', 'trash_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Garante que RLS está habilitado
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Cria trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_current_tenant_id();', t);
  END LOOP;
END $$;

-- 6. POLÍTICAS DE RLS ESTREITAS PARA CADA TABELA DE NEGÓCIO
-- ------------------------------------------------------------------------------

-- === CLIENTES ===
DROP POLICY IF EXISTS "tenant_clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "tenant_clientes_manage" ON public.clientes;
DROP POLICY IF EXISTS "owner or admin update clientes" ON public.clientes;
DROP POLICY IF EXISTS "owner or admin read clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth read clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth write clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth update clientes" ON public.clientes;
DROP POLICY IF EXISTS "admin delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_select_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_insert_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_delete_clientes" ON public.clientes;

DROP POLICY IF EXISTS "tenant_isolation_select_clientes" ON public.clientes;
CREATE POLICY "tenant_isolation_select_clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_clientes" ON public.clientes;
CREATE POLICY "tenant_isolation_insert_clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
CREATE POLICY "tenant_isolation_update_clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_clientes" ON public.clientes;
CREATE POLICY "tenant_isolation_delete_clientes" ON public.clientes
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === AGÊNCIAS ===
DROP POLICY IF EXISTS "tenant_agencias_select" ON public.agencias;
DROP POLICY IF EXISTS "tenant_agencias_manage" ON public.agencias;
DROP POLICY IF EXISTS "auth read agencias" ON public.agencias;
DROP POLICY IF EXISTS "auth write agencias" ON public.agencias;
DROP POLICY IF EXISTS "auth update agencias" ON public.agencias;
DROP POLICY IF EXISTS "admin delete agencias" ON public.agencias;
DROP POLICY IF EXISTS "owner or admin read agencias" ON public.agencias;
DROP POLICY IF EXISTS "owner or admin update agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_select_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_insert_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_delete_agencias" ON public.agencias;

DROP POLICY IF EXISTS "tenant_isolation_select_agencias" ON public.agencias;
CREATE POLICY "tenant_isolation_select_agencias" ON public.agencias
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_agencias" ON public.agencias;
CREATE POLICY "tenant_isolation_insert_agencias" ON public.agencias
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
CREATE POLICY "tenant_isolation_update_agencias" ON public.agencias
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_agencias" ON public.agencias;
CREATE POLICY "tenant_isolation_delete_agencias" ON public.agencias
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === PIS (PEDIDOS DE INSERÇÃO) ===
DROP POLICY IF EXISTS "auth read pis" ON public.pis;
DROP POLICY IF EXISTS "auth insert pis" ON public.pis;
DROP POLICY IF EXISTS "auth update pis" ON public.pis;
DROP POLICY IF EXISTS "admin delete pis" ON public.pis;
DROP POLICY IF EXISTS "owner or admin read pis" ON public.pis;
DROP POLICY IF EXISTS "owner or admin update pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_select_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_insert_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_update_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_delete_pis" ON public.pis;

DROP POLICY IF EXISTS "tenant_isolation_select_pis" ON public.pis;
CREATE POLICY "tenant_isolation_select_pis" ON public.pis
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_pis" ON public.pis;
CREATE POLICY "tenant_isolation_insert_pis" ON public.pis
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_pis" ON public.pis;
CREATE POLICY "tenant_isolation_update_pis" ON public.pis
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_pis" ON public.pis;
CREATE POLICY "tenant_isolation_delete_pis" ON public.pis
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === PROPOSTAS ===
DROP POLICY IF EXISTS "owner or admin update propostas" ON public.propostas;
DROP POLICY IF EXISTS "owner or admin read propostas" ON public.propostas;
DROP POLICY IF EXISTS "admin delete propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth insert propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth read propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth write propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth update propostas" ON public.propostas;
DROP POLICY IF EXISTS "Usuario ve propostas do seu tenant" ON public.propostas;
DROP POLICY IF EXISTS "Usuario gerencia propostas do seu tenant" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_select_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_insert_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_delete_propostas" ON public.propostas;

DROP POLICY IF EXISTS "tenant_isolation_select_propostas" ON public.propostas;
CREATE POLICY "tenant_isolation_select_propostas" ON public.propostas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_propostas" ON public.propostas;
CREATE POLICY "tenant_isolation_insert_propostas" ON public.propostas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
CREATE POLICY "tenant_isolation_update_propostas" ON public.propostas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_propostas" ON public.propostas;
CREATE POLICY "tenant_isolation_delete_propostas" ON public.propostas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === PRODUTOS ===
DROP POLICY IF EXISTS "admin delete produtos" ON public.produtos;
DROP POLICY IF EXISTS "admin update produtos" ON public.produtos;
DROP POLICY IF EXISTS "admin insert produtos" ON public.produtos;
DROP POLICY IF EXISTS "auth read produtos" ON public.produtos;
DROP POLICY IF EXISTS "admin write produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_insert_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_delete_produtos" ON public.produtos;

DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_select_produtos" ON public.produtos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_insert_produtos" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_update_produtos" ON public.produtos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "tenant_isolation_delete_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_delete_produtos" ON public.produtos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === BRIEFINGS ===
DROP POLICY IF EXISTS "Users can delete their own briefings" ON public.briefings;
DROP POLICY IF EXISTS "Users can update their own pending briefings" ON public.briefings;
DROP POLICY IF EXISTS "Users can create their own briefings" ON public.briefings;
DROP POLICY IF EXISTS "Users can view their own briefings" ON public.briefings;
DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_select_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_insert_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_update_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_delete_briefings" ON public.briefings;

DROP POLICY IF EXISTS "tenant_isolation_select_briefings" ON public.briefings;
CREATE POLICY "tenant_isolation_select_briefings" ON public.briefings
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_briefings" ON public.briefings;
CREATE POLICY "tenant_isolation_insert_briefings" ON public.briefings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_briefings" ON public.briefings;
CREATE POLICY "tenant_isolation_update_briefings" ON public.briefings
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_briefings" ON public.briefings;
CREATE POLICY "tenant_isolation_delete_briefings" ON public.briefings
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === TAREFAS ===
DROP POLICY IF EXISTS "tarefas_all_auth" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_select_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_insert_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_update_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_delete_tarefas" ON public.tarefas;

DROP POLICY IF EXISTS "tenant_isolation_select_tarefas" ON public.tarefas;
CREATE POLICY "tenant_isolation_select_tarefas" ON public.tarefas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_tarefas" ON public.tarefas;
CREATE POLICY "tenant_isolation_insert_tarefas" ON public.tarefas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_tarefas" ON public.tarefas;
CREATE POLICY "tenant_isolation_update_tarefas" ON public.tarefas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_tarefas" ON public.tarefas;
CREATE POLICY "tenant_isolation_delete_tarefas" ON public.tarefas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

-- === LANDING PAGES E LEADS ===
DROP POLICY IF EXISTS "landing_pages tenant read" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages tenant write" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages tenant update" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages tenant delete" ON public.landing_pages;
DROP POLICY IF EXISTS "tenant_isolation_select_landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "tenant_isolation_manage_landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "tenant_isolation_select_landing_pages" ON public.landing_pages;
CREATE POLICY "tenant_isolation_select_landing_pages" ON public.landing_pages
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_manage_landing_pages" ON public.landing_pages;
CREATE POLICY "tenant_isolation_manage_landing_pages" ON public.landing_pages
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_select_leads" ON public.landing_page_leads;
DROP POLICY IF EXISTS "landing_leads tenant read" ON public.landing_page_leads;
DROP POLICY IF EXISTS "tenant_isolation_select_leads" ON public.landing_page_leads;
CREATE POLICY "tenant_isolation_select_leads" ON public.landing_page_leads
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "landing_leads tenant update" ON public.landing_page_leads;
DROP POLICY IF EXISTS "tenant_isolation_update_leads" ON public.landing_page_leads;
CREATE POLICY "tenant_isolation_update_leads" ON public.landing_page_leads
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'executivo'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'executivo'))));

DROP POLICY IF EXISTS "landing_leads tenant delete" ON public.landing_page_leads;
DROP POLICY IF EXISTS "tenant_isolation_delete_leads" ON public.landing_page_leads;
CREATE POLICY "tenant_isolation_delete_leads" ON public.landing_page_leads
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === INFLUENCIADORES ===
DROP POLICY IF EXISTS "Admin e producao podem ver influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Admin e producao podem inserir influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Admin e producao podem atualizar influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Admin e producao podem excluir influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation_select_influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation_insert_influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation_update_influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation_delete_influenciadores" ON public.influenciadores;

CREATE POLICY "tenant_isolation_select_influenciadores" ON public.influenciadores
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'))));

CREATE POLICY "tenant_isolation_insert_influenciadores" ON public.influenciadores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'))));

CREATE POLICY "tenant_isolation_update_influenciadores" ON public.influenciadores
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'))));

CREATE POLICY "tenant_isolation_delete_influenciadores" ON public.influenciadores
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === PROJETOS ESPECIAIS ===
DROP POLICY IF EXISTS "auth read projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "auth write projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "auth insert projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "owner or admin update projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "admin delete projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "owner or admin read projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation_select_projetos_especiais" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation_insert_projetos_especiais" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation_update_projetos_especiais" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation_delete_projetos_especiais" ON public.projetos_especiais;

CREATE POLICY "tenant_isolation_select_projetos_especiais" ON public.projetos_especiais
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_insert_projetos_especiais" ON public.projetos_especiais
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_projetos_especiais" ON public.projetos_especiais
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_delete_projetos_especiais" ON public.projetos_especiais
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === EVENTOS CALENDARIO ===
DROP POLICY IF EXISTS "users see own eventos" ON public.eventos_calendario;
DROP POLICY IF EXISTS "users insert own eventos" ON public.eventos_calendario;
DROP POLICY IF EXISTS "users update own eventos" ON public.eventos_calendario;
DROP POLICY IF EXISTS "users delete own eventos" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation_select_eventos_calendario" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation_insert_eventos_calendario" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation_update_eventos_calendario" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation_delete_eventos_calendario" ON public.eventos_calendario;

CREATE POLICY "tenant_isolation_select_eventos_calendario" ON public.eventos_calendario
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE POLICY "tenant_isolation_insert_eventos_calendario" ON public.eventos_calendario
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE POLICY "tenant_isolation_update_eventos_calendario" ON public.eventos_calendario
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE POLICY "tenant_isolation_delete_eventos_calendario" ON public.eventos_calendario
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))));

-- === REUNIOES ===
DROP POLICY IF EXISTS "auth read reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "auth insert reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "auth update reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "admin delete reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin update reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin delete reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin read reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation_select_reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation_insert_reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation_update_reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation_delete_reunioes" ON public.reunioes;

CREATE POLICY "tenant_isolation_select_reunioes" ON public.reunioes
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_insert_reunioes" ON public.reunioes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_reunioes" ON public.reunioes
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_delete_reunioes" ON public.reunioes
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())));

-- === METAS EXECUTIVO ===
DROP POLICY IF EXISTS "auth read metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin insert metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin update metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin delete metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "own or admin read metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin or diretoria insert metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin or diretoria update metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin or diretoria delete metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation_select_metas_executivo" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation_insert_metas_executivo" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation_update_metas_executivo" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation_delete_metas_executivo" ON public.metas_executivo;

CREATE POLICY "tenant_isolation_select_metas_executivo" ON public.metas_executivo
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (executivo_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

CREATE POLICY "tenant_isolation_insert_metas_executivo" ON public.metas_executivo
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

CREATE POLICY "tenant_isolation_update_metas_executivo" ON public.metas_executivo
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

CREATE POLICY "tenant_isolation_delete_metas_executivo" ON public.metas_executivo
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

-- === MATERIAIS DE APOIO ===
DROP POLICY IF EXISTS "auth read materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "auth insert materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "owner or admin update materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "owner or admin delete materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation_select_materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation_insert_materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation_update_materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation_delete_materiais_apoio" ON public.materiais_apoio;

CREATE POLICY "tenant_isolation_select_materiais_apoio" ON public.materiais_apoio
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_insert_materiais_apoio" ON public.materiais_apoio
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_materiais_apoio" ON public.materiais_apoio
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR created_by = auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_delete_materiais_apoio" ON public.materiais_apoio
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR created_by = auth.uid())));

-- === PERMUTA SALDOS ===
DROP POLICY IF EXISTS "Authenticated can read permuta_saldos" ON public.permuta_saldos;
DROP POLICY IF EXISTS "Service role manages permuta_saldos" ON public.permuta_saldos;
DROP POLICY IF EXISTS "tenant_isolation" ON public.permuta_saldos;
DROP POLICY IF EXISTS "Users can manage permuta_saldos" ON public.permuta_saldos;
DROP POLICY IF EXISTS "tenant_isolation_select_permuta_saldos" ON public.permuta_saldos;
DROP POLICY IF EXISTS "tenant_isolation_manage_permuta_saldos" ON public.permuta_saldos;

CREATE POLICY "tenant_isolation_select_permuta_saldos" ON public.permuta_saldos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_manage_permuta_saldos" ON public.permuta_saldos
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === PERMUTA RECEBIMENTOS ===
DROP POLICY IF EXISTS "Authenticated can read permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Authenticated can insert permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Admins can update permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Admins can delete permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Users can manage permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation_select_permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation_insert_permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation_update_permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation_delete_permuta_recebimentos" ON public.permuta_recebimentos;

CREATE POLICY "tenant_isolation_select_permuta_recebimentos" ON public.permuta_recebimentos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_insert_permuta_recebimentos" ON public.permuta_recebimentos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_permuta_recebimentos" ON public.permuta_recebimentos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_delete_permuta_recebimentos" ON public.permuta_recebimentos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === EMISSORAS ===
DROP POLICY IF EXISTS "tenant members can view emissoras" ON public.emissoras;
DROP POLICY IF EXISTS "admin can manage emissoras" ON public.emissoras;
DROP POLICY IF EXISTS "tenant_isolation" ON public.emissoras;
DROP POLICY IF EXISTS "tenant_isolation_select_emissoras" ON public.emissoras;
DROP POLICY IF EXISTS "tenant_isolation_manage_emissoras" ON public.emissoras;

CREATE POLICY "tenant_isolation_select_emissoras" ON public.emissoras
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_manage_emissoras" ON public.emissoras
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === COMISSOES REGRAS ===
DROP POLICY IF EXISTS "Tenant lê regras" ON public.comissoes_regras;
DROP POLICY IF EXISTS "Admin gerencia regras" ON public.comissoes_regras;
DROP POLICY IF EXISTS "tenant_isolation" ON public.comissoes_regras;
DROP POLICY IF EXISTS "tenant_isolation_select_comissoes_regras" ON public.comissoes_regras;
DROP POLICY IF EXISTS "tenant_isolation_manage_comissoes_regras" ON public.comissoes_regras;

CREATE POLICY "tenant_isolation_select_comissoes_regras" ON public.comissoes_regras
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_manage_comissoes_regras" ON public.comissoes_regras
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

-- === COMISSOES APURACAO ===
DROP POLICY IF EXISTS "Tenant lê comissões" ON public.comissoes_apuracao;
DROP POLICY IF EXISTS "Admin gerencia comissões" ON public.comissoes_apuracao;
DROP POLICY IF EXISTS "tenant_isolation" ON public.comissoes_apuracao;
DROP POLICY IF EXISTS "tenant_isolation_select_comissoes_apuracao" ON public.comissoes_apuracao;
DROP POLICY IF EXISTS "tenant_isolation_manage_comissoes_apuracao" ON public.comissoes_apuracao;

CREATE POLICY "tenant_isolation_select_comissoes_apuracao" ON public.comissoes_apuracao
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria') OR executivo_id = auth.uid())));

CREATE POLICY "tenant_isolation_manage_comissoes_apuracao" ON public.comissoes_apuracao
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

-- === POS VENDAS E ANEXOS ===
DROP POLICY IF EXISTS "pos_vendas read by pi access" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_vendas insert by pi access" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_vendas update by pi access" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_vendas delete by pi access" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation_select_pos_vendas" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation_insert_pos_vendas" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation_update_pos_vendas" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation_delete_pos_vendas" ON public.pos_vendas;

CREATE POLICY "tenant_isolation_select_pos_vendas" ON public.pos_vendas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.can_access_pi(pi_id, auth.uid())));

CREATE POLICY "tenant_isolation_insert_pos_vendas" ON public.pos_vendas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.can_access_pi(pi_id, auth.uid())));

CREATE POLICY "tenant_isolation_update_pos_vendas" ON public.pos_vendas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.can_access_pi(pi_id, auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.can_access_pi(pi_id, auth.uid())));

CREATE POLICY "tenant_isolation_delete_pos_vendas" ON public.pos_vendas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "pos_venda_anexos read by pi access" ON public.pos_venda_anexos;
DROP POLICY IF EXISTS "pos_venda_anexos write by pi access" ON public.pos_venda_anexos;
DROP POLICY IF EXISTS "pos_venda_anexos delete by pi access" ON public.pos_venda_anexos;
DROP POLICY IF EXISTS "tenant_isolation" ON public.pos_venda_anexos;
DROP POLICY IF EXISTS "tenant_isolation_pos_venda_anexos" ON public.pos_venda_anexos;

CREATE POLICY "tenant_isolation_pos_venda_anexos" ON public.pos_venda_anexos
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND pv.tenant_id = public.current_user_tenant_id()
      AND public.is_tenant_operational(pv.tenant_id)
  ))
  WITH CHECK (public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND pv.tenant_id = public.current_user_tenant_id()
      AND public.is_tenant_operational(pv.tenant_id)
  ));

-- === LINKS UTEIS ===
DROP POLICY IF EXISTS "Authenticated can view links" ON public.links_uteis;
DROP POLICY IF EXISTS "Authenticated can create links" ON public.links_uteis;
DROP POLICY IF EXISTS "Owner or admin can update links" ON public.links_uteis;
DROP POLICY IF EXISTS "Owner or admin can delete links" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation_select_links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation_insert_links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation_update_links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation_delete_links_uteis" ON public.links_uteis;

CREATE POLICY "tenant_isolation_select_links_uteis" ON public.links_uteis
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_insert_links_uteis" ON public.links_uteis
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND auth.uid() = created_by));

CREATE POLICY "tenant_isolation_update_links_uteis" ON public.links_uteis
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (auth.uid() = created_by OR public.is_admin(auth.uid()))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (auth.uid() = created_by OR public.is_admin(auth.uid()))));

CREATE POLICY "tenant_isolation_delete_links_uteis" ON public.links_uteis
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (auth.uid() = created_by OR public.is_admin(auth.uid()))));

-- === TRASH ITEMS ===
DROP POLICY IF EXISTS "Admins podem ver lixeira do tenant" ON public.trash_items;
DROP POLICY IF EXISTS "Admins podem atualizar lixeira" ON public.trash_items;
DROP POLICY IF EXISTS "Admins podem apagar lixeira" ON public.trash_items;
DROP POLICY IF EXISTS "tenant_isolation" ON public.trash_items;
DROP POLICY IF EXISTS "tenant_isolation_select_trash_items" ON public.trash_items;
DROP POLICY IF EXISTS "tenant_isolation_update_trash_items" ON public.trash_items;
DROP POLICY IF EXISTS "tenant_isolation_delete_trash_items" ON public.trash_items;

CREATE POLICY "tenant_isolation_select_trash_items" ON public.trash_items
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_update_trash_items" ON public.trash_items
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_delete_trash_items" ON public.trash_items
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === NOTIFICACOES ===
DROP POLICY IF EXISTS "users see own notif" ON public.notificacoes;
DROP POLICY IF EXISTS "users update own notif" ON public.notificacoes;
DROP POLICY IF EXISTS "auth insert notif" ON public.notificacoes;
DROP POLICY IF EXISTS "users or admins insert notif" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation_select_notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation_insert_notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation_update_notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation_delete_notificacoes" ON public.notificacoes;

CREATE POLICY "tenant_isolation_select_notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id))));

CREATE POLICY "tenant_isolation_insert_notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id))))
  WITH CHECK (user_id = auth.uid() AND (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id))));

CREATE POLICY "tenant_isolation_delete_notificacoes" ON public.notificacoes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id))));

-- === MIDIA CONFIG ===
DROP POLICY IF EXISTS "auth read midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "admin upsert midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "admin update midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "tenant_isolation" ON public.midia_config;
DROP POLICY IF EXISTS "tenant_isolation_select_midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "tenant_isolation_manage_midia_config" ON public.midia_config;

CREATE POLICY "tenant_isolation_select_midia_config" ON public.midia_config
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_manage_midia_config" ON public.midia_config
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- 7. TABELAS FILHAS (PI_ITENS, PROPOSTA_ITENS, ANEXOS)
-- ------------------------------------------------------------------------------
-- PI_ITENS
ALTER TABLE public.pi_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth insert pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth update pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth delete pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "tenant_isolation_pi_itens" ON public.pi_itens;

DROP POLICY IF EXISTS "tenant_isolation_pi_itens" ON public.pi_itens;
CREATE POLICY "tenant_isolation_pi_itens" ON public.pi_itens
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id AND (p.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(p.tenant_id))
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id AND (p.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(p.tenant_id))
    )
  );

-- PROPOSTA_ITENS
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read proposta_itens" ON public.proposta_itens;
DROP POLICY IF EXISTS "auth write proposta_itens" ON public.proposta_itens;
DROP POLICY IF EXISTS "tenant_isolation_proposta_itens" ON public.proposta_itens;

DROP POLICY IF EXISTS "tenant_isolation_proposta_itens" ON public.proposta_itens;
CREATE POLICY "tenant_isolation_proposta_itens" ON public.proposta_itens
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id AND (pr.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(pr.tenant_id))
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id AND (pr.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(pr.tenant_id))
    )
  );

-- PI_ANEXOS
ALTER TABLE public.pi_anexos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read pi_anexos" ON public.pi_anexos;
DROP POLICY IF EXISTS "tenant_isolation_pi_anexos" ON public.pi_anexos;
DROP POLICY IF EXISTS "tenant_isolation_pi_anexos" ON public.pi_anexos;
CREATE POLICY "tenant_isolation_pi_anexos" ON public.pi_anexos
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_anexos.pi_id AND (p.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(p.tenant_id))
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_anexos.pi_id AND (p.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(p.tenant_id))
    )
  );

-- 8. PROFILES (ISOLAMENTO DE USUÁRIOS ENTRE EMPRESAS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "tenant_isolation_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "tenant_isolation_profiles_update" ON public.profiles;

DROP POLICY IF EXISTS "tenant_isolation_profiles_select" ON public.profiles;
CREATE POLICY "tenant_isolation_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR auth.uid() = id
    OR tenant_id = public.current_user_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_profiles_update" ON public.profiles;
CREATE POLICY "tenant_isolation_profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR auth.uid() = id
    OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid()))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR auth.uid() = id
    OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid()))
  );

-- 8.1 BLINDAGEM CONTRA FUGA DE TENANT (PROPOSTA A - SAAS MULTITENANT)
-- Impede que usuários comuns alterem seu próprio tenant_id para obter acesso a outra empresa
CREATE OR REPLACE FUNCTION public.check_profile_tenant_immutability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.tenant_id IS NOT NULL AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Violacao de Seguranca: O tenant_id nao pode ser modificado por usuarios do tenant.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_tenant_immutability ON public.profiles;
CREATE TRIGGER trg_profile_tenant_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_tenant_immutability();

-- 8.2 DESVINCULAÇÃO INSTITUCIONAL DO SUPER ADMIN (PROPOSTA C)
-- Garante que o perfil do proprietário Rafael Rodrigo permaneça com governança transversal desvinculado de clientes
UPDATE public.profiles
   SET tenant_id = NULL
 WHERE lower(email) = 'rafaelrodrigo.as@gmail.com';

-- 9. TENANTS (GESTÃO EXCLUSIVA DO SUPER ADMIN, LEITURA DO PRÓPRIO TENANT)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super_admin_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "users_read_own_tenant" ON public.tenants;

DROP POLICY IF EXISTS "users_read_own_tenant" ON public.tenants;
CREATE POLICY "users_read_own_tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR id = public.current_user_tenant_id()
  );

DROP POLICY IF EXISTS "super_admin_manage_tenants" ON public.tenants;
CREATE POLICY "super_admin_manage_tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ==============================================================================
-- FIM DA MIGRATION DE ISOLAMENTO MULTI-TENANT
-- ==============================================================================



-- ==============================================================================
-- PERMISSÕES DE SCHEMA REVISADAS (MÍNIMO PRIVILÉGIO - ZERO GRANT INDISCRIMINADO)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Revogação explícita de acessos amplos indevidos para anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

NOTIFY pgrst, 'reload schema';
