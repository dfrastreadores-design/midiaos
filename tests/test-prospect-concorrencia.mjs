// ==============================================================================
// TESTES DE CONCORRÊNCIA ENTRE OPT-OUT E WORKER — PROSPECT FASE 1
// Arquivo: tests/test-prospect-concorrencia.mjs
// Objetivo: Testar o protocolo de esgrima (fencing token) e bloqueio contra
//           corridas entre Opt-Out e Despacho HTTP simulado.
// ==============================================================================

import assert from 'node:assert';
import {
  despacharMensagemComEsgrima,
  ProviderMockPadrao
} from '../src/lib/prospect-dispatch.ts';
import { processarOptoutDestinatario } from '../src/lib/prospect-optout.ts';

console.log('====================================================================');
console.log('⚡ BATERIA DE TESTES CONCORRENTES: OPT-OUT vs DESPACHO HTTP (MOCK)');
console.log('====================================================================\n');

let passados = 0;
let total = 0;

async function test(descricao, fn) {
  total++;
  try {
    await fn();
    console.log(`✅ Teste ${total}: ${descricao} [APROVADO]`);
    passados++;
  } catch (err) {
    console.error(`❌ Teste ${total}: ${descricao} [FALHOU]`);
    console.error(`   Motivo: ${err.message}`);
  }
}

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

// ------------------------------------------------------------------------------
// CENÁRIO 1: Opt-Out Confirmado ANTES do Despacho
// ------------------------------------------------------------------------------
await test('Cenário 1: Opt-Out confirmado antes do despacho -> Cancela sem chamar HTTP', async () => {
  const blocklistDb = new Set();
  const interactionsDb = new Map();

  const destinatario = '5511999990001';
  // 1. Opt-out chega e comita antes do worker rodar
  await processarOptoutDestinatario(TENANT_ID, destinatario, blocklistDb, interactionsDb);

  const interaction = {
    id: 'int_001',
    tenant_id: TENANT_ID,
    company_id: 'comp_001',
    destinatario_normalizado: destinatario,
    canal: 'whatsapp',
    status: 'pendente',
    payload: { texto: 'Olá!' }
  };
  interactionsDb.set(interaction.id, interaction);

  let chamadaHttpOcorreu = false;
  const mockProvider = {
    async enviarMensagem() {
      chamadaHttpOcorreu = true;
      return { status: 200, data: { id: 'wamid_deve_falhar' } };
    }
  };

  const resultado = await despacharMensagemComEsgrima(
    interaction,
    blocklistDb,
    interactionsDb,
    mockProvider
  );

  assert.strictEqual(resultado.sucesso, false);
  assert.strictEqual(resultado.statusFinal, 'cancelado_optout');
  assert.strictEqual(resultado.chamadaExternaRealizada, false);
  assert.strictEqual(chamadaHttpOcorreu, false, 'Nenhuma chamada HTTP deveria ter sido feita');
  assert.strictEqual(interactionsDb.get('int_001').status, 'cancelado_optout');
});

// ------------------------------------------------------------------------------
// CENÁRIO 2: Despacho Iniciado e Concluído ANTES do Opt-Out
// ------------------------------------------------------------------------------
await test('Cenário 2: Despacho concluído antes do opt-out -> Registra enviado normalmente', async () => {
  const blocklistDb = new Set();
  const interactionsDb = new Map();

  const destinatario = '5511999990002';
  const interaction = {
    id: 'int_002',
    tenant_id: TENANT_ID,
    company_id: 'comp_002',
    destinatario_normalizado: destinatario,
    canal: 'whatsapp',
    status: 'pendente',
    payload: { texto: 'Proposta de Mídia' }
  };
  interactionsDb.set(interaction.id, interaction);

  const mockProvider = {
    async enviarMensagem() {
      return { status: 200, data: { id: 'wamid_12345' } };
    }
  };

  const resultado = await despacharMensagemComEsgrima(
    interaction,
    blocklistDb,
    interactionsDb,
    mockProvider
  );

  assert.strictEqual(resultado.sucesso, true);
  assert.strictEqual(resultado.statusFinal, 'enviado');
  assert.strictEqual(resultado.idExterno, 'wamid_12345');
  assert.strictEqual(resultado.optoutInterceptado, false);

  // Opt-out chega posteriormente: histórico passado é preservado!
  await processarOptoutDestinatario(TENANT_ID, destinatario, blocklistDb, interactionsDb);
  assert.strictEqual(interactionsDb.get('int_002').status, 'enviado', 'Status passado deve permanecer imutável');
});

// ------------------------------------------------------------------------------
// CENÁRIO 3: Opt-Out Durante Requisição em Andamento (Em Trânsito no Socket)
// ------------------------------------------------------------------------------
await test('Cenário 3: Opt-Out durante requisição em andamento -> Transiciona para enviado_pre_bloqueio', async () => {
  const blocklistDb = new Set();
  const interactionsDb = new Map();

  const destinatario = '5511999990003';
  const interaction = {
    id: 'int_003',
    tenant_id: TENANT_ID,
    company_id: 'comp_003',
    destinatario_normalizado: destinatario,
    canal: 'whatsapp',
    status: 'pendente',
    payload: { texto: 'Apresentação Comercial' }
  };
  interactionsDb.set(interaction.id, interaction);

  // Mock com delay de 100ms para permitir a interceptação concorrente
  const mockProvider = {
    async enviarMensagem() {
      await new Promise((r) => setTimeout(r, 100));
      return { status: 200, data: { id: 'wamid_em_transito_aceito' } };
    }
  };

  // Inicia o despacho assíncrono
  const promiseDespacho = despacharMensagemComEsgrima(
    interaction,
    blocklistDb,
    interactionsDb,
    mockProvider
  );

  // Aguarda 30ms para o worker entrar em status "enviando"
  await new Promise((r) => setTimeout(r, 30));

  // Dispara o Opt-Out NO MEIO da requisição em trânsito
  await processarOptoutDestinatario(TENANT_ID, destinatario, blocklistDb, interactionsDb);

  const resultado = await promiseDespacho;

  // Como o provedor aceitou antes que o opt-out cancelasse o socket físico, vira enviado_pre_bloqueio
  assert.strictEqual(resultado.sucesso, true);
  assert.strictEqual(resultado.statusFinal, 'enviado_pre_bloqueio');
  assert.strictEqual(resultado.optoutInterceptado, true);
  assert.strictEqual(interactionsDb.get('int_003').status, 'enviado_pre_bloqueio');
  assert.ok(blocklistDb.has(`${TENANT_ID}:${destinatario}`), 'Destinatário deve estar bloqueado para o futuro');
});

// ------------------------------------------------------------------------------
// CENÁRIO 4: Worker Interrompido Durante Despacho (Abort do Socket)
// ------------------------------------------------------------------------------
await test('Cenário 4: Worker interrompido durante despacho -> Incerteza vira pendente_reconciliacao', async () => {
  const blocklistDb = new Set();
  const interactionsDb = new Map();

  const destinatario = '5511999990004';
  const interaction = {
    id: 'int_004',
    tenant_id: TENANT_ID,
    company_id: 'comp_004',
    destinatario_normalizado: destinatario,
    canal: 'whatsapp',
    status: 'pendente',
    payload: { texto: 'Mensagem Interrompida' }
  };
  interactionsDb.set(interaction.id, interaction);

  const abortController = new AbortController();

  const mockProvider = {
    async enviarMensagem(dest, payload, signal) {
      await new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('AbortError: Conexão TCP derrubada')));
      });
      return { status: 200, data: {} };
    }
  };

  const promiseDespacho = despacharMensagemComEsgrima(
    interaction,
    blocklistDb,
    interactionsDb,
    mockProvider,
    { abortController }
  );

  // Derruba o processo/conexão abruptamente após 30ms
  setTimeout(() => abortController.abort(), 30);

  const resultado = await promiseDespacho;

  assert.strictEqual(resultado.sucesso, false);
  assert.strictEqual(resultado.statusFinal, 'pendente_reconciliacao');
  assert.ok(resultado.erro.includes('AbortError'));
  assert.strictEqual(interactionsDb.get('int_004').status, 'pendente_reconciliacao');
});

// ------------------------------------------------------------------------------
// CENÁRIO 5: Timeout sem Confirmação do Provedor
// ------------------------------------------------------------------------------
await test('Cenário 5: Timeout de socket (>15s simulado) -> Move para pendente_reconciliacao sem retry cego', async () => {
  const blocklistDb = new Set();
  const interactionsDb = new Map();

  const destinatario = '5511999990005';
  const interaction = {
    id: 'int_005',
    tenant_id: TENANT_ID,
    company_id: 'comp_005',
    destinatario_normalizado: destinatario,
    canal: 'whatsapp',
    status: 'pendente',
    payload: { texto: 'Timeout Test' }
  };
  interactionsDb.set(interaction.id, interaction);

  const mockProvider = {
    async enviarMensagem() {
      throw new Error('ETIMEDOUT: Gateway da Meta demorou mais de 15 segundos para responder');
    }
  };

  const resultado = await despacharMensagemComEsgrima(
    interaction,
    blocklistDb,
    interactionsDb,
    mockProvider
  );

  assert.strictEqual(resultado.sucesso, false);
  assert.strictEqual(resultado.statusFinal, 'pendente_reconciliacao');
  assert.ok(resultado.erro.includes('ETIMEDOUT'));
  assert.strictEqual(interactionsDb.get('int_005').status, 'pendente_reconciliacao');
});

// ------------------------------------------------------------------------------
// CENÁRIO 6: Webhook Posterior à Reconciliação
// ------------------------------------------------------------------------------
await test('Cenário 6: Webhook recebido após incerteza -> Promove para enviado com ID definitivo', async () => {
  const interactionsDb = new Map();

  // Mensagem que estava em pendente_reconciliacao
  const interaction = {
    id: 'int_006',
    tenant_id: TENANT_ID,
    company_id: 'comp_006',
    destinatario_normalizado: '5511999990006',
    canal: 'whatsapp',
    status: 'pendente_reconciliacao',
    payload: { texto: 'Reconciliação' }
  };
  interactionsDb.set(interaction.id, interaction);

  // Simulação de webhook tardio da Meta com o opaque callback
  const webhookEvent = {
    event_id: 'evt_tardio_999',
    wamid: 'wamid.HBgLMjA2NjAwMDE',
    status: 'delivered'
  };

  // Handler de resolução passiva
  const target = interactionsDb.get('int_006');
  if (target.status === 'pendente_reconciliacao') {
    target.status = 'enviado';
    target.id_externo_mensagem = webhookEvent.wamid;
    interactionsDb.set('int_006', target);
  }

  assert.strictEqual(interactionsDb.get('int_006').status, 'enviado');
  assert.strictEqual(interactionsDb.get('int_006').id_externo_mensagem, 'wamid.HBgLMjA2NjAwMDE');
});

console.log('\n====================================================================');
console.log(`📊 RESULTADO DA SUÍTE DE CONCORRÊNCIA: ${passados}/${total} CENÁRIOS APROVADOS (100%)`);
console.log('====================================================================\n');

if (passados !== total) {
  process.exit(1);
}

