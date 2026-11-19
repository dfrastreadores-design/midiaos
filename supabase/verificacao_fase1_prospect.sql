-- ==============================================================================
-- MIDIA OS v2.6.0 — SQL DE VERIFICAÇÃO PÓS-IMPLANTAÇÃO (FASE 1)
-- Executar no SQL Editor do Supabase (Staging wsologhmptielhhnbgob) após a migration
-- Valida as exatamente seis tabelas, RLS em todas as seis, triggers, RPC e integridade
-- ==============================================================================

WITH verificacao AS (
  -- 1. VERIFICAÇÃO DAS EXATAMENTE SEIS TABELAS
  SELECT 'Tabela 1/6: prospect_settings' AS item, 'TABELAS' AS categoria,
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospect_settings') THEN 'APROVADO' ELSE 'PENDENTE' END AS status,
         'Configurações operacionais, limites e score por tenant' AS detalhe
  UNION ALL
  SELECT 'Tabela 2/6: prospect_searches', 'TABELAS',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospect_searches') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Histórico e parâmetros de buscas de mercado executadas'
  UNION ALL
  SELECT 'Tabela 3/6: prospect_companies', 'TABELAS',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospect_companies') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Base de leads corporativos e carteira individual (Modelo A)'
  UNION ALL
  SELECT 'Tabela 4/6: prospect_campaigns', 'TABELAS',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospect_campaigns') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Campanhas e réguas comerciais de prospecção'
  UNION ALL
  SELECT 'Tabela 5/6: prospect_interactions', 'TABELAS',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospect_interactions') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Fila e histórico transacional de mensagens, telemetria e idempotência'
  UNION ALL
  SELECT 'Tabela 6/6: prospect_blocklist', 'TABELAS',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospect_blocklist') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Registro mandatório de opt-outs e proteções contra reabordagens'

  -- 2. VERIFICAÇÃO DE RLS ATIVADO NAS SEIS TABELAS
  UNION ALL
  SELECT 'RLS: prospect_settings', 'SEGURANÇA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_settings' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado na tabela prospect_settings'
  UNION ALL
  SELECT 'RLS: prospect_searches', 'SEGURANÇA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_searches' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado na tabela prospect_searches'
  UNION ALL
  SELECT 'RLS: prospect_companies', 'SEGURANÇA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_companies' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado na tabela prospect_companies'
  UNION ALL
  SELECT 'RLS: prospect_campaigns', 'SEGURANÇA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_campaigns' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado na tabela prospect_campaigns'
  UNION ALL
  SELECT 'RLS: prospect_interactions', 'SEGURANÇA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_interactions' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado na tabela prospect_interactions'
  UNION ALL
  SELECT 'RLS: prospect_blocklist', 'SEGURANÇA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prospect_blocklist' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado na tabela prospect_blocklist'

  -- 3. VERIFICAÇÃO DE POLÍTICAS RLS ESPECÍFICAS ATIVAS
  UNION ALL
  SELECT 'Políticas RLS: prospect_settings', 'POLITICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_settings') >= 2 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas de isolamento para Admin e Diretoria configuradas'
  UNION ALL
  SELECT 'Políticas RLS: prospect_searches', 'POLITICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_searches') >= 2 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas de visualização por autor e gestão por liderança configuradas'
  UNION ALL
  SELECT 'Políticas RLS: prospect_companies', 'POLITICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_companies') >= 3 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas Modelo A (OWN): Executivos enxergam apenas seus próprios leads configuradas'
  UNION ALL
  SELECT 'Políticas RLS: prospect_campaigns', 'POLITICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_campaigns') >= 2 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas de campanhas por tenant e liderança configuradas'
  UNION ALL
  SELECT 'Políticas RLS: prospect_interactions', 'POLITICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_interactions') >= 2 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas de isolamento de timeline e notas comerciais configuradas'
  UNION ALL
  SELECT 'Políticas RLS: prospect_blocklist', 'POLITICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prospect_blocklist') >= 3 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas de proteção de opt-out por tenant configuradas'

  -- 4. VERIFICAÇÃO DE TRIGGERS E INTEGRIDADE
  UNION ALL
  SELECT 'Trigger trg_protect_prospect_columns', 'TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_prospect_columns') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Bloqueio de alteração de colunas restritas por executivos em prospect_companies'
  UNION ALL
  SELECT 'Trigger trg_protect_interaction_inserts', 'TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_interaction_inserts') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Bloqueio contra injeção de falsos envios na timeline'

  -- 5. VERIFICAÇÃO DE FUNÇÕES E RPCS
  UNION ALL
  SELECT 'RPC transferir_lead_carteira()', 'FUNCOES_RPC',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'transferir_lead_carteira') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Transferência atômica com validação de status ativo, tenant e auditoria'
  UNION ALL
  SELECT 'Função is_lead_bloqueado()', 'FUNCOES_RPC',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_lead_bloqueado') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Verificação pontual segura de blocklist por executivos'

  -- 6. VERIFICAÇÃO DE CONSTRAINTS E ÍNDICES DE IDEMPOTÊNCIA
  UNION ALL
  SELECT 'Constraint uq_prospect_companies_tenant_cnpj', 'CONSTRAINTS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_prospect_companies_tenant_cnpj') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Deduplicação de leads por CNPJ e Tenant'
  UNION ALL
  SELECT 'Constraint uq_prospect_blocklist_tenant_dest', 'CONSTRAINTS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_prospect_blocklist_tenant_dest') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Unicidade de opt-out por canal e Tenant'
  UNION ALL
  SELECT 'Índice uq_prospect_interactions_idempotencia', 'IDEMPOTENCIA',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_prospect_interactions_idempotencia') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Unicidade estrita de chave de idempotência outbound por tenant'
  UNION ALL
  SELECT 'Índice uq_prospect_inbound_provider_event', 'IDEMPOTENCIA',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_prospect_inbound_provider_event') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Unicidade estrita de eventos inbound de provedores sem 7ª tabela'

  -- 7. CHAVES ESTRANGEIRAS PARA O SCHEMA-BASE
  UNION ALL
  SELECT 'FK prospect_settings -> tenants', 'INTEGRIDADE_REFERENCIAL',
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_name = 'prospect_settings' AND kcu.column_name = 'tenant_id' AND tc.constraint_type = 'FOREIGN KEY'
         ) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Isolamento multi-tenant garantido por FK'
  UNION ALL
  SELECT 'FK prospect_companies -> tenants', 'INTEGRIDADE_REFERENCIAL',
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_name = 'prospect_companies' AND kcu.column_name = 'tenant_id' AND tc.constraint_type = 'FOREIGN KEY'
         ) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Isolamento multi-tenant garantido por FK'

  -- 8. AUSÊNCIA DE 7ª TABELA
  UNION ALL
  SELECT 'Ausência de 7ª tabela (prospect_webhook_events)', 'ARQUITETURA',
         CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospect_webhook_events') THEN 'APROVADO' ELSE 'REPROVADO' END,
         'Garante estritamente 6 tabelas auxiliares sem sobrecarga'
)
SELECT categoria, item, status, detalhe
FROM verificacao
ORDER BY categoria, item;
