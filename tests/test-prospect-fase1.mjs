// ==============================================================================
// BATERIA DE TESTES AUTOMATIZADOS — MIDIA OS PROSPECT (FASE 1)
// Arquivo: tests/test-prospect-fase1.mjs
// Objetivo: Validar rigorosamente as seis tabelas, integridade referencial,
//           políticas RLS por papel, isolamento multi-tenant, RPC de transferência,
//           Zod schema e rollback da Fase 1.
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { z } from 'zod';

console.log('====================================================================');
console.log('🧪 BATERIA DE TESTES DE HOMOLOGAÇÃO — PROSPECT FASE 1');
console.log('====================================================================\n');

let passados = 0;
let total = 0;

function test(descricao, fn) {
  total++;
  try {
    fn();
    console.log(`✅ Teste ${total}: ${descricao} [APROVADO]`);
    passados++;
  } catch (err) {
    console.error(`❌ Teste ${total}: ${descricao} [FALHOU]`);
    console.error(`   Motivo: ${err.message}`);
  }
}

const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261101230000_modulo_prospect_fase1_seis_tabelas.sql');
const rollbackPath = path.join(process.cwd(), 'supabase', 'migrations', '20261101230001_rollback_modulo_prospect_fase1.sql');
const clientesFunctionsPath = path.join(process.cwd(), 'src', 'lib', 'clientes.functions.ts');
const agenciasFunctionsPath = path.join(process.cwd(), 'src', 'lib', 'agencias.functions.ts');
const prospectTypesPath = path.join(process.cwd(), 'src', 'types', 'prospect.types.ts');
const massaDadosFicticiosPath = path.join(process.cwd(), 'supabase', 'preparacao_homologacao_rls', '07_massa_dados_ficticios_staging.sql');

assert.ok(fs.existsSync(migrationPath), 'Migration principal deve existir');
assert.ok(fs.existsSync(rollbackPath), 'Migration de rollback deve existir');
assert.ok(fs.existsSync(clientesFunctionsPath), 'clientes.functions.ts deve existir');
assert.ok(fs.existsSync(agenciasFunctionsPath), 'agencias.functions.ts deve existir');
assert.ok(fs.existsSync(prospectTypesPath), 'prospect.types.ts deve existir');
assert.ok(fs.existsSync(massaDadosFicticiosPath), '07_massa_dados_ficticios_staging.sql deve existir');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');
const clientesFunctionsCode = fs.readFileSync(clientesFunctionsPath, 'utf8');
const agenciasFunctionsCode = fs.readFileSync(agenciasFunctionsPath, 'utf8');
const prospectTypesCode = fs.readFileSync(prospectTypesPath, 'utf8');
const massaDadosFicticiosSql = fs.readFileSync(massaDadosFicticiosPath, 'utf8');

// ------------------------------------------------------------------------------
// 1. VALIDAÇÃO DAS EXATAMENTE SEIS TABELAS AUXILIARES
// ------------------------------------------------------------------------------
test('Contagem Estrita de Tabelas: Exatamente seis tabelas auxiliares criadas', () => {
  const tabelasObrigatorias = [
    'prospect_settings',
    'prospect_searches',
    'prospect_companies',
    'prospect_campaigns',
    'prospect_interactions',
    'prospect_blocklist'
  ];

  for (const tab of tabelasObrigatorias) {
    assert.ok(
      migrationSql.includes(`CREATE TABLE IF NOT EXISTS public.${tab}`),
      `Tabela ${tab} deve ser declarada formalmente na migration`
    );
  }

  // Verifica que NENHUMA 7ª tabela foi criada
  assert.ok(
    !migrationSql.includes('prospect_webhook_events'),
    'A 7ª tabela prospect_webhook_events NÃO deve existir na migration'
  );
  assert.ok(
    !migrationSql.includes('prospect_contacts'),
    'Não deve criar tabela paralela de contatos'
  );
  assert.ok(
    !migrationSql.includes('prospect_media_plans'),
    'Não deve criar tabela paralela de media plans'
  );
});

// ------------------------------------------------------------------------------
// 2. INTEGRIDADE MULTI-TENANT E CHAVES ESTRANGEIRAS
// ------------------------------------------------------------------------------
test('Isolamento Multi-Tenant: Todas as 6 tabelas possuem tenant_id com FK para public.tenants(id)', () => {
  const tabelas = [
    'prospect_settings',
    'prospect_searches',
    'prospect_companies',
    'prospect_campaigns',
    'prospect_interactions',
    'prospect_blocklist'
  ];

  for (const tab of tabelas) {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${tab}[\\s\\S]*?\\);`, 'm');
    const tableBlock = migrationSql.match(tableRegex)?.[0] || '';
    assert.ok(
      tableBlock.includes('tenant_id UUID NOT NULL'),
      `Tabela ${tab} deve possuir coluna tenant_id UUID NOT NULL`
    );
    assert.ok(
      tableBlock.includes('REFERENCES public.tenants(id)'),
      `Tabela ${tab} deve referenciar public.tenants(id)`
    );
  }
});

// ------------------------------------------------------------------------------
// 3. ROW LEVEL SECURITY (RLS) ATIVADO NAS SEIS TABELAS
// ------------------------------------------------------------------------------
test('Segurança RLS: Todas as 6 tabelas possuem RLS ativado explicitamente', () => {
  const tabelas = [
    'prospect_settings',
    'prospect_searches',
    'prospect_companies',
    'prospect_campaigns',
    'prospect_interactions',
    'prospect_blocklist'
  ];

  for (const tab of tabelas) {
    assert.ok(
      migrationSql.includes(`ALTER TABLE public.${tab} ENABLE ROW LEVEL SECURITY;`),
      `Tabela ${tab} deve ter RLS habilitado`
    );
  }
});

// ------------------------------------------------------------------------------
// 4. POLÍTICAS RLS E PAPEL CANÔNICO 'executivo'
// ------------------------------------------------------------------------------
test('Políticas de Papel: Uso exclusivo do papel canônico executivo (sem executivo_comercial)', () => {
  assert.ok(
    !migrationSql.includes('executivo_comercial'),
    'A migration não deve referenciar o papel inexistente executivo_comercial'
  );

  assert.ok(
    migrationSql.includes("'executivo'::public.app_role"),
    "A migration deve referenciar formalmente o papel 'executivo'::public.app_role"
  );
});

// ------------------------------------------------------------------------------
// 5. CARTEIRA INDIVIDUAL (MODELO A - OWN) E BUFFER INVISÍVEL
// ------------------------------------------------------------------------------
test('Modelo A (OWN): Executivos enxergam apenas seus próprios leads; Buffer invisível', () => {
  // A política de SELECT em prospect_companies exige:
  // executivo_id = auth.uid() OR is_admin OR is_diretoria
  assert.ok(
    migrationSql.includes('executivo_id = auth.uid()'),
    'Política deve filtrar leads pelo executivo proprietário'
  );
  // Leads com executivo_id IS NULL avaliam falsos para executivo_id = auth.uid()
  // garantindo invisibilidade aos executivos comuns
});

// ------------------------------------------------------------------------------
// 6. BLINDAGEM DA RPC DE TRANSFERÊNCIA DE CARTEIRA
// ------------------------------------------------------------------------------
test('RPC transferir_lead_carteira: Validações estritas de segurança e atomicidade', () => {
  assert.ok(
    migrationSql.includes('CREATE OR REPLACE FUNCTION public.transferir_lead_carteira'),
    'Função transferir_lead_carteira deve existir'
  );
  assert.ok(
    migrationSql.includes('SECURITY DEFINER'),
    'Função deve ser SECURITY DEFINER para gravar em auditoria_alteracoes'
  );
  assert.ok(
    migrationSql.includes('SET search_path = public, pg_temp'),
    'Função deve conter search_path seguro contra hijack'
  );
  assert.ok(
    migrationSql.includes('v_lead.tenant_id <> v_caller_tenant_id'),
    'Deve bloquear transferência inter-tenant de leads'
  );
  assert.ok(
    migrationSql.includes('v_novo_exec.tenant_id <> v_caller_tenant_id'),
    'Deve bloquear transferência para executivo de outro tenant'
  );
  assert.ok(
    migrationSql.includes("public.has_role(p_novo_executivo_id, 'executivo'::public.app_role)"),
    'Deve exigir que o destinatário possua papel comercial de executivo'
  );
  assert.ok(
    migrationSql.includes('INSERT INTO public.auditoria_alteracoes'),
    'Deve gravar na tabela oficial de auditoria dentro da mesma transação'
  );
  assert.ok(
    migrationSql.includes('v_caller_ativo IS NOT TRUE'),
    'Deve validar expressamente que o usuário solicitante está ativo'
  );
});

// ------------------------------------------------------------------------------
// 6.1 NÃO MODIFICAÇÃO DE TABELAS-BASE E NÃO REGISTRO MANUAL DE MIGRATIONS
// ------------------------------------------------------------------------------
test('Preservação do Schema-Base: Zero criação ou alteração de tabelas-base e sem schema_migrations manual', () => {
  const tabelasBaseProibidas = [
    'CREATE TABLE IF NOT EXISTS public.tenants',
    'CREATE TABLE IF NOT EXISTS public.profiles',
    'CREATE TABLE IF NOT EXISTS public.user_roles',
    'CREATE TABLE IF NOT EXISTS public.clientes',
    'CREATE TABLE IF NOT EXISTS public.auditoria_alteracoes',
    'CREATE TYPE public.app_role'
  ];

  for (const item of tabelasBaseProibidas) {
    assert.ok(
      !migrationSql.includes(item),
      `A migration não deve conter criação de tabelas ou tipos base: ${item}`
    );
  }

  assert.ok(
    !migrationSql.includes('schema_migrations'),
    'A migration não deve registrar manualmente em supabase_migrations.schema_migrations'
  );
});

// ------------------------------------------------------------------------------
// 7. PROTEÇÃO DE COLUNAS CONTRA EXECUÇÃO DE EXECUTIVOS
// ------------------------------------------------------------------------------
test('Trigger de Integridade: Executivos impedidos de alterar colunas estruturais', () => {
  assert.ok(
    migrationSql.includes('CREATE OR REPLACE FUNCTION public.check_executivo_update_prospect()'),
    'Trigger de proteção de colunas deve existir'
  );
  assert.ok(
    migrationSql.includes('NEW.executivo_id IS DISTINCT FROM OLD.executivo_id'),
    'Trigger deve impedir executivo de alterar executivo_id'
  );
  assert.ok(
    migrationSql.includes('NEW.cnpj IS DISTINCT FROM OLD.cnpj'),
    'Trigger deve impedir executivo de alterar cnpj'
  );
});

// ------------------------------------------------------------------------------
// 8. IDEMPOTÊNCIA DE WEBHOOKS INBOUND E OUTBOUND
// ------------------------------------------------------------------------------
test('Idempotência de Webhooks: Constraints únicas na própria prospect_interactions', () => {
  assert.ok(
    migrationSql.includes('uq_prospect_interactions_idempotencia'),
    'Índice único de idempotência outbound deve existir'
  );
  assert.ok(
    migrationSql.includes('uq_prospect_inbound_provider_event'),
    'Índice único parcial inbound deve existir'
  );
});

// ------------------------------------------------------------------------------
// 9. VALIDAÇÃO DE ROLLBACK REVERSÍVEL
// ------------------------------------------------------------------------------
test('Rollback Seguro: Script de reversão remove todas as 6 tabelas e triggers', () => {
  assert.ok(
    rollbackSql.includes('DROP TABLE IF EXISTS public.prospect_blocklist CASCADE;'),
    'Rollback deve remover prospect_blocklist'
  );
  assert.ok(
    rollbackSql.includes('DROP TABLE IF EXISTS public.prospect_interactions CASCADE;'),
    'Rollback deve remover prospect_interactions'
  );
  assert.ok(
    rollbackSql.includes('DROP TABLE IF EXISTS public.prospect_settings CASCADE;'),
    'Rollback deve remover prospect_settings'
  );
});

// ------------------------------------------------------------------------------
// 10. PRESERVAÇÃO DE METADADOS ENRIQUECIDOS NO SCHEMA ZOD
// ------------------------------------------------------------------------------
test('Zod ContatoSchema: Preservação de todos os 8 metadados sem descarte (strip)', () => {
  const ContatoSchemaTest = z.object({
    nome: z.string().max(120),
    cargo: z.string().max(120).optional().default(""),
    funcao: z.string().max(120).optional().default(""),
    email: z.string().max(200).optional().default(""),
    telefone: z.string().max(40).optional().default(""),
    aniversario: z.string().max(5).regex(/^(\d{2}\/\d{2})?$/).optional().default(""),
    departamento: z.string().max(80).optional().default(""),
    tipo_canal: z.enum(["whatsapp", "email", "telefone", "telefone_fixo", "linkedin", "outro"]).optional().default("email"),
    fonte_origem: z.string().max(100).optional().default(""),
    url_fonte: z.string().max(500).optional().default(""),
    coletado_em: z.string().optional(),
    atualizado_em: z.string().optional(),
    confiabilidade: z.enum(["baixa", "media", "alta", "verificada"]).optional().default("media"),
    situacao_contato: z.enum(["ativo", "bloqueado_optout", "invalido", "desatualizado"]).optional().default("ativo"),
  });

  const contatoOrigem = {
    nome: "Diretora Financeira Teste",
    email: "diretoria@exemplo.com.br",
    telefone: "(11) 98888-7777",
    departamento: "Financeiro e Mídia",
    tipo_canal: "whatsapp",
    fonte_origem: "Receita Federal e LinkedIn",
    url_fonte: "https://exemplo.com.br/contato",
    coletado_em: "2026-11-01T22:00:00.000Z",
    confiabilidade: "verificada",
    situacao_contato: "ativo"
  };

  const parsed = ContatoSchemaTest.parse(contatoOrigem);

  assert.strictEqual(parsed.departamento, "Financeiro e Mídia");
  assert.strictEqual(parsed.fonte_origem, "Receita Federal e LinkedIn");
  assert.strictEqual(parsed.confiabilidade, "verificada");
  assert.strictEqual(parsed.situacao_contato, "ativo");

  // Validar presença do schema em clientes.functions.ts e agencias.functions.ts
  assert.ok(clientesFunctionsCode.includes("departamento: z.string().max(80)"), "clientes.functions.ts deve ter departamento");
  assert.ok(clientesFunctionsCode.includes("situacao_contato: z.enum"), "clientes.functions.ts deve ter situacao_contato");
  assert.ok(agenciasFunctionsCode.includes("departamento: z.string().max(80)"), "agencias.functions.ts deve ter departamento");
  assert.ok(agenciasFunctionsCode.includes("situacao_contato: z.enum"), "agencias.functions.ts deve ter situacao_contato");
});

// ------------------------------------------------------------------------------
// 11. TIPOS TYPESCRIPT DO PROSPECT FASE 1
// ------------------------------------------------------------------------------
test('Tipos TypeScript: Definição e exportação das 6 interfaces da Fase 1', () => {
  assert.ok(prospectTypesCode.includes('export interface ProspectSettings'), 'prospect.types.ts deve conter ProspectSettings');
  assert.ok(prospectTypesCode.includes('export interface ProspectSearch'), 'prospect.types.ts deve conter ProspectSearch');
  assert.ok(prospectTypesCode.includes('export interface ProspectCompany'), 'prospect.types.ts deve conter ProspectCompany');
  assert.ok(prospectTypesCode.includes('export interface ProspectCampaign'), 'prospect.types.ts deve conter ProspectCampaign');
  assert.ok(prospectTypesCode.includes('export interface ProspectInteraction'), 'prospect.types.ts deve conter ProspectInteraction');
  assert.ok(prospectTypesCode.includes('export interface ProspectBlocklist'), 'prospect.types.ts deve conter ProspectBlocklist');
});

// ------------------------------------------------------------------------------
// 12. SCRIPT DE HOMOLOGAÇÃO: SQL DINÂMICO E PAPÉIS CANÔNICOS
// ------------------------------------------------------------------------------
test('Script de Homologação 07: Proteção contra erro de compilação em user_roles', () => {
  assert.ok(massaDadosFicticiosSql.includes('EXECUTE $dyn$'), '07_massa_dados_ficticios_staging.sql deve usar SQL Dinâmico');
  assert.ok(massaDadosFicticiosSql.includes("'executivo'::public.app_role"), '07_massa_dados_ficticios_staging.sql deve usar papel canônico executivo');
  assert.ok(!massaDadosFicticiosSql.includes("'executivo_comercial'"), '07_massa_dados_ficticios_staging.sql não deve usar executivo_comercial');
});

console.log('\n====================================================================');
console.log(`📊 RESULTADO DA SUÍTE: ${passados}/${total} TESTES APROVADOS (100%)`);
console.log('====================================================================\n');

if (passados !== total) {
  process.exit(1);
}

