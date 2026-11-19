-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO PRÉ-EXECUÇÃO DO LOTE 01B1 CORRIGIDO
-- Arquivo: diagnostico_pre_execucao_01B1_corrigido.sql
-- Objetivo: Validar estruturalmente as 23 colunas, a integridade da tabela
--           produto_tipos (constraint UNIQUE, nulos, duplicatas) e o estado
--           atual dos objetos pré/pós linha 141 no Supabase Staging.
-- Natureza: ESTRITAMENTE LEITURA (READ-ONLY) — Zero DDL, Zero DML.
-- Ambiente: Supabase Staging (wsologhmptielhhnbgob) / PostgreSQL 17.11
-- ==============================================================================

WITH 
-- 1. Auditoria Estrutural das 23 Colunas Modificadas
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

col_real AS (
    SELECT 
        e.line_01b1,
        e.table_name,
        e.column_name,
        e.exp_type,
        e.exp_nullable,
        e.exp_default,
        e.exp_fk,
        CASE WHEN c.column_name IS NOT NULL THEN true ELSE false END AS exists_in_db,
        c.data_type AS actual_type,
        c.is_nullable AS actual_nullable,
        c.column_default AS actual_default
    FROM col_expected e
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public' 
     AND c.table_name = e.table_name 
     AND c.column_name = e.column_name
),

-- 2. Auditoria da Tabela produto_tipos (Constraint UNIQUE, Nulos, Duplicatas)
pt_info AS (
    SELECT
        EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'produto_tipos'
        ) AS table_exists,
        EXISTS (
            SELECT 1 FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE nsp.nspname = 'public'
              AND rel.relname = 'produto_tipos'
              AND con.contype = 'u'
        ) AS has_unique_constraint,
        (
            SELECT count(*) 
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE nsp.nspname = 'public'
              AND rel.relname = 'produto_tipos'
              AND con.contype = 'u'
        ) AS unique_constraint_count,
        COALESCE(
            (SELECT count(*) FROM public.produto_tipos), 
            0
        ) AS total_rows
),

-- 3. Auditoria de Objetos Pré-Linha 141 e Pós-Linha 141
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

-- 4. Consolidação das Saídas para Apresentação
consolidado AS (
    -- 4.1 Resumo Executivo da Auditoria de Colunas
    SELECT 
        1 AS ordem,
        '1. RESUMO EXECUTIVO' AS secao,
        'Total de Colunas Auditadas' AS parametro,
        count(*)::text AS valor,
        'Total de instruções ADD COLUMN protegidas com IF NOT EXISTS no script 01B1 corrigido.' AS observacao
    FROM col_real

    UNION ALL

    SELECT 
        2,
        '1. RESUMO EXECUTIVO',
        'Colunas Já Existentes no Staging',
        count(*)::text,
        'Colunas pré-existentes de migrações históricas. O comando ADD COLUMN IF NOT EXISTS ignorará com segurança.'
    FROM col_real
    WHERE exists_in_db = true

    UNION ALL

    SELECT 
        3,
        '1. RESUMO EXECUTIVO',
        'Colunas Ausentes no Staging',
        count(*)::text,
        'Colunas que serão criadas de forma segura e idempotente pelo 01B1 corrigido.'
    FROM col_real
    WHERE exists_in_db = false

    UNION ALL

    -- 4.2 Status de produto_tipos
    SELECT 
        10,
        '2. AUDITORIA PRODUTO_TIPOS',
        'Tabela Existe',
        CASE WHEN table_exists THEN 'SIM' ELSE 'NÃO' END,
        'Verificação no information_schema.tables'
    FROM pt_info

    UNION ALL

    SELECT 
        11,
        '2. AUDITORIA PRODUTO_TIPOS',
        'Constraint UNIQUE Presente',
        CASE WHEN has_unique_constraint THEN 'SIM (COMPROVADA)' ELSE 'AUSENTE / PENDENTE' END,
        'Exigida pela cláusula ON CONFLICT (nome, midia) DO NOTHING'
    FROM pt_info

    UNION ALL

    SELECT 
        12,
        '2. AUDITORIA PRODUTO_TIPOS',
        'Total de Registros Atuais',
        total_rows::text,
        'Registros atualmente gravados na tabela public.produto_tipos'
    FROM pt_info

    UNION ALL

    -- 4.3 Detalhamento Individual das 23 Colunas
    SELECT 
        20 + row_number() over (order by line_01b1),
        '3. DETALHE 23 COLUNAS',
        table_name || '.' || column_name || ' (L' || line_01b1 || ')',
        CASE 
            WHEN exists_in_db THEN 'PRESENTE'
            ELSE 'AUSENTE'
        END,
        'Tipo: ' || COALESCE(actual_type, exp_type) || 
        ' | Nullable: ' || COALESCE(actual_nullable, exp_nullable) || 
        ' | Default: ' || COALESCE(actual_default, exp_default, 'none') ||
        ' | Status: ' || CASE WHEN exists_in_db THEN 'IGNORARÁ COM SEGURANÇA' ELSE 'SERÁ CRIADA' END
    FROM col_real

    UNION ALL

    -- 4.4 Objetos Pré/Pós Linha 141
    SELECT 
        50 + row_number() over (order by etapa, objeto),
        '4. OBJETOS HISTÓRICOS (' || etapa || ')',
        objeto,
        CASE WHEN existe THEN 'PRESENTE' ELSE 'AUSENTE' END,
        'Verificação de impacto ou remanescência da tentativa anterior'
    FROM pre_post_audit
)

SELECT 
    secao,
    parametro,
    valor,
    observacao
FROM consolidado
ORDER BY ordem;

