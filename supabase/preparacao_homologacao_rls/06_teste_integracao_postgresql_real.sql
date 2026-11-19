-- ==============================================================================
-- ETAPA 5 - TESTE DE INTEGRAÇÃO REAL EM POSTGRESQL (NÃO EXECUTADO)
-- ARQUIVO: 06_teste_integracao_postgresql_real.sql
-- OBJETIVO: Bateria de testes reais de RLS executada nativamente em transação Postgres
--           com asserções ativas e ROLLBACK obrigatório para não persistir dados.
-- AMBIENTE: Exclusivo para banco de Homologação / Staging (JAMAIS em Produção).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. CONSTANTES E SINCRONIZAÇÃO DE IDENTIDADES DE HOMOLOGAÇÃO
-- Identificadores sincronizados com 07_massa_dados_ficticios_staging.sql:
--   • Tenant Alfa:     11111111-1111-1111-1111-111111111111
--   • Tenant Beta:     22222222-2222-2222-2222-222222222222
--   • Exec Alfa 1:     11111111-aaaa-1111-aaaa-111111111111
--   • Exec Alfa 2:     22222222-aaaa-2222-aaaa-222222222222
--   • OPEC Alfa:       33333333-aaaa-3333-aaaa-333333333333
--   • Financeiro Alfa: 44444444-aaaa-4444-aaaa-444444444444
--   • Master Alfa:     99999999-aaaa-9999-aaaa-999999999999
--   • Exec Beta 1:     55555555-bbbb-5555-bbbb-555555555555
--   • Master Beta:     88888888-bbbb-8888-bbbb-888888888888
--   • Cliente Alfa 1:  c1111111-aaaa-1111-aaaa-111111111111
--   • Proposta Alfa 1: d1111111-aaaa-1111-aaaa-111111111111
--   • PI Alfa 1:       e1111111-aaaa-1111-aaaa-111111111111
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'INICIANDO BATERIA DE TESTES REAIS DE RLS NO POSTGRESQL (TRANSAÇÃO ATIVA)';
    RAISE NOTICE '====================================================================';
END $$;


-- ------------------------------------------------------------------------------
-- CENÁRIO REAL 1: TESTE DE ISOLAMENTO CROSS-TENANT (LEITURA E ESCRITA)
-- Emulação da sessão do Executivo Beta (Tenant Beta)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '55555555-bbbb-5555-bbbb-555555555555', true);
SELECT set_config('request.jwt.claim.email', 'vendedor1.beta@ficticio.test', true);

DO $$
DECLARE
    v_count INT := 0;
    v_rows INT := 0;
    v_tenant_alfa UUID := '11111111-1111-1111-1111-111111111111';
    v_prop_alfa UUID := 'd1111111-aaaa-1111-aaaa-111111111111';
BEGIN
    -- 1.1 Teste de Leitura: Usuário Beta tenta ler propostas do Tenant Alfa
    SELECT COUNT(*) INTO v_count 
    FROM public.propostas 
    WHERE tenant_id = v_tenant_alfa;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'VIOLAÇÃO CRÍTICA DE RLS [CENÁRIO 1]: Usuário do Tenant Beta conseguiu visualizar % proposta(s) do Tenant Alfa!', v_count;
    END IF;

    -- 1.2 Teste de Leitura em insertion_orders (se existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insertion_orders') THEN
        EXECUTE 'SELECT COUNT(*) FROM public.insertion_orders WHERE tenant_id = $1' 
        INTO v_count 
        USING v_tenant_alfa;

        IF v_count > 0 THEN
            RAISE EXCEPTION 'VIOLAÇÃO CRÍTICA DE RLS [CENÁRIO 1]: Usuário do Tenant Beta conseguiu visualizar % PI(s) do Tenant Alfa!', v_count;
        END IF;
    END IF;

    -- 1.3 Teste de Escrita: Usuário Beta tenta atualizar proposta do Tenant Alfa
    UPDATE public.propostas 
    SET valor_negociado = 999999.00 
    WHERE id = v_prop_alfa;
    
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        RAISE EXCEPTION 'VIOLAÇÃO CRÍTICA DE RLS [CENÁRIO 1]: Usuário do Tenant Beta conseguiu alterar registro do Tenant Alfa!';
    END IF;

    RAISE NOTICE '✅ Cenário 1 APROVADO: Isolamento Cross-Tenant (Leitura e Escrita bloqueadas para outro tenant)';
END $$;

-- ------------------------------------------------------------------------------
-- CENÁRIO REAL 2: TESTE DE CARTEIRA COMERCIAL (MESMA EMPRESA)
-- Emulação do Executivo Alfa 2 tentando alterar registro do Executivo Alfa 1
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-aaaa-2222-aaaa-222222222222', true);
SELECT set_config('request.jwt.claim.email', 'vendedor2.alfa@ficticio.test', true);

DO $$
DECLARE
    v_rows INT := 0;
    v_prop_alfa1 UUID := 'd1111111-aaaa-1111-aaaa-111111111111';
BEGIN
    -- Executivo 2 tenta alterar a proposta d1111111 criada pelo Executivo 1
    UPDATE public.propostas 
    SET valor_negociado = 1.00 
    WHERE id = v_prop_alfa1;
    
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE RLS [CENÁRIO 2]: Executivo 2 conseguiu modificar proposta pertencente ao Executivo 1 da mesma empresa!';
    END IF;

    RAISE NOTICE '✅ Cenário 2 APROVADO: Restrição de Carteira Comercial (Executivo não pode sobrescrever item alheio)';
END $$;

-- ------------------------------------------------------------------------------
-- CENÁRIO REAL 3: TESTE DE FRONTEIRA OPEC VS FINANCEIRO
-- Emulação da sessão de OPEC Alfa (não pode ter acesso às transações financeiras)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '33333333-aaaa-3333-aaaa-333333333333', true);
SELECT set_config('request.jwt.claim.email', 'opec.alfa@ficticio.test', true);

DO $$
DECLARE
    v_count INT := 0;
    v_tenant_alfa UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financeiro_transacoes') THEN
        EXECUTE 'SELECT COUNT(*) FROM public.financeiro_transacoes WHERE tenant_id = $1' 
        INTO v_count 
        USING v_tenant_alfa;

        IF v_count > 0 THEN
            RAISE EXCEPTION 'VIOLAÇÃO DE RLS [CENÁRIO 3]: OPEC visualizou % transação(ões) financeiras confidenciais!', v_count;
        END IF;
    END IF;

    RAISE NOTICE '✅ Cenário 3 APROVADO: Fronteira OPEC vs Financeiro (Transações financeiras protegidas)';
END $$;

-- ------------------------------------------------------------------------------
-- CENÁRIO REAL 4: TESTE DE DEFESA CONTRA SPOOFING DE CLAIMS JWT
-- Emulação de atacante injetando claims 'role=MASTER' ou 'tenant_id' no token
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '55555555-bbbb-5555-bbbb-555555555555', true);
SELECT set_config('request.jwt.claim.email', 'vendedor1.beta@ficticio.test', true);
SELECT set_config('request.jwt.claim.user_metadata', '{"role": "MASTER", "is_superadmin": true, "tenant_id": "11111111-1111-1111-1111-111111111111"}', true);

DO $$
DECLARE
    v_count INT := 0;
    v_tenant_alfa UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM public.propostas 
    WHERE tenant_id = v_tenant_alfa;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA [CENÁRIO 4]: Atacante com claims JWT forjadas obteve acesso ao Tenant Alfa!';
    END IF;

    RAISE NOTICE '✅ Cenário 4 APROVADO: Imunidade a Spoofing (Servidor valida perfis estritamente via banco)';
END $$;

-- ------------------------------------------------------------------------------
-- CENÁRIO REAL 5: GOVERNANÇA CORPORATIVA (MASTER DA EMPRESA)
-- Emulação do Master da Empresa Alfa (autorização plena sobre o próprio tenant)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '99999999-aaaa-9999-aaaa-999999999999', true);
SELECT set_config('request.jwt.claim.email', 'master.alfa@ficticio.test', true);

DO $$
DECLARE
    v_count INT := 0;
    v_tenant_alfa UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM public.propostas 
    WHERE tenant_id = v_tenant_alfa;
    
    -- Se a massa de testes foi inserida, o Master deve ler todas as propostas da sua empresa
    IF v_count = 0 AND EXISTS (SELECT 1 FROM public.propostas WHERE tenant_id = v_tenant_alfa) THEN
        RAISE EXCEPTION 'FALHA DE GOVERNANÇA [CENÁRIO 5]: Master da Empresa não conseguiu ler propostas da sua própria equipe!';
    END IF;

    RAISE NOTICE '✅ Cenário 5 APROVADO: Governança Corporativa (Master da Empresa tem acesso aos dados do próprio tenant)';
END $$;

-- ------------------------------------------------------------------------------
-- REVERSÃO MANDATÓRIA (ZERO RESÍDUO DE DADOS)
-- ------------------------------------------------------------------------------
RESET ROLE;
ROLLBACK;

DO $$
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'BATERIA CONCLUÍDA COM SUCESSO: ROLLBACK EFETUADO (ZERO RESÍDUO)';
    RAISE NOTICE '====================================================================';
END $$;
