-- ==============================================================================
-- MIDIA OS v2.6.0 — AUDITORIA READ-ONLY APÓS DUAS FALHAS DA 01B1 (ERRO 42701)
-- Arquivo: diagnostico_auditoria_pos_falhas_01B1.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob) / PostgreSQL 17.11
--
-- NATUREZA: ESTRITAMENTE LEITURA (READ-ONLY)
-- REGRAS: Zero DDL, Zero DML, Zero alteração de dados, Zero impacto no banco.
-- OBJETIVO:
--   1. Inspecionar exaustivamente todos os objetos e alterações declarados no lote
--      01B1 antes da linha 141 (ponto exato do erro 42701 em public.produtos.formato).
--   2. Verificar tabelas, colunas, constraints, índices, triggers, funções,
--      políticas RLS, buckets de storage, permissões e dados.
--   3. Determinar empiricamente se o ambiente sofreu ROLLBACK TOTAL do lote ou se
--      permanece com objetos HISTÓRICOS pré-existentes de migrações anteriores.
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
        ', Registros estim: ' || COALESCE((SELECT reltuples::bigint::text FROM pg_class WHERE oid = to_regclass('public.' || t.tab_name)), '0')
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
-- 3. CONSTRAINTS (PK, FK, UNIQUE, CHECK)
-- ------------------------------------------------------------------------------
audit_constraints AS (
  SELECT
    300 + row_number() OVER (ORDER BY c.ordem)::int AS ordem,
    '3. CONSTRAINTS'::text AS categoria,
    (c.tab_name || ' -> ' || c.con_name_pattern)::text AS objeto,
    c.declarado_em::text AS declarado_em,
    c.origem_historica::text AS origem_historica,
    CASE 
      WHEN con.conname IS NOT NULL THEN 'PRESENTE' 
      ELSE 'AUSENTE' 
    END::text AS status_catalogo,
    CASE 
      WHEN con.conname IS NOT NULL THEN
        'Nome: ' || con.conname ||
        ', Tipo: ' || CASE con.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'f' THEN 'FOREIGN KEY' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK' ELSE con.contype END ||
        ', Def: ' || pg_get_constraintdef(con.oid)
      ELSE 'Constraint não encontrada' 
    END::text AS detalhes_estrutura,
    c.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      (1, 'pi_anexos', 'pi_anexos_pkey', '01B1: Linha 5', 'Migration 20260528161435', 'p', 'HISTÓRICO_CONHECIDO (PK id)'),
      (2, 'pi_assinaturas_cliente', 'pi_assinaturas_cliente_pkey', '01B1: Linha 92', 'Migration 20260602142716', 'p', 'HISTÓRICO_CONHECIDO (PK id)'),
      (3, 'pi_assinaturas_cliente', '%pi_id%', '01B1: Linha 93', 'Migration 20260602142716', 'f', 'HISTÓRICO_CONHECIDO (FK pis.id ON DELETE CASCADE)'),
      (4, 'pi_assinaturas_cliente', '%token%', '01B1: Linha 94', 'Migration 20260602142716', 'u', 'HISTÓRICO_CONHECIDO (UNIQUE token)'),
      (5, 'pi_assinaturas_cliente', '%status%', '01B1: Linha 95', 'Migration 20260602142716', 'c', 'HISTÓRICO_CONHECIDO (CHECK pendente|assinado|expirado)'),
      (6, 'pi_assinaturas_cliente', '%criado_por%', '01B1: Linha 102', 'Migration 20260602142716', 'f', 'HISTÓRICO_CONHECIDO (FK auth.users.id)')
  ) AS c(ordem, tab_name, con_name_pattern, declarado_em, origem_historica, con_type, classificacao)
  LEFT JOIN LATERAL (
    SELECT con.oid, con.conname, con.contype
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    WHERE ns.nspname = 'public'
      AND cl.relname = c.tab_name
      AND con.contype = c.con_type
      AND (con.conname ILIKE c.con_name_pattern)
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
-- 6. POLÍTICAS RLS (Tabelas e Storage Pré-Linha 141)
-- ------------------------------------------------------------------------------
audit_policies AS (
  SELECT
    600 + row_number() OVER (ORDER BY pol.ordem)::int AS ordem,
    '6. POLÍTICAS RLS'::text AS categoria,
    (pol.schema_name || '.' || pol.table_name || ' -> "' || pol.policy_name || '"')::text AS objeto,
    pol.declarado_em::text AS declarado_em,
    pol.origem_historica::text AS origem_historica,
    CASE 
      WHEN p.polname IS NOT NULL THEN 'PRESENTE' 
      ELSE 'AUSENTE' 
    END::text AS status_catalogo,
    CASE 
      WHEN p.polname IS NOT NULL THEN
        'Comando: ' || (CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END) ||
        ', Roles: ' || COALESCE(array_to_string(ARRAY(SELECT rolname::text FROM pg_roles WHERE oid = ANY(p.polroles)), ', '), 'PUBLIC') ||
        ', Permissiva: ' || CASE WHEN p.polpermissive THEN 'YES' ELSE 'NO' END
      ELSE 'Política não encontrada' 
    END::text AS detalhes_estrutura,
    pol.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      -- pi_anexos (Linhas 35-69)
      (1, 'public', 'pi_anexos', 'read pi_anexos', '01B1: Linha 36', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (SELECT authenticated)'),
      (2, 'public', 'pi_anexos', 'insert pi_anexos', '01B1: Linha 58', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (INSERT authenticated)'),
      (3, 'public', 'pi_anexos', 'update pi_anexos', '01B1: Linha 62', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (UPDATE authenticated)'),
      (4, 'public', 'pi_anexos', 'delete pi_anexos', '01B1: Linha 67', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (DELETE authenticated)'),
      -- storage.objects para bucket pi-anexos (Linhas 75-86)
      (5, 'storage', 'objects', 'pi-anexos read auth', '01B1: Linha 76', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (SELECT authenticated)'),
      (6, 'storage', 'objects', 'pi-anexos insert auth', '01B1: Linha 80', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (INSERT authenticated)'),
      (7, 'storage', 'objects', 'pi-anexos delete owner/admin', '01B1: Linha 84', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (DELETE owner/admin)'),
      -- pi_assinaturas_cliente (Linhas 113-122)
      (8, 'public', 'pi_assinaturas_cliente', 'auth read pi_assin', '01B1: Linha 114', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (SELECT authenticated)'),
      (9, 'public', 'pi_assinaturas_cliente', 'auth insert pi_assin', '01B1: Linha 117', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (INSERT criado_por)'),
      (10, 'public', 'pi_assinaturas_cliente', 'auth delete pi_assin', '01B1: Linha 120', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (DELETE authenticated)'),
      -- storage.objects para bucket assinaturas (Linhas 123-138)
      (11, 'storage', 'objects', 'assin own read', '01B1: Linha 124', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (SELECT folder/user)'),
      (12, 'storage', 'objects', 'assin own write', '01B1: Linha 127', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (INSERT folder/user)'),
      (13, 'storage', 'objects', 'assin own update', '01B1: Linha 130', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (UPDATE folder/user)'),
      (14, 'storage', 'objects', 'assin own delete', '01B1: Linha 133', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (DELETE folder/user)'),
      (15, 'storage', 'objects', 'assin admin all', '01B1: Linha 136', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (ALL is_admin)')
  ) AS pol(ordem, schema_name, table_name, policy_name, declarado_em, origem_historica, classificacao)
  LEFT JOIN LATERAL (
    SELECT p.polname, p.polcmd, p.polroles, p.polpermissive
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
-- 7. STORAGE, DADOS E INSERTS (Pré-Linha 141)
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
    -- Bucket pi-anexos (Linha 71: INSERT INTO storage.buckets ... ON CONFLICT DO NOTHING)
    SELECT
      1 AS ordem,
      'storage.buckets -> pi-anexos'::text AS objeto,
      '01B1: Linha 71'::text AS declarado_em,
      'Migration 20260528161435'::text AS origem_historica,
      CASE WHEN sb.id IS NOT NULL THEN 'PRESENTE' ELSE 'AUSENTE' END::text AS status_catalogo,
      CASE 
        WHEN sb.id IS NOT NULL THEN
          'Bucket id: ' || sb.id || ', name: ' || sb.name || ', public: ' || sb.public::text ||
          ', arquivos em storage.objects: ' || (SELECT count(*)::text FROM storage.objects WHERE bucket_id = 'pi-anexos')
        ELSE 'Bucket não existe em storage.buckets' 
      END::text AS detalhes_estrutura,
      'HISTÓRICO_CONHECIDO (INSERT ON CONFLICT DO NOTHING)'::text AS classificacao
    FROM (SELECT 1) _
    LEFT JOIN storage.buckets sb ON sb.id = 'pi-anexos'
    
    UNION ALL
    
    -- Bucket assinaturas (Dependência das Policies das Linhas 123-138)
    SELECT
      2,
      'storage.buckets -> assinaturas',
      '01B1: Linhas 123-138',
      'Migration 20260602142716',
      CASE WHEN sb.id IS NOT NULL THEN 'PRESENTE' ELSE 'AUSENTE' END,
      CASE 
        WHEN sb.id IS NOT NULL THEN
          'Bucket id: ' || sb.id || ', name: ' || sb.name || ', public: ' || sb.public::text ||
          ', arquivos em storage.objects: ' || (SELECT count(*)::text FROM storage.objects WHERE bucket_id = 'assinaturas')
        ELSE 'Bucket não existe em storage.buckets' 
      END,
      'HISTÓRICO_CONHECIDO (Referência em storage policies)'
    FROM (SELECT 1) _
    LEFT JOIN storage.buckets sb ON sb.id = 'assinaturas'

    UNION ALL

    -- Contagem de dados em public.pi_anexos
    SELECT
      3,
      'public.pi_anexos (contagem registros)',
      '01B1: Linhas 4-19',
      'Migration 20260528161435',
      CASE WHEN to_regclass('public.pi_anexos') IS NOT NULL THEN 'TABELA_EXISTE' ELSE 'TABELA_INEXISTENTE' END,
      CASE 
        WHEN to_regclass('public.pi_anexos') IS NOT NULL THEN
          'Registros estimados (pg_class.reltuples): ' || COALESCE((SELECT reltuples::bigint::text FROM pg_class WHERE oid = to_regclass('public.pi_anexos')), '0')
        ELSE 'Tabela inexistente' 
      END,
      'DADOS_APLICACAO'
    FROM (SELECT 1) _

    UNION ALL

    -- Contagem de dados em public.pi_assinaturas_cliente
    SELECT
      4,
      'public.pi_assinaturas_cliente (contagem registros)',
      '01B1: Linhas 91-104',
      'Migration 20260602142716',
      CASE WHEN to_regclass('public.pi_assinaturas_cliente') IS NOT NULL THEN 'TABELA_EXISTE' ELSE 'TABELA_INEXISTENTE' END,
      CASE 
        WHEN to_regclass('public.pi_assinaturas_cliente') IS NOT NULL THEN
          'Registros estimados (pg_class.reltuples): ' || COALESCE((SELECT reltuples::bigint::text FROM pg_class WHERE oid = to_regclass('public.pi_assinaturas_cliente')), '0')
        ELSE 'Tabela inexistente' 
      END,
      'DADOS_APLICACAO'
    FROM (SELECT 1) _
  ) AS b
),

-- ------------------------------------------------------------------------------
-- 8. PERMISSÕES E GRANTS (Pré-Linha 141 e Linhas 143-144)
-- ------------------------------------------------------------------------------
audit_grants AS (
  SELECT
    800 + row_number() OVER (ORDER BY g.ordem)::int AS ordem,
    '8. PERMISSÕES (GRANTS)'::text AS categoria,
    (g.tab_name || ' -> ' || g.role_name)::text AS objeto,
    g.declarado_em::text AS declarado_em,
    g.origem_historica::text AS origem_historica,
    CASE 
      WHEN count(tp.privilege_type) > 0 THEN 'PRESENTE' 
      ELSE 'AUSENTE' 
    END::text AS status_catalogo,
    CASE 
      WHEN count(tp.privilege_type) > 0 THEN
        'Privilégios: ' || string_agg(tp.privilege_type, ', ' ORDER BY tp.privilege_type)
      ELSE 'Nenhum privilégio concedido encontrado' 
    END::text AS detalhes_estrutura,
    g.classificacao::text AS classificacao_origem
  FROM (
    VALUES
      (1, 'pi_anexos', 'authenticated', '01B1: Linha 21', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (SELECT, INSERT, UPDATE, DELETE)'),
      (2, 'pi_anexos', 'service_role', '01B1: Linha 22', 'Migration 20260528161435', 'HISTÓRICO_CONHECIDO (ALL)'),
      (3, 'pi_assinaturas_cliente', 'authenticated', '01B1: Linha 108', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (SELECT, INSERT, UPDATE, DELETE)'),
      (4, 'pi_assinaturas_cliente', 'service_role', '01B1: Linha 109', 'Migration 20260602142716', 'HISTÓRICO_CONHECIDO (ALL)'),
      (5, 'produtos', 'authenticated', '01B1: Linha 144', 'Migration 20260603175430', 'PONTO_DE_FALHA_OU_POSTERIOR (Linha 144)'),
      (6, 'produtos', 'service_role', '01B1: Linha 143', 'Migration 20260603175430', 'PONTO_DE_FALHA_OU_POSTERIOR (Linha 143)')
  ) AS g(ordem, tab_name, role_name, declarado_em, origem_historica, classificacao)
  LEFT JOIN information_schema.table_privileges tp
    ON tp.table_schema = 'public'
   AND tp.table_name = g.tab_name
   AND tp.grantee = g.role_name
  GROUP BY g.ordem, g.tab_name, g.role_name, g.declarado_em, g.origem_historica, g.classificacao
),

-- ------------------------------------------------------------------------------
-- 9. SÍNTESE DIAGNÓSTICA (ROLLBACK vs HISTÓRICO PRÉ-EXISTENTE)
-- ------------------------------------------------------------------------------
audit_sintese AS (
  SELECT
    900::int AS ordem,
    '9. SÍNTESE DIAGNÓSTICA'::text AS categoria,
    'ESTADO GLOBAL DO BANCO: ROLLBACK vs HISTÓRICO'::text AS objeto,
    'Comparação Pré-141 vs Posterior-141'::text AS declarado_em,
    'Critério de Integridade Transacional'::text AS origem_historica,
    CASE 
      WHEN (to_regclass('public.pi_anexos') IS NOT NULL AND to_regclass('public.tarefas') IS NOT NULL)
        THEN 'AMBOS PRESENTES (Histórico Pré-existente Completo)'
      WHEN (to_regclass('public.pi_anexos') IS NOT NULL AND to_regclass('public.tarefas') IS NULL)
        THEN 'APENAS PRÉ-141 PRESENTE (Evidência de Commit Parcial)'
      WHEN (to_regclass('public.pi_anexos') IS NULL AND to_regclass('public.tarefas') IS NULL)
        THEN 'AMBOS AUSENTES (Rollback Total / Tábula Rasa)'
      ELSE 'ESTADO HÍBRIDO / ATÍPICO'
    END::text AS status_catalogo,
    CASE 
      WHEN (to_regclass('public.pi_anexos') IS NOT NULL AND to_regclass('public.tarefas') IS NOT NULL)
        THEN 'Os objetos investigados já existiam no banco antes das execuções da 01B1 original. O erro 42701 foi causado exclusivamente por essa existência prévia. As falhas não corromperam o banco.'
      WHEN (to_regclass('public.pi_anexos') IS NOT NULL AND to_regclass('public.tarefas') IS NULL)
        THEN 'Houve commit das instruções anteriores à linha 141 antes da interrupção pelo erro 42701.'
      WHEN (to_regclass('public.pi_anexos') IS NULL AND to_regclass('public.tarefas') IS NULL)
        THEN 'O PostgreSQL efetuou ROLLBACK integral da transação do lote.'
      ELSE 'Verificar detalhes nas seções anteriores.'
    END::text AS detalhes_estrutura,
    'AVALIAÇÃO_GLOBAL'::text AS classificacao_origem
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

