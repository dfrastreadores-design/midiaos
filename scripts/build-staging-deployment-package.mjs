import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const schemaCompletoPath = path.join(process.cwd(), 'supabase', 'schema_completo.sql');

console.log('Compiling staging deployment package...\n');

// 1. Read schema_completo.sql
let coreSql = fs.readFileSync(schemaCompletoPath, 'utf8');

// ==============================================================================
// SANITIZAÇÃO DE SEGURANÇA E COMPATIBILIDADE NO CORE SCHEMA
// ==============================================================================

// A. Consolidar tipos enum no topo com todos os valores de v2.6.0
const enumsHeader = `-- ==============================================================================
-- 1. EXTENSÕES POSTGRESQL NATIVAS E TIPOS ENUM CONSOLIDADOS (MIDIA OS v2.6.0)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'executivo', 'opec', 'financeiro', 'diretoria', 'producao', 'parceiro_comercial', 'super_admin', 'teste'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pi_status AS ENUM (
    'rascunho', 'enviado', 'aprovado', 'faturado', 'cancelado', 'substituido',
    'aguardando_aprovacao', 'reprovado', 'aguardando_assinatura', 'assinado',
    'enviar_opec', 'veiculado', 'encerrado', 'finalizado'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.projeto_status AS ENUM ('em_comercializacao', 'vendido', 'encerrado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notificacao_tipo AS ENUM (
    'novo_pi', 'pi_anexado', 'campanha_finalizando', 'projeto_finalizando', 'outro',
    'campanha_iniciando', 'campanha_progresso', 'proposta_vencendo',
    'pi_aguardando_aprovacao', 'pi_aprovado', 'pi_reprovado', 'producao_solicitada', 'pi_renovado'
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
    'agencia_publicidade', 'produtora', 'grafica', 'estudio', 'assessoria_imprensa',
    'marketing_digital', 'evento', 'editora'
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
`;

// Remover comandos repetidos/dispersos de CREATE TYPE e ALTER TYPE ADD VALUE
coreSql = coreSql.replace(/CREATE\s+TYPE\s+public\.\w+\s+AS\s+ENUM\s*\([^)]+\);/gi, '-- [Consolidado no topo] CREATE TYPE');
coreSql = coreSql.replace(/ALTER\s+TYPE\s+public\.\w+\s+ADD\s+VALUE[^;]+;/gi, '-- [Consolidado no topo] ALTER TYPE ADD VALUE');

// B. Neutralizar DML direta em auth.users e auth.identities
coreSql = coreSql.replace(/UPDATE\s+auth\.users\s+SET\s+encrypted_password[\s\S]*?;\s*/gi, '-- [Higienização] UPDATE auth.users suprimido\n');
coreSql = coreSql.replace(/UPDATE\s+auth\.users\s+SET\s+banned_until[\s\S]*?;\s*/gi, '-- [Higienização] UPDATE auth.users suprimido\n');

// Proteger bloco DO cirúrgico de criação manual de usuário auth
coreSql = coreSql.replace(/DO\s+\$\$\s*DECLARE\s+v_uid\s+uuid;\s*BEGIN\s+SELECT\s+id\s+INTO\s+v_uid\s+FROM\s+auth\.users[\s\S]*?END\s+\$\$;/gi, '-- [Higienização] Injeção direta em auth.users suprimida; gerido via GoTrue/Signup\n');

// C. Corrigir o seed do Tenant TV Brasília para ter UUID fixo 'a711a129-330c-46bf-943a-531cedd4f2ff'
coreSql = coreSql.replace(
  /INSERT INTO public\.tenants \(razao_social, nome_fantasia, plano, ciclo, valor_mensal, status, observacoes\)[\s\S]*?WHERE NOT EXISTS \(SELECT 1 FROM public\.tenants WHERE razao_social = 'TV Brasília'\);/gi,
  `INSERT INTO public.tenants (id, razao_social, nome_fantasia, plano, ciclo, valor_mensal, status, observacoes)
VALUES ('a711a129-330c-46bf-943a-531cedd4f2ff', 'TV Brasília', 'TV Brasília', 'enterprise', 'mensal', 0, 'ativo', 'Cliente inicial — plano sob contrato.')
ON CONFLICT (id) DO NOTHING;`
);

// D. Suprimir manipulação de session_replication_role
coreSql = coreSql.replace(/SET\s+session_replication_role\s*=\s*replica\s*;/gi, '-- [Higienização] SET session_replication_role suprimido');
coreSql = coreSql.replace(/SET\s+session_replication_role\s*=\s*origin\s*;/gi, '-- [Higienização] SET session_replication_role suprimido');

// E. Tornar políticas e triggers idempotentes
coreSql = coreSql.replace(/CREATE\s+POLICY\s+("[^"]+"|[a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+(?:%I)?)/gi, (match, polName, tblName) => {
  if (tblName.includes('%') || tblName.includes('$') || polName.includes('%')) return match;
  return `DROP POLICY IF EXISTS ${polName} ON ${tblName};\nCREATE POLICY ${polName} ON ${tblName}`;
});

coreSql = coreSql.replace(/^(\s*CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)[\s\S]*?ON\s+([a-zA-Z0-9_.]+))/gmi, (match, full, trgName, tblName) => {
  if (tblName.includes('%') || tblName.includes('$') || trgName.includes('%')) return match;
  return `DROP TRIGGER IF EXISTS ${trgName} ON ${tblName};\n${full.trimStart()}`;
});

coreSql = coreSql.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF NOT EXISTS\s+)([a-zA-Z0-9_]+)/gi, 'CREATE $1INDEX IF NOT EXISTS $2');
coreSql = coreSql.replace(/CREATE\s+TABLE\s+(?!IF NOT EXISTS\s+)public\.([a-zA-Z0-9_]+)/gi, 'CREATE TABLE IF NOT EXISTS public.$1');

// F. Revisão estrita de privilégios: anon NUNCA recebe EXECUTE ou SELECT universal
const permissionsFooter = `
-- ==============================================================================
-- PERMISSÕES DE SCHEMA REVISADAS (MÍNIMO PRIVILÉGIO - ZERO GRANT INDISCRIMINADO)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Revogação explícita de acessos amplos indevidos para anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

NOTIFY pgrst, 'reload schema';
`;

const finalCoreSql = enumsHeader + '\n\n' + coreSql + '\n\n' + permissionsFooter;
fs.writeFileSync('supabase/01_midiaos_v260_core_schema.sql', finalCoreSql, 'utf8');
console.log('Gerado: supabase/01_midiaos_v260_core_schema.sql (' + Math.round(finalCoreSql.length / 1024) + ' KB)');

// ==============================================================================
// PARTE 2: MIGRATIONS 153 A 208 (Módulos Verticais SaaS v2.6.0)
// ==============================================================================
const postMigrationFiles = fs.readdirSync(migrationsDir).filter(f => {
  return f.endsWith('.sql') &&
         f > '20260923120000_multi_tenant_isolation.sql' &&
         !f.includes('prospect') &&
         f !== 'fix_produto_tipos_rls.sql';
}).sort();

// Adicionar hotfix no final
postMigrationFiles.push('fix_produto_tipos_rls.sql');

console.log(`Compiling ${postMigrationFiles.length} post-isolation migrations...`);

let postSql = `-- ==============================================================================
-- MIDIA OS v2.6.0 — MÓDULOS DE EXPANSÃO SAAS (MIGRATIONS 153 A 208)
-- Arquivo: supabase/02_midiaos_v260_post_migrations.sql
-- Ambiente Autorizado: Exclusivo para Staging (wsologhmptielhhnbgob)
-- ==============================================================================
`;

for (const mf of postMigrationFiles) {
  const mPath = path.join(migrationsDir, mf);
  if (!fs.existsSync(mPath)) continue;
  let mContent = fs.readFileSync(mPath, 'utf8');

  // Higienizar DML direta em auth.users
  mContent = mContent.replace(/UPDATE\s+auth\.users[\s\S]*?;\s*/gi, '-- [Higienização] UPDATE auth.users suprimido\n');
  mContent = mContent.replace(/INSERT\s+INTO\s+auth\.users[\s\S]*?;\s*/gi, '-- [Higienização] INSERT auth.users suprimido\n');

  postSql += `\n\n-- ------------------------------------------------------------------------------\n`;
  postSql += `-- MIGRATION: ${mf}\n`;
  postSql += `-- ------------------------------------------------------------------------------\n`;
  postSql += mContent;
}

postSql += '\n\n' + permissionsFooter;
fs.writeFileSync('supabase/02_midiaos_v260_post_migrations.sql', postSql, 'utf8');
console.log('Gerado: supabase/02_midiaos_v260_post_migrations.sql (' + Math.round(postSql.length / 1024) + ' KB)');
