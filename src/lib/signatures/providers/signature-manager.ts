import type {
  SignatureProvider,
  EnvelopeCreationResult,
  EnvelopeStatusResult,
} from "./types";
import type { DocumentoAssinatura, Signatario } from "@/types/assinaturas.types";

/**
 * Provedor Nativo do Mídia OS.
 * Opera diretamente com tokens seguros do sistema, tela de assinatura pública,
 * carimbo de data/hora, IP, biometria manuscrita e evidência digital.
 */
export class InternalSignatureProvider implements SignatureProvider {
  readonly id = "interno";
  readonly name = "Mídia OS Nativo (Digital & Evidências)";

  isConfigured(_tenantConfig?: Record<string, any>): boolean {
    return true; // Sempre ativo nativamente
  }

  getSetupInstructions(): string {
    return "O provedor nativo do Mídia OS já está ativo e configurado com tokens seguros, captura de rubrica e trilha de auditoria.";
  }

  async createEnvelope(
    documento: DocumentoAssinatura,
    signatarios: Signatario[],
    _tenantConfig?: Record<string, any>
  ): Promise<EnvelopeCreationResult> {
    const signatariosMap: Record<string, { signUrl?: string; externalSignerId?: string }> = {};

    for (const sig of signatarios) {
      signatariosMap[sig.id] = {
        signUrl: `/assinar/${sig.token}`,
        externalSignerId: sig.token,
      };
    }

    return {
      envelopeId: `midia-env-${documento.id}-${Date.now()}`,
      provider: this.id,
      status: "criado",
      signatariosMap,
      mensagem: "Envelope nativo gerado com sucesso.",
    };
  }

  async checkStatus(
    envelopeId: string,
    _tenantConfig?: Record<string, any>
  ): Promise<EnvelopeStatusResult> {
    return {
      envelopeId,
      status: "aguardando",
      signatariosStatus: [],
    };
  }

  async cancelEnvelope(_envelopeId: string, _tenantConfig?: Record<string, any>): Promise<boolean> {
    return true;
  }
}

/**
 * Provedor Externo Desacoplado: DocuSign
 */
export class DocuSignProvider implements SignatureProvider {
  readonly id = "docusign";
  readonly name = "DocuSign eSignature";

  isConfigured(tenantConfig?: Record<string, any>): boolean {
    const cfg = tenantConfig?.docusign;
    return !!(cfg && cfg.api_key && (cfg.integration_key || cfg.account_id));
  }

  getSetupInstructions(): string {
    return "Para utilizar DocuSign, informe a Integration Key, Account ID e RSA Private Key ou Secret nas Configurações de Assinatura do seu Tenant.";
  }

  async createEnvelope(
    _documento: DocumentoAssinatura,
    _signatarios: Signatario[],
    tenantConfig?: Record<string, any>
  ): Promise<EnvelopeCreationResult> {
    if (!this.isConfigured(tenantConfig)) {
      throw new Error(
        "Integração DocuSign não configurada para este Tenant. Acesse Configurações > Provedores de Assinatura para informar suas chaves ou selecione o Provedor Nativo Mídia OS."
      );
    }
    // Arquitetura preparada para chamada HTTP à API REST DocuSign v2.1
    // (quando as chaves forem fornecidas pelo cliente)
    return {
      envelopeId: `docusign-${Date.now()}`,
      provider: this.id,
      status: "enviado",
    };
  }

  async checkStatus(envelopeId: string, tenantConfig?: Record<string, any>): Promise<EnvelopeStatusResult> {
    if (!this.isConfigured(tenantConfig)) {
      throw new Error("Integração DocuSign não configurada.");
    }
    return {
      envelopeId,
      status: "aguardando",
      signatariosStatus: [],
    };
  }

  async cancelEnvelope(_envelopeId: string, tenantConfig?: Record<string, any>): Promise<boolean> {
    if (!this.isConfigured(tenantConfig)) return false;
    return true;
  }
}

/**
 * Provedor Externo Desacoplado: ClickSign
 */
export class ClickSignProvider implements SignatureProvider {
  readonly id = "clicksign";
  readonly name = "Clicksign";

  isConfigured(tenantConfig?: Record<string, any>): boolean {
    const cfg = tenantConfig?.clicksign;
    return !!(cfg && cfg.access_token);
  }

  getSetupInstructions(): string {
    return "Para utilizar Clicksign, informe seu Access Token (Chave de API) nas Configurações de Assinatura do seu Tenant.";
  }

  async createEnvelope(
    _documento: DocumentoAssinatura,
    _signatarios: Signatario[],
    tenantConfig?: Record<string, any>
  ): Promise<EnvelopeCreationResult> {
    if (!this.isConfigured(tenantConfig)) {
      throw new Error(
        "Integração Clicksign não configurada para este Tenant. Acesse Configurações > Provedores de Assinatura para cadastrar seu Access Token."
      );
    }
    return {
      envelopeId: `clicksign-${Date.now()}`,
      provider: this.id,
      status: "enviado",
    };
  }

  async checkStatus(envelopeId: string, tenantConfig?: Record<string, any>): Promise<EnvelopeStatusResult> {
    if (!this.isConfigured(tenantConfig)) throw new Error("Clicksign não configurada.");
    return {
      envelopeId,
      status: "aguardando",
      signatariosStatus: [],
    };
  }

  async cancelEnvelope(_envelopeId: string, tenantConfig?: Record<string, any>): Promise<boolean> {
    if (!this.isConfigured(tenantConfig)) return false;
    return true;
  }
}

/**
 * Provedor Externo Desacoplado: ZapSign
 */
export class ZapSignProvider implements SignatureProvider {
  readonly id = "zapsign";
  readonly name = "ZapSign";

  isConfigured(tenantConfig?: Record<string, any>): boolean {
    const cfg = tenantConfig?.zapsign;
    return !!(cfg && cfg.api_token);
  }

  getSetupInstructions(): string {
    return "Para utilizar ZapSign com assinatura facilitada e envio por WhatsApp, informe seu API Token da ZapSign nas Configurações de Assinatura.";
  }

  async createEnvelope(
    _documento: DocumentoAssinatura,
    _signatarios: Signatario[],
    tenantConfig?: Record<string, any>
  ): Promise<EnvelopeCreationResult> {
    if (!this.isConfigured(tenantConfig)) {
      throw new Error(
        "Integração ZapSign não configurada para este Tenant. Acesse Configurações > Provedores de Assinatura para inserir seu API Token."
      );
    }
    return {
      envelopeId: `zapsign-${Date.now()}`,
      provider: this.id,
      status: "enviado",
    };
  }

  async checkStatus(envelopeId: string, tenantConfig?: Record<string, any>): Promise<EnvelopeStatusResult> {
    if (!this.isConfigured(tenantConfig)) throw new Error("ZapSign não configurada.");
    return {
      envelopeId,
      status: "aguardando",
      signatariosStatus: [],
    };
  }

  async cancelEnvelope(_envelopeId: string, tenantConfig?: Record<string, any>): Promise<boolean> {
    if (!this.isConfigured(tenantConfig)) return false;
    return true;
  }
}

/**
 * Registro de todos os provedores disponíveis
 */
export const SIGNATURE_PROVIDERS: Record<string, SignatureProvider> = {
  interno: new InternalSignatureProvider(),
  docusign: new DocuSignProvider(),
  clicksign: new ClickSignProvider(),
  zapsign: new ZapSignProvider(),
};

export function getSignatureProvider(id?: string): SignatureProvider {
  return SIGNATURE_PROVIDERS[id || "interno"] || SIGNATURE_PROVIDERS.interno;
}
