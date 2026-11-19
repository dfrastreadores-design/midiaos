// Types: insertion-orders.types.ts
// Definições de Tipagem Estrita para Pedidos de Inserção (PI), Checking de Veiculação & Liquidação Bimodal

export type BillingType = "REPRESENTATIVE_BILLING" | "DIRECT_VEHICLE_BILLING";

export type CheckingStatus = "pending_upload" | "under_review" | "approved" | "rejected";

export type PIStatus =
  | "draft"              // Rascunho
  | "approved"           // Aprovado / Autorizado
  | "in_broadcast"       // Em Veiculação
  | "awaiting_checking"  // Aguardando Comprovação
  | "checking_approved"  // Checking Auditado e Validado
  | "billed"             // Faturado / Dossiê Enviado ao Cliente
  | "paid_by_client"     // Liquidado pelo Cliente
  | "settled"            // Comissões e Repasses Concluídos
  | "canceled";          // Cancelado

export type CheckingItemStatus = "pending_review" | "approved" | "rejected";

export type SettlementType = "CLIENT_RECEIVABLE" | "VEHICLE_PAYABLE" | "COMMISSION_RECEIVABLE";

export type SettlementPayer = "client" | "representative" | "vehicle";

export type SettlementReceiver = "representative" | "vehicle";

export type SettlementStatus = "pending_checking" | "awaiting_payment" | "paid";

export type CheckingFileType =
  | "foto"
  | "video"
  | "irradiacao"
  | "relatorio"
  | "clipping"
  | "link"
  | "nf"
  | "material_producao";

export type PiItemType = "MEDIA" | "PRODUCTION";
export type PiDisplayMode = "ITEMIZED" | "EMBEDDED";

export interface PiItem {
  id: string;
  tenant_id?: string;
  pi_id: string;
  vehicle_id?: string | null;
  item_type?: PiItemType;
  display_mode?: PiDisplayMode;
  parent_media_item_id?: string | null;
  is_commissionable?: boolean;
  media_raw_cost?: number;
  embedded_production_cost?: number;
  client_facing_total?: number;
  period_start?: string | null;
  period_end?: string | null;
  format_description: string;
  insertions_count: number;
  unit_price: number;
  total_price: number;
  vehicle_commission_rate?: number | null;
  vehicle_commission_amount?: number;
  vehicle_net_amount: number;
  checking_required?: boolean;
  created_at?: string;
  updated_at?: string;

  // Relação opcional com o veículo / parceiro
  vehicle?: {
    id: string;
    nome_fantasia: string;
    razao_social: string;
    tipo_veiculo?: string;
    cnpj?: string;
  } | null;

  // Checkings vinculados a este item
  checkings?: PiChecking[];
  embedded_productions?: PiItem[];
}

export interface PiChecking {
  id: string;
  tenant_id?: string;
  pi_id: string;
  pi_item_id?: string | null;
  vehicle_id?: string | null;
  file_url: string;
  file_name?: string | null;
  file_type: CheckingFileType;
  external_link?: string | null;
  broadcast_date?: string | null;
  broadcast_time?: string | null;
  notes?: string | null;
  status: CheckingItemStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Informações de visualização do auditor e veículo
  reviewer?: {
    id: string;
    nome?: string;
    email?: string;
  } | null;
  vehicle?: {
    id: string;
    nome_fantasia: string;
  } | null;
}

export interface PiSettlement {
  id: string;
  tenant_id?: string;
  pi_id: string;
  type: SettlementType;
  payer_id?: string;
  receiver_id?: string;
  payer_type?: SettlementPayer;
  receiver_type?: SettlementReceiver;
  vehicle_id?: string | null;
  amount: number;
  due_date?: string | null;
  paid_at?: string | null;
  status: SettlementStatus;
  invoice_number?: string | null;
  proof_of_payment_url?: string | null;
  payment_method?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;

  vehicle?: {
    id: string;
    nome_fantasia: string;
    razao_social: string;
    dados_bancarios?: any;
    chave_pix?: string;
  } | null;
}

export interface PiDossierData {
  generated_at: string;
  pi_number: string;
  client_name: string;
  billing_type: BillingType;
  gross_amount: number;
  commission_amount: number;
  net_vehicles_amount: number;
  items_summary: Array<{
    vehicle_name: string;
    format: string;
    insertions: number;
    period: string;
    total: number;
  }>;
  checkings_audit: Array<{
    item_format: string;
    vehicle_name: string;
    file_type: string;
    file_url: string;
    approved_at: string;
    reviewer_name: string;
  }>;
  invoice?: {
    number: string;
    url?: string;
    issuer: string;
  };
}

export interface InsertionOrder {
  id: string;
  tenant_id?: string;
  pi_number: string;
  client_id?: string | null;
  agency_id?: string | null;
  representative_id?: string | null;
  proposal_id?: string | null;
  legacy_pi_id?: string | null;
  billing_type: BillingType;
  gross_amount: number;
  representative_commission_rate: number;
  representative_commission_amount: number;
  net_vehicle_amount: number;
  checking_status: CheckingStatus;
  status: PIStatus;
  campaign_name?: string;
  campaign_title: string;
  campaign_start_date?: string | null;
  campaign_end_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
  vehicle_invoice_number?: string | null;
  vehicle_invoice_url?: string | null;
  dossier_url?: string | null;
  dossier_data?: PiDossierData | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Entidades associadas
  client?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj?: string | null;
    email?: string | null;
    telefone?: string | null;
  } | null;
  agency?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj?: string | null;
  } | null;
  representative?: {
    id: string;
    nome?: string;
    email?: string;
  } | null;

  items?: PiItem[];
  checkings?: PiChecking[];
  settlements?: PiSettlement[];
}

// Helpers de Formatação e Rótulos
export const BILLING_TYPE_METADATA: Record<
  BillingType,
  { label: string; badge: string; description: string }
> = {
  REPRESENTATIVE_BILLING: {
    label: "Modalidade 1: Faturamento via Representante",
    badge: "Conta Própria / Intermediação Financeira",
    description:
      "Representante fatura o Cliente, recebe o valor bruto integral, retém sua comissão e repassa o líquido aos Veículos.",
  },
  DIRECT_VEHICLE_BILLING: {
    label: "Modalidade 2: Faturamento Direto pelo Veículo",
    badge: "Representação Pura / Faturamento Direto",
    description:
      "Veículo fatura o Cliente diretamente após auditoria de checking. Após pagamento, o Veículo repassa a comissão acordada ao Representante.",
  },
};

export const CHECKING_STATUS_METADATA: Record<
  CheckingStatus,
  { label: string; color: string; alertClass: string }
> = {
  pending_upload: {
    label: "Aguardando Comprovantes",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    alertClass: "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300",
  },
  under_review: {
    label: "Em Análise de Auditoria",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    alertClass: "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300",
  },
  approved: {
    label: "100% Auditado & Aprovado",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    alertClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300",
  },
  rejected: {
    label: "Comprovação Recusada / Pendências",
    color: "bg-rose-100 text-rose-800 border-rose-300",
    alertClass: "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300",
  },
};

export const PI_STATUS_METADATA: Record<
  PIStatus,
  { label: string; color: string; stepIndex: number }
> = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-700", stepIndex: 0 },
  approved: { label: "Aprovado / Autorizado", color: "bg-indigo-100 text-indigo-800", stepIndex: 1 },
  in_broadcast: { label: "Em Veiculação", color: "bg-cyan-100 text-cyan-800", stepIndex: 2 },
  awaiting_checking: { label: "Aguardando Checking", color: "bg-amber-100 text-amber-800", stepIndex: 3 },
  checking_approved: { label: "Checking Validado", color: "bg-teal-100 text-teal-800", stepIndex: 4 },
  billed: { label: "Faturado / Dossiê Enviado", color: "bg-blue-100 text-blue-800", stepIndex: 5 },
  paid_by_client: { label: "Liquidado pelo Cliente", color: "bg-purple-100 text-purple-800", stepIndex: 6 },
  settled: { label: "Repasses Concluídos", color: "bg-emerald-100 text-emerald-800", stepIndex: 7 },
  canceled: { label: "Cancelado", color: "bg-rose-100 text-rose-800", stepIndex: -1 },
};

export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  CLIENT_RECEIVABLE: "Recebível do Cliente (NF/Cobrança)",
  VEHICLE_PAYABLE: "Repasse ao Veículo (Saldo Líquido)",
  COMMISSION_RECEIVABLE: "Comissão a Receber do Veículo",
};

export const SETTLEMENT_STATUS_METADATA: Record<
  SettlementStatus,
  { label: string; color: string }
> = {
  pending_checking: {
    label: "Bloqueado (Aguardando Checking)",
    color: "bg-amber-100 text-amber-800 border-amber-300",
  },
  awaiting_payment: {
    label: "Liberado para Pagamento",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  paid: {
    label: "Liquidado / Pago",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
};

/**
 * Utilitário de cálculo financeiro estrito com 2 casas decimais
 */
export function calculatePiSplits(
  grossAmount: number,
  commissionRate: number,
  items: Array<{ total_price: number }>,
) {
  const gross = Math.round((Number(grossAmount) || 0) * 100) / 100;
  const rate = Math.round((Number(commissionRate) || 0) * 100) / 100;
  const commissionAmount = Math.round(gross * (rate / 100) * 100) / 100;
  const netVehicleAmount = Math.max(0, Math.round((gross - commissionAmount) * 100) / 100);

  return {
    grossAmount: gross,
    commissionRate: rate,
    commissionAmount,
    netVehicleAmount,
  };
}

export interface PiItemCalcInput {
  item_type?: PiItemType;
  display_mode?: PiDisplayMode;
  parent_media_item_id?: string | null;
  is_commissionable?: boolean;
  unit_price: number;
  insertions_count: number;
  total_price?: number;
}

export function calculatePiSplitsWithProduction(
  items: PiItemCalcInput[],
  representativeCommissionRate: number,
) {
  const rate = Math.round((Number(representativeCommissionRate) || 0) * 100) / 100;

  let grossAmount = 0;
  let commissionableGross = 0;
  let nonCommissionableGross = 0;
  let totalCommission = 0;
  let totalNetVehicle = 0;

  const processed = items.map((it) => {
    const isComm = it.is_commissionable !== false;
    const count = Math.max(1, Number(it.insertions_count) || 1);
    const unit = Math.round((Number(it.unit_price) || 0) * 100) / 100;
    const tot =
      it.total_price !== undefined
        ? Math.round(Number(it.total_price) * 100) / 100
        : Math.round(unit * count * 100) / 100;

    grossAmount += tot;

    let commAmount = 0;
    let netAmount = tot;

    if (isComm) {
      commissionableGross += tot;
      commAmount = Math.round(tot * (rate / 100) * 100) / 100;
      netAmount = Math.max(0, Math.round((tot - commAmount) * 100) / 100);
    } else {
      nonCommissionableGross += tot;
      commAmount = 0;
      netAmount = tot;
    }

    totalCommission += commAmount;
    totalNetVehicle += netAmount;

    return {
      ...it,
      total_price: tot,
      vehicle_commission_rate: isComm ? rate : 0,
      vehicle_commission_amount: commAmount,
      vehicle_net_amount: netAmount,
    };
  });

  return {
    grossAmount: Math.round(grossAmount * 100) / 100,
    commissionRate: rate,
    commissionAmount: Math.round(totalCommission * 100) / 100,
    netVehicleAmount: Math.round(totalNetVehicle * 100) / 100,
    commissionableGross: Math.round(commissionableGross * 100) / 100,
    nonCommissionableGross: Math.round(nonCommissionableGross * 100) / 100,
    items: processed,
  };
}
