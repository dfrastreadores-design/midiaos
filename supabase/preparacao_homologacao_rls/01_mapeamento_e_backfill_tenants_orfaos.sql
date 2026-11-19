-- ==============================================================================
-- ETAPA 5 - REVISÃO INDEPENDENTE DE HOMOLOGAÇÃO (NÃO EXECUTADA)
-- ARQUIVO: 01_mapeamento_e_backfill_tenants_orfaos.sql
-- OBJETIVO: Mapear e associar registros órfãos exclusivamente por evidência DETERMINÍSTICA.
-- REGRA MANDATÓRIA: Não executar automaticamente. Apenas para homologação.
-- DIRETRIZ ESTRITA: ZERO atribuição por suposição. Registros sem vínculo inequívoco
--                   são preservados intactos em quarentena para curadoria manual.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELAS DE AUDITORIA E QUARENTENA DE REGISTROS ÓRFÃOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._backfill_orfaos_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela TEXT NOT NULL,
    registro_id UUID NOT NULL,
    criterio_deterministico TEXT NOT NULL,
    tenant_id_atribuido UUID NOT NULL,
    detalhes_evidencia JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public._registros_orfaos_quarentena (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela TEXT NOT NULL,
    registro_id UUID NOT NULL,
    motivo_quarentena TEXT NOT NULL,
    dados_registro JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pendente_analise_master',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. PROCEDIMENTO DE MAPEAMENTO DETERMINÍSTICO (SEM SUPOSIÇÃO)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_total_associados INTEGER := 0;
    v_total_quarentena INTEGER := 0;
BEGIN
    -- ==========================================================================
    -- CRITÉRIO DETERMINÍSTICO 1: HERANÇA DIRETA DE ENTIDADE PAI
    -- ==========================================================================

    -- 1.1 insertion_orders -> cliente cadastrado com tenant conhecido
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insertion_orders') THEN
        INSERT INTO public._backfill_orfaos_audit (tabela, registro_id, criterio_deterministico, tenant_id_atribuido, detalhes_evidencia)
        SELECT 
            'insertion_orders', 
            io.id, 
            'heranca_cliente_conhecido', 
            c.tenant_id,
            jsonb_build_object('client_id', c.id, 'client_cnpj', c.cnpj, 'client_tenant', c.tenant_id)
        FROM public.insertion_orders io
        JOIN public.clientes c ON c.id = io.client_id
        WHERE io.tenant_id IS NULL AND c.tenant_id IS NOT NULL;

        UPDATE public.insertion_orders io
        SET tenant_id = c.tenant_id
        FROM public.clientes c
        WHERE io.client_id = c.id
          AND io.tenant_id IS NULL
          AND c.tenant_id IS NOT NULL;
    END IF;

    -- 1.2 pi_items -> insertion_order pai
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_items') THEN
        UPDATE public.pi_items pi_it
        SET tenant_id = io.tenant_id
        FROM public.insertion_orders io
        WHERE pi_it.pi_id = io.id
          AND pi_it.tenant_id IS NULL
          AND io.tenant_id IS NOT NULL;
    END IF;

    -- 1.3 pi_checkings -> insertion_order pai
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_checkings') THEN
        UPDATE public.pi_checkings pc
        SET tenant_id = io.tenant_id
        FROM public.insertion_orders io
        WHERE pc.pi_id = io.id
          AND pc.tenant_id IS NULL
          AND io.tenant_id IS NOT NULL;
    END IF;

    -- 1.4 pi_settlements -> insertion_order pai
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pi_settlements') THEN
        UPDATE public.pi_settlements ps
        SET tenant_id = io.tenant_id
        FROM public.insertion_orders io
        WHERE ps.pi_id = io.id
          AND ps.tenant_id IS NULL
          AND io.tenant_id IS NOT NULL;
    END IF;

    -- 1.5 propostas -> cliente cadastrado
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        INSERT INTO public._backfill_orfaos_audit (tabela, registro_id, criterio_deterministico, tenant_id_atribuido, detalhes_evidencia)
        SELECT 
            'propostas', 
            p.id, 
            'heranca_cliente_proposta', 
            c.tenant_id,
            jsonb_build_object('cliente_id', c.id, 'cliente_razao', c.razao_social)
        FROM public.propostas p
        JOIN public.clientes c ON c.id = p.cliente_id
        WHERE p.tenant_id IS NULL AND c.tenant_id IS NOT NULL;

        UPDATE public.propostas p
        SET tenant_id = c.tenant_id
        FROM public.clientes c
        WHERE p.cliente_id = c.id
          AND p.tenant_id IS NULL
          AND c.tenant_id IS NOT NULL;
    END IF;

    -- ==========================================================================
    -- CRITÉRIO DETERMINÍSTICO 2: AUTORIA COMPROVADA DO USUÁRIO CRIADOR
    -- ==========================================================================

    -- 2.1 Clientes criados por usuário cujo perfil tem tenant único e confirmado
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes') THEN
        INSERT INTO public._backfill_orfaos_audit (tabela, registro_id, criterio_deterministico, tenant_id_atribuido, detalhes_evidencia)
        SELECT 
            'clientes', 
            c.id, 
            'autoria_criador_confirmada', 
            pr.tenant_id,
            jsonb_build_object('created_by', pr.id, 'user_email', pr.email)
        FROM public.clientes c
        JOIN public.profiles pr ON pr.id = c.created_by
        WHERE c.tenant_id IS NULL AND pr.tenant_id IS NOT NULL;

        UPDATE public.clientes c
        SET tenant_id = pr.tenant_id
        FROM public.profiles pr
        WHERE c.created_by = pr.id
          AND c.tenant_id IS NULL
          AND pr.tenant_id IS NOT NULL;
    END IF;

    -- 2.2 Agências
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias') THEN
        UPDATE public.agencias a
        SET tenant_id = pr.tenant_id
        FROM public.profiles pr
        WHERE a.created_by = pr.id
          AND a.tenant_id IS NULL
          AND pr.tenant_id IS NOT NULL;
    END IF;

    -- 2.3 Produtos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
        UPDATE public.produtos prod
        SET tenant_id = pr.tenant_id
        FROM public.profiles pr
        WHERE prod.created_by = pr.id
          AND prod.tenant_id IS NULL
          AND pr.tenant_id IS NOT NULL;
    END IF;

    -- 2.4 Financeiro Transações
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financeiro_transacoes') THEN
        UPDATE public.financeiro_transacoes ft
        SET tenant_id = pr.tenant_id
        FROM public.profiles pr
        WHERE ft.created_by = pr.id
          AND ft.tenant_id IS NULL
          AND pr.tenant_id IS NOT NULL;
    END IF;

    -- ==========================================================================
    -- CRITÉRIO DETERMINÍSTICO 3: TITULARIDADE COMERCIAL (executivo_id)
    -- ==========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes') THEN
        UPDATE public.clientes c
        SET tenant_id = pr.tenant_id
        FROM public.profiles pr
        WHERE c.executivo_id = pr.id
          AND c.tenant_id IS NULL
          AND pr.tenant_id IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        UPDATE public.propostas p
        SET tenant_id = pr.tenant_id
        FROM public.profiles pr
        WHERE p.executivo_id = pr.id
          AND p.tenant_id IS NULL
          AND pr.tenant_id IS NOT NULL;
    END IF;

    -- ==========================================================================
    -- DESTINO DOS DEMAIS REGISTROS ÓRFÃOS: QUARENTENA SEGURA (NUNCA SUPOSIÇÃO)
    -- ==========================================================================
    -- Registros sem herança e sem autor conhecido NÃO são associados a nenhum tenant.
    -- Ficam em quarentena isolada para análise do Master da Plataforma.

    INSERT INTO public._registros_orfaos_quarentena (tabela, registro_id, motivo_quarentena, dados_registro)
    SELECT 'clientes', id, 'SEM_EVIDENCIA_DETERMINISTICA', jsonb_build_object('razao_social', razao_social, 'cnpj', cnpj, 'created_at', created_at)
    FROM public.clientes WHERE tenant_id IS NULL;

    INSERT INTO public._registros_orfaos_quarentena (tabela, registro_id, motivo_quarentena, dados_registro)
    SELECT 'agencias', id, 'SEM_EVIDENCIA_DETERMINISTICA', jsonb_build_object('razao_social', razao_social, 'cnpj', cnpj, 'created_at', created_at)
    FROM public.agencias WHERE tenant_id IS NULL;

    INSERT INTO public._registros_orfaos_quarentena (tabela, registro_id, motivo_quarentena, dados_registro)
    SELECT 'propostas', id, 'SEM_EVIDENCIA_DETERMINISTICA', jsonb_build_object('campanha', campanha, 'numero', numero, 'cliente_id', cliente_id, 'created_at', created_at)
    FROM public.propostas WHERE tenant_id IS NULL;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insertion_orders') THEN
        INSERT INTO public._registros_orfaos_quarentena (tabela, registro_id, motivo_quarentena, dados_registro)
        SELECT 'insertion_orders', id, 'SEM_EVIDENCIA_DETERMINISTICA', jsonb_build_object('pi_number', pi_number, 'client_id', client_id, 'created_at', created_at)
        FROM public.insertion_orders WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
        INSERT INTO public._registros_orfaos_quarentena (tabela, registro_id, motivo_quarentena, dados_registro)
        SELECT 'produtos', id, 'SEM_EVIDENCIA_DETERMINISTICA', jsonb_build_object('nome', nome, 'created_at', created_at)
        FROM public.produtos WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financeiro_transacoes') THEN
        INSERT INTO public._registros_orfaos_quarentena (tabela, registro_id, motivo_quarentena, dados_registro)
        SELECT 'financeiro_transacoes', id, 'SEM_EVIDENCIA_DETERMINISTICA', jsonb_build_object('descricao', descricao, 'valor', valor, 'created_at', created_at)
        FROM public.financeiro_transacoes WHERE tenant_id IS NULL;
    END IF;

    RAISE NOTICE 'Mapeamento determinístico concluído. Registros sem vínculo inequívoco preservados em quarentena sem alteração.';
END $$;
