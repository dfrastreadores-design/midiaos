import type { ComponentType } from "react";
import { template as piAprovadoTemplate } from "./pi-aprovado";
import { template as piPendenteAprovacaoTemplate } from "./pi-pendente-aprovacao";
import { template as piRegeneradoTemplate } from "./pi-regenerado";
import { template as trialAlertaTemplate } from "./trial-alerta";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "pi-aprovado": piAprovadoTemplate,
  "pi-pendente-aprovacao": piPendenteAprovacaoTemplate,
  "pi-regenerado": piRegeneradoTemplate,
  "trial-alerta": trialAlertaTemplate,
};
