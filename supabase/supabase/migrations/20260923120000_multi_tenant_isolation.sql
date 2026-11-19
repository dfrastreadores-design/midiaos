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
DROP POLICY IF EXISTS "auth read clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth write clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth update clientes" ON public.clientes;
DROP POLICY IF EXISTS "admin delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_select_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_insert_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_delete_clientes" ON public.clientes;

CREATE POLICY "tenant_isolation_select_clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_clientes" ON public.clientes
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === AGÊNCIAS ===
DROP POLICY IF EXISTS "auth read agencias" ON public.agencias;
DROP POLICY IF EXISTS "auth write agencias" ON public.agencias;
DROP POLICY IF EXISTS "auth update agencias" ON public.agencias;
DROP POLICY IF EXISTS "admin delete agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_select_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_insert_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_delete_agencias" ON public.agencias;

CREATE POLICY "tenant_isolation_select_agencias" ON public.agencias
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_agencias" ON public.agencias
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_agencias" ON public.agencias
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_agencias" ON public.agencias
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === PIS (PEDIDOS DE INSERÇÃO) ===
DROP POLICY IF EXISTS "auth read pis" ON public.pis;
DROP POLICY IF EXISTS "auth insert pis" ON public.pis;
DROP POLICY IF EXISTS "auth update pis" ON public.pis;
DROP POLICY IF EXISTS "admin delete pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_select_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_insert_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_update_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_delete_pis" ON public.pis;

CREATE POLICY "tenant_isolation_select_pis" ON public.pis
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_pis" ON public.pis
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_pis" ON public.pis
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_pis" ON public.pis
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === PROPOSTAS ===
DROP POLICY IF EXISTS "auth read propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth write propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth update propostas" ON public.propostas;
DROP POLICY IF EXISTS "Usuario ve propostas do seu tenant" ON public.propostas;
DROP POLICY IF EXISTS "Usuario gerencia propostas do seu tenant" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_select_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_insert_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_delete_propostas" ON public.propostas;

CREATE POLICY "tenant_isolation_select_propostas" ON public.propostas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_propostas" ON public.propostas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_propostas" ON public.propostas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_propostas" ON public.propostas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === PRODUTOS ===
DROP POLICY IF EXISTS "auth read produtos" ON public.produtos;
DROP POLICY IF EXISTS "admin write produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_insert_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_delete_produtos" ON public.produtos;

CREATE POLICY "tenant_isolation_select_produtos" ON public.produtos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_produtos" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_update_produtos" ON public.produtos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_delete_produtos" ON public.produtos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === BRIEFINGS ===
DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_select_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_insert_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_update_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_delete_briefings" ON public.briefings;

CREATE POLICY "tenant_isolation_select_briefings" ON public.briefings
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_briefings" ON public.briefings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_briefings" ON public.briefings
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_briefings" ON public.briefings
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === TAREFAS ===
DROP POLICY IF EXISTS "tarefas_all_auth" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_select_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_insert_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_update_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_delete_tarefas" ON public.tarefas;

CREATE POLICY "tenant_isolation_select_tarefas" ON public.tarefas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_tarefas" ON public.tarefas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_tarefas" ON public.tarefas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_tarefas" ON public.tarefas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

-- === LANDING PAGES E LEADS ===
DROP POLICY IF EXISTS "tenant_isolation_select_landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "tenant_isolation_manage_landing_pages" ON public.landing_pages;
CREATE POLICY "tenant_isolation_select_landing_pages" ON public.landing_pages
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_manage_landing_pages" ON public.landing_pages
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_select_leads" ON public.landing_page_leads;
CREATE POLICY "tenant_isolation_select_leads" ON public.landing_page_leads
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

-- 7. TABELAS FILHAS (PI_ITENS, PROPOSTA_ITENS, ANEXOS)
-- ------------------------------------------------------------------------------
-- PI_ITENS
ALTER TABLE public.pi_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth insert pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth update pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth delete pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "tenant_isolation_pi_itens" ON public.pi_itens;

CREATE POLICY "tenant_isolation_pi_itens" ON public.pi_itens
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id AND p.tenant_id = public.current_user_tenant_id()
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id AND p.tenant_id = public.current_user_tenant_id()
    )
  );

-- PROPOSTA_ITENS
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read proposta_itens" ON public.proposta_itens;
DROP POLICY IF EXISTS "auth write proposta_itens" ON public.proposta_itens;
DROP POLICY IF EXISTS "tenant_isolation_proposta_itens" ON public.proposta_itens;

CREATE POLICY "tenant_isolation_proposta_itens" ON public.proposta_itens
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id AND pr.tenant_id = public.current_user_tenant_id()
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id AND pr.tenant_id = public.current_user_tenant_id()
    )
  );

-- PI_ANEXOS
ALTER TABLE public.pi_anexos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read pi_anexos" ON public.pi_anexos;
DROP POLICY IF EXISTS "tenant_isolation_pi_anexos" ON public.pi_anexos;
CREATE POLICY "tenant_isolation_pi_anexos" ON public.pi_anexos
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_anexos.pi_id AND p.tenant_id = public.current_user_tenant_id()
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_anexos.pi_id AND p.tenant_id = public.current_user_tenant_id()
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

CREATE POLICY "tenant_isolation_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR auth.uid() = id
    OR tenant_id = public.current_user_tenant_id()
  );

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

-- 9. TENANTS (GESTÃO EXCLUSIVA DO SUPER ADMIN, LEITURA DO PRÓPRIO TENANT)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super_admin_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "users_read_own_tenant" ON public.tenants;

CREATE POLICY "users_read_own_tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR id = public.current_user_tenant_id()
  );

CREATE POLICY "super_admin_manage_tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ==============================================================================
-- FIM DA MIGRATION DE ISOLAMENTO MULTI-TENANT
-- ==============================================================================
