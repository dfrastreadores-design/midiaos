import { TipoCobrancaRepresentacao } from "./representacao-comercial.types";

export type ProposalStatus = "draft" | "sent" | "approved" | "rejected" | "converted_to_pi";

export const PROPOSAL_STATUS_LABELS: Record<
  ProposalStatus,
  { label: string; cor: string; bgBadge: string }
> = {
  draft: {
    label: "Rascunho",
    cor: "text-slate-600 dark:text-slate-400",
    bgBadge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
  },
  sent: {
    label: "Enviada ao Cliente",
    cor: "text-blue-600 dark:text-blue-400",
    bgBadge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  approved: {
    label: "Aprovada",
    cor: "text-emerald-600 dark:text-emerald-400",
    bgBadge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  rejected: {
    label: "Recusada",
    cor: "text-rose-600 dark:text-rose-400",
    bgBadge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  converted_to_pi: {
    label: "Convertida em PI",
    cor: "text-purple-600 dark:text-purple-400",
    bgBadge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
};

export interface ProposalItem {
  id: string;
  proposal_id?: string;
  media_service_id?: string | null;
  partner_id?: string | null;
  product_name: string;
  is_own_product: boolean;
  quantity: number;
  billing_type: TipoCobrancaRepresentacao | string;
  unit_price: number;
  gross_price: number;
  discount: number;
  discount_percent: number;
  net_client_val: number;
  agency_commission_percent: number;
  agency_commission_val: number;
  partner_payout_val: number;
  min_negotiated_unit_price?: number | null;
  notes?: string | null;
  created_at?: string;

  // Joined Partner Info
  partner?: {
    id: string;
    nome_fantasia?: string | null;
    razao_social: string;
    logo_url?: string | null;
    comissao_padrao_percentual?: number;
  } | null;

  // Joined Media Service Info
  media_service?: {
    id: string;
    categoria_midia: string;
    cidade?: string | null;
    estado?: string | null;
    imagem_url?: string | null;
    especificacoes_tecnicas?: any;
  } | null;
}

export interface Proposal {
  id: string;
  tenant_id?: string;
  client_name: string;
  client_id?: string | null;
  client_logo_url?: string | null;
  campaign_title?: string | null;
  total_gross: number;
  total_discount: number;
  total_net_agency: number;
  total_payout_partners: number;
  profit_margin_percent: number;
  status: ProposalStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: ProposalItem[];
}

export interface ProposalSimulationItemInput {
  id?: string;
  media_service_id?: string | null;
  partner_id?: string | null;
  product_name: string;
  is_own_product: boolean;
  quantity: number;
  billing_type: TipoCobrancaRepresentacao | string;
  unit_price: number;
  discount_type: "percent" | "fixed";
  discount_value: number;
  agency_commission_percent: number;
  min_negotiated_unit_price?: number | null;
  notes?: string | null;
  partner?: {
    id: string;
    nome_fantasia?: string | null;
    razao_social: string;
    logo_url?: string | null;
  } | null;
  media_service?: {
    id: string;
    categoria_midia: string;
    cidade?: string | null;
    estado?: string | null;
    imagem_url?: string | null;
  } | null;
}

/**
 * Realiza os cálculos financeiros estritos de um item da proposta
 */
export function calculateItemFinancials(input: {
  quantity: number;
  unit_price: number;
  discount_type: "percent" | "fixed";
  discount_value: number;
  is_own_product: boolean;
  agency_commission_percent: number;
  min_negotiated_unit_price?: number | null;
}) {
  const quantity = Math.max(0.01, Number(input.quantity) || 1);
  const unitPrice = Math.max(0, Number(input.unit_price) || 0);
  const grossPrice = Math.round(quantity * unitPrice * 100) / 100;

  let discountVal = 0;
  let discountPercent = 0;

  if (input.discount_type === "percent") {
    discountPercent = Math.min(100, Math.max(0, Number(input.discount_value) || 0));
    discountVal = Math.round(((grossPrice * discountPercent) / 100) * 100) / 100;
  } else {
    discountVal = Math.min(grossPrice, Math.max(0, Number(input.discount_value) || 0));
    discountPercent = grossPrice > 0 ? Math.round(((discountVal / grossPrice) * 100) * 100) / 100 : 0;
  }

  // Valor Bruto Negociado Faturado ao Cliente
  const netClientVal = Math.max(0, Math.round((grossPrice - discountVal) * 100) / 100);

  // Valor unitário efetivo negociado
  const effectiveUnitPrice = quantity > 0 ? netClientVal / quantity : 0;
  const isBelowMinimum =
    input.min_negotiated_unit_price != null &&
    input.min_negotiated_unit_price > 0 &&
    effectiveUnitPrice < input.min_negotiated_unit_price;

  let agencyCommissionPercent = Math.max(0, Number(input.agency_commission_percent) || 0);
  let agencyCommissionVal = 0;
  let partnerPayoutVal = 0;

  if (input.is_own_product) {
    // PRODUTO PRÓPRIO: Repasse ao Veículo = R$ 0,00, 100% da receita para a Representação
    agencyCommissionPercent = 100;
    agencyCommissionVal = netClientVal;
    partnerPayoutVal = 0;
  } else {
    // VEÍCULO PARCEIRO: Comissão % aplicada sobre o valor faturado ao cliente
    agencyCommissionVal = Math.round(((netClientVal * agencyCommissionPercent) / 100) * 100) / 100;
    partnerPayoutVal = Math.max(0, Math.round((netClientVal - agencyCommissionVal) * 100) / 100);
  }

  return {
    quantity,
    unitPrice,
    grossPrice,
    discountVal,
    discountPercent,
    netClientVal,
    agencyCommissionPercent,
    agencyCommissionVal,
    partnerPayoutVal,
    effectiveUnitPrice,
    isBelowMinimum,
  };
}

/**
 * Consolida os totais executivos de uma proposta multiveículos
 */
export function calculateProposalTotals(
  items: Array<{
    gross_price: number;
    discount: number;
    net_client_val: number;
    agency_commission_val: number;
    partner_payout_val: number;
  }>,
) {
  const totalGross = items.reduce((acc, it) => acc + (Number(it.gross_price) || 0), 0);
  const totalDiscount = items.reduce((acc, it) => acc + (Number(it.discount) || 0), 0);
  const totalNetClient = items.reduce((acc, it) => acc + (Number(it.net_client_val) || 0), 0);
  const totalNetAgency = items.reduce((acc, it) => acc + (Number(it.agency_commission_val) || 0), 0);
  const totalPayoutPartners = items.reduce((acc, it) => acc + (Number(it.partner_payout_val) || 0), 0);

  const profitMarginPercent =
    totalNetClient > 0 ? Math.round(((totalNetAgency / totalNetClient) * 100) * 100) / 100 : 0;

  return {
    totalGross: Math.round(totalGross * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalNetClient: Math.round(totalNetClient * 100) / 100,
    totalNetAgency: Math.round(totalNetAgency * 100) / 100,
    totalPayoutPartners: Math.round(totalPayoutPartners * 100) / 100,
    profitMarginPercent,
  };
}
