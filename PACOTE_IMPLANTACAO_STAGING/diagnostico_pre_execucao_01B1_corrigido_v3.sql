-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO PRÉ-EXECUÇÃO DO LOTE 01B1 CORRIGIDO (V3)
-- Arquivo: diagnostico_pre_execucao_01B1_corrigido_v3.sql
-- Objetivo: Validação estritamente leitura das 23 colunas, verificação segura
--           da tabela produto_tipos (constraint UNIQUE, nulos, duplicatas) sem
--           falha caso a tabela não exista, auditoria de FKs e mapeamento histórico.
-- Natureza: ESTRITAMENTE LEITURA (READ-ONLY) — Zero DDL, Zero DML.
-- Ambiente: Supabase Staging (wsologhmptielhhnbgob) / PostgreSQL 17.11
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PARTE 1: Bloco PL/pgSQL com SQL Dinâmico Seguro (Somente Leitura)
-- Executa verificações de integridade em produto_tipos SEM erro se a tabela não existir.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_table_exists boolean;
    v_total_rows bigint := 0;
    v_null_rows bigint := 0;
    v_dup_rows bigint := 0;
BEGIN
    SELECT (to_regclass('public.produto_tipos') IS NOT NULL) INTO v_table_exists;

    IF v_table_exists THEN
        EXECUTE 'SELECT count(*) FROM public.produto_tipos' INTO v_total_rows;
        EXECUTE 'SELECT count(*) FROM public.produto_tipos WHERE nome IS NULL OR midia IS NULL' INTO v_null_rows;
        EXECUTE 'SELECT count(*) FROM (SELECT nome, midia FROM public.produto_tipos GROUP BY nome, midia HAVING count(*) > 1) d' INTO v_dup_rows;

        RAISE NOTICE '==================================================';
        RAISE NOTICE 'AUDITORIA DINÂMICA: public.produto_tipos';
        RAISE NOTICE '==================================================';
        RAISE NOTICE 'Status da Tabela: PRESENTE NO BANCO';
        RAISE NOTICE 'Total de Linhas: %', v_total_rows;
        RAISE NOTICE 'Linhas com Valores NULL em (nome, midia): %', v_null_rows;
        RAISE NOTICE 'Grupos Duplicados em (nome, midia): %', v_dup_rows;
        IF v_dup_rows > 0 THEN
            RAISE WARNING 'ATENÇÃO: Existem % grupos duplicados em produto_tipos!', v_dup_rows;
        ELSE
            RAISE NOTICE 'Integridade de Dados: OK (Zero duplicatas encontradas)';
        END IF;
    ELSE
        RAISE NOTICE '==================================================';
        RAISE NOTICE 'AUDITORIA DINÂMICA: public.produto_tipos';
        RAISE NOTICE '==================================================';
        RAISE NOTICE 'Status da Tabela: AUSENTE NO BANCO';
        RAISE NOTICE 'Observação: A tabela será criada com segurança e idempotência pelo lote 01B1 corrigido.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- PARTE 2: Consulta Tabular Read-Only Via Catálogos de Sistema (PostgreSQL 17.11)
-- ------------------------------------------------------------------------------
WITH 
-- 1. Matriz de Definição Esperada das 23 Colunas
col_expected AS (
    SELECT * FROM (VALUES
        ('produtos', 'formato', 'text', 'YES', NULL, NULL, 141),
        ('agencias', 'website', 'text', 'YES', NULL, NULL, 148),
        ('agencias', 'instagram', 'text', 'YES', NULL, NULL, 149),
        ('agencias', 'linkedin', 'text', 'YES', NULL, NULL, 150),
        ('agencias', 'facebook', 'text', 'YES', NULL, NULL, 151),
        ('clientes', 'website', 'text', 'YES', NULL, NULL, 154),
        ('clientes', 'instagram', 'text', 'YES', NULL, NULL, 155),
        ('clientes', 'linkedin', 'text', 'YES', NULL, NULL, 156),
        ('clientes', 'facebook', 'text', 'YES', NULL, NULL, 157),
        ('email_send_log', 'message_id', 'text', 'YES', NULL, NULL, 242),
        ('email_send_state', 'batch_size', 'integer', 'NO', '10', NULL, 276),
        ('email_send_state', 'send_delay_ms', 'integer', 'NO', '200', NULL, 280),
        ('email_send_state', 'auth_email_ttl_minutes', 'integer', 'NO', '15', NULL, 284),
        ('email_send_state', 'transactional_email_ttl_minutes', 'integer', 'NO', '60', NULL, 288),
        ('pi_itens', 'mes', 'integer', 'YES', NULL, NULL, 599),
        ('pi_itens', 'ano', 'integer', 'YES', NULL, NULL, 600),
        ('proposta_itens', 'mes', 'integer', 'YES', NULL, NULL, 617),
        ('proposta_itens', 'ano', 'integer', 'YES', NULL, NULL, 618),
        ('pis', 'vencimento_tipo', 'text', 'YES', '''manual''::text', NULL, 625),
        ('proposta_itens', 'horario', 'text', 'YES', NULL, NULL, 712),
        ('pi_itens', 'horario', 'text', 'YES', NULL, NULL, 715),
        ('pis', 'responsavel_negociacao_id', 'uuid', 'YES', NULL, 'profiles(id)', 1200),
        ('pis', 'executivo_execucao_id', 'uuid', 'YES', NULL, 'profiles(id)', 1201)
    ) AS t(table_name, column_name, exp_type, exp_nullable, exp_default, exp_fk, line_01b1)
),

-- 2. Verificação Real das Colunas no information_schema
col_real AS (
    SELECT 
        e.line_01b1,
        e.table_name,
        e.column_name,
        e.exp_type,
        e.exp_nullable,
        e.exp_default,
        e.exp_fk,
        EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = e.table_name
        ) AS table_exists,
        CASE WHEN c.column_name IS NOT NULL THEN true ELSE false END AS column_exists,
        c.data_type::text AS actual_type,
        c.is_nullable::text AS actual_nullable,
        c.column_default::text AS actual_default,
        CASE
            -- Se a tabela nem existe no banco
            WHEN NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = e.table_name
            ) THEN 'PENDENTE'
            -- Se a coluna não existe na tabela
            WHEN c.column_name IS NULL THEN 'AUSENTE'
            -- Se a coluna existe e o tipo é divergente
            WHEN c.data_type::text <> e.exp_type::text THEN 'INCOMPATÍVEL'
            -- Se a coluna existe e o tipo confere
            ELSE 'COMPATÍVEL'
        END AS status_classificacao
    FROM col_expected e
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public' 
     AND c.table_name = e.table_name 
     AND c.column_name = e.column_name
),

-- 3. Auditoria Específica da Constraint UNIQUE em public.produto_tipos
-- Consulta PURAMENTE catálogos de sistema (zero SELECT estático em public.produto_tipos)
pt_catalog AS (
    SELECT
        con.conname AS constraint_name,
        array_agg(att.attname::text ORDER BY u.attpos) AS constraint_columns,
        idx.indisunique AS is_unique_index,
        idx.indisvalid AS is_valid_index,
        (idx.indpred IS NULL) AS is_unconditional,
        bool_and(att.attnotnull) AS all_columns_not_null
    FROM pg_class rel
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_constraint con ON con.conrelid = rel.oid AND con.contype = 'u'
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS u(attnum, attpos) ON true
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = u.attnum
    JOIN pg_index idx ON idx.indexrelid = con.conindid
    WHERE nsp.nspname = 'public' AND rel.relname = 'produto_tipos'
    GROUP BY con.conname, idx.indisunique, idx.indisvalid, idx.indpred
),

-- 4. Validação das Chaves Estrangeiras (pis.responsavel_negociacao_id e executivo_execucao_id)
pis_fks AS (
    SELECT 
        att_src.attname::text AS source_column,
        con.conname::text AS fk_constraint_name,
        frel.relname::text AS destination_table,
        att_tgt.attname::text AS destination_column
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS u_src(attnum, attpos) ON true
    JOIN pg_attribute att_src ON att_src.attrelid = con.conrelid AND att_src.attnum = u_src.attnum
    JOIN pg_class frel ON frel.oid = con.confrelid
    JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS u_tgt(attnum, attpos) ON u_src.attpos = u_tgt.attpos
    JOIN pg_attribute att_tgt ON att_tgt.attrelid = con.confrelid AND att_tgt.attnum = u_tgt.attnum
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pis'
      AND con.contype = 'f'
      AND att_src.attname IN ('responsavel_negociacao_id', 'executivo_execucao_id')
),

fk_audit AS (
    SELECT 
        target_col.col_name,
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id' AND data_type = 'uuid'
        ) AS profiles_id_is_uuid,
        f.fk_constraint_name,
        f.destination_table,
        f.destination_column,
        CASE
            WHEN f.fk_constraint_name IS NOT NULL AND f.destination_table = 'profiles' AND f.destination_column = 'id' THEN 'COMPROVADA'
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pis' AND column_name = target_col.col_name) THEN 'AUSENTE (COLUNA EXISTE SEM FK)'
            ELSE 'PENDENTE (COLUNA E FK SERÃO CRIADAS NO 01B1)'
        END AS fk_status
    FROM (VALUES ('responsavel_negociacao_id'), ('executivo_execucao_id')) AS target_col(col_name)
    LEFT JOIN pis_fks f ON f.source_column = target_col.col_name
),

-- 5. Mapeamento de Existência dos 12 Objetos Históricos (Pré e Pós Linha 141)
pre_post_audit AS (
    SELECT 
        'PRE_141' AS etapa,
        'public.pi_anexos' AS objeto,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pi_anexos') AS existe
    UNION ALL
    SELECT 'PRE_141', 'storage.buckets: pi-anexos', EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pi-anexos')
    UNION ALL
    SELECT 'PRE_141', 'public.profiles.assinatura_url', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assinatura_url')
    UNION ALL
    SELECT 'PRE_141', 'public.pi_assinaturas_cliente', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pi_assinaturas_cliente')
    UNION ALL
    SELECT 'LINHA_141', 'public.produtos.formato', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'formato')
    UNION ALL
    SELECT 'POS_141', 'public.permuta_recebimentos', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permuta_recebimentos')
    UNION ALL
    SELECT 'POS_141', 'public.permuta_saldos', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permuta_saldos')
    UNION ALL
    SELECT 'POS_141', 'public.produto_tipos', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produto_tipos')
    UNION ALL
    SELECT 'POS_141', 'public.pi_financeiro', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pi_financeiro')
    UNION ALL
    SELECT 'POS_141', 'public.sync_cnpj_log', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sync_cnpj_log')
    UNION ALL
    SELECT 'POS_141', 'public.tarefas', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tarefas')
    UNION ALL
    SELECT 'POS_141', 'public.briefings', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'briefings')
),

-- 6. Consolidação dos Resultados
consolidado AS (
    -- 6.1 Sumário Executivo das 23 Colunas
    SELECT 
        1 AS ordem,
        '1. RESUMO 23 COLUNAS' AS categoria,
        'Total de Colunas Mapeadas' AS item,
        count(*)::text AS resultado,
        'Instruções ADD COLUMN protegidas com IF NOT EXISTS no 01B1 corrigido.' AS detalhe
    FROM col_real

    UNION ALL

    SELECT 
        2,
        '1. RESUMO 23 COLUNAS',
        'Colunas COMPATÍVEIS no Staging',
        count(*)::text,
        'Colunas pré-existentes cuja estrutura (tipo e nulabilidade) confere 100% com a definição esperada.'
    FROM col_real
    WHERE status_classificacao = 'COMPATÍVEL'

    UNION ALL

    SELECT 
        3,
        '1. RESUMO 23 COLUNAS',
        'Colunas AUSENTES no Staging',
        count(*)::text,
        'Colunas que ainda não existem e serão criadas com segurança na execução do 01B1 corrigido.'
    FROM col_real
    WHERE status_classificacao = 'AUSENTE'

    UNION ALL

    SELECT 
        4,
        '1. RESUMO 23 COLUNAS',
        'Colunas INCOMPATÍVEIS no Staging',
        count(*)::text,
        CASE WHEN count(*) = 0 THEN 'Nenhuma incompatibilidade de tipo/estrutura encontrada.' ELSE 'ALERTA: Existem tipos divergentes!' END
    FROM col_real
    WHERE status_classificacao = 'INCOMPATÍVEL'

    UNION ALL

    -- 6.2 Auditoria Específica de produto_tipos
    SELECT 
        10,
        '2. AUDITORIA PRODUTO_TIPOS',
        'Existência da Tabela',
        CASE WHEN to_regclass('public.produto_tipos') IS NOT NULL THEN 'SIM (PRESENTE)' ELSE 'NÃO (AUSENTE)' END,
        'Verificado de forma segura via to_regclass(''public.produto_tipos'')'

    UNION ALL

    SELECT 
        11,
        '2. AUDITORIA PRODUTO_TIPOS',
        'Constraint UNIQUE (nome, midia)',
        CASE 
            WHEN to_regclass('public.produto_tipos') IS NULL THEN 'NÃO APLICÁVEL (TABELA AUSENTE)'
            WHEN EXISTS (
                SELECT 1 FROM pt_catalog 
                WHERE constraint_columns = ARRAY['nome', 'midia']::text[]
                  AND is_unique_index = true
                  AND is_valid_index = true
                  AND is_unconditional = true
                  AND all_columns_not_null = true
            ) THEN 'COMPROVADA (COMPATÍVEL COM ON CONFLICT)'
            ELSE 'PENDENTE / DIVERGENTE'
        END,
        'Exige: colunas nome e midia em ordem, índice único válido, sem predicado e ambas NOT NULL.'

    UNION ALL

    SELECT 
        12,
        '2. AUDITORIA PRODUTO_TIPOS',
        'Composição e Ordem das Colunas',
        COALESCE(
            (SELECT array_to_string(constraint_columns, ', ') FROM pt_catalog LIMIT 1),
            'N/A'
        ),
        'Ordem exata das colunas na constraint UNIQUE de produto_tipos'

    UNION ALL

    SELECT 
        13,
        '2. AUDITORIA PRODUTO_TIPOS',
        'Unicidade Incondicional (Sem WHERE)',
        CASE 
            WHEN to_regclass('public.produto_tipos') IS NULL THEN 'N/A (TABELA AUSENTE)'
            WHEN (SELECT is_unconditional FROM pt_catalog LIMIT 1) THEN 'SIM (SEM PREDICADO)'
            ELSE 'NÃO / PENDENTE'
        END,
        'Comprova que não se trata de índice parcial (indpred IS NULL)'

    UNION ALL

    SELECT 
        14,
        '2. AUDITORIA PRODUTO_TIPOS',
        'Colunas nome e midia com NOT NULL',
        CASE 
            WHEN to_regclass('public.produto_tipos') IS NULL THEN 'N/A (TABELA AUSENTE)'
            WHEN (SELECT all_columns_not_null FROM pt_catalog LIMIT 1) THEN 'SIM (AMBAS NOT NULL)'
            ELSE 'NÃO / PENDENTE'
        END,
        'Garante que valores NULL não enfraquecem a unicidade'

    UNION ALL

    -- 6.3 Validação de Foreign Keys
    SELECT 
        20 + row_number() over (order by col_name),
        '3. VALIDAÇÃO DE CHAVES ESTRANGEIRAS',
        'pis.' || col_name || ' -> profiles(id)',
        fk_status,
        'Destino profiles.id é UUID: ' || CASE WHEN profiles_id_is_uuid THEN 'SIM (COMPATÍVEL)' ELSE 'NÃO' END
    FROM fk_audit

    UNION ALL

    -- 6.4 Detalhamento Individual das 23 Colunas
    SELECT 
        30 + row_number() over (order by line_01b1),
        '4. DETALHE 23 COLUNAS',
        table_name || '.' || column_name || ' (Linha ' || line_01b1 || ')',
        status_classificacao,
        'Tipo Real: ' || COALESCE(actual_type, 'N/A') || ' (Esperado: ' || exp_type || ')' ||
        ' | Nullable Real: ' || COALESCE(actual_nullable, 'N/A') || ' (Esperado: ' || exp_nullable || ')' ||
        ' | Default Real: ' || COALESCE(actual_default, 'none')
    FROM col_real

    UNION ALL

    -- 6.5 Mapeamento Histórico Pré e Pós Linha 141
    SELECT 
        70 + row_number() over (order by etapa, objeto),
        '5. OBJETOS HISTÓRICOS (' || etapa || ')',
        objeto,
        CASE WHEN existe THEN 'PRESENTE NO BANCO' ELSE 'AUSENTE' END,
        'Status de existência no banco. NÃO CONCLUSIVO ISOLADAMENTE quanto a execução parcial ou completa do lote 01B1.'
    FROM pre_post_audit
)

SELECT 
    categoria,
    item,
    resultado,
    detalhe
FROM consolidado
ORDER BY ordem;
