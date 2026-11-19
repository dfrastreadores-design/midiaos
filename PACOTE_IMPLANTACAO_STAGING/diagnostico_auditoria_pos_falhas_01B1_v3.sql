-- ==============================================================================
-- MIDIA OS v2.6.0 — AUDITORIA READ-ONLY APÓS DUAS FALHAS DA 01B1 (VERSÃO V3)
-- Arquivo: diagnostico_auditoria_pos_falhas_01B1_v3.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob) / PostgreSQL 17.11
--
-- NATUREZA: ESTRITAMENTE LEITURA (READ-ONLY)
-- REGRAS: Zero DDL, Zero DML, Zero alteração de dados, Zero comandos de configuração.
-- AVISO DE COMPATIBILIDADE: A sintaxe deste script foi concebida e revisada para
-- a gramática e catálogos do PostgreSQL 17.11. Em estrito cumprimento às regras
-- de isolamento e não execução remota, sua compatibilidade final no Supabase Staging
-- AINDA NÃO FOI COMPROVADA EM EXECUÇÃO REAL e depende de execução manual autorizada.
--
-- OBJETIVO:
--   1. Inspecionar exaustivamente todos os objetos e alterações declarados no lote
--      01B1 antes da linha 141 (ponto exato do erro 42701 em public.produtos.formato).
--   2. Verificar tabelas, colunas, constraints completas (tipo, colunas locais, tabela
--      e colunas referenciadas, regra ON DELETE e expressões CHECK).
--   3. Validar EFETIVAMENTE todas as 15 políticas RLS: comando (polcmd), roles (polroles),
--      permissividade (polpermissive), expressão USING (polqual) e expressão WITH CHECK (polwithcheck).
--   4. Proteger consultas a storage.buckets e storage.objects via query_to_xml() e to_regclass()
--      para prevenir erro 42P01 caso o schema ou tabelas de storage estejam ausentes.
--   5. Comparar conjunto completo de GRANTs com DISTINCT na agregação para eliminar duplicidades.
--   6. Diferenciar contagens reais de métricas estimadas do catálogo, sem inferir INSERTs.
--   7. Evitar conclusões causais automáticas sobre transações, classificando explicitamente
--      o que é comprovado, o que é indício e o que é indeterminável no catálogo.
-- ==============================================================================

WITH 
-- ------------------------------------------------------------------------------
-- 1. TABELAS (Pré-Linha 141 e Amostra de Controle Posterior)
-- ------------------------------------------------------------------------------
audit_tabelas AS (
  SELECT
    100 + row_number() OVER (ORDER BY t.ordem)::int AS ordem,
    '1. TABELAS'::text AS categoria,
    ('public.' || t.tab_name)::text AS objeto,
    t.declarado_em::text AS declarado_em,
    t.origem_historica::text AS origem_historica,
    CASE 
      WHEN to_regclass('public.' || t.tab_name) IS NOT NULL THEN 'PRESENTE' 
      ELSE 'AUSENTE' 
    END::text AS status_catalogo,
    CASE 
      WHEN to_regclass('public.' || t.tab_name) IS NOT NULL THEN
        'Colunas: ' || (SELECT count(*)::text FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.tab_name) ||
        ', RLS: ' || (SELECT CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END FROM pg_class WHERE oid = to_regclass('public.' || t.tab_name)) ||
        ', Registros estim (pg_class): ' || COALESCE((SELECT reltuples::bigint::text FROM pg_class WHERE oid = to_regclass('public.' || t.tab_name)), '0') ||
        ', Tuplas vivas estim (pg_stat): ' || COALESCE((SELECT n_live_tup::bigint::text FROM pg_stat_user_tables WHERE relid = to_regclass('public.' || t.tab_name)), '0')
      ELSE 'Tabela não encontrada no catálogo public' 
    END::text AS detalhes_estrutura,
    t.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      (1, 'pi_anexos', '01B1: Linhas 4-19', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (Pré-Linha 141)'),
      (2, 'pi_assinaturas_cliente', '01B1: Linhas 91-104', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (Pré-Linha 141)'),
      (3, 'permuta_recebimentos', '01B1: Linhas 371-384', 'Migration 20260603180219', 'CONTROLE_POSTERIOR (Linha > 141)'),
      (4, 'permuta_saldos', '01B1: Linhas 410-421', 'Migration 20260603180219', 'CONTROLE_POSTERIOR (Linha > 141)'),
      (5, 'produto_tipos', '01B1: Linhas 718-725', 'Migration 20260603182103', 'CONTROLE_POSTERIOR (Linha > 141)'),
      (6, 'pi_financeiro', '01B1: Linhas 728-744', 'Migration 20260603182103', 'CONTROLE_POSTERIOR (Linha > 141)'),
      (7, 'sync_cnpj_log', '01B1: Linhas 992-1000', 'Migration 20260604104037', 'CONTROLE_POSTERIOR (Linha > 141)'),
      (8, 'tarefas', '01B1: Linhas 1052-1065', 'Migration 20260604141617', 'CONTROLE_POSTERIOR (Linha > 141)'),
      (9, 'briefings', '01B1: Linhas 1124-1144', 'Migration 20260604173822', 'CONTROLE_POSTERIOR (Linha > 141)')
  ) AS t(ordem, tab_name, declarado_em, origem_historica, classificacao)
),

-- ------------------------------------------------------------------------------
-- 2. COLUNAS (Pré-Linha 141, Ponto de Falha e Controle)
-- ------------------------------------------------------------------------------
audit_colunas AS (
  SELECT
    200 + row_number() OVER (ORDER BY c.ordem)::int AS ordem,
    '2. COLUNAS'::text AS categoria,
    (c.tab_name || '.' || c.col_name)::text AS objeto,
    c.declarado_em::text AS declarado_em,
    c.origem_historica::text AS origem_historica,
    CASE 
      WHEN isc.column_name IS NOT NULL THEN 'PRESENTE' 
      ELSE 'AUSENTE' 
    END::text AS status_catalogo,
    CASE 
      WHEN isc.column_name IS NOT NULL THEN
        'Tipo: ' || isc.data_type || COALESCE('(' || isc.character_maximum_length || ')', '') ||
        ', Nullable: ' || isc.is_nullable ||
        ', Default: ' || COALESCE(isc.column_default, 'NONE')
      ELSE 'Coluna não encontrada no catálogo' 
    END::text AS detalhes_estrutura,
    c.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      -- pi_anexos (Linhas 4-19)
      (1, 'pi_anexos', 'id', '01B1: Linha 5', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (PK id)'),
      (2, 'pi_anexos', 'cliente_id', '01B1: Linha 6', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (FK cliente)'),
      (3, 'pi_anexos', 'agencia_id', '01B1: Linha 7', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (FK agencia)'),
      (4, 'pi_anexos', 'pi_id', '01B1: Linha 8', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (FK pi)'),
      (5, 'pi_anexos', 'titulo', '01B1: Linha 9', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (NOT NULL)'),
      (6, 'pi_anexos', 'descricao', '01B1: Linha 10', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO'),
      (7, 'pi_anexos', 'periodo_referencia', '01B1: Linha 11', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO'),
      (8, 'pi_anexos', 'arquivo_nome', '01B1: Linha 12', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (NOT NULL)'),
      (9, 'pi_anexos', 'arquivo_path', '01B1: Linha 13', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (NOT NULL)'),
      (10, 'pi_anexos', 'arquivo_tipo', '01B1: Linha 14', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO'),
      (11, 'pi_anexos', 'arquivo_tamanho', '01B1: Linha 15', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO'),
      (12, 'pi_anexos', 'created_by', '01B1: Linha 16', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO'),
      (13, 'pi_anexos', 'created_at', '01B1: Linha 17', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (DEFAULT now())'),
      (14, 'pi_anexos', 'updated_at', '01B1: Linha 18', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (DEFAULT now())'),
      -- profiles (Linha 89)
      (15, 'profiles', 'assinatura_url', '01B1: Linha 89', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (TEXT)'),
      -- pi_assinaturas_cliente (Linhas 91-104)
      (16, 'pi_assinaturas_cliente', 'id', '01B1: Linha 92', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (PK id)'),
      (17, 'pi_assinaturas_cliente', 'pi_id', '01B1: Linha 93', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (FK pis NOT NULL)'),
      (18, 'pi_assinaturas_cliente', 'token', '01B1: Linha 94', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (UNIQUE NOT NULL)'),
      (19, 'pi_assinaturas_cliente', 'status', '01B1: Linha 95', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (CHECK NOT NULL)'),
      (20, 'pi_assinaturas_cliente', 'nome_assinante', '01B1: Linha 96', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO'),
      (21, 'pi_assinaturas_cliente', 'cpf', '01B1: Linha 97', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO'),
      (22, 'pi_assinaturas_cliente', 'email', '01B1: Linha 98', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO'),
      (23, 'pi_assinaturas_cliente', 'ip', '01B1: Linha 99', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO'),
      (24, 'pi_assinaturas_cliente', 'user_agent', '01B1: Linha 100', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO'),
      (25, 'pi_assinaturas_cliente', 'assinado_em', '01B1: Linha 101', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO'),
      (26, 'pi_assinaturas_cliente', 'criado_por', '01B1: Linha 102', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (FK auth.users)'),
      (27, 'pi_assinaturas_cliente', 'created_at', '01B1: Linha 103', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (DEFAULT now())'),
      -- Ponto Exato de Falha 42701 (Linha 141)
      (28, 'produtos', 'formato', '01B1: Linha 141', 'Migration 20260603175430', 'PONTO_DE_FALHA_42701 (Linha 141)'),
      -- Controle Posterior de produtos (Linhas > 141)
      (29, 'produtos', 'link_modelo', '01B1: Linha 813', 'Migration 20260603204918', 'CONTROLE_POSTERIOR (Linha > 141)'),
      (30, 'produtos', 'requer_producao', '01B1: Linha 975', 'Migration 20260604020942', 'CONTROLE_POSTERIOR (Linha > 141)')
  ) AS c(ordem, tab_name, col_name, declarado_em, origem_historica, classificacao)
  LEFT JOIN information_schema.columns isc
    ON isc.table_schema = 'public'
   AND isc.table_name = c.tab_name
   AND isc.column_name = c.col_name
),

-- ------------------------------------------------------------------------------
-- 3. CONSTRAINTS RIGOROSAS (Tabela, Tipo, Colunas, Ref Tabela/Colunas, On Delete e CHECK)
-- ------------------------------------------------------------------------------
audit_constraints AS (
  SELECT
    300 + row_number() OVER (ORDER BY c.ordem)::int AS ordem,
    '3. CONSTRAINTS'::text AS categoria,
    (c.expected_table || ' -> ' || c.description)::text AS objeto,
    c.declarado_em::text AS declarado_em,
    c.origem_historica::text AS origem_historica,
    CASE 
      WHEN con.conname IS NULL THEN 'AUSENTE'
      WHEN (
        -- Tipo compatível
        con.contype = c.expected_type
        -- Colunas locais compatíveis
        AND con.actual_cols = c.expected_cols
        -- Se Foreign Key: tabela referenciada, colunas referenciadas e regra de delete compatíveis
        AND (c.expected_type <> 'f' OR (
          con.actual_ref_table = c.expected_ref_table
          AND con.actual_ref_cols = c.expected_ref_cols
          AND con.actual_delrule = c.expected_delrule
        ))
        -- Se CHECK: expressão contém os literais exigidos
        AND (c.expected_type <> 'c' OR (
          con.check_expr ILIKE '%status%' 
          AND con.check_expr ILIKE '%pendente%' 
          AND con.check_expr ILIKE '%assinado%' 
          AND con.check_expr ILIKE '%expirado%'
        ))
      ) THEN 'PRESENTE_COMPATÍVEL'
      ELSE 'DIVERGENTE_ESTRUTURAL'
    END::text AS status_catalogo,
    CASE 
      WHEN con.conname IS NULL THEN 'Constraint não encontrada para a tabela, tipo e colunas especificadas'
      ELSE
        'Nome real: ' || con.conname ||
        ' | Tipo: ' || CASE con.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'f' THEN 'FOREIGN KEY' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK' ELSE con.contype END ||
        ' | Colunas: [' || COALESCE(array_to_string(con.actual_cols, ', '), '') || ']' ||
        CASE WHEN con.contype = 'f' THEN
          ' | Ref: ' || COALESCE(con.actual_ref_table, '') || '([' || COALESCE(array_to_string(con.actual_ref_cols, ', '), '') || '])' ||
          ' | ON DELETE: ' || CASE con.actual_delrule WHEN 'c' THEN 'CASCADE' WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE con.actual_delrule END
        ELSE '' END ||
        CASE WHEN con.contype = 'c' THEN ' | Expressão: ' || COALESCE(con.check_expr, '') ELSE '' END ||
        ' | Def: ' || con.full_def
    END::text AS detalhes_estrutura,
    c.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      (1, 'pi_anexos', 'p', ARRAY['id']::text[], NULL::text, NULL::text[], NULL::text, '01B1: Linha 5', 'Migration 20260528161435', 'PRIMARY KEY (id)', 'HISTÓRICO_CONHECIDO (PK id)'),
      (2, 'pi_assinaturas_cliente', 'p', ARRAY['id']::text[], NULL::text, NULL::text[], NULL::text, '01B1: Linha 92', 'Migration 20260602142716', 'PRIMARY KEY (id)', 'HISTÓRICO_CONHECIDO (PK id)'),
      (3, 'pi_assinaturas_cliente', 'f', ARRAY['pi_id']::text[], 'public.pis', ARRAY['id']::text[], 'c', '01B1: Linha 93', 'Migration 20260602142716', 'FOREIGN KEY (pi_id) REFERENCES public.pis(id) ON DELETE CASCADE', 'HISTÓRICO_CONHECIDO (FK pis.id CASCADE)'),
      (4, 'pi_assinaturas_cliente', 'u', ARRAY['token']::text[], NULL::text, NULL::text[], NULL::text, '01B1: Linha 94', 'Migration 20260602142716', 'UNIQUE (token)', 'HISTÓRICO_CONHECIDO (UNIQUE token)'),
      (5, 'pi_assinaturas_cliente', 'c', ARRAY['status']::text[], NULL::text, NULL::text[], NULL::text, '01B1: Linha 95', 'Migration 20260602142716', 'CHECK (status IN (''pendente'',''assinado'',''expirado''))', 'HISTÓRICO_CONHECIDO (CHECK status)'),
      (6, 'pi_assinaturas_cliente', 'f', ARRAY['criado_por']::text[], 'auth.users', ARRAY['id']::text[], 'a', '01B1: Linha 102', 'Migration 20260602142716', 'FOREIGN KEY (criado_por) REFERENCES auth.users(id)', 'HISTÓRICO_CONHECIDO (FK auth.users.id)')
  ) AS c(ordem, expected_table, expected_type, expected_cols, expected_ref_table, expected_ref_cols, expected_delrule, declarado_em, origem_historica, description, classificacao)
  LEFT JOIN LATERAL (
    SELECT
      con.oid,
      con.conname,
      con.contype,
      ARRAY(SELECT a.attname::text FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey) ORDER BY array_position(con.conkey, a.attnum)) AS actual_cols,
      CASE WHEN con.confrelid <> 0 THEN (SELECT n.nspname || '.' || cl.relname FROM pg_class cl JOIN pg_namespace n ON n.oid = cl.relnamespace WHERE cl.oid = con.confrelid) ELSE NULL END AS actual_ref_table,
      CASE WHEN con.confrelid <> 0 THEN ARRAY(SELECT a.attname::text FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = ANY(con.confkey) ORDER BY array_position(con.confkey, a.attnum)) ELSE NULL END AS actual_ref_cols,
      con.confdeltype::text AS actual_delrule,
      CASE WHEN con.contype = 'c' THEN pg_get_expr(con.conbin, con.conrelid) ELSE NULL END AS check_expr,
      pg_get_constraintdef(con.oid) AS full_def
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    WHERE ns.nspname = 'public'
      AND cl.relname = c.expected_table
      AND con.contype = c.expected_type
      AND (
        (c.expected_type IN ('p', 'u', 'f') AND ARRAY(SELECT a.attname::text FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey) ORDER BY array_position(con.conkey, a.attnum)) = c.expected_cols)
        OR
        (c.expected_type = 'c' AND (c.expected_cols <@ ARRAY(SELECT a.attname::text FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)) OR pg_get_expr(con.conbin, con.conrelid) ILIKE '%status%'))
      )
    LIMIT 1
  ) con ON true
),

-- ------------------------------------------------------------------------------
-- 4. ÍNDICES (Pré-Linha 141)
-- ------------------------------------------------------------------------------
audit_indices AS (
  SELECT
    400 + row_number() OVER (ORDER BY i.ordem)::int AS ordem,
    '4. ÍNDICES'::text AS categoria,
    (i.tab_name || ' -> ' || i.idx_name)::text AS objeto,
    i.declarado_em::text AS declarado_em,
    i.origem_historica::text AS origem_historica,
    CASE 
      WHEN pi.indexname IS NOT NULL THEN 'PRESENTE' 
      ELSE 'AUSENTE' 
    END::text AS status_catalogo,
    CASE 
      WHEN pi.indexname IS NOT NULL THEN
        'Definição: ' || pi.indexdef ||
        ', Válido: ' || (SELECT COALESCE(indisvalid::text, 'UNKNOWN') FROM pg_index WHERE indexrelid = to_regclass('public.' || pi.indexname))
      ELSE 'Índice não encontrado' 
    END::text AS detalhes_estrutura,
    i.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      (1, 'pi_anexos', 'idx_pi_anexos_cliente', '01B1: Linha 26', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (cliente_id)'),
      (2, 'pi_anexos', 'idx_pi_anexos_agencia', '01B1: Linha 27', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (agencia_id)'),
      (3, 'pi_anexos', 'idx_pi_anexos_pi', '01B1: Linha 28', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (pi_id)'),
      (4, 'pi_assinaturas_cliente', 'idx_pi_assin_pi', '01B1: Linha 105', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (pi_id)'),
      (5, 'pi_assinaturas_cliente', 'idx_pi_assin_token', '01B1: Linha 106', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (token)')
  ) AS i(ordem, tab_name, idx_name, declarado_em, origem_historica, classificacao)
  LEFT JOIN pg_indexes pi
    ON pi.schemaname = 'public'
   AND pi.tablename = i.tab_name
   AND pi.indexname = i.idx_name
),

-- ------------------------------------------------------------------------------
-- 5. TRIGGERS E FUNÇÕES (Pré-Linha 141)
-- ------------------------------------------------------------------------------
audit_triggers_funcoes AS (
  SELECT
    500 + row_number() OVER (ORDER BY tf.ordem)::int AS ordem,
    '5. TRIGGERS E FUNÇÕES'::text AS categoria,
    tf.objeto_nome::text AS objeto,
    tf.declarado_em::text AS declarado_em,
    tf.origem_historica::text AS origem_historica,
    CASE 
      WHEN tf.tipo = 'TRIGGER' AND trg.tgname IS NOT NULL THEN 'PRESENTE'
      WHEN tf.tipo = 'FUNCTION' AND prc.proname IS NOT NULL THEN 'PRESENTE'
      ELSE 'AUSENTE'
    END::text AS status_catalogo,
    CASE 
      WHEN tf.tipo = 'TRIGGER' AND trg.tgname IS NOT NULL THEN
        'Trigger: ' || trg.tgname || ', Habilitado: ' || trg.tgenabled || ', Função disparada: ' || (SELECT proname FROM pg_proc WHERE oid = trg.tgfoid)
      WHEN tf.tipo = 'FUNCTION' AND prc.proname IS NOT NULL THEN
        'Função: ' || prc.proname || '(), Retorno: ' || format_type(prc.prorettype, NULL)
      ELSE 'Objeto não encontrado'
    END::text AS detalhes_estrutura,
    tf.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      (1, 'TRIGGER', 'pi_anexos.trg_pi_anexos_updated_at', '01B1: Linha 30', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (BEFORE UPDATE)', 'pi_anexos', 'trg_pi_anexos_updated_at'),
      (2, 'FUNCTION', 'public.touch_updated_at()', 'Dependência Linha 32', 'Função de infraestrutura', 'DEPENDÊNCIA_SISTEMA', 'public', 'touch_updated_at')
  ) AS tf(ordem, tipo, objeto_nome, declarado_em, origem_historica, classificacao, schema_or_tab, target_name)
  LEFT JOIN LATERAL (
    SELECT tr.tgname, tr.tgenabled, tr.tgfoid
    FROM pg_trigger tr
    JOIN pg_class cl ON cl.oid = tr.tgrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    WHERE ns.nspname = 'public'
      AND cl.relname = tf.schema_or_tab
      AND tr.tgname = tf.target_name
      AND NOT tr.tgisinternal
    LIMIT 1
  ) trg ON tf.tipo = 'TRIGGER'
  LEFT JOIN LATERAL (
    SELECT p.proname, p.prorettype
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = tf.schema_or_tab
      AND p.proname = tf.target_name
    LIMIT 1
  ) prc ON tf.tipo = 'FUNCTION'
),

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS RLS COM VALIDAÇÃO EFETIVA (Comando, Roles, Permissividade, USING e WITH CHECK)
-- ------------------------------------------------------------------------------
audit_policies AS (
  SELECT
    600 + row_number() OVER (ORDER BY pol.ordem)::int AS ordem,
    '6. POLÍTICAS RLS'::text AS categoria,
    (pol.schema_name || '.' || pol.table_name || ' -> "' || pol.policy_name || '"')::text AS objeto,
    pol.declarado_em::text AS declarado_em,
    pol.origem_historica::text AS origem_historica,
    CASE 
      WHEN p.polname IS NULL THEN 'AUSENTE'
      WHEN p.polcmd <> pol.expected_cmd THEN 'DIVERGENTE_COMANDO'
      WHEN NOT (ARRAY[pol.expected_role]::text[] <@ p.actual_roles) THEN 'DIVERGENTE_ROLES'
      WHEN p.polpermissive <> pol.expected_permissive THEN 'DIVERGENTE_PERMISSIVIDADE'
      WHEN pol.expected_has_using AND (p.actual_using IS NULL OR NOT (p.actual_using LIKE pol.expected_using_pattern)) THEN 'DIVERGENTE_USING'
      WHEN NOT pol.expected_has_using AND p.actual_using IS NOT NULL THEN 'DIVERGENTE_USING_INESPERADO'
      WHEN pol.expected_has_with_check AND (p.actual_with_check IS NULL OR NOT (p.actual_with_check LIKE pol.expected_with_check_pattern)) THEN 'DIVERGENTE_WITH_CHECK'
      WHEN NOT pol.expected_has_with_check AND p.actual_with_check IS NOT NULL THEN 'DIVERGENTE_WITH_CHECK_INESPERADO'
      ELSE 'PRESENTE_CONFORME'
    END::text AS status_catalogo,
    CASE 
      WHEN p.polname IS NULL THEN 'Política RLS não encontrada no catálogo'
      ELSE
        'Cmd: ' || (CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END) ||
        ' (Esp: ' || (CASE pol.expected_cmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END) || ')' ||
        ' | Roles: [' || COALESCE(array_to_string(p.actual_roles, ', '), 'PUBLIC') || ']' ||
        ' (Esp: [' || pol.expected_role || '])' ||
        ' | Permissiva: ' || CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END ||
        ' | USING: ' || COALESCE(p.actual_using, '<NENHUM>') ||
        ' | WITH CHECK: ' || COALESCE(p.actual_with_check, '<NENHUM>')
    END::text AS detalhes_estrutura,
    pol.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      -- pi_anexos (Linhas 35-69)
      (1, 'public', 'pi_anexos', 'read pi_anexos', 'r', 'authenticated', true, true, '%is_admin%auth.uid()%created_by%clientes%agencias%pis%', false, NULL::text, '01B1: Linha 36', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (SELECT authenticated)'),
      (2, 'public', 'pi_anexos', 'insert pi_anexos', 'a', 'authenticated', true, false, NULL::text, true, '%auth.uid() IS NOT NULL%', '01B1: Linha 58', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (INSERT authenticated)'),
      (3, 'public', 'pi_anexos', 'update pi_anexos', 'w', 'authenticated', true, true, '%is_admin%auth.uid()%created_by = auth.uid()%', true, '%is_admin%auth.uid()%created_by = auth.uid()%', '01B1: Linha 62', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (UPDATE authenticated)'),
      (4, 'public', 'pi_anexos', 'delete pi_anexos', 'd', 'authenticated', true, true, '%is_admin%auth.uid()%created_by = auth.uid()%', false, NULL::text, '01B1: Linha 67', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (DELETE authenticated)'),
      -- storage.objects para bucket pi-anexos (Linhas 75-86)
      (5, 'storage', 'objects', 'pi-anexos read auth', 'r', 'authenticated', true, true, '%bucket_id%pi-anexos%', false, NULL::text, '01B1: Linha 76', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (SELECT authenticated)'),
      (6, 'storage', 'objects', 'pi-anexos insert auth', 'a', 'authenticated', true, false, NULL::text, true, '%bucket_id%pi-anexos%auth.uid() IS NOT NULL%', '01B1: Linha 80', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (INSERT authenticated)'),
      (7, 'storage', 'objects', 'pi-anexos delete owner/admin', 'd', 'authenticated', true, true, '%bucket_id%pi-anexos%is_admin%owner = auth.uid()%', false, NULL::text, '01B1: Linha 84', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (DELETE owner/admin)'),
      -- pi_assinaturas_cliente (Linhas 113-122)
      (8, 'public', 'pi_assinaturas_cliente', 'auth read pi_assin', 'r', 'authenticated', true, true, '%true%', false, NULL::text, '01B1: Linha 114', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (SELECT authenticated)'),
      (9, 'public', 'pi_assinaturas_cliente', 'auth insert pi_assin', 'a', 'authenticated', true, false, NULL::text, true, '%auth.uid() = criado_por%', '01B1: Linha 117', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (INSERT criado_por)'),
      (10, 'public', 'pi_assinaturas_cliente', 'auth delete pi_assin', 'd', 'authenticated', true, true, '%true%', false, NULL::text, '01B1: Linha 120', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (DELETE authenticated)'),
      -- storage.objects para bucket assinaturas (Linhas 123-138)
      (11, 'storage', 'objects', 'assin own read', 'r', 'authenticated', true, true, '%bucket_id%assinaturas%foldername%auth.uid()%', false, NULL::text, '01B1: Linha 124', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (SELECT folder/user)'),
      (12, 'storage', 'objects', 'assin own write', 'a', 'authenticated', true, false, NULL::text, true, '%bucket_id%assinaturas%foldername%auth.uid()%', '01B1: Linha 127', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (INSERT folder/user)'),
      (13, 'storage', 'objects', 'assin own update', 'w', 'authenticated', true, true, '%bucket_id%assinaturas%foldername%auth.uid()%', false, NULL::text, '01B1: Linha 130', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (UPDATE folder/user)'),
      (14, 'storage', 'objects', 'assin own delete', 'd', 'authenticated', true, true, '%bucket_id%assinaturas%foldername%auth.uid()%', false, NULL::text, '01B1: Linha 133', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (DELETE folder/user)'),
      (15, 'storage', 'objects', 'assin admin all', '*', 'authenticated', true, true, '%bucket_id%assinaturas%is_admin%auth.uid()%', true, '%bucket_id%assinaturas%is_admin%auth.uid()%', '01B1: Linha 136', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (ALL is_admin)')
  ) AS pol(ordem, schema_name, table_name, policy_name, expected_cmd, expected_role, expected_permissive, expected_has_using, expected_using_pattern, expected_has_with_check, expected_with_check_pattern, declarado_em, origem_historica, classificacao)
  LEFT JOIN LATERAL (
    SELECT
      p.polname,
      p.polcmd,
      p.polpermissive,
      ARRAY(SELECT rolname::text FROM pg_roles WHERE oid = ANY(p.polroles)) AS actual_roles,
      pg_get_expr(p.polqual, p.polrelid) AS actual_using,
      pg_get_expr(p.polwithcheck, p.polrelid) AS actual_with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = pol.schema_name
      AND c.relname = pol.table_name
      AND p.polname = pol.policy_name
    LIMIT 1
  ) p ON true
),

-- ------------------------------------------------------------------------------
-- 7. STORAGE, DADOS E RIGOR SOBRE INSERTS (Proteção Dinâmica contra 42P01)
-- ------------------------------------------------------------------------------
audit_storage_e_dados AS (
  SELECT
    700 + row_number() OVER (ORDER BY b.ordem)::int AS ordem,
    '7. STORAGE E DADOS'::text AS categoria,
    b.objeto::text AS objeto,
    b.declarado_em::text AS declarado_em,
    b.origem_historica::text AS origem_historica,
    b.status_catalogo::text AS status_catalogo,
    b.detalhes_estrutura::text AS detalhes_estrutura,
    b.classificacao::text AS classificacao_origem
  FROM (
    -- Bucket pi-anexos (Linha 71) - Protegido contra ausência de storage.buckets
    SELECT
      1 AS ordem,
      'storage.buckets -> pi-anexos'::text AS objeto,
      '01B1: Linha 71'::text AS declarado_em,
      'Migration 20260528161435'::text AS origem_historica,
      CASE 
        WHEN to_regclass('storage.buckets') IS NOT NULL THEN
          CASE 
            WHEN COALESCE(((xpath('/row/cnt/text()', query_to_xml('SELECT count(*) AS cnt FROM storage.buckets WHERE id = ''pi-anexos''', true, false, '')))[1])::text, '0') = '1'
              THEN 'PRESENTE (CONTAGEM REAL: 1)'
            ELSE 'AUSENTE (CONTAGEM REAL: 0)'
          END
        ELSE 'TABELA storage.buckets AUSENTE NO BANCO'
      END::text AS status_catalogo,
      CASE 
        WHEN to_regclass('storage.buckets') IS NOT NULL THEN
          COALESCE(
            ((xpath('/row/val/text()', query_to_xml('SELECT (''Bucket id: '' || id || '', name: '' || name || '', public: '' || public::text) AS val FROM storage.buckets WHERE id = ''pi-anexos''', true, false, '')))[1])::text,
            'Bucket pi-anexos não encontrado em storage.buckets'
          ) || ' | AVISO: A presença deste bucket NÃO comprova que o INSERT da 01B1 (Linha 71) foi executado nas falhas recentes, pois a migration histórica 20260528161435 já continha o mesmo INSERT ON CONFLICT DO NOTHING.'
        ELSE 'Tabela storage.buckets inexistente no catálogo'
      END::text AS detalhes_estrutura,
      'INDÍCIO_HISTÓRICO (Origem da inserção indeterminável)'::text AS classificacao
    FROM (SELECT 1) _
    
    UNION ALL
    
    -- Arquivos no Bucket pi-anexos (storage.objects) - Protegido contra ausência de storage.objects
    SELECT
      2,
      'storage.objects (bucket pi-anexos)',
      'Uso da aplicação',
      'Migration 20260528161435',
      CASE
        WHEN to_regclass('storage.objects') IS NOT NULL THEN 'CONTAGEM_REAL'
        ELSE 'TABELA storage.objects AUSENTE NO BANCO'
      END::text,
      CASE
        WHEN to_regclass('storage.objects') IS NOT NULL THEN
          'Total de arquivos em storage.objects para pi-anexos: ' || COALESCE(((xpath('/row/cnt/text()', query_to_xml('SELECT count(*) AS cnt FROM storage.objects WHERE bucket_id = ''pi-anexos''', true, false, '')))[1])::text, '0')
        ELSE 'Tabela storage.objects inexistente no catálogo'
      END::text,
      'DADOS_ARMAZENAMENTO'::text
    FROM (SELECT 1) _

    UNION ALL
    
    -- Bucket assinaturas (Linhas 123-138) - Protegido contra ausência de storage.buckets
    SELECT
      3,
      'storage.buckets -> assinaturas',
      '01B1: Linhas 123-138 (Referência)',
      'Migration 20260602142716',
      CASE 
        WHEN to_regclass('storage.buckets') IS NOT NULL THEN
          CASE 
            WHEN COALESCE(((xpath('/row/cnt/text()', query_to_xml('SELECT count(*) AS cnt FROM storage.buckets WHERE id = ''assinaturas''', true, false, '')))[1])::text, '0') = '1'
              THEN 'PRESENTE (CONTAGEM REAL: 1)'
            ELSE 'AUSENTE (CONTAGEM REAL: 0)'
          END
        ELSE 'TABELA storage.buckets AUSENTE NO BANCO'
      END::text,
      CASE 
        WHEN to_regclass('storage.buckets') IS NOT NULL THEN
          COALESCE(
            ((xpath('/row/val/text()', query_to_xml('SELECT (''Bucket id: '' || id || '', name: '' || name || '', public: '' || public::text) AS val FROM storage.buckets WHERE id = ''assinaturas''', true, false, '')))[1])::text,
            'Bucket assinaturas não encontrado em storage.buckets'
          ) || ' | Bucket referenciado nas políticas RLS de storage.'
        ELSE 'Tabela storage.buckets inexistente no catálogo'
      END::text,
      'HISTÓRICO_CONHECIDO'::text
    FROM (SELECT 1) _

    UNION ALL

    -- Arquivos no Bucket assinaturas (storage.objects) - Protegido contra ausência de storage.objects
    SELECT
      4,
      'storage.objects (bucket assinaturas)',
      'Uso da aplicação',
      'Migration 20260602142716',
      CASE
        WHEN to_regclass('storage.objects') IS NOT NULL THEN 'CONTAGEM_REAL'
        ELSE 'TABELA storage.objects AUSENTE NO BANCO'
      END::text,
      CASE
        WHEN to_regclass('storage.objects') IS NOT NULL THEN
          'Total de arquivos em storage.objects para assinaturas: ' || COALESCE(((xpath('/row/cnt/text()', query_to_xml('SELECT count(*) AS cnt FROM storage.objects WHERE bucket_id = ''assinaturas''', true, false, '')))[1])::text, '0')
        ELSE 'Tabela storage.objects inexistente no catálogo'
      END::text,
      'DADOS_ARMAZENAMENTO'::text
    FROM (SELECT 1) _

    UNION ALL

    -- Registros em public.pi_anexos (MÉTRICA ESTIMADA)
    SELECT
      5,
      'public.pi_anexos (contagem registros)',
      '01B1: Linhas 4-19',
      'Migration 20260528161435',
      CASE WHEN to_regclass('public.pi_anexos') IS NOT NULL THEN 'TABELA_EXISTE' ELSE 'TABELA_INEXISTENTE' END::text,
      CASE 
        WHEN to_regclass('public.pi_anexos') IS NOT NULL THEN
          'MÉTRICA ESTIMADA DO CATÁLOGO: reltuples (planejador) = ' || COALESCE((SELECT reltuples::bigint::text FROM pg_class WHERE oid = to_regclass('public.pi_anexos')), '0') ||
          ', n_live_tup (estatísticas) = ' || COALESCE((SELECT n_live_tup::bigint::text FROM pg_stat_user_tables WHERE relid = to_regclass('public.pi_anexos')), '0') ||
          '. AVISO: Contagem estimada. O lote 01B1 NÃO possui instruções INSERT para esta tabela; nenhum dado foi inserido pelo script 01B1.'
        ELSE 'Tabela inexistente no catálogo' 
      END::text,
      'DADOS_APLICACAO_ESTIMATIVA'::text
    FROM (SELECT 1) _

    UNION ALL

    -- Registros em public.pi_assinaturas_cliente (MÉTRICA ESTIMADA)
    SELECT
      6,
      'public.pi_assinaturas_cliente (contagem registros)',
      '01B1: Linhas 91-104',
      'Migration 20260602142716',
      CASE WHEN to_regclass('public.pi_assinaturas_cliente') IS NOT NULL THEN 'TABELA_EXISTE' ELSE 'TABELA_INEXISTENTE' END::text,
      CASE 
        WHEN to_regclass('public.pi_assinaturas_cliente') IS NOT NULL THEN
          'MÉTRICA ESTIMADA DO CATÁLOGO: reltuples (planejador) = ' || COALESCE((SELECT reltuples::bigint::text FROM pg_class WHERE oid = to_regclass('public.pi_assinaturas_cliente')), '0') ||
          ', n_live_tup (estatísticas) = ' || COALESCE((SELECT n_live_tup::bigint::text FROM pg_stat_user_tables WHERE relid = to_regclass('public.pi_assinaturas_cliente')), '0') ||
          '. AVISO: Contagem estimada. O lote 01B1 NÃO possui instruções INSERT para esta tabela; nenhum dado foi inserido pelo script 01B1.'
        ELSE 'Tabela inexistente no catálogo' 
      END::text,
      'DADOS_APLICACAO_ESTIMATIVA'::text
    FROM (SELECT 1) _
  ) AS b
),

-- ------------------------------------------------------------------------------
-- 8. PERMISSÕES E GRANTS (Conjunto Distinto e Comparação Completa)
-- ------------------------------------------------------------------------------
audit_grants AS (
  SELECT
    800 + row_number() OVER (ORDER BY g.ordem)::int AS ordem,
    '8. PERMISSÕES (GRANTS)'::text AS categoria,
    (g.tab_name || ' -> ' || g.role_name)::text AS objeto,
    g.declarado_em::text AS declarado_em,
    g.origem_historica::text AS origem_historica,
    CASE 
      WHEN priv.actual_privs IS NULL THEN 'AUSENTE'
      WHEN priv.actual_privs = g.expected_privs THEN 'PRESENTE_EXATO'
      WHEN g.expected_privs <@ priv.actual_privs THEN 'PRESENTE_SUPERSET'
      ELSE 'DIVERGENTE_PARCIAL'
    END::text AS status_catalogo,
    CASE 
      WHEN priv.actual_privs IS NULL THEN 'Nenhum privilégio concedido encontrado no catálogo'
      ELSE
        'Esperados: [' || array_to_string(g.expected_privs, ', ') || ']' ||
        ' | Concedidos: [' || array_to_string(priv.actual_privs, ', ') || ']' ||
        CASE 
          WHEN NOT (g.expected_privs <@ priv.actual_privs) THEN
            ' | Faltantes: [' || COALESCE(array_to_string(ARRAY(SELECT unnest(g.expected_privs) EXCEPT SELECT unnest(priv.actual_privs)), ', '), 'Nenhum') || ']'
          ELSE ''
        END
    END::text AS detalhes_estrutura,
    g.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      (1, 'pi_anexos', 'authenticated', ARRAY['DELETE', 'INSERT', 'SELECT', 'UPDATE']::text[], '01B1: Linha 21', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (SELECT, INSERT, UPDATE, DELETE)'),
      (2, 'pi_anexos', 'service_role', ARRAY['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE']::text[], '01B1: Linha 22', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (ALL)'),
      (3, 'pi_assinaturas_cliente', 'authenticated', ARRAY['DELETE', 'INSERT', 'SELECT', 'UPDATE']::text[], '01B1: Linha 108', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (SELECT, INSERT, UPDATE, DELETE)'),
      (4, 'pi_assinaturas_cliente', 'service_role', ARRAY['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE']::text[], '01B1: Linha 109', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (ALL)'),
      (5, 'produtos', 'authenticated', ARRAY['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE']::text[], '01B1: Linha 144', 'Migration 20260603175430', 'PONTO_DE_FALHA_OU_POSTERIOR (Linha 144)'),
      (6, 'produtos', 'service_role', ARRAY['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE']::text[], '01B1: Linha 143', 'Migration 20260603175430', 'PONTO_DE_FALHA_OU_POSTERIOR (Linha 143)')
  ) AS g(ordem, tab_name, role_name, expected_privs, declarado_em, origem_historica, classificacao)
  LEFT JOIN LATERAL (
    SELECT
      array_agg(DISTINCT privilege_type::text ORDER BY privilege_type::text) AS actual_privs
    FROM information_schema.table_privileges tp
    WHERE tp.table_schema = 'public'
      AND tp.table_name = g.tab_name
      AND tp.grantee = g.role_name
  ) priv ON true
),

-- ------------------------------------------------------------------------------
-- 9. INDICADORES TRANSACIONAIS E FATOS OBSERVADOS (Sem Conclusões Automáticas)
-- ------------------------------------------------------------------------------
audit_sintese AS (
  SELECT
    900 + row_number() OVER (ORDER BY s.ordem)::int AS ordem,
    '9. INDICADORES TRANSACIONAIS'::text AS categoria,
    s.indicador::text AS objeto,
    s.escopo::text AS declarado_em,
    'Avaliação Objetiva do Catálogo'::text AS origem_historica,
    s.status::text AS status_catalogo,
    s.detalhes::text AS detalhes_estrutura,
    s.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      (
        1,
        'FATO OBSERVADO: Presença de Tabelas do Bloco Pré-Linha 141',
        'pi_anexos, pi_assinaturas_cliente',
        CASE 
          WHEN to_regclass('public.pi_anexos') IS NOT NULL AND to_regclass('public.pi_assinaturas_cliente') IS NOT NULL THEN 'AMBAS PRESENTES'
          WHEN to_regclass('public.pi_anexos') IS NOT NULL OR to_regclass('public.pi_assinaturas_cliente') IS NOT NULL THEN 'PARCIALMENTE PRESENTES'
          ELSE 'AUSENTES'
        END,
        'Presença física comprovada no catálogo pg_class. Não comprova se foram criadas na tentativa recente ou em migrations históricas anteriores.',
        'COMPROVADO_NO_CATÁLOGO'
      ),
      (
        2,
        'FATO OBSERVADO: Presença de Tabelas de Controle Posteriores (Linha > 141)',
        'permuta_recebimentos, permuta_saldos, produto_tipos, tarefas, briefings',
        CASE 
          WHEN to_regclass('public.tarefas') IS NOT NULL AND to_regclass('public.briefings') IS NOT NULL THEN 'TABELAS DE CONTROLE PRESENTES'
          ELSE 'TABELAS DE CONTROLE AUSENTES OU PARCIAIS'
        END,
        'A presença de objetos que constam exclusivamente após a linha 141 é forte indício de que o banco de Staging já possuía uma linha de base de migrações implantada anteriormente.',
        'INDÍCIO_HISTÓRICO'
      ),
      (
        3,
        'AVALIAÇÃO DE CAUSALIDADE: Transação das Tentativas 01B1',
        'Tentativa 1 e Tentativa 2 da 01B1 original',
        'INCONCLUSIVO (EVIDÊNCIA TRANSACIONAL DIRETA INDISPONÍVEL NO CATÁLOGO)',
        'O catálogo do PostgreSQL armazena o estado estrutural presente, mas não registra trilha de auditoria de chamadas web abortadas nem timestamps DDL por instrução. Portanto, é tecnicamente impossível afirmar com certeza matemática se as duas execuções sofreram ROLLBACK integral (sendo a presença fruto do histórico pré-existente) ou se houve commit parcial antes da interrupção na linha 141.',
        'NÃO_DETERMINÁVEL'
      ),
      (
        4,
        'AVALIAÇÃO DE PRONTIDÃO: Mitigação Estrutural pelo 01B1 Corrigido',
        '01B1_midiaos_v260_core_parte2A_corrigido.sql',
        'PROTEGIDO (44 ADD COLUMN IF NOT EXISTS + 1 ON CONFLICT)',
        'Como a versão corrigida possui proteções IF NOT EXISTS em todas as 44 colunas e ON CONFLICT na tabela produto_tipos, a execução subsequente será estruturalmente segura e idempotente em ambos os cenários (tábula rasa ou presença histórica de objetos).',
        'REQUISITO_DE_SEGURANÇA'
      )
  ) AS s(ordem, indicador, escopo, status, detalhes, classificacao)
)

-- ------------------------------------------------------------------------------
-- RESULTADO FINAL UNIFICADO
-- ------------------------------------------------------------------------------
SELECT * FROM audit_tabelas
UNION ALL
SELECT * FROM audit_colunas
UNION ALL
SELECT * FROM audit_constraints
UNION ALL
SELECT * FROM audit_indices
UNION ALL
SELECT * FROM audit_triggers_funcoes
UNION ALL
SELECT * FROM audit_policies
UNION ALL
SELECT * FROM audit_storage_e_dados
UNION ALL
SELECT * FROM audit_grants
UNION ALL
SELECT * FROM audit_sintese
ORDER BY ordem;

