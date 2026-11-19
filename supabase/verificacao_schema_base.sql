-- ==============================================================================
-- MIDIA OS v2.6.0 — SQL DE VERIFICAÇÃO DO SCHEMA-BASE (HOMOLOGAÇÃO / STAGING)
-- Executar no SQL Editor do Supabase (wsologhmptielhhnbgob) após rodar bootstrap_staging_base.sql
-- ==============================================================================

WITH verificacao AS (
  -- 1. EXTENSÕES
  SELECT 'Extensão pgcrypto' AS item, 'EXTENSOES' AS categoria,
         CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN 'APROVADO' ELSE 'PENDENTE' END AS status,
         'Criptografia e geração de chaves' AS detalhe
  UNION ALL
  SELECT 'Extensão uuid-ossp', 'EXTENSOES',
         CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Geração de UUIDs'

  -- 2. TIPOS ENUM CANÔNICOS
  UNION ALL
  SELECT 'Enum public.app_role', 'ENUMS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Papéis de acesso do sistema (admin, executivo, diretoria, etc.)'
  UNION ALL
  SELECT 'Enum public.pi_status', 'ENUMS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_status') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Ciclo de vida de Pedidos de Inserção'
  UNION ALL
  SELECT 'Enum public.notificacao_tipo', 'ENUMS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificacao_tipo') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Tipos de notificações operacionais'

  -- 3. TABELAS-BASE ESSENCIAIS
  UNION ALL
  SELECT 'Tabela public.tenants', 'TABELAS_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Entidade raiz do modelo multi-tenant'
  UNION ALL
  SELECT 'Tabela public.profiles', 'TABELAS_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Perfis de usuários vinculados a auth.users e tenants'
  UNION ALL
  SELECT 'Tabela public.user_roles', 'TABELAS_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Atribuições RBAC de papéis por usuário'
  UNION ALL
  SELECT 'Tabela public.clientes', 'TABELAS_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Cadastro de clientes e contatos por tenant'
  UNION ALL
  SELECT 'Tabela public.agencias', 'TABELAS_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agencias') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Cadastro de agências de publicidade'
  UNION ALL
  SELECT 'Tabela public.auditoria_alteracoes', 'TABELAS_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auditoria_alteracoes') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Log de auditoria e compliance transacional'

  -- 4. SEGURANÇA ROW LEVEL SECURITY (RLS)
  UNION ALL
  SELECT 'RLS em public.tenants', 'SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado'
  UNION ALL
  SELECT 'RLS em public.profiles', 'SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado'
  UNION ALL
  SELECT 'RLS em public.user_roles', 'SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado'
  UNION ALL
  SELECT 'RLS em public.clientes', 'SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado'
  UNION ALL
  SELECT 'RLS em public.auditoria_alteracoes', 'SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auditoria_alteracoes' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Row Level Security habilitado'

  -- 5. FUNÇÕES E TRIGGERS OBRIGATÓRIOS
  UNION ALL
  SELECT 'Função public.current_tenant_id()', 'FUNCOES_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_tenant_id') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Resolução do tenant_id da sessão ativa'
  UNION ALL
  SELECT 'Função public.has_role()', 'FUNCOES_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Verificação RBAC de papel ativo do usuário'
  UNION ALL
  SELECT 'Função public.is_admin()', 'FUNCOES_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Verificação de perfil de administrador'
  UNION ALL
  SELECT 'Trigger on_auth_user_created', 'TRIGGERS_BASE',
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Criação automática de profile ao registrar no auth.users'

  -- 6. DADOS ESSENCIAIS (SEED DE HOMOLOGAÇÃO)
  UNION ALL
  SELECT 'Tenant Padrão TV Brasília (a711a129-330c-46bf-943a-531cedd4f2ff)', 'DADOS_SEEDS',
         CASE WHEN EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Tenant raiz para vinculação de executivos e homologação do Prospect'
)
SELECT categoria, item, status, detalhe
FROM verificacao
ORDER BY categoria, item;

