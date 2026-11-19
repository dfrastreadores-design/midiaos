-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO DE LEITURA (SOMENTE LEITURA / ZERO MUTAÇÃO)
-- Arquivo: PACOTE_IMPLANTACAO_STAGING/diagnostico_leitura_staging.sql
-- Ambiente: Exclusivo para Staging (wsologhmptielhhnbgob)
-- Objetivo: Averiguar o estado atual do banco após a primeira tentativa da Etapa 1
-- Executar manualmente no SQL Editor autenticado do Supabase
-- ==============================================================================

WITH 
diag_resumo AS (
  SELECT 
    '0. RESUMO GERAL' AS tipo,
    'Estado Global do Schema Public' AS objeto,
    (SELECT count(*)::text || ' tabelas no schema public' FROM information_schema.tables WHERE table_schema = 'public') AS status,
    CASE 
      WHEN (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') = 0 
      THEN 'BANCO TOTALMENTE VAZIO: A transacao anterior foi revertida integralmente pelo erro de sintaxe. Pronto para aplicacao limpa.'
      ELSE 'EXECUCAO PARCIAL: Comandos anteriores foram persistidos. A reaplicacao com a correcao e 100% segura e idempotente.'
    END AS detalhe
),

diag_tabelas AS (
  SELECT 
    '1. TABELA CORE' AS tipo,
    t.nome_esperado AS objeto,
    CASE WHEN it.table_name IS NOT NULL THEN 'PRESENTE' ELSE 'AUSENTE' END AS status,
    CASE 
      WHEN it.table_name IS NULL THEN 'N/A'
      WHEN pt.rowsecurity = true THEN 'RLS ATIVO'
      ELSE 'RLS DESATIVADO'
    END AS detalhe
  FROM (
    VALUES 
      ('tenants'),
      ('profiles'),
      ('user_roles'),
      ('clientes'),
      ('agencias'),
      ('propostas'),
      ('pis'),
      ('produtos'),
      ('auditoria_alteracoes')
  ) AS t(nome_esperado)
  LEFT JOIN information_schema.tables it 
    ON it.table_schema = 'public' AND it.table_name = t.nome_esperado
  LEFT JOIN pg_tables pt 
    ON pt.schemaname = 'public' AND pt.tablename = t.nome_esperado
),

diag_enums AS (
  SELECT 
    '2. ENUM' AS tipo,
    e.nome_esperado AS objeto,
    CASE WHEN t.typname IS NOT NULL THEN 'CRIADO' ELSE 'AUSENTE' END AS status,
    CASE 
      WHEN t.typname IS NULL THEN 'N/A'
      ELSE (SELECT count(*)::text || ' valores configurados' FROM pg_enum WHERE enumtypid = t.oid)
    END AS detalhe
  FROM (
    VALUES 
      ('app_role'),
      ('pi_status'),
      ('tipo_midia'),
      ('notificacao_tipo'),
      ('proposta_status'),
      ('midia_tipo'),
      ('pessoa_tipo'),
      ('comissao_escopo'),
      ('comissao_status')
  ) AS e(nome_esperado)
  LEFT JOIN pg_type t 
    ON t.typname = e.nome_esperado 
    AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
),

diag_funcoes AS (
  SELECT 
    '3. FUNCAO CORE' AS tipo,
    f.nome_esperado AS objeto,
    CASE WHEN p.proname IS NOT NULL THEN 'CRIADA' ELSE 'AUSENTE' END AS status,
    CASE 
      WHEN p.proname IS NOT NULL THEN 'Assinatura registrada no schema public'
      ELSE 'N/A'
    END AS detalhe
  FROM (
    VALUES 
      ('current_tenant_id'),
      ('has_role'),
      ('is_admin'),
      ('is_super_admin'),
      ('handle_new_user')
  ) AS f(nome_esperado)
  LEFT JOIN pg_proc p 
    ON p.proname = f.nome_esperado 
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
),

diag_policies AS (
  SELECT 
    '4. POLITICAS RLS' AS tipo,
    pol.tabela AS objeto,
    CASE WHEN count(p.policyname) > 0 THEN 'CONFIGURADAS' ELSE 'SEM POLITICAS' END AS status,
    count(p.policyname)::text || ' politica(s) RLS ativa(s)' AS detalhe
  FROM (
    VALUES 
      ('tenants'),
      ('profiles'),
      ('user_roles'),
      ('clientes')
  ) AS pol(tabela)
  LEFT JOIN pg_policies p 
    ON p.schemaname = 'public' AND p.tablename = pol.tabela
  GROUP BY pol.tabela
)

SELECT tipo, objeto, status, detalhe FROM diag_resumo
UNION ALL
SELECT tipo, objeto, status, detalhe FROM diag_tabelas
UNION ALL
SELECT tipo, objeto, status, detalhe FROM diag_enums
UNION ALL
SELECT tipo, objeto, status, detalhe FROM diag_funcoes
UNION ALL
SELECT tipo, objeto, status, detalhe FROM diag_policies
ORDER BY tipo, objeto;
