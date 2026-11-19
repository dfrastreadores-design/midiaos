-- ==============================================================================
-- MIDIA OS v2.6.0 — CONSULTA DEFINITIVA DE VERIFICAÇÃO DO SISTEMA COMPLETO
-- Arquivo: supabase/verificacao_sistema_completo.sql
-- Ambiente: Exclusivo para Staging (wsologhmptielhhnbgob)
-- Executar no SQL Editor após a aplicação dos Pacotes 01 e 02
-- ==============================================================================

WITH verificacao AS (
  -- 1. EXTENSÕES DO POSTGRESQL
  SELECT 'Extensão pgcrypto' AS item, '1. EXTENSOES' AS categoria,
         CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN 'APROVADO' ELSE 'PENDENTE' END AS status,
         'Criptografia, tokens e hashing' AS detalhe
  UNION ALL
  SELECT 'Extensão uuid-ossp', '1. EXTENSOES',
         CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Geração nativa de UUID v4'

  -- 2. TIPOS ENUM DO SISTEMA (CONSOLIDADOS v2.6.0)
  UNION ALL
  SELECT 'Enum public.app_role', '2. ENUMS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Papéis de acesso RBAC (admin, executivo, diretoria, super_admin, etc.)'
  UNION ALL
  SELECT 'Enum public.pi_status', '2. ENUMS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pi_status') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Máquina de estados dos PIs'
  UNION ALL
  SELECT 'Enum public.notificacao_tipo', '2. ENUMS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificacao_tipo') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Tipos de eventos de push e alerta'
  UNION ALL
  SELECT 'Enum public.tipo_midia', '2. ENUMS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_midia') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Categorização de inventário e produtos'
  UNION ALL
  SELECT 'Enum public.proposta_status', '2. ENUMS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposta_status') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Estados da esteira de propostas comerciais'

  -- 3. TABELAS-BASE E MULTI-TENANCY (ETAPA 1 - CORE SCHEMA)
  UNION ALL
  SELECT 'Tabela public.tenants', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Entidade raiz multi-tenant'
  UNION ALL
  SELECT 'Tabela public.profiles', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Perfis de usuários vinculados a auth.users e tenants'
  UNION ALL
  SELECT 'Tabela public.user_roles', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Atribuições RBAC de papéis'
  UNION ALL
  SELECT 'Tabela public.permissions', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Catálogo de permissões de sistema'
  UNION ALL
  SELECT 'Tabela public.role_permissions', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Mapeamento entre papéis e permissões'
  UNION ALL
  SELECT 'Tabela public.clientes', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Base de clientes do CRM'
  UNION ALL
  SELECT 'Tabela public.agencias', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agencias') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Agências de publicidade'
  UNION ALL
  SELECT 'Tabela public.propostas', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'propostas') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Propostas comerciais'
  UNION ALL
  SELECT 'Tabela public.proposta_itens', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposta_itens') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Itens e linhas de propostas'
  UNION ALL
  SELECT 'Tabela public.pis', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pis') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Pedidos de Inserção'
  UNION ALL
  SELECT 'Tabela public.pi_itens', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pi_itens') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Itens de veiculação do PI'
  UNION ALL
  SELECT 'Tabela public.briefings', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'briefings') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Briefings comerciais e operacionais'
  UNION ALL
  SELECT 'Tabela public.produtos', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Catálogo de produtos de mídia'
  UNION ALL
  SELECT 'Tabela public.produto_tipos', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produto_tipos') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Tipos e formatos de mídia'
  UNION ALL
  SELECT 'Tabela public.auditoria_alteracoes', '3. TABELAS_CORE',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auditoria_alteracoes') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Log de auditoria e compliance transacional'

  -- 4. MÓDULOS DE EXPANSÃO SAAS v2.6.0 (ETAPA 2 - POST-MIGRATIONS)
  UNION ALL
  SELECT 'Assinaturas: assinaturas_documentos', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assinaturas_documentos') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Módulo universal de assinaturas digitais'
  UNION ALL
  SELECT 'Assinaturas: assinantes_documento', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assinantes_documento') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Signatários de documentos'
  UNION ALL
  SELECT 'Social Media: social_media_posts', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_media_posts') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Hub de publicações e redes sociais'
  UNION ALL
  SELECT 'Parceiros: parceiros', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Cadastro unificado de parceiros comerciais'
  UNION ALL
  SELECT 'Representação: representacoes_comerciais', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'representacoes_comerciais') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Catálogo de veículos e representações'
  UNION ALL
  SELECT 'Contratos: contratos_representacao', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contratos_representacao') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Contratos de representação comercial de veículos'
  UNION ALL
  SELECT 'Checking & Settlement: pi_checking_events', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pi_checking_events') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Comprovação de veiculação e checking de PIs'
  UNION ALL
  SELECT 'Inteligência: estrategias_ia', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estrategias_ia') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Módulo de estratégias geradas por IA'
  UNION ALL
  SELECT 'Copiloto: copiloto_chats', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'copiloto_chats') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Sessões do copiloto comercial Gemini'
  UNION ALL
  SELECT 'Inventário: rotas_inventario', '4. MODULOS_V260',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rotas_inventario') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Geolocalização de rotas de mídia'

  -- 5. ROW LEVEL SECURITY (RLS ATIVO EM TABELAS FUNDAMENTAIS)
  UNION ALL
  SELECT 'RLS: public.tenants', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado'
  UNION ALL
  SELECT 'RLS: public.profiles', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado'
  UNION ALL
  SELECT 'RLS: public.user_roles', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado'
  UNION ALL
  SELECT 'RLS: public.clientes', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado'
  UNION ALL
  SELECT 'RLS: public.agencias', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agencias' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado'
  UNION ALL
  SELECT 'RLS: public.propostas', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'propostas' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado'
  UNION ALL
  SELECT 'RLS: public.pis', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pis' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado'
  UNION ALL
  SELECT 'RLS: public.auditoria_alteracoes', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auditoria_alteracoes' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado'
  UNION ALL
  SELECT 'RLS: public.produto_tipos', '5. SEGURANCA_RLS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'produto_tipos' AND rowsecurity = true) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'RLS habilitado (confirmando aplicação do Hotfix 211)'

  -- 6. POLÍTICAS RLS CONFIGURADAS (QUANTIDADE ADEQUADA)
  UNION ALL
  SELECT 'Políticas RLS em produto_tipos (>= 4)', '6. POLÍTICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'produto_tipos') >= 4 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas corrigidas de SELECT, INSERT, UPDATE e DELETE pelo Hotfix 211'
  UNION ALL
  SELECT 'Políticas RLS em tenants (>= 2)', '6. POLÍTICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants') >= 2 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas de super admin e leitura do próprio tenant'
  UNION ALL
  SELECT 'Políticas RLS em profiles (>= 2)', '6. POLÍTICAS_RLS',
         CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') >= 2 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Políticas de isolamento e atualização de perfil'

  -- 7. FUNÇÕES E TRIGGERS ESSENCIAIS
  UNION ALL
  SELECT 'Função public.current_tenant_id()', '7. FUNCOES_E_TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_tenant_id') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Resolução do tenant da sessão ativa'
  UNION ALL
  SELECT 'Função public.current_user_tenant_id()', '7. FUNCOES_E_TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_user_tenant_id') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Resolução do tenant para políticas RLS'
  UNION ALL
  SELECT 'Função public.has_role()', '7. FUNCOES_E_TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Checagem RBAC de papel ativo do usuário'
  UNION ALL
  SELECT 'Função public.is_admin()', '7. FUNCOES_E_TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Validação de perfil de administrador'
  UNION ALL
  SELECT 'Função public.is_super_admin()', '7. FUNCOES_E_TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Validação de perfil Super Admin'
  UNION ALL
  SELECT 'Trigger on_auth_user_created', '7. FUNCOES_E_TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Gatilho de signup automático no auth.users'
  UNION ALL
  SELECT 'Trigger trg_produto_tipos_set_tenant', '7. FUNCOES_E_TRIGGERS',
         CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_produto_tipos_set_tenant') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Auto-atribuição de tenant_id em produto_tipos (Hotfix 211)'

  -- 8. ÍNDICES E CONSTRAINTS CRÍTICOS
  UNION ALL
  SELECT 'Índice idx_produto_tipos_tenant_midia_nome', '8. CONSTRAINTS_E_INDICES',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_produto_tipos_tenant_midia_nome') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Unicidade de tipos por tenant, mídia e nome'
  UNION ALL
  SELECT 'Índice idx_profiles_tenant_id', '8. CONSTRAINTS_E_INDICES',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_tenant_id') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Performance de buscas de perfis por inquilino'
  UNION ALL
  SELECT 'Índice idx_clientes_tenant_id', '8. CONSTRAINTS_E_INDICES',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clientes_tenant_id') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Isolamento multi-tenant de clientes'

  -- 9. AUDITORIA DE PERMISSÕES E ZERO EXPOSIÇÃO A ANON
  UNION ALL
  SELECT 'Ausência de permissões administrativas a anon', '9. PERMISSOES_SEGURANCA',
         CASE WHEN NOT EXISTS (
           SELECT 1 FROM information_schema.role_table_grants
           WHERE grantee = 'anon' AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
             AND table_name IN ('tenants', 'profiles', 'user_roles', 'auditoria_alteracoes')
         ) THEN 'APROVADO' ELSE 'REPROVADO' END,
         'Garante que o papel anon não possui privilégios destrutivos em tabelas core'
  UNION ALL
  SELECT 'Permissão USAGE no schema public para authenticated', '9. PERMISSOES_SEGURANCA',
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.usage_privileges
           WHERE grantee = 'authenticated' AND object_schema = 'public'
         ) THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Acesso concedido aos usuários logados via PostgREST'

  -- 10. DADOS FUNDAMENTAIS E VOLUME TOTAL DE TABELAS
  UNION ALL
  SELECT 'Tenant Raiz TV Brasília (a711a129-330c-46bf-943a-531cedd4f2ff)', '10. INTEGRIDADE_GERAL',
         CASE WHEN EXISTS (SELECT 1 FROM public.tenants WHERE id = 'a711a129-330c-46bf-943a-531cedd4f2ff') THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Tenant padrão de homologação ativo'
  UNION ALL
  SELECT 'Volume Total de Tabelas no Schema Public (>= 80 tabelas)', '10. INTEGRIDADE_GERAL',
         CASE WHEN (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') >= 80 THEN 'APROVADO' ELSE 'PENDENTE' END,
         'Garante a presença física de todos os módulos de v2.6.0'
)
SELECT categoria, item, status, detalhe
FROM verificacao
ORDER BY categoria, item;
