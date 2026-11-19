-- ==============================================================================
-- MIDIA OS v2.6.0 — SCRIPT DE DIAGNÓSTICO DE RECONCILIAÇÃO DO STAGING
-- Arquivo: diagnostico_reconciliacao_01B1.sql
-- Objetivo: Inspecionar o estado real dos objetos investigados após erro 42701,
--           sem assumir premissas de tábula rasa ou rollback automático.
-- Natureza: ESTRITAMENTE LEITURA (READ-ONLY) — Zero DDL, Zero DML.
-- Ambiente: Supabase Staging (wsologhmptielhhnbgob) / PostgreSQL 17.11
-- ==============================================================================

WITH 
-- 1. Verificação das 9 Tabelas Principais Investigadas
tab_audit AS (
    SELECT 
        t.table_name,
        EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t.table_name
        ) AS exists_in_db,
        (
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = t.table_name
        ) AS col_count,
        (
            SELECT count(*) 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t.table_name
        ) AS rls_policy_count,
        (
            SELECT count(*) 
            FROM pg_trigger tr
            JOIN pg_class cl ON cl.oid = tr.tgrelid
            JOIN pg_namespace ns ON ns.oid = cl.relnamespace
            WHERE ns.nspname = 'public' 
              AND cl.relname = t.table_name 
              AND NOT tr.tgisinternal
        ) AS trigger_count
    FROM (
        VALUES 
            ('pi_anexos'),
            ('pi_assinaturas_cliente'),
            ('permuta_recebimentos'),
            ('permuta_saldos'),
            ('produto_tipos'),
            ('pi_financeiro'),
            ('sync_cnpj_log'),
            ('tarefas'),
            ('briefings')
    ) AS t(table_name)
),

-- 2. Verificação das Colunas Investigadas (Foco em ALTER TABLE com e sem IF NOT EXISTS)
col_audit AS (
    SELECT 
        c.table_name,
        c.column_name,
        c.expected_type,
        c.has_if_not_exists_in_01b1,
        c.line_in_01b1,
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = c.table_name 
              AND column_name = c.column_name
        ) AS exists_in_db,
        (
            SELECT data_type || COALESCE('(' || character_maximum_length || ')', '')
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = c.table_name 
              AND column_name = c.column_name
        ) AS actual_type
    FROM (
        VALUES 
            -- Coluna onde disparou o erro 42701
            ('produtos', 'formato', 'text', false, 141),
            -- Colunas com ALTER TABLE imediato posterior (sem IF NOT EXISTS em 01B1)
            ('agencias', 'website', 'text', false, 148),
            ('agencias', 'instagram', 'text', false, 149),
            ('agencias', 'linkedin', 'text', false, 150),
            ('agencias', 'facebook', 'text', false, 151),
            ('clientes', 'website', 'text', false, 154),
            ('clientes', 'instagram', 'text', false, 155),
            ('clientes', 'linkedin', 'text', false, 156),
            ('clientes', 'facebook', 'text', false, 157),
            -- Colunas pré-linha 141
            ('profiles', 'assinatura_url', 'text', true, 89),
            ('pis', 'email_faturamento', 'text', true, 168),
            -- Outras colunas sem IF NOT EXISTS posteriores em 01B1
            ('email_send_log', 'message_id', 'text', false, 242),
            ('email_send_state', 'batch_size', 'integer', false, 276),
            ('pi_itens', 'mes', 'integer', false, 599),
            ('pi_itens', 'ano', 'integer', false, 600),
            ('proposta_itens', 'mes', 'integer', false, 617),
            ('proposta_itens', 'ano', 'integer', false, 618),
            ('pis', 'vencimento_tipo', 'text', false, 625),
            ('proposta_itens', 'horario', 'text', false, 712),
            ('pi_itens', 'horario', 'text', false, 715),
            ('pis', 'responsavel_negociacao_id', 'uuid', false, 1200),
            ('pis', 'executivo_execucao_id', 'uuid', false, 1201),
            -- Colunas com IF NOT EXISTS posteriores em 01B1
            ('produtos', 'link_modelo', 'text', true, 813),
            ('produtos', 'requer_producao', 'boolean', true, 975),
            ('briefings', 'produtos', 'ARRAY', true, 1157),
            ('briefings', 'motivo_recusa', 'text', true, 1192),
            ('briefings', 'distribuicao_entregas', 'text', true, 1193)
    ) AS c(table_name, column_name, expected_type, has_if_not_exists_in_01b1, line_in_01b1)
),

-- 3. Verificação do Bucket de Storage pi-anexos
bucket_audit AS (
    SELECT 
        'pi-anexos' AS bucket_name,
        EXISTS (
            SELECT 1 FROM storage.buckets WHERE id = 'pi-anexos'
        ) AS exists_in_db,
        (
            SELECT count(*) 
            FROM pg_policies 
            WHERE schemaname = 'storage' 
              AND tablename = 'objects' 
              AND policyname LIKE '%pi-anexos%'
        ) AS storage_policy_count
),

-- 4. Consolidação Geral dos Objetos
consolidado AS (
    -- Sumário Executivo / Diagnóstico Reconciliado
    SELECT 
        1 AS ordem,
        '0. RESUMO RECONCILIAÇÃO' AS grupo,
        'Classificação Empírica do Estado' AS item,
        'NÃO CONCLUSIVO (ORIGEM INDETERMINADA)' AS status_staging,
        'Tabelas e colunas existem no banco, mas sua presença decorre de migrations históricas (Mai/Jun 2026), NÃO de execução completa do lote 01B1.' AS detalhes

    UNION ALL

    SELECT 
        2,
        '0. RESUMO RECONCILIAÇÃO',
        'Causa Raiz do Erro 42701',
        'FALHA DE IDEMPOTÊNCIA NA LINHA 141',
        'Linha 141 executou "ALTER TABLE public.produtos ADD COLUMN formato TEXT;" sem IF NOT EXISTS. A coluna já existia da migration 20260603175430.'

    UNION ALL

    SELECT 
        3,
        '0. RESUMO RECONCILIAÇÃO',
        'Validação da Classificação Anterior',
        'PREMISSA DE TÁBULA RASA INVÁLIDA',
        'O diagnóstico anterior presumiu que objetos pós-linha 141 só existiriam se o 01B1 completasse. Como eles já existiam do histórico, o diagnóstico gerou falso-positivo.'

    UNION ALL

    -- Status das 9 Tabelas
    SELECT 
        10 + row_number() over (order by table_name),
        '1. TABELAS INVESTIGADAS (9)',
        'public.' || table_name,
        CASE 
            WHEN exists_in_db THEN 'PRESENTE (ORIGEM INDETERMINADA: MIGRATION HISTÓRICA OU 01B1)'
            ELSE 'AUSENTE'
        END,
        'Colunas: ' || col_count || ' | Triggers: ' || trigger_count || ' | RLS Policies: ' || rls_policy_count
    FROM tab_audit

    UNION ALL

    -- Status do Storage Bucket
    SELECT 
        30,
        '2. STORAGE BUCKET (1)',
        'storage.buckets: ' || bucket_name,
        CASE 
            WHEN exists_in_db THEN 'PRESENTE (ORIGEM INDETERMINADA: MIGRATION HISTÓRICA OU 01B1)'
            ELSE 'AUSENTE'
        END,
        'Políticas de Storage ativas: ' || storage_policy_count
    FROM bucket_audit

    UNION ALL

    -- Status das Colunas Críticas
    SELECT 
        40 + row_number() over (order by line_in_01b1, table_name, column_name),
        '3. COLUNAS CRÍTICAS (ALTER TABLE)',
        table_name || '.' || column_name || ' (Linha ' || line_in_01b1 || ')',
        CASE 
            WHEN exists_in_db THEN 'PRESENTE'
            ELSE 'AUSENTE'
        END,
        'Tipo Atual: ' || COALESCE(actual_type, 'N/A') || 
        ' | Tipo Esperado: ' || expected_type || 
        ' | IF NOT EXISTS no script: ' || CASE WHEN has_if_not_exists_in_01b1 THEN 'SIM' ELSE 'NÃO (VULNERÁVEL A 42701)' END
    FROM col_audit
)

SELECT 
    grupo,
    item,
    status_staging,
    detalhes
FROM consolidado
ORDER BY ordem;

