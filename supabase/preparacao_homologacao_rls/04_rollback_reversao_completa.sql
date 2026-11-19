-- ==============================================================================
-- ETAPA 5 - REVISÃO INDEPENDENTE DE HOMOLOGAÇÃO (NÃO EXECUTADA)
-- ARQUIVO: 04_rollback_reversao_completa.sql
-- OBJETIVO: Reversão integral e simétrica para as políticas imediatamente anteriores.
-- REGRA MANDATÓRIA: Não executar automaticamente. Documento de contingência.
-- AVISO: EXECUÇÃO BLOQUEADA POR SEGURANÇA. UTILIZE 04_rollback_seguro_contingencia.sql
-- ==============================================================================

-- TRAVA DE SEGURANÇA CONTRA EXECUÇÃO ACIDENTAL
DO $$ 
BEGIN 
    RAISE EXCEPTION 'EXECUÇÃO BLOQUEADA POR AUDITORIA DE SEGURANÇA: Este script restaura políticas legadas vulneráveis com vazamento cross-tenant (OR tenant_id IS NULL). Para contingência segura, utilize 04_rollback_seguro_contingencia.sql ou restauração controlada de Snapshot/PITR.'; 
END $$;

-- 1. RESTAURAR INSERTION_ORDERS
DO $$ BEGIN

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insertion_orders') THEN
    DROP POLICY IF EXISTS "rls_insertion_orders_select" ON public.insertion_orders;
    DROP POLICY IF EXISTS "rls_insertion_orders_insert" ON public.insertion_orders;
    DROP POLICY IF EXISTS "rls_insertion_orders_update" ON public.insertion_orders;
    DROP POLICY IF EXISTS "rls_insertion_orders_delete" ON public.insertion_orders;

    CREATE POLICY "Permissao por CNPJ ou Master" ON public.insertion_orders
    FOR ALL TO authenticated
    USING (
        public.is_master_user()
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND (
                cnpj_cliente = public.get_current_user_cnpj()
                OR cnpj_veiculo = public.get_current_user_cnpj()
            )
        )
        OR (
            public.get_current_user_cnpj() IS NULL
            AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
        )
    )
    WITH CHECK (
        public.is_master_user()
        OR (
            public.get_current_user_cnpj() IS NULL
            AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
        )
    );
END IF;
END $$;

-- 2. RESTAURAR PI_ITEMS, PI_CHECKINGS, PI_SETTLEMENTS
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_items') THEN
    DROP POLICY IF EXISTS "rls_pi_items_all" ON public.pi_items;

    CREATE POLICY "pi_items_rbac_all" ON public.pi_items
    FOR ALL TO authenticated
    USING (
        public.is_master_user()
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND (
                cnpj_veiculo = public.get_current_user_cnpj()
                OR pi_id IN (
                    SELECT id FROM public.insertion_orders
                    WHERE cnpj_cliente = public.get_current_user_cnpj()
                       OR cnpj_veiculo = public.get_current_user_cnpj()
                )
            )
        )
        OR (
            public.get_current_user_cnpj() IS NULL
            AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
        )
    )
    WITH CHECK (
        public.is_master_user()
        OR (
            public.get_current_user_cnpj() IS NULL
            AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
        )
    );
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_checkings') THEN
    DROP POLICY IF EXISTS "rls_pi_checkings_select" ON public.pi_checkings;
    DROP POLICY IF EXISTS "rls_pi_checkings_insert" ON public.pi_checkings;
    DROP POLICY IF EXISTS "rls_pi_checkings_update" ON public.pi_checkings;

    CREATE POLICY "pi_checkings_rbac_all" ON public.pi_checkings
    FOR ALL TO authenticated
    USING (
        public.is_master_user()
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND (
                cnpj_veiculo = public.get_current_user_cnpj()
                OR pi_id IN (
                    SELECT id FROM public.insertion_orders
                    WHERE cnpj_cliente = public.get_current_user_cnpj()
                       OR cnpj_veiculo = public.get_current_user_cnpj()
                )
            )
        )
        OR (
            public.get_current_user_cnpj() IS NULL
            AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
        )
    )
    WITH CHECK (
        public.is_master_user()
        OR (
            public.get_current_user_cnpj() NOT NULL
            AND cnpj_veiculo = public.get_current_user_cnpj()
        )
        OR (
            public.get_current_user_cnpj() IS NULL
            AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
        )
    );
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_settlements') THEN
    DROP POLICY IF EXISTS "rls_pi_settlements_select" ON public.pi_settlements;
    DROP POLICY IF EXISTS "rls_pi_settlements_write" ON public.pi_settlements;

    CREATE POLICY "pi_settlements_rbac_all" ON public.pi_settlements
    FOR ALL TO authenticated
    USING (
        public.is_master_user()
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND (
                cnpj_pagador = public.get_current_user_cnpj()
                OR cnpj_recebedor = public.get_current_user_cnpj()
                OR pi_id IN (
                    SELECT id FROM public.insertion_orders
                    WHERE cnpj_cliente = public.get_current_user_cnpj()
                       OR cnpj_veiculo = public.get_current_user_cnpj()
                )
            )
        )
        OR (
            public.get_current_user_cnpj() IS NULL
            AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
        )
    )
    WITH CHECK (
        public.is_master_user()
        OR (
            public.get_current_user_cnpj() IS NULL
            AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
        )
    );
END IF;
END $$;

-- 3. RESTAURAR PRODUTOS
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
    DROP POLICY IF EXISTS "rls_produtos_select" ON public.produtos;
    DROP POLICY IF EXISTS "rls_produtos_insert" ON public.produtos;
    DROP POLICY IF EXISTS "rls_produtos_update" ON public.produtos;
    DROP POLICY IF EXISTS "rls_produtos_delete" ON public.produtos;

    CREATE POLICY "tenant_isolation_select_produtos" ON public.produtos
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        parceiro_id IS NOT NULL OR
        partner_id IS NOT NULL OR
        parceiro_nome IS NOT NULL OR
        parceiro_cnpj IS NOT NULL OR
        origem_produto = 'PARCEIRO'
    );

    CREATE POLICY "permitir_update_universal_produtos" ON public.produtos
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
    )
    WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
    );
END IF;
END $$;

-- 4. RESTAURAR CLIENTES E AGÊNCIAS
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes') THEN
    DROP POLICY IF EXISTS "rls_clientes_select" ON public.clientes;
    DROP POLICY IF EXISTS "rls_clientes_insert" ON public.clientes;
    DROP POLICY IF EXISTS "rls_clientes_update" ON public.clientes;
    DROP POLICY IF EXISTS "rls_clientes_delete" ON public.clientes;

    CREATE POLICY "permitir_update_universal_clientes" ON public.clientes
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
    )
    WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
    );
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias') THEN
    DROP POLICY IF EXISTS "rls_agencias_select" ON public.agencias;
    DROP POLICY IF EXISTS "rls_agencias_write" ON public.agencias;

    CREATE POLICY "tenant_isolation_select_agencias" ON public.agencias
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

    CREATE POLICY "permitir_update_universal_agencias" ON public.agencias
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
    )
    WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
    );
END IF;
END $$;

-- 5. RESTAURAR PROPOSTAS
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
    DROP POLICY IF EXISTS "rls_propostas_select" ON public.propostas;
    DROP POLICY IF EXISTS "rls_propostas_insert" ON public.propostas;
    DROP POLICY IF EXISTS "rls_propostas_update" ON public.propostas;
    DROP POLICY IF EXISTS "rls_propostas_delete" ON public.propostas;

    CREATE POLICY "permitir_update_universal_propostas" ON public.propostas
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
    )
    WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
    );
END IF;
END $$;

-- 6. RESTAURAR FINANCEIRO TRANSAÇÕES
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financeiro_transacoes') THEN
    DROP POLICY IF EXISTS "rls_financeiro_transacoes_select" ON public.financeiro_transacoes;
    DROP POLICY IF EXISTS "rls_financeiro_transacoes_write" ON public.financeiro_transacoes;

    CREATE POLICY "tenant_isolation_select_financeiro_transacoes" ON public.financeiro_transacoes
    FOR SELECT TO authenticated
    USING (
        public.is_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_tenant_id()
    );

    CREATE POLICY "tenant_isolation_update_financeiro_transacoes" ON public.financeiro_transacoes
    FOR UPDATE TO authenticated
    USING (
        public.is_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_tenant_id()
    );
END IF;
END $$;

-- 7. RESTAURAR PROPOSTA_FEEDBACKS
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposta_feedbacks') THEN
    DROP POLICY IF EXISTS "rls_proposta_feedbacks_tenant" ON public.proposta_feedbacks;
    DROP POLICY IF EXISTS "rls_proposta_feedbacks_public_insert" ON public.proposta_feedbacks;

    CREATE POLICY "Inquilino gerencia feedbacks da proposta" ON public.proposta_feedbacks
    FOR ALL TO authenticated
    USING (
        tenant_id IS NULL OR 
        tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
    WITH CHECK (
        tenant_id IS NULL OR 
        tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    );

    CREATE POLICY "Publico pode inserir feedback com token valido" ON public.proposta_feedbacks
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
END IF;
END $$;
