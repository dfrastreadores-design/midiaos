-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO DE LEITURA DO ESTADO ATUAL DO STAGING
-- Arquivo: 00_diagnostico_estado_atual_staging.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob)
-- Finalidade: Avaliar se a execução parcial foi comitada ou revertida (rollback)
-- Restrição: SOMENTE LEITURA (Zero escrita, zero DDL, zero risco)
-- ==============================================================================

-- 1. CONTAGEM GERAL DE OBJETOS NO SCHEMA PUBLIC
SELECT
  '1. CONTAGEM GERAL' AS secao,
  'Tabelas Base' AS categoria,
  count(*)::text AS total_encontrado
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT
  '1. CONTAGEM GERAL',
  'Tipos ENUM',
  count(*)::text
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e'

UNION ALL

SELECT
  '1. CONTAGEM GERAL',
  'Funções',
  count(*)::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'

UNION ALL

SELECT
  '1. CONTAGEM GERAL',
  'Gatilhos (Triggers)',
  count(*)::text
FROM information_schema.triggers
WHERE trigger_schema = 'public'

UNION ALL

SELECT
  '1. CONTAGEM GERAL',
  'Políticas RLS',
  count(*)::text
FROM pg_policies
WHERE schemaname = 'public';


-- 2. VERIFICAÇÃO ESPECÍFICA DAS TABELAS CHAVE AFETADAS PELA LINHA 3125
SELECT
  '2. TABELAS NA REGIAO DO ERRO' AS secao,
  table_name,
  'EXISTE' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('propostas', 'clientes', 'agencias', 'proposta_itens', 'tenants', 'profiles', 'user_roles')
ORDER BY table_name;


-- 3. VERIFICAÇÃO DA CONSTRAINT ONDE HOUVE O TRUNCAMENTO
SELECT
  '3. CONSTRAINT DO TRUNCAMENTO' AS secao,
  conname AS nome_constraint,
  conrelid::regclass::text AS tabela
FROM pg_constraint
WHERE conname IN ('propostas_cliente_id_fkey', 'propostas_agencia_id_fkey', 'propostas_executivo_id_fkey', 'proposta_itens_proposta_id_fkey');


-- 4. LISTA DE TODAS AS TABELAS ENCONTRADAS (SE HOUVER)
SELECT
  '4. TODAS AS TABELAS' AS secao,
  row_number() OVER (ORDER BY table_name) AS item,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- 5. LISTA DE TODOS OS ENUMS ENCONTRADOS (SE HOUVER)
SELECT
  '5. TODOS OS ENUMS' AS secao,
  row_number() OVER (ORDER BY t.typname) AS item,
  t.typname AS enum_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e'
ORDER BY t.typname;
