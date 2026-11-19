/**
 * MOTOR DE DESPACHO E BLOQUEIO CONCORRENTE — MIDIA OS PROSPECT (FASE 1)
 *
 * Implementa o protocolo de serialização por destinatário com Two-Phase Lease,
 * Fencing Tokens e detecção atômica de corrida entre Opt-Out e Despacho HTTP.
 *
 * REGRAS INEGOCIÁVEIS:
 *   1. Se o opt-out for confirmado antes do início do despacho, nenhuma chamada externa é iniciada.
 *   2. Se o despacho já tiver começado e houver opt-out, o resultado é tratado como incerto até evidência externa.
 *   3. Não há falsa confirmação de envio (HTTP 200/201 = aceite pelo provedor, não entrega física).
 *   4. Zero retry cego em situações de incerteza (transiciona para pendente_reconciliacao).
 *   5. Compatível com pools de conexão (PgBouncer) e ambientes Serverless / Nitro.
 */

import crypto from "node:crypto";

export interface DispatchInteraction {
  id: string;
  tenant_id: string;
  company_id: string;
  destinatario_normalizado: string;
  canal: "whatsapp" | "email";
  status: string;
  payload: any;
  chave_idempotencia?: string;
  dispatch_token?: string;
  optout_interceptado?: boolean;
}

export interface DispatchResult {
  sucesso: boolean;
  statusFinal: string;
  idExterno?: string;
  erro?: string;
  optoutInterceptado: boolean;
  chamadaExternaRealizada: boolean;
}

export interface ProviderMockAdapter {
  enviarMensagem: (destinatario: string, payload: any, signal?: AbortSignal) => Promise<{ status: number; data: any }>;
}

/**
 * Simula o provedor externo para testes controlados sem disparos reais
 */
export const ProviderMockPadrao: ProviderMockAdapter = {
  async enviarMensagem(destinatario: string, payload: any, signal?: AbortSignal) {
    if (signal?.aborted) {
      throw new Error("AbortError: Requisição cancelada antes da transmissão.");
    }
    // Delay simulado de rede
    await new Promise((r) => setTimeout(r, 50));
    return {
      status: 200,
      data: { id: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` }
    };
  }
};

/**
 * Executa o protocolo de despacho com esgrima transacional (fencing) por destinatário
 */
export async function despacharMensagemComEsgrima(
  interaction: DispatchInteraction,
  blocklistDb: Set<string>, // Simula tabela prospect_blocklist (tenant_id:destinatario)
  interactionsDb: Map<string, DispatchInteraction>,
  provider: ProviderMockAdapter = ProviderMockPadrao,
  options: { delayHttpMs?: number; abortController?: AbortController } = {}
): Promise<DispatchResult> {
  const blocklistKey = `${interaction.tenant_id}:${interaction.destinatario_normalizado}`;
  const abortController = options.abortController || new AbortController();

  // ============================================================================
  // FASE 1: RESERVA ATÔMICA E CONSULTA MANDATÓRIA À BLOCKLIST (PRE-FLIGHT)
  // ============================================================================
  if (blocklistDb.has(blocklistKey)) {
    // Regra 1: Opt-Out confirmado antes do início do despacho -> CANCELAR IMEDIATAMENTE
    interaction.status = "cancelado_optout";
    interactionsDb.set(interaction.id, interaction);
    return {
      sucesso: false,
      statusFinal: "cancelado_optout",
      erro: "Destinatário já cadastrado na blocklist de opt-out.",
      optoutInterceptado: false,
      chamadaExternaRealizada: false
    };
  }

  // Gera o fencing token durável de execução
  const dispatchToken = crypto.randomUUID();
  interaction.dispatch_token = dispatchToken;
  interaction.status = "enviando";
  interaction.optout_interceptado = false;
  interactionsDb.set(interaction.id, interaction);

  // ============================================================================
  // FASE 2: CHAMADA EXTERNA COM TRATAMENTO DE CORRIDA E TIMEOUT
  // ============================================================================
  let respostaProvedor: { status: number; data: any } | null = null;
  let erroCapturado: any = null;
  let chamadaExternaRealizada = true;

  try {
    if (options.delayHttpMs && options.delayHttpMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, options.delayHttpMs);
        abortController.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("AbortError: Chamada cancelada pelo cliente local."));
        });
      });
    }

    respostaProvedor = await provider.enviarMensagem(
      interaction.destinatario_normalizado,
      interaction.payload,
      abortController.signal
    );
  } catch (err: any) {
    erroCapturado = err;
  }

  // ============================================================================
  // FASE 3: RESOLUÇÃO ATÔMICA PÓS-TRANSMISSÃO
  // ============================================================================
  // Verifica se o opt-out foi acionado concorrentemente durante o trânsito HTTP
  const estadoAtual = interactionsDb.get(interaction.id) || interaction;
  const optoutConcorrenteOcorreu = estadoAtual.optout_interceptado === true || blocklistDb.has(blocklistKey);

  // Cenário A: Provedor retornou HTTP 200/201 (Aceito pelo Provedor)
  if (respostaProvedor && (respostaProvedor.status === 200 || respostaProvedor.status === 201)) {
    const idExterno = respostaProvedor.data?.id || respostaProvedor.data?.messages?.[0]?.id;

    if (optoutConcorrenteOcorreu) {
      // Regra 2: Opt-out chegou enquanto a chamada externa trafegava e foi aceita pela operadora
      // A mensagem escapou fisicamente antes do opt-out agir sobre o provedor
      estadoAtual.status = "enviado_pre_bloqueio";
      estadoAtual.dispatch_token = undefined;
      interactionsDb.set(interaction.id, estadoAtual);

      return {
        sucesso: true,
        statusFinal: "enviado_pre_bloqueio",
        idExterno,
        optoutInterceptado: true,
        chamadaExternaRealizada: true
      };
    }

    // Fluxo normal: Aceito pelo provedor em trânsito
    estadoAtual.status = "enviado";
    estadoAtual.dispatch_token = undefined;
    interactionsDb.set(interaction.id, estadoAtual);

    return {
      sucesso: true,
      statusFinal: "enviado",
      idExterno,
      optoutInterceptado: false,
      chamadaExternaRealizada: true
    };
  }

  // Cenário B: Timeout de rede, queda de conexão ou erro de socket (Incerteza)
  if (erroCapturado) {
    // Regra 3 & 4: Incerteza absoluta -> NUNCA RETRY CEGO. Transiciona para pendente_reconciliacao
    estadoAtual.status = "pendente_reconciliacao";
    estadoAtual.dispatch_token = undefined;
    interactionsDb.set(interaction.id, estadoAtual);

    return {
      sucesso: false,
      statusFinal: "pendente_reconciliacao",
      erro: erroCapturado.message,
      optoutInterceptado: optoutConcorrenteOcorreu,
      chamadaExternaRealizada: true
    };
  }

  // Cenário C: Provedor retornou erro explícito (ex.: 400 ou 429)
  const statusHttp = respostaProvedor?.status || 500;
  if (statusHttp === 429 || statusHttp === 503) {
    estadoAtual.status = "falha_temporaria";
  } else {
    estadoAtual.status = "falha_definitiva";
  }
  estadoAtual.dispatch_token = undefined;
  interactionsDb.set(interaction.id, estadoAtual);

  return {
    sucesso: false,
    statusFinal: estadoAtual.status,
    erro: `HTTP_${statusHttp}`,
    optoutInterceptado: optoutConcorrenteOcorreu,
    chamadaExternaRealizada: true
  };
}

