-- ==============================================================================
-- ETAPA 6 - MASSA DE DADOS FICTÍCIOS PARA HOMOLOGAÇÃO (NÃO EXECUTADA)
-- ARQUIVO: 07_massa_dados_ficticios_staging.sql
-- OBJETIVO: Provisionar dados 100% fictícios para testes em ambiente de Staging.
-- REGRA MANDATÓRIA: NÃO executar em Produção. Apenas em projeto de teste isolado.
--
-- PRÉ-REQUISITO MANDATÓRIO DE AUTENTICAÇÃO:
--   A tabela public.profiles possui chave estrangeira id REFERENCES auth.users(id).
--   A tabela public.clientes possui executivo_id e created_by REFERENCES auth.users(id).
--   Antes da execução deste script em banco de Staging real, os seguintes UUIDs de teste
--   devem estar previamente cadastrados em auth.users (via Supabase Auth Admin API ou
--   rotina controlada de setup de testes):
--     • 11111111-aaaa-1111-aaaa-111111111111 (vendedor1.alfa@ficticio.test)
--     • 22222222-aaaa-2222-aaaa-222222222222 (vendedor2.alfa@ficticio.test)
--     • 33333333-aaaa-3333-aaaa-333333333333 (opec.alfa@ficticio.test)
--     • 44444444-aaaa-4444-aaaa-444444444444 (financeiro.alfa@ficticio.test)
--     • 99999999-aaaa-9999-aaaa-999999999999 (master.alfa@ficticio.test)
--     • 55555555-bbbb-5555-bbbb-555555555555 (vendedor1.beta@ficticio.test)
--     • 88888888-bbbb-8888-bbbb-888888888888 (master.beta@ficticio.test)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TENANTS FICTÍCIOS DE TESTE
-- ------------------------------------------------------------------------------
INSERT INTO public.tenants (id, razao_social, nome_fantasia, status, plano)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Empresa Alfa Mídia Fictícia Ltda', 'Alfa Mídia Teste', 'ativo', 'enterprise'),
  ('22222222-2222-2222-2222-222222222222', 'Empresa Beta Painéis Fictícia S/A', 'Beta OOH Teste', 'ativo', 'enterprise')
ON CONFLICT (id) DO UPDATE SET
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia;

-- ------------------------------------------------------------------------------
-- 2. PERFIS DE USUÁRIOS FICTÍCIOS (EMPRESA ALFA E BETA)
-- ------------------------------------------------------------------------------
-- Empresa Alfa
INSERT INTO public.profiles (id, nome, email, tenant_id, role, ativo)
VALUES
  ('11111111-aaaa-1111-aaaa-111111111111', 'Executivo Alfa 1 (Teste)', 'vendedor1.alfa@ficticio.test', '11111111-1111-1111-1111-111111111111', 'EXECUTIVO_COMERCIAL', true),
  ('22222222-aaaa-2222-aaaa-222222222222', 'Executivo Alfa 2 (Teste)', 'vendedor2.alfa@ficticio.test', '11111111-1111-1111-1111-111111111111', 'EXECUTIVO_COMERCIAL', true),
  ('33333333-aaaa-3333-aaaa-333333333333', 'OPEC Alfa (Teste)', 'opec.alfa@ficticio.test', '11111111-1111-1111-1111-111111111111', 'OPEC', true),
  ('44444444-aaaa-4444-aaaa-444444444444', 'Financeiro Alfa (Teste)', 'financeiro.alfa@ficticio.test', '11111111-1111-1111-1111-111111111111', 'FINANCEIRO', true),
  ('99999999-aaaa-9999-aaaa-999999999999', 'Master Empresa Alfa (Teste)', 'master.alfa@ficticio.test', '11111111-1111-1111-1111-111111111111', 'MASTER_EMPRESA', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  tenant_id = EXCLUDED.tenant_id,
  role = EXCLUDED.role;

-- Empresa Beta
INSERT INTO public.profiles (id, nome, email, tenant_id, role, ativo)
VALUES
  ('55555555-bbbb-5555-bbbb-555555555555', 'Executivo Beta 1 (Teste)', 'vendedor1.beta@ficticio.test', '22222222-2222-2222-2222-222222222222', 'EXECUTIVO_COMERCIAL', true),
  ('88888888-bbbb-8888-bbbb-888888888888', 'Master Empresa Beta (Teste)', 'master.beta@ficticio.test', '22222222-2222-2222-2222-222222222222', 'MASTER_EMPRESA', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  tenant_id = EXCLUDED.tenant_id,
  role = EXCLUDED.role;

-- Sincronizar papéis na tabela public.user_roles se ela existir no ambiente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    EXECUTE $dyn$
      INSERT INTO public.user_roles (user_id, role)
      VALUES
        ('11111111-aaaa-1111-aaaa-111111111111', 'executivo'::public.app_role),
        ('22222222-aaaa-2222-aaaa-222222222222', 'executivo'::public.app_role),
        ('33333333-aaaa-3333-aaaa-333333333333', 'opec'::public.app_role),
        ('44444444-aaaa-4444-aaaa-444444444444', 'financeiro'::public.app_role),
        ('99999999-aaaa-9999-aaaa-999999999999', 'admin'::public.app_role),
        ('55555555-bbbb-5555-bbbb-555555555555', 'executivo'::public.app_role),
        ('88888888-bbbb-8888-bbbb-888888888888', 'admin'::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    $dyn$;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. CLIENTES E AGÊNCIAS FICTÍCIOS
-- ------------------------------------------------------------------------------
INSERT INTO public.clientes (id, tenant_id, razao_social, nome_fantasia, cnpj, executivo_id, created_by, status)
VALUES
  ('c1111111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'Supermercado Modelo Fictício Ltda', 'Super Modelo', '11.222.333/0001-44', '11111111-aaaa-1111-aaaa-111111111111', '11111111-aaaa-1111-aaaa-111111111111', 'ativo'),
  ('c2222222-aaaa-2222-aaaa-222222222222', '11111111-1111-1111-1111-111111111111', 'Farmácia Bem Estar Fictícia S/A', 'Farmácia Bem Estar', '55.666.777/0001-88', '22222222-aaaa-2222-aaaa-222222222222', '22222222-aaaa-2222-aaaa-222222222222', 'ativo'),
  ('c5555555-bbbb-5555-bbbb-555555555555', '22222222-2222-2222-2222-222222222222', 'Auto Peças Beta Fictícia Eireli', 'Beta Auto Peças', '99.888.777/0001-66', '55555555-bbbb-5555-bbbb-555555555555', '55555555-bbbb-5555-bbbb-555555555555', 'ativo')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. PROPOSTAS COMERCIAIS FICTÍCIAS
-- Schema oficial alinhado:
--   • 'campanha' (TEXT NOT NULL) e 'valor_negociado' (NUMERIC NOT NULL)
--   • 'numero' (TEXT NOT NULL UNIQUE) fornecido explicitamente para independência de triggers
--   • 'status' em conformidade com o enum public.proposta_status ('rascunho', 'enviada', 'aprovada', 'recusada', 'convertida')
-- ------------------------------------------------------------------------------
INSERT INTO public.propostas (id, numero, tenant_id, cliente_id, campanha, valor_negociado, executivo_id, created_by, status)
VALUES
  ('d1111111-aaaa-1111-aaaa-111111111111', 'PROP-STAGING-ALFA-001', '11111111-1111-1111-1111-111111111111', 'c1111111-aaaa-1111-aaaa-111111111111', 'Campanha de Inauguração Alfa', 45000.00, '11111111-aaaa-1111-aaaa-111111111111', '11111111-aaaa-1111-aaaa-111111111111', 'aprovada'),
  ('d2222222-aaaa-2222-aaaa-222222222222', 'PROP-STAGING-ALFA-002', '11111111-1111-1111-1111-111111111111', 'c2222222-aaaa-2222-aaaa-222222222222', 'Campanha Black Friday Alfa', 30000.00, '22222222-aaaa-2222-aaaa-222222222222', '22222222-aaaa-2222-aaaa-222222222222', 'rascunho'),
  ('d5555555-bbbb-5555-bbbb-555555555555', 'PROP-STAGING-BETA-001', '22222222-2222-2222-2222-222222222222', 'c5555555-bbbb-5555-bbbb-555555555555', 'Campanha Rodovias Beta', 60000.00, '55555555-bbbb-5555-bbbb-555555555555', '55555555-bbbb-5555-bbbb-555555555555', 'enviada')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. PEDIDOS DE INSERÇÃO (INSERTION_ORDERS)
-- Utilização de SQL dinâmico para não falhar no parse caso a tabela opcional não exista
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'insertion_orders'
  ) THEN
    EXECUTE $dyn$
      INSERT INTO public.insertion_orders (
        id, 
        tenant_id, 
        pi_number, 
        client_id, 
        representative_id, 
        cnpj_cliente, 
        status, 
        gross_amount, 
        campaign_name
      )
      VALUES
        ('e1111111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'PI-ALFA-2026-001', 'c1111111-aaaa-1111-aaaa-111111111111', '11111111-aaaa-1111-aaaa-111111111111', '11.222.333/0001-44', 'approved', 45000.00, 'Inauguração Loja 1'),
        ('e5555555-bbbb-5555-bbbb-555555555555', '22222222-2222-2222-2222-222222222222', 'PI-BETA-2026-001', 'c5555555-bbbb-5555-bbbb-555555555555', '55555555-bbbb-5555-bbbb-555555555555', '99.888.777/0001-66', 'draft', 60000.00, 'Circuito Rodoviário 2026')
      ON CONFLICT (id) DO NOTHING;
    $dyn$;
  END IF;
END $$;
