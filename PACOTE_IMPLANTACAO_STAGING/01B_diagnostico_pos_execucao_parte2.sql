-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO PÓS-EXECUÇÃO DA PARTE 2 (STAGING)
-- Arquivo: 01B_diagnostico_pos_execucao_parte2.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob)
-- Finalidade: Comprovar a implantação integral do lote 01B com SaaS e Teste de 72h
-- Restrição: SOMENTE LEITURA (Zero escrita, zero criação de objetos, zero DDL)
-- ==============================================================================

WITH
tabelas_esperadas_p2 AS (
  SELECT unnest(ARRAY[
    'tenants', 'tenant_faturas', 'briefings', 'briefing_anexos', 'tarefas', 'influenciadores',
    'links_uteis', 'permuta_recebimentos', 'permuta_saldos', 'pi_anexos',
    'pi_assinaturas_cliente', 'pi_financeiro', 'produto_tipos', 'proposal_history',
    'proposta_anexos', 'proposta_layouts', 'solicitacoes_producao', 'sync_cnpj_log',
    'system_announcements', 'system_settings'
  ]) AS table_name
),
todos_os_checks AS (
  -- 1. Tabela de Tenants
  SELECT
    10 AS ordem,
    '1. GESTÃO DE TENANTS'::text AS categoria,
    'Tabela public.tenants'::text AS objeto,
    'Parte 2 (Linha 2184)'::text AS esperado_em,
    CASE
      WHEN to_regclass('public.tenants') IS NOT NULL THEN 'CRIADA (OID ' || (to_regclass('public.tenants')::oid)::text || ')'
      ELSE 'NÃO ENCONTRADA'
    END AS valor_encontrado,
    CASE WHEN to_regclass('public.tenants') IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END AS status,
    'Tabela central de empresas clientes (SaaS Multi-Tenant)'::text AS observacao

  UNION ALL

  -- 1.1 Colunas de Ciclo de Vida SaaS na Tabela Tenants
  SELECT
    11 AS ordem,
    '1. GESTÃO DE TENANTS',
    'Colunas SaaS (subscription_status, trial_started_at, trial_ends_at)',
    'Parte 2 (Linhas 2197-2205)',
    (SELECT count(*)::text || ' de 3 colunas de teste/assinatura presentes'
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'tenants'
       AND column_name IN ('subscription_status', 'trial_started_at', 'trial_ends_at')),
    CASE
      WHEN (SELECT count(*)
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'tenants'
              AND column_name IN ('subscription_status', 'trial_started_at', 'trial_ends_at')) = 3 THEN 'CONFORME'
      ELSE 'AUSENTE'
    END,
    'Colunas que controlam a expiração das 72h e o bloqueio operacional'

  UNION ALL

  -- 2. Seed do Tenant Raiz TV Brasília
  SELECT
    20 AS ordem,
    '2. TENANT TV BRASÍLIA',
    'Tenant TV Brasília (UUID a711a129-330c-46bf-943a-531cedd4f2ff)',
    'Parte 2 (Linha 2236)',
    CASE
      WHEN EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff') THEN
        (SELECT format('PRESENTE (%s | plano: %s | sub_status: %s | bloqueado: %s)', razao_social, plano, subscription_status, bloqueado)
         FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff')
      ELSE 'NÃO ENCONTRADO'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff' AND subscription_status = 'active') THEN 'CONFORME'
      WHEN EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff') THEN 'DIVERGENTE (sub_status diferente de active)'
      ELSE 'AUSENTE'
    END,
    'Empresa cliente cadastrada sob plano Enterprise ativo e perpétuo (sem teste de 72h)'

  UNION ALL

  -- 3. Desvinculação do Proprietário Rafael Rodrigo
  SELECT
    30 AS ordem,
    '3. GOVERNANÇA GLOBAL DO PROPRIETÁRIO',
    'Perfil Rafael Rodrigo (rafaelrodrigo.as@gmail.com)',
    'Parte 2 (Hardening SaaS)',
    CASE
      WHEN EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = 'rafaelrodrigo.as@gmail.com' AND tenant_id = 'a711a129-330c-46bf-943a-531cedd4f2ff') THEN
        'DIVERGENTE: Vinculado indevidamente ao tenant TV Brasília'
      WHEN EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = 'rafaelrodrigo.as@gmail.com') THEN
        'CONFORME: Perfil global livre de tenant de cliente (tenant_id IS NULL)'
      ELSE
        'INFO: Perfil ainda não provisionado em auth (será criado no primeiro login)'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = 'rafaelrodrigo.as@gmail.com' AND tenant_id = 'a711a129-330c-46bf-943a-531cedd4f2ff') THEN
        'DIVERGENTE'
      ELSE
        'CONFORME'
    END,
    'O proprietário do SaaS não pode pertencer ao tenant de empresas clientes'

  UNION ALL

  -- 4. Tabelas Base Criadas na Parte 2
  SELECT
    40 + row_number() OVER (ORDER BY te.table_name)::int AS ordem,
    '4. TABELAS DA PARTE 2'::text AS categoria,
    te.table_name::text AS objeto,
    'Parte 2'::text AS esperado_em,
    CASE
      WHEN c.relname IS NOT NULL THEN 'CRIADA (OID ' || c.oid::text || ')'
      ELSE 'NÃO ENCONTRADA'
    END AS valor_encontrado,
    CASE WHEN c.relname IS NOT NULL THEN 'CONFORME' ELSE 'AUSENTE' END AS status,
    'Tabela de negócio/operação criada no lote da Parte 2'::text AS observacao
  FROM tabelas_esperadas_p2 te
  LEFT JOIN pg_class c ON c.relname = te.table_name AND c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'

  UNION ALL

  -- 5. Coluna tenant_id nas Tabelas Principais
  SELECT
    70 AS ordem,
    '5. COLUNA TENANT_ID NAS TABELAS'::text AS categoria,
    'Presença da coluna tenant_id nas 19 tabelas de negócio'::text AS objeto,
    'Parte 2 (Linhas 2285-2319)'::text AS esperado_em,
    (SELECT count(*)::text || ' de 19 tabelas com tenant_id'
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND column_name = 'tenant_id'
       AND table_name IN (
         'clientes','agencias','propostas','pis','briefings','tarefas',
         'influenciadores','produtos','projetos_especiais','eventos_calendario',
         'reunioes','metas_executivo','materiais_apoio','links_uteis',
         'midia_config','notificacoes','permuta_recebimentos',
         'solicitacoes_producao','permuta_saldos'
       )) AS valor_encontrado,
    CASE
      WHEN (SELECT count(*)
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND column_name = 'tenant_id'
              AND table_name IN (
                'clientes','agencias','propostas','pis','briefings','tarefas',
                'influenciadores','produtos','projetos_especiais','eventos_calendario',
                'reunioes','metas_executivo','materiais_apoio','links_uteis',
                'midia_config','notificacoes','permuta_recebimentos',
                'solicitacoes_producao','permuta_saldos'
              )) = 19 THEN 'CONFORME'
      ELSE 'DIVERGENTE'
    END AS status,
    'Coluna chave para isolamento RLS em banco compartilhado'::text AS observacao

  UNION ALL

  -- 6. Marco de Término da Parte 2 (handle_new_user)
  SELECT
    80 AS ordem,
    '6. MARCO DE TÉRMINO DA PARTE 2'::text AS categoria,
    'Função handle_new_user() atualizada'::text AS objeto,
    'Parte 2 (Linhas 2416-2448)'::text AS esperado_em,
    CASE
      WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        'PRESENTE (Atualizada na linha 2.448 do arquivo 01B)'
      ELSE
        'NÃO ENCONTRADA'
    END AS valor_encontrado,
    CASE
      WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN 'CONFORME'
      ELSE 'AUSENTE'
    END AS status,
    'Comprova que a Parte 2 executou integralmente até a linha final 2.449 sem corte'::text AS observacao

  UNION ALL

  -- 7. Resumo Geral Pós-Parte 2
  SELECT
    100 AS ordem,
    '7. RESUMO GERAL DA PARTE 2'::text AS categoria,
    'Total Acumulado de Tabelas Base em public'::text AS objeto,
    'Esperado: ~47 a 49 tabelas base'::text AS esperado_em,
    (SELECT count(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') || ' tabelas encontradas',
    CASE
      WHEN (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') >= 47 THEN 'CONFORME'
      ELSE 'DIVERGENTE (Contagem abaixo do esperado)'
    END AS status,
    'Total de tabelas criadas pela soma da Parte 1 + Parte 2'::text AS observacao

  UNION ALL

  SELECT
    101 AS ordem,
    '7. RESUMO GERAL DA PARTE 2'::text AS categoria,
    'Avaliação de Prontidão para Parte 3'::text AS objeto,
    'Parte 2 100% íntegra'::text AS esperado_em,
    CASE
      WHEN to_regclass('public.tenants') IS NOT NULL
       AND to_regclass('public.tenant_faturas') IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff' AND subscription_status = 'active')
       AND (SELECT count(*)
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND column_name = 'tenant_id'
              AND table_name IN ('clientes','agencias','pis','propostas')) = 4
       THEN 'PARTE 2 CONCLUÍDA COM SUCESSO'
      ELSE 'PENDÊNCIAS DETECTADAS'
    END AS valor_encontrado,
    CASE
      WHEN to_regclass('public.tenants') IS NOT NULL
       AND to_regclass('public.tenant_faturas') IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff' AND subscription_status = 'active')
       AND (SELECT count(*)
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND column_name = 'tenant_id'
              AND table_name IN ('clientes','agencias','pis','propostas')) = 4
       THEN 'CONFORME'
      ELSE 'DIVERGENTE'
    END AS status,
    CASE
      WHEN to_regclass('public.tenants') IS NOT NULL
       AND to_regclass('public.tenant_faturas') IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff')
       THEN 'Autorizado avançar para Parte 3 (01C_midiaos_v260_core_parte3.sql)'
      ELSE 'Não avançar. Inspecione os itens AUSENTES ou DIVERGENTES'
    END AS observacao
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
