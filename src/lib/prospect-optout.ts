/**
 * MOTOR DE OPT-OUT E BLOQUEIO CONCORRENTE — MIDIA OS PROSPECT (FASE 1)
 *
 * Registra o descadastramento mandatório do lead e executa o cancelamento
 * atômico de mensagens futuras, interceptando requisições em trânsito.
 */

import type { DispatchInteraction } from "./prospect-dispatch.ts";

export interface OptoutResult {
  sucesso: boolean;
  totalCanceladas: number;
  mensagensEmTransitoInterceptadas: number;
  registradoEmBlocklist: boolean;
}

/**
 * Executa o opt-out em tempo real com garantia de cancelamento e interceptação
 */
export async function processarOptoutDestinatario(
  tenantId: string,
  destinatarioNormalizado: string,
  blocklistDb: Set<string>,
  interactionsDb: Map<string, DispatchInteraction>,
  motivo: string = "solicitacao_lead"
): Promise<OptoutResult> {
  const blocklistKey = `${tenantId}:${destinatarioNormalizado}`;

  // 1. Grava na Blocklist Imediatamente
  blocklistDb.add(blocklistKey);

  let totalCanceladas = 0;
  let mensagensEmTransitoInterceptadas = 0;

  // 2. Itera atomicamente sobre as interações do destinatário
  for (const [id, interaction] of interactionsDb.entries()) {
    if (
      interaction.tenant_id === tenantId &&
      interaction.destinatario_normalizado === destinatarioNormalizado
    ) {
      // Mensagens ainda não transmitidas -> CANCELAR IMEDIATAMENTE
      if (interaction.status === "agendado" || interaction.status === "pendente") {
        interaction.status = "cancelado_optout";
        interactionsDb.set(id, interaction);
        totalCanceladas++;
      }
      // Mensagens em curso (no socket HTTP) -> MARCAR INTERCEPTAÇÃO
      else if (interaction.status === "enviando") {
        interaction.optout_interceptado = true;
        interactionsDb.set(id, interaction);
        mensagensEmTransitoInterceptadas++;
      }
    }
  }

  return {
    sucesso: true,
    totalCanceladas,
    mensagensEmTransitoInterceptadas,
    registradoEmBlocklist: true
  };
}
