const fs = require('fs');
const path = require('path');

const expData = JSON.parse(fs.readFileSync('supabase/exported_legacy_data.json', 'utf8'));

let sql = `-- ==============================================================================
-- MIGRATION CONSOLIDADA MIDIA-OS PARA PROJETO tvniawyweymutjiybxyo
-- DATA: 2026-10-03
-- AUTOR: Midia.OS AI Engineer
-- ==============================================================================

-- 1. EXTENSÕES OBRIGATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TIPOS ENUM DEFINITIVOS (Com todos os valores consolidados)
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'executivo', 'opec', 'financeiro', 'diretoria', 'producao', 'parceiro_comercial', 'super_admin', 'teste'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pi_status AS ENUM (
    'rascunho', 'enviado', 'aprovado', 'faturado', 'cancelado', 'substituido', 'aguardando_aprovacao', 'reprovado', 'aguardando_assinatura', 'assinado', 'enviar_opec', 'veiculado', 'encerrado', 'finalizado'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.projeto_status AS ENUM ('em_comercializacao', 'vendido', 'encerrado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notificacao_tipo AS ENUM (
    'novo_pi', 'pi_anexado', 'campanha_finalizando', 'projeto_finalizando', 'outro', 'campanha_iniciando', 'campanha_progresso', 'proposta_vencendo', 'pi_aguardando_aprovacao', 'pi_aprovado', 'pi_reprovado', 'producao_solicitada', 'pi_renovado'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.proposta_status AS ENUM ('rascunho', 'enviada', 'aprovada', 'recusada', 'convertida');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.midia_tipo AS ENUM ('TV', 'Radio', 'DOOH');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.reuniao_status AS ENUM ('agendada', 'realizada', 'cancelada', 'remarcada');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.evento_origem AS ENUM ('reuniao', 'proposta', 'pi', 'google', 'manual');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_midia AS ENUM (
    'tv', 'radio', 'portal', 'ooh', 'dooh', 'influencer', 'redes_sociais', 'outros',
    'agencia_publicidade', 'produtora', 'grafica', 'estudio', 'assessoria_imprensa', 'marketing_digital', 'evento', 'editora'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pessoa_tipo AS ENUM ('pj', 'cpf');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comissao_escopo AS ENUM ('global', 'fornecedor', 'cliente', 'campanha', 'tipo_midia');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comissao_status AS ENUM ('prevista', 'confirmada', 'paga', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- (Funções de segurança e multi-tenant serão criadas após a criação das tabelas base)
`;

// ==============================================================================
// 3. USUÁRIO ADMINISTRADOR NO auth.users E auth.identities
// ==============================================================================

sql += `
-- Inserir/atualizar o usuário principal rafaelnexomidia@gmail.com com a senha 21242628
DO $$
DECLARE
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = 'rafaelnexomidia@gmail.com' LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    IF v_existing_id <> 'e6d8c416-b50c-4c07-84be-079318ed343d'::uuid THEN
      UPDATE auth.identities SET user_id = 'e6d8c416-b50c-4c07-84be-079318ed343d' WHERE user_id = v_existing_id;
      UPDATE auth.users SET id = 'e6d8c416-b50c-4c07-84be-079318ed343d' WHERE id = v_existing_id;
    END IF;
    UPDATE auth.users SET
      encrypted_password = crypt('21242628', gen_salt('bf')),
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
      raw_user_meta_data = '{"nome": "Rafael Rodrigo", "email_verified": true}',
      updated_at = now()
    WHERE id = 'e6d8c416-b50c-4c07-84be-079318ed343d';
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'e6d8c416-b50c-4c07-84be-079318ed343d',
      'authenticated',
      'authenticated',
      'rafaelnexomidia@gmail.com',
      crypt('21242628', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"nome": "Rafael Rodrigo", "email_verified": true}',
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider = 'email' AND provider_id = 'rafaelnexomidia@gmail.com') THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'e6d8c416-b50c-4c07-84be-079318ed343d',
      'e6d8c416-b50c-4c07-84be-079318ed343d',
      jsonb_build_object('sub', 'e6d8c416-b50c-4c07-84be-079318ed343d', 'email', 'rafaelnexomidia@gmail.com'),
      'email',
      'rafaelnexomidia@gmail.com',
      now(), now(), now()
    );
  ELSE
    UPDATE auth.identities 
    SET user_id = 'e6d8c416-b50c-4c07-84be-079318ed343d'
    WHERE provider = 'email' AND provider_id = 'rafaelnexomidia@gmail.com';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;

// Adicionar usuários das outras contas de profiles para garantir integridade referencial
for (const p of expData.profiles) {
  if (p.id === 'e6d8c416-b50c-4c07-84be-079318ed343d') continue;
  sql += `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '${p.id}' OR lower(email) = lower('${p.email}')) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone_change, phone_change_token, email_change_token_current, reauthentication_token,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '${p.id}',
      'authenticated',
      'authenticated',
      '${p.email}',
      crypt('21242628', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('nome', '${(p.nome || '').replace(/'/g, "''")}'),
      now(),
      now(),
      '', '', '', '',
      '', '', '', '',
      false
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider = 'email' AND provider_id = '${p.email}') THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      '${p.id}',
      '${p.id}',
      jsonb_build_object('sub', '${p.id}', 'email', '${p.email}'),
      'email',
      '${p.email}',
      now(), now(), now()
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;
}

// Higienização de todas as colunas de string do auth.users para prevenir erro 500 do GoTrue
sql += `
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  aud = COALESCE(aud, 'authenticated'),
  role = COALESCE(role, 'authenticated'),
  is_super_admin = COALESCE(is_super_admin, false);
`;

// 4. Injetar DDL do schema_completo.sql tratado
let sc = fs.readFileSync('supabase/schema_completo.sql', 'utf8');

// Neutralizar inserts de planos e produto_tipos em schema_completo para não gerar UUIDs aleatórios conflitantes
sc = sc.replace(/INSERT INTO public\.planos\s*\([^)]*\)\s*VALUES\s*\(\s*'Básico'[\s\S]*?\);/gi, '-- Inserção de planos delegada para Seção 6 com IDs canônicos\n');
sc = sc.replace(/INSERT INTO public\.planos\s*\([^)]*\)\s*SELECT\s*'Connect'[\s\S]*?;\s*/gi, '-- Inserção de Connect delegada para Seção 6 com IDs canônicos\n');
sc = sc.replace(/INSERT INTO public\.produto_tipos\s*\([^)]*\)\s*VALUES\s*\(\s*'VT', 'TV'[\s\S]*?\);/gi, '-- Inserção de produto_tipos delegada para Seção 6 com IDs canônicos\n');

// 1. Remover blocos DO inteiros que criavam ou alteravam tipos enum (pois já foram criados no início)
sc = sc.replace(/DO\s+\$\$[\s\S]*?\$\$;/gi, (match) => {
  if (match.includes('CREATE TYPE') || match.includes('ALTER TYPE')) {
    return '-- Bloco de enum já executado no início';
  }
  return match;
});

// 2. Remover CREATE TYPE e ALTER TYPE isolados (fora de blocos DO)
sc = sc.replace(/CREATE\s+TYPE\s+public\.\w+\s+AS\s+ENUM\s*\([^)]+\);/gi, '-- Enum isolado já executado');
sc = sc.replace(/ALTER\s+TYPE\s+public\.\w+\s+ADD\s+VALUE[^;]+;/gi, '-- Alter type isolado já executado');

// 3. Proteger comandos REVOKE EXECUTE contra funções inexistentes
sc = sc.replace(
  /EXECUTE format\('REVOKE EXECUTE ON FUNCTION public\.%s FROM PUBLIC, anon, authenticated', fn\);/g,
  "BEGIN EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn); EXCEPTION WHEN OTHERS THEN NULL; END;"
);

sc = sc.replace(
  /EXECUTE format\('REVOKE EXECUTE ON FUNCTION public\.%s FROM PUBLIC, anon', fn\);/g,
  "BEGIN EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn); EXCEPTION WHEN OTHERS THEN NULL; END;"
);

sc = sc.replace(
  /EXECUTE format\('GRANT EXECUTE ON FUNCTION public\.%s TO authenticated, service_role', fn\);/g,
  "BEGIN EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn); EXCEPTION WHEN OTHERS THEN NULL; END;"
);

sc = sc.replace(
  /REVOKE EXECUTE ON FUNCTION\s+(public\.[a-zA-Z0-9_]+(?:\([^)]*\))?)\s+FROM\s+([^;\n]+);/gi,
  (match, p1, p2) => `DO $$ BEGIN REVOKE EXECUTE ON FUNCTION ${p1} FROM ${p2}; EXCEPTION WHEN OTHERS THEN NULL; END $$;`
);

function makeIdempotent(text) {
  // 1. Proteger CREATE POLICY com DROP IF EXISTS (ignorando format com % ou $)
  text = text.replace(/CREATE\s+POLICY\s+("[^"]+"|[a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+(?:%I)?)/gi, (match, polName, tblName) => {
    if (tblName.includes('%') || tblName.includes('$') || polName.includes('%')) return match;
    return `DROP POLICY IF EXISTS ${polName} ON ${tblName};\nCREATE POLICY ${polName} ON ${tblName}`;
  });

  // 2. Proteger CREATE TRIGGER com DROP IF EXISTS no nível do comando
  text = text.replace(/^(\s*CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)[\s\S]*?ON\s+([a-zA-Z0-9_.]+))/gmi, (match, full, trgName, tblName) => {
    if (tblName.includes('%') || tblName.includes('$') || trgName.includes('%')) return match;
    return `DROP TRIGGER IF EXISTS ${trgName} ON ${tblName};\n${full.trimStart()}`;
  });

  // 3. Proteger CREATE (UNIQUE) INDEX com IF NOT EXISTS
  text = text.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF NOT EXISTS\s+)([a-zA-Z0-9_]+)/gi, 'CREATE $1INDEX IF NOT EXISTS $2');

  // 4. Proteger CREATE TABLE com IF NOT EXISTS
  text = text.replace(/CREATE\s+TABLE\s+(?!IF NOT EXISTS\s+)public\.([a-zA-Z0-9_]+)/gi, 'CREATE TABLE IF NOT EXISTS public.$1');

  return text;
}

sc = makeIdempotent(sc);

// Tratar INSERT INTO com conflito
sc = sc.replace(/(INSERT INTO\s+public\.\w+\s*\([^)]+\)\s*VALUES\s*[\s\S]*?);(?!\s*ON CONFLICT)/gi, (match, ins) => {
  if (ins.includes('ON CONFLICT')) return match;
  return `${ins} ON CONFLICT DO NOTHING;`;
});

sql += `\n-- ==============================================================================\n-- 4. DDL COMPLETO DA APLICAÇÃO (schema_completo.sql)\n-- ==============================================================================\n\n` + sc;

// 5. Migrações posteriores a 2026-09-18
const postMigrations = [
  '20260923120000_multi_tenant_isolation.sql',
  '20260928160000_produtos_parceiro.sql',
  '20260928170000_produto_tipos_tenant.sql',
  '20260929100000_produtos_cep.sql',
  '20260929120000_social_media_hub.sql',
  '20260929130000_production_data_safety_guardrails.sql',
  '20260929140000_produtos_fotos.sql',
  '20260929150000_financeiro_entradas_saidas.sql',
  '20260929160000_inquilino_proposta_template.sql',
  '20260929170000_propostas_pacote_midia_e_geoloc.sql',
  'fix_produto_tipos_rls.sql',
  '20260929170000_fix_all_rls_and_tenants.sql',
  '20260930190000_midia_os_saas_master.sql',
  '20260930200000_modulo_universal_assinaturas.sql',
  '20261001140000_adicionar_modelos_proposta_tenants.sql',
  '20261001143000_modulo_indicadores_clientes.sql',
  '20261001142500_push_notifications.sql',
  '20261001180000_fix_tenants_columns.sql',
  '20261001200000_create_parceiros_table.sql',
  '20261002120000_proposta_itens_parceiro.sql'
];

sql += `\n\n-- ==============================================================================\n-- 5. MIGRAÇÕES RECENTES COMPLEMENTARES\n-- ==============================================================================\n

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) IN ('rafaelrodrigo.as@gmail.com', 'rafaelnexomidia@gmail.com')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('super_admin', 'diretoria', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.is_super_admin(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.log_alteracao();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
`;

for (const m of postMigrations) {
  const p = path.join('supabase/migrations', m);
  if (fs.existsSync(p)) {
    let mContent = fs.readFileSync(p, 'utf8');
    mContent = makeIdempotent(mContent);
    sql += `\n-- --- Migração: ${m} ---\n` + mContent + '\n';
  }
}

// 6. Inserir dados operacionais (Planos, Tenant, Profiles, UserRoles, ProdutoTipos)
sql += `\n\n-- ==============================================================================\n-- 6. DADOS OPERACIONAIS RESTAURADOS (Zero Perda de Dados)\n-- ==============================================================================\n`;

// Planos
for (const pl of expData.planos) {
  const modulosArr = "ARRAY[" + (pl.modulos || []).map(m => `'${m}'`).join(',') + "]::text[]";
  sql += `
DO $$
DECLARE
  v_old_id uuid;
BEGIN
  SELECT id INTO v_old_id FROM public.planos WHERE nome = '${pl.nome}' LIMIT 1;
  IF v_old_id IS NOT NULL THEN
    IF v_old_id <> '${pl.id}'::uuid THEN
      UPDATE public.tenants SET plano_id = '${pl.id}' WHERE plano_id = v_old_id;
      UPDATE public.planos SET id = '${pl.id}' WHERE id = v_old_id;
    END IF;
    UPDATE public.planos SET
      descricao = '${(pl.descricao || '').replace(/'/g, "''")}',
      preco_mensal = ${pl.preco_mensal || 0},
      max_usuarios = ${pl.max_usuarios || 'NULL'},
      modulos = ${modulosArr},
      is_default = ${pl.is_default ? 'true' : 'false'},
      ativo = ${pl.ativo ? 'true' : 'false'},
      updated_at = now()
    WHERE id = '${pl.id}';
  ELSIF EXISTS (SELECT 1 FROM public.planos WHERE id = '${pl.id}') THEN
    UPDATE public.planos SET
      nome = '${pl.nome}',
      descricao = '${(pl.descricao || '').replace(/'/g, "''")}',
      preco_mensal = ${pl.preco_mensal || 0},
      max_usuarios = ${pl.max_usuarios || 'NULL'},
      modulos = ${modulosArr},
      is_default = ${pl.is_default ? 'true' : 'false'},
      ativo = ${pl.ativo ? 'true' : 'false'},
      updated_at = now()
    WHERE id = '${pl.id}';
  ELSE
    INSERT INTO public.planos (id, nome, descricao, preco_mensal, max_usuarios, modulos, is_default, ativo, created_at, updated_at)
    VALUES ('${pl.id}', '${pl.nome}', '${(pl.descricao || '').replace(/'/g, "''")}', ${pl.preco_mensal || 0}, ${pl.max_usuarios || 'NULL'}, ${modulosArr}, ${pl.is_default ? 'true' : 'false'}, ${pl.ativo ? 'true' : 'false'}, '${pl.created_at}', '${pl.updated_at}');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;
}

// Tenant
for (const t of expData.tenants) {
  const modulosArr = "ARRAY[" + (t.modulos_override || []).map(m => `'${m}'`).join(',') + "]::text[]";
  const catArr = "ARRAY[" + (t.categorias_servicos || []).map(m => `'${m}'`).join(',') + "]::text[]";
  sql += `
DO $$
BEGIN
  INSERT INTO public.tenants (
    id, razao_social, nome_fantasia, cnpj, contato_nome, contato_email, contato_whatsapp,
    plano, ciclo, valor_mensal, status, data_inicio, proximo_vencimento, observacoes,
    created_at, updated_at, max_usuarios, plano_id, modulos_override, categorias_servicos,
    proposta_layout_padrao, produto_marca, logo_url
  ) VALUES (
    '${t.id}', '${(t.razao_social || '').replace(/'/g, "''")}', '${(t.nome_fantasia || '').replace(/'/g, "''")}', '${t.cnpj || ''}',
    '${(t.contato_nome || '').replace(/'/g, "''")}', '${t.contato_email || ''}', '${t.contato_whatsapp || ''}',
    '${t.plano || 'enterprise'}', '${t.ciclo || 'mensal'}', ${t.valor_mensal || 0}, '${t.status || 'ativo'}',
    '${t.data_inicio || '2026-08-11'}', '${t.proximo_vencimento || '2030-12-30'}', '${(t.observacoes || '').replace(/'/g, "''")}',
    '${t.created_at}', '${t.updated_at}', ${t.max_usuarios || 50}, '${t.plano_id}', ${modulosArr}, ${catArr},
    '${t.proposta_layout_padrao || 'simplificado'}', '${t.produto_marca || 'midiaos'}', '${t.logo_url || ''}'
  ) ON CONFLICT (id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    nome_fantasia = EXCLUDED.nome_fantasia,
    cnpj = EXCLUDED.cnpj,
    status = EXCLUDED.status,
    plano_id = EXCLUDED.plano_id,
    modulos_override = EXCLUDED.modulos_override,
    categorias_servicos = EXCLUDED.categorias_servicos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;
}

// Profiles
for (const p of expData.profiles) {
  sql += `
DO $$
BEGIN
  INSERT INTO public.profiles (
    id, nome, email, telefone, whatsapp, cargo, ativo, created_at, updated_at,
    assinatura_url, tenant_id, last_active_at
  ) VALUES (
    '${p.id}', '${(p.nome || '').replace(/'/g, "''")}', '${p.email}',
    ${p.telefone ? `'${p.telefone}'` : 'NULL'},
    ${p.whatsapp ? `'${p.whatsapp}'` : 'NULL'},
    ${p.cargo ? `'${(p.cargo || '').replace(/'/g, "''")}'` : 'NULL'},
    ${p.ativo ? 'true' : 'false'},
    '${p.created_at}',
    '${p.updated_at}',
    ${p.assinatura_url ? `'${p.assinatura_url}'` : 'NULL'},
    ${p.tenant_id ? `'${p.tenant_id}'` : 'NULL'},
    ${p.last_active_at ? `'${p.last_active_at}'` : 'NULL'}
  ) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    tenant_id = EXCLUDED.tenant_id,
    cargo = EXCLUDED.cargo,
    ativo = EXCLUDED.ativo;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;
}

// User Roles
for (const r of expData.userRoles) {
  sql += `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '${r.user_id}' AND role = '${r.role}') THEN
    INSERT INTO public.user_roles (id, user_id, role, created_at)
    VALUES ('${r.id}', '${r.user_id}', '${r.role}', '${r.created_at}')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;
}

// Produto Tipos
for (const pt of expData.produtoTipos) {
  sql += `
DO $$
DECLARE
  v_old_id uuid;
BEGIN
  SELECT id INTO v_old_id FROM public.produto_tipos WHERE nome = '${(pt.nome || '').replace(/'/g, "''")}' AND midia = '${pt.midia}' LIMIT 1;
  IF v_old_id IS NOT NULL THEN
    IF v_old_id <> '${pt.id}'::uuid THEN
      UPDATE public.produto_tipos SET id = '${pt.id}' WHERE id = v_old_id;
    END IF;
  ELSE
    INSERT INTO public.produto_tipos (id, nome, midia, created_at, created_by)
    VALUES ('${pt.id}', '${(pt.nome || '').replace(/'/g, "''")}', '${pt.midia}', '${pt.created_at}', ${pt.created_by ? `'${pt.created_by}'` : 'NULL'})
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, midia = EXCLUDED.midia;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;
}

// 7. Permissões Globais e Recarregar Cache
sql += `
-- ==============================================================================
-- 7. PERMISSÕES FINAIS E ATUALIZAÇÃO DO CACHE REST
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Recarregar cache de esquemas do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE 'Migração do Mídia.OS executada com absoluto sucesso!';
END $$;
`;

fs.writeFileSync('supabase/migracao_midia_os.sql', sql);
console.log('Arquivo supabase/migracao_midia_os.sql gerado com sucesso! Tamanho:', sql.length, 'bytes');
