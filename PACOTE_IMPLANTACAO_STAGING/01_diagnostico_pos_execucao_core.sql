-- ==============================================================================
-- MIDIA OS v2.6.0 — ETAPA 1: DIAGNÓSTICO DE LEITURA PÓS-EXECUÇÃO DO CORE
-- Arquivo: 01_diagnostico_pos_execucao_core.sql
-- Ambiente Autorizado: Supabase STAGING (Project ID: wsologhmptielhhnbgob)
-- Restrição: SOMENTE LEITURA (Zero escrita, zero DDL, zero modificação de dados)
-- ==============================================================================

-- 1. CONFERÊNCIA DOS TOTAIS POR CATEGORIA DE OBJETO NO SCHEMA PUBLIC
SELECT
  '1. TOTAIS DE OBJETOS' AS categoria,
  'Tabelas Base' AS tipo,
  count(*)::text AS total_encontrado,
  '59' AS total_esperado,
  CASE WHEN count(*) = 59 THEN 'CONFORME' ELSE 'DIVERGENTE' END AS status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT
  '1. TOTAIS DE OBJETOS',
  'Tipos ENUM',
  count(*)::text,
  '12',
  CASE WHEN count(*) = 12 THEN 'CONFORME' ELSE 'DIVERGENTE' END
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e'

UNION ALL

SELECT
  '1. TOTAIS DE OBJETOS',
  'Funções (PL/pgSQL e SQL)',
  count(*)::text,
  '87',
  CASE WHEN count(*) = 87 THEN 'CONFORME' ELSE 'DIVERGENTE' END
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'

UNION ALL

SELECT
  '1. TOTAIS DE OBJETOS',
  'Gatilhos (Triggers)',
  count(*)::text,
  '160',
  CASE WHEN count(*) = 160 THEN 'CONFORME' ELSE 'DIVERGENTE' END
FROM information_schema.triggers
WHERE trigger_schema = 'public'

UNION ALL

SELECT
  '1. TOTAIS DE OBJETOS',
  'Políticas de RLS',
  count(*)::text,
  '219',
  CASE WHEN count(*) >= 209 THEN 'CONFORME' ELSE 'DIVERGENTE' END
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
  '1. TOTAIS DE OBJETOS',
  'Índices',
  count(*)::text,
  '175',
  CASE WHEN count(*) >= 175 THEN 'CONFORME' ELSE 'DIVERGENTE' END
FROM pg_indexes
WHERE schemaname = 'public';


-- 2. CONFERÊNCIA DO TENANT RAIZ (TV BRASÍLIA)
SELECT
  '2. TENANT RAIZ' AS secao,
  id::text,
  razao_social,
  nome_fantasia,
  status,
  CASE
    WHEN id = 'a711a129-330c-46bf-943a-531cedd4f2ff' AND status = 'ativo' THEN 'CONFORME'
    ELSE 'DIVERGENTE'
  END AS status_validacao
FROM public.tenants
WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff';


-- 3. CONFERÊNCIA DA CORREÇÃO CIRÚRGICA (gerar_pos_vendas_pendentes)
SELECT
  '3. CORRECAO CIRURGICA' AS secao,
  'gerar_pos_vendas_pendentes()' AS rotina,
  to_regprocedure('public.gerar_pos_vendas_pendentes()')::text AS regprocedure,
  routine_type,
  security_type,
  CASE
    WHEN to_regprocedure('public.gerar_pos_vendas_pendentes()') IS NOT NULL AND security_type = 'DEFINER' THEN 'CONFORME'
    ELSE 'DIVERGENTE'
  END AS status_validacao
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'gerar_pos_vendas_pendentes';


-- 4. CONFERÊNCIA DE PRIVILÉGIOS REVOGADOS NA FUNÇÃO gerar_pos_vendas_pendentes
SELECT
  '4. PRIVILEGIOS' AS secao,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'gerar_pos_vendas_pendentes';


-- 5. LISTA DE TABELAS BASE PRESENTES NO SCHEMA PUBLIC
SELECT
  row_number() OVER (ORDER BY table_name) AS item,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- 6. LISTA DE TIPOS ENUM PRESENTES NO SCHEMA PUBLIC
SELECT
  row_number() OVER (ORDER BY t.typname) AS item,
  t.typname AS enum_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e'
ORDER BY t.typname;

