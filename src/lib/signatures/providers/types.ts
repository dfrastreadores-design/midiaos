import type { DocumentoAssinatura, Signatario } from "@/types/assinaturas.types";

export interface EnvelopeCreationResult {
  envelopeId: string;
  provider: string;
  status: "criado" | "enviado" | "erro";
  signatariosMap?: Record<string, { signUrl?: string; externalSignerId?: string }>;
  mensagem?: string;
}

export interface EnvelopeStatusResult {
  envelopeId: string;
  status: "aguardando" | "assinado_parcialmente" | "assinado" | "recusado" | "cancelado";
  signatariosStatus: Array<{
    email: string;
    nome: string;
    assinado: boolean;
    dataAssinatura?: string;
  }>;
}

export interface SignatureProvider {
  /** Identificador único do provedor (ex: 'interno', 'docusign', 'clicksign', 'zapsign') */
  readonly id: string;
  
  /** Nome legível do provedor */
  readonly name: string;

  /** Verifica se o provedor possui credenciais ativas e configuradas no tenant */
  isConfigured(tenantConfig?: Record<string, any>): boolean;

  /** Retorna a mensagem de configuração pendente caso não configurado */
  getSetupInstructions(): string;

  /** Cria o envelope / fluxo de assinatura */
  createEnvelope(
    documento: DocumentoAssinatura,
    signatarios: Signatario[],
    tenantConfig?: Record<string, any>
  ): Promise<EnvelopeCreationResult>;

  /** Consulta o status atualizado do envelope */
  checkStatus(envelopeId: string, tenantConfig?: Record<string, any>): Promise<EnvelopeStatusResult>;

  /** Cancela o envelope no provedor */
  cancelEnvelope(envelopeId: string, tenantConfig?: Record<string, any>): Promise<boolean>;
}
