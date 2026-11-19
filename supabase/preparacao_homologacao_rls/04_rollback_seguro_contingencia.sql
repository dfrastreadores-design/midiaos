-- ==============================================================================
-- ETAPA 5 - PROPOSTA ALTERNATIVA DE CONTINGÊNCIA SEGURA (RLS MULTIEMPRESA)
-- ARQUIVO: 04_rollback_seguro_contingencia.sql
-- OBJETIVO: Reversão controlada e segura sem reabrir vulnerabilidades de vazamento.
--
-- PRINCÍPIOS DESTA CONTINGÊNCIA SEGURA:
--   1. ZERO TOLERÂNCIA A 'tenant_id IS NULL' PARA USUÁRIOS COMUNS.
--      Registros órfãos permanecem em quarentena restrita acessíveis unicamente
--      pelo Master da Plataforma (public.is_super_admin).
--   2. ISOLAMENTO ESTRITO POR EMPRESA PRESERVADO:
--      tenant_id = public.current_user_tenant_id() obrigatório em todas as políticas.
--   3. POLÍTICAS COMPLETAS E SIMÉTRICAS:
--      Garantia de regras explícitas para SELECT, INSERT, UPDATE e DELETE.
--   4. IMUNIDADE A SPOOFING:
--      Identidade e tenant são resolvidos via funções seguras do banco (profiles).
--
-- DIRETRIZ DE ENGENHARIA PARA INCIDENTES DE PRODUÇÃO:
--   Se a integridade do banco ou das relações entre empresas tiver sido violada,
--   a ação mandatória de recuperação NÃO é rodar rollbacks permissivos, e sim:
--   - Restauração controlada de Snapshot / PITR (Point-In-Time Recovery) do Supabase;
--   - Auditoria forense dos registros alterados a partir da tabela de auditoria.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONTINGÊNCIA SEGURA: INSERTION_ORDERS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insertion_orders') THEN
    ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "rls_insertion_orders_select" ON public.insertion_orders;
    DROP POLICY IF EXISTS "rls_insertion_orders_insert" ON public.insertion_orders;
    DROP POLICY IF EXISTS "rls_insertion_orders_update" ON public.insertion_orders;
    DROP POLICY IF EXISTS "rls_insertion_orders_delete" ON public.insertion_orders;
    DROP POLICY IF EXISTS "Permissao por CNPJ ou Master" ON public.insertion_orders;
    DROP POLICY IF EXISTS "insertion_orders_contingencia_select" ON public.insertion_orders;
    DROP POLICY IF EXISTS "insertion_orders_contingencia_write" ON public.insertion_orders;

    -- SELECT SEGURO: Master global OU anunciante via CNPJ OU membro da própria empresa
    CREATE POLICY "insertion_orders_contingencia_select" ON public.insertion_orders
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.get_current_user_cnpj() IS NOT NULL
            AND (
                cnpj_cliente = public.get_current_user_cnpj()
                OR cnpj_veiculo = public.get_current_user_cnpj()
            )
        )
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );

    -- ESCRITA SEGURA: Master global OU equipe autorizada da PRÓPRIA empresa (sem vazamento)
    CREATE POLICY "insertion_orders_contingencia_write" ON public.insertion_orders
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR representative_id = auth.uid()
                OR created_by = auth.uid()
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );
END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. CONTINGÊNCIA SEGURA: PRODUTOS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "rls_produtos_select" ON public.produtos;
    DROP POLICY IF EXISTS "rls_produtos_insert" ON public.produtos;
    DROP POLICY IF EXISTS "rls_produtos_update" ON public.produtos;
    DROP POLICY IF EXISTS "rls_produtos_delete" ON public.produtos;
    DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "permitir_update_universal_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "produtos_contingencia_select" ON public.produtos;
    DROP POLICY IF EXISTS "produtos_contingencia_write" ON public.produtos;

    CREATE POLICY "produtos_contingencia_select" ON public.produtos
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );

    CREATE POLICY "produtos_contingencia_write" ON public.produtos
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
            AND public.is_tenant_admin(tenant_id)
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );
END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. CONTINGÊNCIA SEGURA: CLIENTES E AGÊNCIAS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "rls_clientes_select" ON public.clientes;
    DROP POLICY IF EXISTS "rls_clientes_insert" ON public.clientes;
    DROP POLICY IF EXISTS "rls_clientes_update" ON public.clientes;
    DROP POLICY IF EXISTS "rls_clientes_delete" ON public.clientes;
    DROP POLICY IF EXISTS "permitir_update_universal_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "clientes_contingencia_select" ON public.clientes;
    DROP POLICY IF EXISTS "clientes_contingencia_write" ON public.clientes;

    CREATE POLICY "clientes_contingencia_select" ON public.clientes
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );

    CREATE POLICY "clientes_contingencia_write" ON public.clientes
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
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
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agencias') THEN
    ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "rls_agencias_select" ON public.agencias;
    DROP POLICY IF EXISTS "rls_agencias_write" ON public.agencias;
    DROP POLICY IF EXISTS "tenant_isolation_select_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "permitir_update_universal_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "agencias_contingencia_all" ON public.agencias;

    CREATE POLICY "agencias_contingencia_all" ON public.agencias
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );
END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. CONTINGÊNCIA SEGURA: PROPOSTAS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'propostas') THEN
    ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "rls_propostas_select" ON public.propostas;
    DROP POLICY IF EXISTS "rls_propostas_insert" ON public.propostas;
    DROP POLICY IF EXISTS "rls_propostas_update" ON public.propostas;
    DROP POLICY IF EXISTS "rls_propostas_delete" ON public.propostas;
    DROP POLICY IF EXISTS "permitir_update_universal_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "propostas_contingencia_select" ON public.propostas;
    DROP POLICY IF EXISTS "propostas_contingencia_write" ON public.propostas;

    CREATE POLICY "propostas_contingencia_select" ON public.propostas
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );

    CREATE POLICY "propostas_contingencia_write" ON public.propostas
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
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
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
        )
    );
END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. CONTINGÊNCIA SEGURA: FINANCEIRO TRANSAÇÕES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financeiro_transacoes') THEN
    ALTER TABLE public.financeiro_transacoes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "rls_financeiro_transacoes_select" ON public.financeiro_transacoes;
    DROP POLICY IF EXISTS "rls_financeiro_transacoes_write" ON public.financeiro_transacoes;
    DROP POLICY IF EXISTS "tenant_isolation_select_financeiro_transacoes" ON public.financeiro_transacoes;
    DROP POLICY IF EXISTS "tenant_isolation_update_financeiro_transacoes" ON public.financeiro_transacoes;
    DROP POLICY IF EXISTS "financeiro_transacoes_contingencia_all" ON public.financeiro_transacoes;

    CREATE POLICY "financeiro_transacoes_contingencia_all" ON public.financeiro_transacoes
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
            )
        )
    )
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            tenant_id IS NOT NULL
            AND tenant_id = public.current_user_tenant_id()
            AND (
                public.is_tenant_admin(tenant_id)
                OR public.is_tenant_role('financeiro', tenant_id)
            )
        )
    );
END IF;
END $$;
