-- ==============================================================================
-- ETAPA 4 - HOMOLOGAÇÃO PREPARADA (NÃO EXECUTADA)
-- ARQUIVO: 03_correcao_rls_tabelas_principais.sql
-- OBJETIVO: Políticas de RLS estritas, multiempresa e com isolamento comercial.
-- REGRA MANDATÓRIA: Não executar automaticamente. Apenas para ambiente de homologação.
-- ==============================================================================

-- ==============================================================================
-- 1. INSERTION_ORDERS (PEDIDOS DE INSERÇÃO - NOVA ESTEIRA)
-- ==============================================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insertion_orders') THEN
    ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permissao por CNPJ ou Master" ON public.insertion_orders;
    DROP POLICY IF EXISTS "tenant_isolation_select_insertion_orders" ON public.insertion_orders;
    DROP POLICY IF EXISTS "tenant_isolation_insert_insertion_orders" ON public.insertion_orders;
    DROP POLICY IF EXISTS "tenant_isolation_update_insertion_orders" ON public.insertion_orders;
    DROP POLICY IF EXISTS "tenant_isolation_delete_insertion_orders" ON public.insertion_orders;
    DROP POLICY IF EXISTS "insertion_orders_rbac_all" ON public.insertion_orders;

    -- LEITURA (SELECT)
    CREATE POLICY "rls_insertion_orders_select" ON public.insertion_orders
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            -- Portal Externo por CNPJ
            public.get_current_user_cnpj() IS NOT NULL
            AND (
                cnpj_cliente = public.get_current_user_cnpj()
                OR cnpj_veiculo = public.get_current_user_cnpj()
            )
        )
        OR (
            -- Usuário Interno do Tenant
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
                OR representative_id = auth.uid()
                OR created_by = auth.uid()
            )
        )
    );

    -- INSERÇÃO (INSERT)
    CREATE POLICY "rls_insertion_orders_insert" ON public.insertion_orders
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
                OR representative_id = auth.uid()
                OR created_by = auth.uid()
            )
        )
    );

    -- ATUALIZAÇÃO (UPDATE)
    CREATE POLICY "rls_insertion_orders_update" ON public.insertion_orders
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
                OR (representative_id = auth.uid() AND status = 'draft')
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
                OR (representative_id = auth.uid() AND status = 'draft')
            )
        )
    );

    -- EXCLUSÃO / CANCELAMENTO (DELETE)
    CREATE POLICY "rls_insertion_orders_delete" ON public.insertion_orders
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND public.is_tenant_admin(tenant_id)
        )
    );
END IF;
END $$;

-- ==============================================================================
-- 2. PI_ITEMS, PI_CHECKINGS, PI_SETTLEMENTS
-- ==============================================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_items') THEN
    ALTER TABLE public.pi_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pi_items_rbac_all" ON public.pi_items;

    CREATE POLICY "rls_pi_items_all" ON public.pi_items
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND cnpj_veiculo = public.get_current_user_cnpj()
        )
        OR (tenant_id = public.current_user_tenant_id())
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (tenant_id = public.current_user_tenant_id())
    );
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_checkings') THEN
    ALTER TABLE public.pi_checkings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pi_checkings_rbac_all" ON public.pi_checkings;

    CREATE POLICY "rls_pi_checkings_select" ON public.pi_checkings
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND cnpj_veiculo = public.get_current_user_cnpj()
        )
        OR (tenant_id = public.current_user_tenant_id())
    );

    CREATE POLICY "rls_pi_checkings_insert" ON public.pi_checkings
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND cnpj_veiculo = public.get_current_user_cnpj()
        )
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
            )
        )
    );

    CREATE POLICY "rls_pi_checkings_update" ON public.pi_checkings
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
            )
        )
    );
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_settlements') THEN
    ALTER TABLE public.pi_settlements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pi_settlements_rbac_all" ON public.pi_settlements;

    CREATE POLICY "rls_pi_settlements_select" ON public.pi_settlements
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND (
                cnpj_pagador = public.get_current_user_cnpj()
                OR cnpj_recebedor = public.get_current_user_cnpj()
            )
        )
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
            )
        )
    );

    CREATE POLICY "rls_pi_settlements_write" ON public.pi_settlements
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
            )
        )
    );
END IF;
END $$;

-- ==============================================================================
-- 3. PRODUTOS (INVENTÁRIO DE MÍDIA)
-- ==============================================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "permitir_select_universal_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "tenant_isolation_insert_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "tenant_isolation_delete_produtos" ON public.produtos;

    -- LEITURA: Produtos do próprio tenant ou de parceiros cadastrados no mesmo tenant
    CREATE POLICY "rls_produtos_select" ON public.produtos
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR tenant_id = public.current_user_tenant_id()
        OR (
            parceiro_id IS NOT NULL 
            AND parceiro_id IN (
                SELECT id FROM public.parceiros WHERE tenant_id = public.current_user_tenant_id()
            )
        )
    );

    -- GESTÃO (INSERT / UPDATE / DELETE): Somente administradores da empresa ou OPEC
    CREATE POLICY "rls_produtos_insert" ON public.produtos
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
            )
        )
    );

    CREATE POLICY "rls_produtos_update" ON public.produtos
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
            )
        )
    );

    CREATE POLICY "rls_produtos_delete" ON public.produtos
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND public.is_tenant_admin(tenant_id)
        )
    );
END IF;
END $$;

-- ==============================================================================
-- 4. CLIENTES E AGÊNCIAS
-- ==============================================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes') THEN
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "tenant_isolation_select_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "tenant_isolation_insert_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "tenant_isolation_delete_clientes" ON public.clientes;

    -- SELECT: Toda a empresa para gestão; Executivo para sua carteira
    CREATE POLICY "rls_clientes_select" ON public.clientes
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
                OR executivo_id = auth.uid()
                OR created_by = auth.uid()
            )
        )
    );

    -- INSERT: Exige tenant_id idêntico ao perfil do usuário
    CREATE POLICY "rls_clientes_insert" ON public.clientes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR tenant_id = public.current_user_tenant_id()
    );

    -- UPDATE: Gestão ou o Executivo titular da carteira
    CREATE POLICY "rls_clientes_update" ON public.clientes
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR executivo_id = auth.uid()
                OR created_by = auth.uid()
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR executivo_id = auth.uid()
                OR created_by = auth.uid()
            )
        )
    );

    -- DELETE: Apenas Master da Empresa ou SuperAdmin
    CREATE POLICY "rls_clientes_delete" ON public.clientes
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND public.is_tenant_admin(tenant_id)
        )
    );
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias') THEN
    ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "tenant_isolation_select_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "tenant_isolation_insert_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "tenant_isolation_delete_agencias" ON public.agencias;

    CREATE POLICY "rls_agencias_select" ON public.agencias
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR tenant_id = public.current_user_tenant_id()
    );

    CREATE POLICY "rls_agencias_write" ON public.agencias
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR created_by = auth.uid()
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR tenant_id = public.current_user_tenant_id()
    );
END IF;
END $$;

-- ==============================================================================
-- 5. PROPOSTAS COMERCIAIS
-- ==============================================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
    ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "tenant_isolation_select_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "tenant_isolation_insert_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "tenant_isolation_delete_propostas" ON public.propostas;

    CREATE POLICY "rls_propostas_select" ON public.propostas
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('opec', tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
                OR executivo_id = auth.uid()
                OR created_by = auth.uid()
                OR executivo_parceiro_id = auth.uid()
            )
        )
    );

    CREATE POLICY "rls_propostas_insert" ON public.propostas
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR executivo_id = auth.uid()
                OR created_by = auth.uid()
            )
        )
    );

    CREATE POLICY "rls_propostas_update" ON public.propostas
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR executivo_id = auth.uid()
                OR created_by = auth.uid()
                OR executivo_parceiro_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR executivo_id = auth.uid()
                OR created_by = auth.uid()
                OR executivo_parceiro_id = auth.uid()
            )
        )
    );

    CREATE POLICY "rls_propostas_delete" ON public.propostas
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND public.is_tenant_admin(tenant_id)
        )
    );
END IF;
END $$;

-- ==============================================================================
-- 6. FINANCEIRO_TRANSACOES
-- ==============================================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financeiro_transacoes') THEN
    ALTER TABLE public.financeiro_transacoes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_select_financeiro_transacoes" ON public.financeiro_transacoes;
    DROP POLICY IF EXISTS "tenant_isolation_insert_financeiro_transacoes" ON public.financeiro_transacoes;
    DROP POLICY IF EXISTS "tenant_isolation_update_financeiro_transacoes" ON public.financeiro_transacoes;
    DROP POLICY IF EXISTS "tenant_isolation_delete_financeiro_transacoes" ON public.financeiro_transacoes;

    CREATE POLICY "rls_financeiro_transacoes_select" ON public.financeiro_transacoes
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
            )
        )
    );

    CREATE POLICY "rls_financeiro_transacoes_write" ON public.financeiro_transacoes
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
            )
        )
    );
END IF;
END $$;

-- ==============================================================================
-- 7. PROPOSTA_FEEDBACKS (PORTAL EXTERNO SEGURO)
-- ==============================================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposta_feedbacks') THEN
    ALTER TABLE public.proposta_feedbacks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Inquilino gerencia feedbacks da proposta" ON public.proposta_feedbacks;
    DROP POLICY IF EXISTS "Publico pode inserir feedback com token valido" ON public.proposta_feedbacks;

    -- Usuários internos do tenant
    CREATE POLICY "rls_proposta_feedbacks_tenant" ON public.proposta_feedbacks
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR tenant_id = public.current_user_tenant_id()
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR tenant_id = public.current_user_tenant_id()
    );

    -- Inserção de feedback público: Exige proposta existente
    CREATE POLICY "rls_proposta_feedbacks_public_insert" ON public.proposta_feedbacks
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        proposta_id IN (SELECT id FROM public.propostas)
    );
END IF;
END $$;
