-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO PÓS-EXECUÇÃO DA PARTE 1 (STAGING)
-- Arquivo: 01A_diagnostico_pos_execucao_parte1.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob)
-- Finalidade: Comprovação integral e exaustiva dos objetos da Parte 1
--             (Extensões, ENUMs, Tabelas, Colunas, Funções, Triggers,
--              Índices, RLS, Storage Buckets e Tenants preexistente)
-- Restrição: SOMENTE LEITURA (Zero escrita, zero criação de objetos, zero DDL)
-- ==============================================================================

WITH
extensoes_esperadas AS (
  SELECT unnest(ARRAY['uuid-ossp', 'pgcrypto']) AS extname
),
enums_esperados AS (
  SELECT unnest(ARRAY[
    'app_role', 'pi_status', 'projeto_status', 'notificacao_tipo', 'proposta_status',
    'midia_tipo', 'reuniao_status', 'evento_origem', 'tipo_midia', 'pessoa_tipo',
    'comissao_escopo', 'comissao_status'
  ]) AS enum_name
),
tabelas_esperadas_p1 AS (
  SELECT unnest(ARRAY[
    'profiles', 'user_roles', 'permissions', 'role_permissions', 'agencias', 'clientes',
    'pis', 'pi_itens', 'pi_historico', 'projetos_especiais', 'notificacoes', 'propostas',
    'proposta_itens', 'produtos', 'metas_executivo', 'notificacao_config', 'google_calendar_tokens',
    'reunioes', 'eventos_calendario', 'midia_config', 'auditoria_acessos', 'email_send_log',
    'email_send_state', 'suppressed_emails', 'email_unsubscribe_tokens', 'auditoria_alteracoes',
    'materiais_apoio'
  ]) AS table_name
),
colunas_finais_esperadas AS (
  SELECT * FROM (VALUES
    ('clientes', 'cnae'),
    ('clientes', 'situacao_cadastral'),
    ('agencias', 'cnae'),
    ('agencias', 'situacao_cadastral')
  ) AS t(table_name, column_name)
),
funcoes_esperadas AS (
  SELECT unnest(ARRAY[
    'has_role', 'is_admin', 'generate_pi_numero', 'generate_proposta_numero',
    'handle_new_user', 'touch_updated_at', 'log_alteracao'
  ]) AS proname
),
triggers_esperados AS (
  SELECT * FROM (VALUES
    ('profiles', 'trg_profiles_updated'),
    ('agencias', 'trg_agencias_updated'),
    ('clientes', 'trg_clientes_updated'),
    ('pis', 'trg_pis_numero'),
    ('pis', 'trg_pis_updated'),
    ('propostas', 'trg_propostas_numero'),
    ('propostas', 'trg_propostas_updated'),
    ('materiais_apoio', 'trg_materiais_apoio_updated_at')
  ) AS t(relname, tgname)
),
indices_esperados AS (
  SELECT * FROM (VALUES
    ('eventos_calendario', 'idx_eventos_inicio'),
    ('reunioes', 'idx_reunioes_data'),
    ('auditoria_acessos', 'idx_auditoria_acessos_created_at'),
    ('email_send_log', 'idx_email_send_log_created'),
    ('notificacoes', 'notificacoes_dedup_idx'),
    ('auditoria_alteracoes', 'idx_aud_alt_created')
  ) AS t(relname, indexname)
),
buckets_esperados AS (
  SELECT * FROM (VALUES
    ('client-logos', false),
    ('projetos-especiais', false),
    ('materiais-apoio', false)
  ) AS t(bucket_id, is_public)
),
todos_os_checks AS (
  -- 1. Extensões Nativas
  SELECT
    10 + row_number() OVER (ORDER BY e.extname)::int AS ordem,
    '1. EXTENSÕES NATIVAS'::text AS categoria,
    e.extname::text AS objeto,
    'Parte 1 (Linhas 4-5)'::text AS esperado_em,
    CASE WHEN pe.extname IS NOT NULL THEN 'INSTALADA (v' || pe.extversion || ')' ELSE 'NÃO INSTALADA' END AS valor_encontrado,
    CASE WHEN pe.extname IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END AS status,
    'Extensão nativa declarada no cabeçalho do arquivo 01A'::text AS observacao
  FROM extensoes_esperadas e
  LEFT JOIN pg_extension pe ON pe.extname = e.extname

  UNION ALL

  -- 2. Tipos ENUM Consolidados (12 ENUMs)
  SELECT
    20 + row_number() OVER (ORDER BY ee.enum_name)::int,
    '2. TIPOS ENUM',
    ee.enum_name,
    'Parte 1 (Linhas 7-79)',
    CASE
      WHEN t.typname IS NOT NULL THEN 'CRIADO (' || (SELECT count(*) FROM pg_enum WHERE enumtypid = t.oid)::text || ' valores)'
      ELSE 'NÃO ENCONTRADO'
    END,
    CASE WHEN t.typname IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END,
    'Tipo ENUM consolidado do Core MIDIA OS v2.6.0'
  FROM enums_esperados ee
  LEFT JOIN pg_type t ON t.typname = ee.enum_name AND t.typnamespace = 'public'::regnamespace

  UNION ALL

  -- 3. Tabelas Base da Parte 1 (27 tabelas)
  SELECT
    40 + row_number() OVER (ORDER BY te.table_name)::int,
    '3. TABELAS DA PARTE 1',
    te.table_name,
    'Parte 1 (Até linha 2.438)',
    CASE
      WHEN c.relname IS NOT NULL THEN 'CRIADA (OID ' || c.oid::text || ')'
      ELSE 'NÃO ENCONTRADA'
    END,
    CASE WHEN c.relname IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END,
    'Tabela base criada no lote da Parte 1'
  FROM tabelas_esperadas_p1 te
  LEFT JOIN pg_class c ON c.relname = te.table_name AND c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'

  UNION ALL

  -- 4. Funções Core da Parte 1
  SELECT
    70 + row_number() OVER (ORDER BY fe.proname)::int,
    '4. FUNÇÕES CORE',
    fe.proname || '()',
    'Parte 1',
    CASE
      WHEN p.proname IS NOT NULL THEN 'CRIADA (retorno: ' || pg_get_function_result(p.oid) || ')'
      ELSE 'NÃO ENCONTRADA'
    END,
    CASE WHEN p.proname IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END,
    'Função de suporte/segurança/regra de negócio da Parte 1'
  FROM funcoes_esperadas fe
  LEFT JOIN pg_proc p ON p.proname = fe.proname AND p.pronamespace = 'public'::regnamespace

  UNION ALL

  -- 5. Triggers Essenciais da Parte 1
  SELECT
    80 + row_number() OVER (ORDER BY te.relname, te.tgname)::int,
    '5. TRIGGERS',
    te.relname || '.' || te.tgname,
    'Parte 1',
    CASE
      WHEN tg.tgname IS NOT NULL THEN 'ATIVO (disparo em ' || te.relname || ')'
      ELSE 'NÃO ENCONTRADO'
    END,
    CASE WHEN tg.tgname IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END,
    'Trigger de atualização, numeração ou auditoria da Parte 1'
  FROM triggers_esperados te
  LEFT JOIN pg_class c ON c.relname = te.relname AND c.relnamespace = 'public'::regnamespace
  LEFT JOIN pg_trigger tg ON tg.tgrelid = c.oid AND tg.tgname = te.tgname AND NOT tg.tgisinternal

  UNION ALL

  -- 6. Índices Representativos da Parte 1
  SELECT
    90 + row_number() OVER (ORDER BY ie.relname, ie.indexname)::int,
    '6. ÍNDICES DE PERFORMANCE',
    ie.relname || '.' || ie.indexname,
    'Parte 1',
    CASE
      WHEN ci.relname IS NOT NULL THEN 'CRIADO (válido)'
      ELSE 'NÃO ENCONTRADO'
    END,
    CASE WHEN ci.relname IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END,
    'Índice de busca e integridade da Parte 1'
  FROM indices_esperados ie
  LEFT JOIN pg_class ci ON ci.relname = ie.indexname AND ci.relnamespace = 'public'::regnamespace AND ci.relkind = 'i'

  UNION ALL

  -- 7. Row Level Security (RLS) nas Tabelas Base
  SELECT
    100,
    '7. SEGURANÇA RLS',
    'Habilitação de RLS nas 27 tabelas base',
    'Parte 1 (Todas as tabelas)',
    (SELECT count(*)::text || ' de 27 tabelas com RLS habilitado'
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname IN (SELECT table_name FROM tabelas_esperadas_p1)
       AND c.relrowsecurity = true),
    CASE
      WHEN (SELECT count(*)
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind = 'r'
              AND c.relname IN (SELECT table_name FROM tabelas_esperadas_p1)
              AND c.relrowsecurity = true) = 27 THEN 'CONFORME'
      ELSE 'DIVERGENTE'
    END,
    'Todas as 27 tabelas base devem possuir RLS ativo (relrowsecurity = true)'

  UNION ALL

  SELECT
    101,
    '7. SEGURANÇA RLS',
    'Cobertura de Políticas por Tabela (Zero tabelas sem política)',
    'Parte 1 (100% de cobertura)',
    (SELECT count(*)::text || ' de 27 tabelas com políticas RLS ativas'
     FROM tabelas_esperadas_p1 te
     WHERE EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = te.table_name)),
    CASE
      WHEN (SELECT count(*)
            FROM tabelas_esperadas_p1 te
            WHERE NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = te.table_name)) = 0 THEN 'CONFORME'
      ELSE 'DIVERGENTE (Tabela sem política detectada)'
    END,
    'Nenhuma das 27 tabelas da Parte 1 pode estar sem política de segurança RLS'

  UNION ALL

  SELECT
    102,
    '7. SEGURANÇA RLS',
    'Inventário de Políticas RLS Ativas em public',
    'Mínimo líquido previsto: 81 políticas',
    (SELECT count(*)::text || ' políticas ativas encontradas (81 líquidas de 01A + residuais de bootstrap)'
     FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN (SELECT table_name FROM tabelas_esperadas_p1)),
    CASE
      WHEN (SELECT count(*)
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename IN (SELECT table_name FROM tabelas_esperadas_p1)) >= 81 THEN 'CONFORME'
      ELSE 'DIVERGENTE (Abaixo do saldo líquido previsto)'
    END,
    'Saldo líquido exato de 01A após 29 drops internos é 81. Presença de políticas adicionais do bootstrap é segura e será higienizada em 01C2'

  UNION ALL

  -- 8. Storage Buckets e RLS de Arquivos
  SELECT
    110 + row_number() OVER (ORDER BY be.bucket_id)::int,
    '8. STORAGE BUCKETS',
    'bucket: ' || be.bucket_id,
    'Parte 1',
    CASE
      WHEN sb.id IS NOT NULL THEN 'CRIADO (privado: ' || (NOT sb.public)::text || ')'
      ELSE 'NÃO ENCONTRADO'
    END,
    CASE WHEN sb.id IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END,
    'Bucket de armazenamento criado pela Parte 1'
  FROM buckets_esperados be
  LEFT JOIN storage.buckets sb ON sb.id = be.bucket_id

  UNION ALL

  SELECT
    115,
    '8. STORAGE BUCKETS',
    'políticas RLS: storage.objects (materiais-apoio)',
    'Parte 1 (Linhas 2420-2436)',
    (SELECT count(*)::text || ' de 4 políticas criadas' FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%materiais-apoio%'),
    CASE
      WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%materiais-apoio%') = 4 THEN 'CONFORME'
      WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%materiais-apoio%') > 0 THEN 'DIVERGENTE (Parcial)'
      ELSE 'AUSENTE'
    END,
    'Políticas: auth read, auth upload, owner/admin update, owner/admin delete'

  UNION ALL

  -- 9. Marco de Término do Arquivo 01A (Linhas 2441 a 2447)
  SELECT
    120 + row_number() OVER (ORDER BY cfe.table_name, cfe.column_name)::int,
    '9. MARCO DE TÉRMINO (COLUNAS FINAIS)',
    (cfe.table_name || '.' || cfe.column_name),
    'Parte 1 (Linhas 2441-2447)',
    CASE
      WHEN c.column_name IS NOT NULL THEN 'PRESENTE (tipo ' || c.data_type || ')'
      ELSE 'NÃO ENCONTRADA'
    END,
    CASE WHEN c.column_name IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END,
    'Últimas instruções do arquivo 01A. Comprova execução integral sem corte/truncamento.'
  FROM colunas_finais_esperadas cfe
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = cfe.table_name
   AND c.column_name = cfe.column_name

  UNION ALL

  -- 10. Verificação da Tabela Tenants Preexistente (Bootstrap)
  SELECT
    130,
    '10. TABELA TENANTS (PREEXISTENTE)',
    'tabela: public.tenants (Estrutura e Chave Primária)',
    'Bootstrap prévio / Parte 2B',
    CASE
      WHEN to_regclass('public.tenants') IS NOT NULL
       AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenants'::regclass AND contype = 'p')
      THEN 'PRESENTE COM CHAVE PRIMÁRIA PK (Preexistente de bootstrap anterior)'
      WHEN to_regclass('public.tenants') IS NOT NULL
      THEN 'PRESENTE SEM CHAVE PRIMÁRIA'
      ELSE 'NÃO ENCONTRADA'
    END,
    CASE
      WHEN to_regclass('public.tenants') IS NOT NULL
       AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tenants'::regclass AND contype = 'p')
      THEN 'CONFORME (Preexistente de bootstrap anterior)'
      ELSE 'DIVERGENTE'
    END,
    'Tabela preexistente de inicialização de homologação. O lote 01B2 aplicará as colunas SaaS aditivas com segurança.'

  UNION ALL

  SELECT
    131,
    '10. TABELA TENANTS (PREEXISTENTE)',
    'Colunas Estruturais Base em tenants',
    'id, razao_social, plano, status',
    (SELECT count(*)::text || ' de 4 colunas base presentes'
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'tenants'
       AND column_name IN ('id', 'razao_social', 'plano', 'status')),
    CASE
      WHEN (SELECT count(*)
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'tenants'
              AND column_name IN ('id', 'razao_social', 'plano', 'status')) = 4 THEN 'CONFORME'
      ELSE 'DIVERGENTE'
    END,
    'Campos essenciais para identificação de empresas contratantes'

  UNION ALL

  SELECT
    132,
    '10. TABELA TENANTS (PREEXISTENTE)',
    'Tenant TV Brasília (UUID a711a129-330c-46bf-943a-531cedd4f2ff)',
    'UUID Canônico Fixo',
    CASE
      WHEN EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff')
      THEN (SELECT format('PRESENTE (%s | Plano: %s | Status: %s)', razao_social, plano, status)
            FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff')
      ELSE 'NÃO ENCONTRADO'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff') THEN 'CONFORME'
      ELSE 'AUSENTE (Será inserido pelo seed de 01B2)'
    END,
    'Empresa cliente TV Brasília cadastrada sob UUID fixo imutável'

  UNION ALL

  SELECT
    133,
    '10. TABELA TENANTS (PREEXISTENTE)',
    'tabela: public.user_tenants (Não-Antecipação)',
    'Parte 2B (01B2)',
    CASE
      WHEN to_regclass('public.user_tenants') IS NULL THEN 'NÃO CRIADA (Ainda não executada)'
      ELSE 'PRESENTE (Já criada)'
    END,
    CASE
      WHEN to_regclass('public.user_tenants') IS NULL THEN 'CONFORME (Esperado AUSENTE nesta etapa)'
      ELSE 'DIVERGENTE (Antecipada)'
    END,
    'A tabela user_tenants pertence exclusivamente ao lote 01B2. Correto estar AUSENTE.'

  UNION ALL

  -- 11. Resumo Geral de Integridade
  SELECT
    200,
    '11. RESUMO GERAL DA PARTE 1',
    'Avaliação Geral de Integridade da Parte 1',
    'Todos os requisitos atendidos',
    CASE
      WHEN (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') >= 27
       AND (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') = 12
       AND (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('clientes', 'agencias') AND column_name IN ('cnae', 'situacao_cadastral')) = 4
       AND (SELECT count(*) FROM storage.buckets WHERE id IN ('client-logos', 'projetos-especiais', 'materiais-apoio')) = 3
       AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('has_role', 'is_admin', 'generate_pi_numero', 'generate_proposta_numero', 'handle_new_user')) = 5
       AND (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (SELECT table_name FROM tabelas_esperadas_p1) AND c.relrowsecurity = true) = 27
       AND (SELECT count(*) FROM tabelas_esperadas_p1 te WHERE NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = te.table_name)) = 0
       AND (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN (SELECT table_name FROM tabelas_esperadas_p1)) >= 81
       AND to_regclass('public.user_tenants') IS NULL
       THEN 'PARTE 1 TOTALMENTE IMPLANTADA E CONFORME'
      ELSE 'PENDENTE / DIVERGÊNCIAS DETECTADAS'
    END,
    CASE
      WHEN (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') >= 27
       AND (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') = 12
       AND (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('clientes', 'agencias') AND column_name IN ('cnae', 'situacao_cadastral')) = 4
       AND (SELECT count(*) FROM storage.buckets WHERE id IN ('client-logos', 'projetos-especiais', 'materiais-apoio')) = 3
       AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('has_role', 'is_admin', 'generate_pi_numero', 'generate_proposta_numero', 'handle_new_user')) = 5
       AND (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (SELECT table_name FROM tabelas_esperadas_p1) AND c.relrowsecurity = true) = 27
       AND (SELECT count(*) FROM tabelas_esperadas_p1 te WHERE NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = te.table_name)) = 0
       AND (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN (SELECT table_name FROM tabelas_esperadas_p1)) >= 81
       AND to_regclass('public.user_tenants') IS NULL
       THEN 'CONFORME'
      ELSE 'DIVERGENTE'
    END,
    CASE
      WHEN (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') >= 27
       AND (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') = 12
       AND (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('clientes', 'agencias') AND column_name IN ('cnae', 'situacao_cadastral')) = 4
       AND (SELECT count(*) FROM storage.buckets WHERE id IN ('client-logos', 'projetos-especiais', 'materiais-apoio')) = 3
       AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('has_role', 'is_admin', 'generate_pi_numero', 'generate_proposta_numero', 'handle_new_user')) = 5
       AND (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (SELECT table_name FROM tabelas_esperadas_p1) AND c.relrowsecurity = true) = 27
       AND (SELECT count(*) FROM tabelas_esperadas_p1 te WHERE NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = te.table_name)) = 0
       AND (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN (SELECT table_name FROM tabelas_esperadas_p1)) >= 81
       AND to_regclass('public.user_tenants') IS NULL
       THEN 'AUTORIZADO AVANÇAR PARA A PARTE 2 (01B1 + 01B2)'
      ELSE 'NÃO AVANÇAR: Verifique os itens AUSENTES ou DIVERGENTES acima'
    END
)
SELECT
  ordem AS "#",
  categoria AS "Categoria",
  objeto AS "Objeto Inspecionado",
  esperado_em AS "Origem Prevista",
  valor_encontrado AS "Estado Encontrado",
  status AS "Status",
  observacao AS "Observação Técnica"
FROM todos_os_checks
ORDER BY ordem;
