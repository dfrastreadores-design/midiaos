// ==============================================================================
// TESTES AUTOMATIZADOS - ETAPA 4: HOMOLOGAÇÃO PREPARADA DE RLS E MULTIEMPRESA
// Projeto: midia.OS (D:\midiaos_build)
// Executado localmente via Node.js em modo simulado e estático (sem tocar no banco).
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('==================================================================');
console.log('🔒 TESTES DE HOMOLOGAÇÃO PREPARADA - ETAPA 4: RLS & MULTIEMPRESA');
console.log('==================================================================\n');

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

// ------------------------------------------------------------------------------
// Contexto dos Cenários de Homologação
// ------------------------------------------------------------------------------
const TENANT_ALFA = '11111111-1111-1111-1111-111111111111';
const TENANT_BETA = '22222222-2222-2222-2222-222222222222';

const MASTER_GLOBAL_EMAIL = 'rafaelrodrigo.as@gmail.com';

const userExecutivoAlfa1 = {
  id: 'exec-alfa-1',
  email: 'vendedor1@alfa.com',
  tenant_id: TENANT_ALFA,
  roles: ['executivo_comercial'],
  cnpj: null,
};

const userExecutivoAlfa2 = {
  id: 'exec-alfa-2',
  email: 'vendedor2@alfa.com',
  tenant_id: TENANT_ALFA,
  roles: ['executivo_comercial'],
  cnpj: null,
};

const userMasterEmpresaAlfa = {
  id: 'master-alfa',
  email: 'diretor@alfa.com',
  tenant_id: TENANT_ALFA,
  roles: ['master_empresa', 'admin'],
  cnpj: null,
};

const userOpecAlfa = {
  id: 'opec-alfa',
  email: 'opec@alfa.com',
  tenant_id: TENANT_ALFA,
  roles: ['opec'],
  cnpj: null,
};

const userFinanceiroAlfa = {
  id: 'fin-alfa',
  email: 'financeiro@alfa.com',
  tenant_id: TENANT_ALFA,
  roles: ['financeiro'],
  cnpj: null,
};

const userBeta = {
  id: 'user-beta',
  email: 'vendedor@beta.com',
  tenant_id: TENANT_BETA,
  roles: ['executivo_comercial'],
  cnpj: null,
};

const portalClienteCnpj = {
  id: 'portal-user-1',
  email: 'anunciante@cliente.com',
  tenant_id: null,
  roles: ['portal_cliente'],
  cnpj: '12345678000199',
};

// ------------------------------------------------------------------------------
// Motor Simulado das Novas Políticas RLS Preparadas
// ------------------------------------------------------------------------------
function evaluatePolicyInsertionOrders(op, record, user, jwtUserMetadata = {}) {
  const isSuperAdmin = user.email === MASTER_GLOBAL_EMAIL;
  if (isSuperAdmin) return true;

  // Portal Externo por CNPJ
  if (user.cnpj) {
    if (op === 'SELECT') {
      return record.cnpj_cliente === user.cnpj || record.cnpj_veiculo === user.cnpj;
    }
    return false;
  }

  // Defesa contra Spoofing de user_metadata: tenant e roles são estritamente do banco
  const userTenant = user.tenant_id;
  if (!userTenant || record.tenant_id !== userTenant) {
    // Bloqueia se o tenant não casar ou se o registro tiver tenant_id nulo
    return false;
  }

  const isTenantAdmin = user.roles.some((r) => ['master_empresa', 'admin', 'diretoria'].includes(r));
  const isOpec = user.roles.includes('opec');
  const isFinanceiro = user.roles.includes('financeiro');
  const isOwner = record.representative_id === user.id || record.created_by === user.id;

  if (op === 'SELECT') {
    return isTenantAdmin || isOpec || isFinanceiro || isOwner;
  }

  if (op === 'INSERT') {
    return isTenantAdmin || isOpec || isOwner;
  }

  if (op === 'UPDATE') {
    if (isTenantAdmin || isOpec || isFinanceiro) return true;
    if (isOwner && record.status === 'draft') return true;
    return false;
  }

  if (op === 'DELETE') {
    return isTenantAdmin;
  }

  return false;
}

function evaluatePolicyFinanceiroTransacoes(op, record, user) {
  const isSuperAdmin = user.email === MASTER_GLOBAL_EMAIL;
  if (isSuperAdmin) return true;

  if (!user.tenant_id || record.tenant_id !== user.tenant_id) {
    return false; // Cross-tenant ou tenant_id nulo bloqueado
  }

  const isTenantAdmin = user.roles.some((r) => ['master_empresa', 'admin'].includes(r));
  const isFinanceiro = user.roles.includes('financeiro');

  return isTenantAdmin || isFinanceiro;
}

// ------------------------------------------------------------------------------
// EXECUÇÃO DOS TESTES DE HOMOLOGAÇÃO
// ------------------------------------------------------------------------------

test('Isolamento Cross-Tenant: Usuário do Tenant Beta não pode ler nem alterar dados do Tenant Alfa', () => {
  const piAlfa = { id: 'pi-1', tenant_id: TENANT_ALFA, representative_id: userExecutivoAlfa1.id, status: 'approved' };
  
  const canSelect = evaluatePolicyInsertionOrders('SELECT', piAlfa, userBeta);
  const canUpdate = evaluatePolicyInsertionOrders('UPDATE', piAlfa, userBeta);

  assert.strictEqual(canSelect, false, 'Usuário de outro tenant não pode ler registro alheio');
  assert.strictEqual(canUpdate, false, 'Usuário de outro tenant não pode atualizar registro alheio');
});

test('Bloqueio Estrito de Registros Órfãos: Tentativa de ler registro com tenant_id = NULL é rejeitada', () => {
  const piOrfao = { id: 'pi-orfao', tenant_id: null, representative_id: userExecutivoAlfa1.id, status: 'draft' };

  const canSelectAlfa = evaluatePolicyInsertionOrders('SELECT', piOrfao, userExecutivoAlfa1);
  const canSelectBeta = evaluatePolicyInsertionOrders('SELECT', piOrfao, userBeta);
  const canUpdateAlfa = evaluatePolicyInsertionOrders('UPDATE', piOrfao, userExecutivoAlfa1);

  assert.strictEqual(canSelectAlfa, false, 'Usuário comum não deve acessar registros órfãos');
  assert.strictEqual(canSelectBeta, false, 'Outro tenant não deve acessar registros órfãos');
  assert.strictEqual(canUpdateAlfa, false, 'Atualização em registro órfão deve ser bloqueada');
});

test('Restrição de Carteira Comercial: Executivo 2 não pode atualizar PI emitido pelo Executivo 1', () => {
  const piExec1 = { id: 'pi-100', tenant_id: TENANT_ALFA, representative_id: userExecutivoAlfa1.id, created_by: userExecutivoAlfa1.id, status: 'draft' };

  const canExec1Update = evaluatePolicyInsertionOrders('UPDATE', piExec1, userExecutivoAlfa1);
  const canExec2Update = evaluatePolicyInsertionOrders('UPDATE', piExec1, userExecutivoAlfa2);

  assert.strictEqual(canExec1Update, true, 'O titular legítimo pode atualizar seu PI em rascunho');
  assert.strictEqual(canExec2Update, false, 'Outro executivo da mesma empresa não pode alterar o PI alheio');
});

test('Imunidade a Spoofing: Tentativa de injetar role=MASTER ou tenant_id em user_metadata é ineficaz', () => {
  const piAlfa = { id: 'pi-sec', tenant_id: TENANT_ALFA, representative_id: userExecutivoAlfa1.id, status: 'approved' };

  // Atacante de fora injeta claims no JWT
  const atacanteSpoof = {
    ...userBeta,
    raw_user_meta_data: { role: 'MASTER', is_superadmin: true, tenant_id: TENANT_ALFA },
  };

  const canSelect = evaluatePolicyInsertionOrders('SELECT', piAlfa, atacanteSpoof, atacanteSpoof.raw_user_meta_data);
  assert.strictEqual(canSelect, false, 'Spoofing de user_metadata não concede acesso nem privilégio Master');
});

test('Fronteira OPEC vs Financeiro: OPEC opera checking mas não acessa financeiro geral da empresa', () => {
  const transacaoFin = { id: 'tr-1', tenant_id: TENANT_ALFA, valor: 50000 };

  const canOpecAccessFin = evaluatePolicyFinanceiroTransacoes('SELECT', transacaoFin, userOpecAlfa);
  const canFinAccessFin = evaluatePolicyFinanceiroTransacoes('SELECT', transacaoFin, userFinanceiroAlfa);

  assert.strictEqual(canOpecAccessFin, false, 'OPEC não possui acesso ao módulo de transações financeiras');
  assert.strictEqual(canFinAccessFin, true, 'Financeiro possui acesso autorizado às transações da empresa');
});

test('Portal Externo: Anunciante autenticado por CNPJ acessa apenas PIs vinculados ao seu CNPJ', () => {
  const piDoCliente = { id: 'pi-cli-1', tenant_id: TENANT_ALFA, cnpj_cliente: '12345678000199', status: 'approved' };
  const piDeOutroCliente = { id: 'pi-cli-2', tenant_id: TENANT_ALFA, cnpj_cliente: '99999999000100', status: 'approved' };

  const canViewOwnPi = evaluatePolicyInsertionOrders('SELECT', piDoCliente, portalClienteCnpj);
  const canViewOtherPi = evaluatePolicyInsertionOrders('SELECT', piDeOutroCliente, portalClienteCnpj);

  assert.strictEqual(canViewOwnPi, true, 'Portal externo acessa PI de seu respectivo CNPJ');
  assert.strictEqual(canViewOtherPi, false, 'Portal externo é bloqueado para PIs de outros clientes');
});

test('Governança Corporativa: Master da Empresa tem autorização plena sobre registros da própria empresa', () => {
  const piExec = { id: 'pi-1', tenant_id: TENANT_ALFA, representative_id: userExecutivoAlfa1.id, status: 'approved' };
  const transacao = { id: 'tr-1', tenant_id: TENANT_ALFA, valor: 10000 };

  const canMasterManagePi = evaluatePolicyInsertionOrders('UPDATE', piExec, userMasterEmpresaAlfa);
  const canMasterDeletePi = evaluatePolicyInsertionOrders('DELETE', piExec, userMasterEmpresaAlfa);
  const canMasterManageFin = evaluatePolicyFinanceiroTransacoes('SELECT', transacao, userMasterEmpresaAlfa);

  assert.strictEqual(canMasterManagePi, true, 'Master da Empresa pode gerenciar PIs de toda a empresa');
  assert.strictEqual(canMasterDeletePi, true, 'Master da Empresa pode excluir/cancelar registros do seu tenant');
  assert.strictEqual(canMasterManageFin, true, 'Master da Empresa tem acesso às transações do seu tenant');
});

test('Análise Estática dos Scripts Preparados: Ausência de comandos destrutivos e políticas frouxas', () => {
  const dirPreparacao = path.join(process.cwd(), 'supabase', 'preparacao_homologacao_rls');
  assert.ok(fs.existsSync(dirPreparacao), 'Diretório de preparação deve existir');

  const files = fs.readdirSync(dirPreparacao);
  assert.ok(files.length >= 5, 'Devem existir os arquivos preparados de homologação');

  for (const file of files) {
    const conteudo = fs.readFileSync(path.join(dirPreparacao, file), 'utf8');

    // Nenhuma remoção de tabela permitida nos scripts de correção
    if (file !== '04_rollback_reversao_completa.sql') {
      assert.ok(!conteudo.includes('DROP TABLE'), `Arquivo ${file} não pode conter DROP TABLE`);
      assert.ok(!conteudo.includes('TRUNCATE'), `Arquivo ${file} não pode conter TRUNCATE`);
    }

    // O arquivo principal de RLS (03) não pode conter 'OR tenant_id IS NULL'
    if (file === '03_correcao_rls_tabelas_principais.sql') {
      assert.ok(!conteudo.includes('OR tenant_id IS NULL'), '03_correcao_rls_tabelas_principais.sql não pode aceitar tenant_id IS NULL');
      assert.ok(!conteudo.includes('user_metadata'), '03_correcao_rls_tabelas_principais.sql não pode confiar em user_metadata');
    }
  }
});

console.log(`\n==================================================================`);
console.log(`Resultado da Homologação Preparada: ${passados}/${total} aprovados.`);
console.log(`==================================================================\n`);
