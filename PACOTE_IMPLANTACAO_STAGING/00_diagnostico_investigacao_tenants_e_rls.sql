-- ==============================================================================
-- MIDIA OS v2.6.0 — DIAGNÓSTICO INVESTIGATIVO DE TENANTS E POLÍTICAS RLS (STAGING)
-- Arquivo: 00_diagnostico_investigacao_tenants_e_rls.sql
-- Ambiente: Supabase STAGING (Project ID: wsologhmptielhhnbgob)
-- Finalidade: Averiguação estática do estado real da tabela public.tenants e do
--             inventário completo das 94 políticas RLS existentes antes de 01B
-- Restrição: SOMENTE LEITURA (Zero escrita, zero DDL, zero alteração de estado)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SEÇÃO 1: ESTRUTURA REAL, COLUNAS E TIPOS DA TABELA public.tenants
-- ------------------------------------------------------------------------------
SELECT
  '1. COLUNAS TENANTS' AS categoria,
  ordinal_position AS "#",
  column_name AS "Coluna",
  data_type || COALESCE('(' || character_maximum_length || ')', '') AS "Tipo",
  is_nullable AS "Permite Nulo?",
  COALESCE(column_default, 'NENHUM') AS "Valor Padrão",
  CASE
    WHEN column_name IN ('subscription_status', 'trial_started_at', 'trial_ends_at',
                         'current_period_start', 'current_period_end', 'cancel_at_period_end',
                         'payment_provider', 'payment_subscription_id', 'last_payment_at')
      THEN 'COLUNA SAAS v2.6.0 (PRESENTE)'
    ELSE 'COLUNA BASE'
  END AS "Classificação Técnica"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
ORDER BY ordinal_position;

-- ------------------------------------------------------------------------------
-- SEÇÃO 2: CONSTRAINTS, CHAVES E REGRAS CHECK EM public.tenants
-- ------------------------------------------------------------------------------
SELECT
  '2. CONSTRAINTS TENANTS' AS categoria,
  conname AS "Nome da Constraint",
  CASE contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    ELSE contype::text
  END AS "Tipo de Constraint",
  pg_get_constraintdef(oid) AS "Definição Técnica"
FROM pg_constraint
WHERE conrelid = 'public.tenants'::regclass
ORDER BY contype, conname;

-- ------------------------------------------------------------------------------
-- SEÇÃO 3: ÍNDICES EXISTENTES EM public.tenants
-- ------------------------------------------------------------------------------
SELECT
  '3. ÍNDICES TENANTS' AS categoria,
  indexname AS "Nome do Índice",
  indexdef AS "Instrução de Criação DDL"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tenants'
ORDER BY indexname;

-- ------------------------------------------------------------------------------
-- SEÇÃO 4: TRIGGERS ASSOCIADOS A public.tenants
-- ------------------------------------------------------------------------------
SELECT
  '4. TRIGGERS TENANTS' AS categoria,
  tgname AS "Nome do Trigger",
  pg_get_triggerdef(oid) AS "Definição do Trigger"
FROM pg_trigger
WHERE tgrelid = 'public.tenants'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- ------------------------------------------------------------------------------
-- SEÇÃO 5: POLÍTICAS RLS VINCULADAS A public.tenants
-- ------------------------------------------------------------------------------
SELECT
  '5. POLÍTICAS RLS TENANTS' AS categoria,
  policyname AS "Nome da Política",
  cmd AS "Comando (SELECT/INSERT/UPDATE/ALL)",
  roles::text AS "Papeis (Roles)",
  qual AS "Condição USING",
  with_check AS "Condição WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tenants'
ORDER BY policyname;

-- ------------------------------------------------------------------------------
-- SEÇÃO 6: VOLUMETRIA E VERIFICAÇÃO DO TENANT TV BRASÍLIA
-- ------------------------------------------------------------------------------
SELECT
  '6. VOLUMETRIA E TENANT TVB' AS categoria,
  'Total de Linhas em tenants' AS "Indicador",
  (SELECT count(*)::text FROM public.tenants) AS "Valor",
  'Quantidade total de empresas cadastradas no banco' AS "Observação"

UNION ALL

SELECT
  '6. VOLUMETRIA E TENANT TVB',
  'Tenant TV Brasília (UUID a711a129-330c-46bf-943a-531cedd4f2ff)',
  CASE
    WHEN EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff')
      THEN 'ENCONTRADO NO BANCO'
    ELSE 'NÃO ENCONTRADO'
  END,
  'Verificação de existência da empresa cliente TV Brasília'

UNION ALL

SELECT
  '6. VOLUMETRIA E TENANT TVB',
  'Dados Comerciais TV Brasília',
  COALESCE((
    SELECT
      format('Razão: %s | Plano: %s | Ciclo: %s | Status: %s | Criado em: %s',
             razao_social, plano, ciclo, status, created_at::text)
    FROM public.tenants
    WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff'
  ), 'Nenhum registro para exibir'),
  'Atributos comerciais do registro existente';

-- ------------------------------------------------------------------------------
-- SEÇÃO 7: INVENTÁRIO EXAUSTIVO DAS 94 POLÍTICAS RLS DAS TABELAS DA PARTE 1
-- ------------------------------------------------------------------------------
SELECT
  '7. INVENTÁRIO DAS 94 POLÍTICAS RLS' AS categoria,
  tablename AS "Tabela",
  policyname AS "Nome da Política RLS",
  cmd AS "Comando",
  roles::text AS "Roles",
  permissive AS "Permissiva?",
  qual AS "Expressão USING",
  with_check AS "Expressão WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'user_roles', 'permissions', 'role_permissions', 'agencias', 'clientes',
    'pis', 'pi_itens', 'pi_historico', 'projetos_especiais', 'notificacoes', 'propostas',
    'proposta_itens', 'produtos', 'metas_executivo', 'notificacao_config', 'google_calendar_tokens',
    'reunioes', 'eventos_calendario', 'midia_config', 'auditoria_acessos', 'email_send_log',
    'email_send_state', 'suppressed_emails', 'email_unsubscribe_tokens', 'auditoria_alteracoes',
    'materiais_apoio'
  )
ORDER BY tablename, policyname;

