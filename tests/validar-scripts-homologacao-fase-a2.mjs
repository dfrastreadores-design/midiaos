// ==============================================================================
// VALIDAÇÃO ESTÁTICA E ESTRUTURAL — FASE A2 (100% LOCAL / SEM REDE / SEM BANCO)
// Arquivo: tests/validar-scripts-homologacao-fase-a2.mjs
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('====================================================================');
console.log('🔍 VALIDAÇÃO ESTÁTICA E CONSISTÊNCIA DE SCRIPTS — FASE A2');
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

const dirPreparacao = path.join(process.cwd(), 'supabase', 'preparacao_homologacao_rls');
const file07 = path.join(dirPreparacao, '07_massa_dados_ficticios_staging.sql');
const file06 = path.join(dirPreparacao, '06_teste_integracao_postgresql_real.sql');
const file04Original = path.join(dirPreparacao, '04_rollback_reversao_completa.sql');
const file04Bak = path.join(dirPreparacao, '04_rollback_reversao_completa.sql.bak');
const file04Seguro = path.join(dirPreparacao, '04_rollback_seguro_contingencia.sql');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// ------------------------------------------------------------------------------
// TESTE 1: Validação de Todos os UUIDs no Script 07
// ------------------------------------------------------------------------------
test('Script 07: Todos os UUIDs devem ser sintaticamente válidos (hexadecimal estrito)', () => {
  const content = fs.readFileSync(file07, 'utf8');
  // Extrai strings que parecem UUIDs (36 caracteres delimitados por aspas simples)
  const matches = content.match(/'([0-9a-zA-Z-]{36})'/g) || [];
  assert.ok(matches.length >= 10, 'Deve conter pelo menos 10 UUIDs fictícios');

  for (const m of matches) {
    const rawUuid = m.replace(/'/g, '');
    assert.ok(UUID_REGEX.test(rawUuid), `UUID inválido detectado no script 07: ${rawUuid}`);
    assert.ok(!/[^0-9a-fA-F-]/.test(rawUuid), `Caractere não hexadecimal no UUID: ${rawUuid}`);
  }
});

// ------------------------------------------------------------------------------
// TESTE 2: Validação de Todos os UUIDs no Script 06
// ------------------------------------------------------------------------------
test('Script 06: Todos os UUIDs devem ser sintaticamente válidos (hexadecimal estrito)', () => {
  const content = fs.readFileSync(file06, 'utf8');
  const matches = content.match(/'([0-9a-zA-Z-]{36})'/g) || [];
  assert.ok(matches.length >= 5, 'Deve conter UUIDs de teste');

  for (const m of matches) {
    const rawUuid = m.replace(/'/g, '');
    assert.ok(UUID_REGEX.test(rawUuid), `UUID inválido detectado no script 06: ${rawUuid}`);
    assert.ok(!/[^0-9a-fA-F-]/.test(rawUuid), `Caractere não hexadecimal no UUID: ${rawUuid}`);
  }
});

// ------------------------------------------------------------------------------
// TESTE 3: Sincronismo e Consistência de Identidades entre Script 07 e 06
// ------------------------------------------------------------------------------
test('Sincronismo 07 <-> 06: IDs de Tenants e Usuários de teste devem ser estritamente idênticos', () => {
  const c07 = fs.readFileSync(file07, 'utf8');
  const c06 = fs.readFileSync(file06, 'utf8');

  const tenantAlfa = '11111111-1111-1111-1111-111111111111';
  const execAlfa1 = '11111111-aaaa-1111-aaaa-111111111111';
  const execAlfa2 = '22222222-aaaa-2222-aaaa-222222222222';
  const opecAlfa = '33333333-aaaa-3333-aaaa-333333333333';
  const execBeta = '55555555-bbbb-5555-bbbb-555555555555';
  const propAlfa = 'd1111111-aaaa-1111-aaaa-111111111111';

  for (const id of [tenantAlfa, execAlfa1, execAlfa2, opecAlfa, execBeta, propAlfa]) {
    assert.ok(c07.includes(id), `Script 07 deve conter o ID sincronizado: ${id}`);
    assert.ok(c06.includes(id), `Script 06 deve conter o ID sincronizado: ${id}`);
  }
});

// ------------------------------------------------------------------------------
// TESTE 4: Conformidade de Schema em public.propostas (Script 07)
// ------------------------------------------------------------------------------
test('Script 07: Propostas deve usar colunas oficiais (campanha, valor_negociado, numero) e enums válidos', () => {
  const c07 = fs.readFileSync(file07, 'utf8');

  assert.ok(!c07.includes('titulo,'), 'Script 07 não pode conter coluna inexistente "titulo"');
  assert.ok(!c07.includes('valor_total,'), 'Script 07 não pode conter coluna inexistente "valor_total"');
  assert.ok(!c07.includes('em_negociacao'), 'Script 07 não pode usar enum inválido "em_negociacao"');

  assert.ok(c07.includes('campanha,'), 'Script 07 deve utilizar coluna oficial "campanha"');
  assert.ok(c07.includes('valor_negociado,'), 'Script 07 deve utilizar coluna oficial "valor_negociado"');
  assert.ok(c07.includes('numero,'), 'Script 07 deve preencher explicitamente a coluna "numero"');
  assert.ok(c07.includes('PRÉ-REQUISITO MANDATÓRIO DE AUTENTICAÇÃO'), 'Script 07 deve documentar dependência com auth.users');
});

// ------------------------------------------------------------------------------
// TESTE 5: SQL Dinâmico com EXECUTE para insertion_orders (Script 07)
// ------------------------------------------------------------------------------
test('Script 07: insertion_orders deve ser executada com SQL dinâmico EXECUTE $dyn$', () => {
  const c07 = fs.readFileSync(file07, 'utf8');
  assert.ok(c07.includes('EXECUTE $dyn$'), 'Script 07 deve encapsular INSERT em EXECUTE dinâmico para não falhar no parse');
});

// ------------------------------------------------------------------------------
// TESTE 6: Cobertura Transacional e Asserções Ativas em 06
// ------------------------------------------------------------------------------
test('Script 06: Transação estrita (BEGIN/ROLLBACK), simulação de sessão e asserções com RAISE EXCEPTION', () => {
  const c06 = fs.readFileSync(file06, 'utf8');

  assert.ok(c06.includes('BEGIN;'), 'Script 06 deve conter abertura de transação BEGIN;');
  assert.ok(c06.includes('ROLLBACK;'), 'Script 06 deve finalizar com reversão obrigatória ROLLBACK;');
  assert.ok(c06.includes('SET LOCAL ROLE authenticated;'), 'Script 06 deve simular papel authenticated');
  assert.ok(c06.includes('request.jwt.claim.sub'), 'Script 06 deve simular claim de identidade JWT');
  assert.ok(c06.includes('RAISE EXCEPTION'), 'Script 06 deve conter asserções ativas de segurança');
  assert.ok(c06.includes('GET DIAGNOSTICS'), 'Script 06 deve verificar impacto em mutações DML');
});

// ------------------------------------------------------------------------------
// TESTE 7: Tratamento do Rollback Inseguro
// ------------------------------------------------------------------------------
test('Tratamento do Rollback: Backup criado, arquivo original travado e contingência segura implementada', () => {
  assert.ok(fs.existsSync(file04Bak), 'Backup 04_rollback_reversao_completa.sql.bak deve existir');
  assert.ok(fs.existsSync(file04Seguro), 'Script 04_rollback_seguro_contingencia.sql deve existir');

  const cOriginal = fs.readFileSync(file04Original, 'utf8');
  assert.ok(cOriginal.includes('RAISE EXCEPTION'), 'Arquivo 04_rollback_reversao_completa.sql deve ter trava de aborto');

  const cSeguro = fs.readFileSync(file04Seguro, 'utf8');
  assert.ok(!cSeguro.includes('OR tenant_id IS NULL'), 'Rollback de contingência segura NÃO pode ter "OR tenant_id IS NULL"');
  assert.ok(!cSeguro.includes('CREATE POLICY "permitir_update_universal'), 'Rollback de contingência segura NÃO pode criar updates universais');
  assert.ok(cSeguro.includes('tenant_id = public.current_user_tenant_id()'), 'Rollback seguro deve reforçar isolamento de tenant');
});


console.log(`\n====================================================================`);
console.log(`Resultado da Validação Estática Fase A2: ${passados}/${total} aprovados.`);
console.log(`====================================================================\n`);

if (passados !== total) {
  process.exit(1);
}
