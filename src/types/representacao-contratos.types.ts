import { z } from "zod";

export type ContratoRepresentacaoStatus =
  | "rascunho"
  | "enviado_assinatura"
  | "ativo"
  | "suspenso"
  | "rescindido"
  | "vencido";

export const CONTRATO_STATUS_CONFIG: Record<
  ContratoRepresentacaoStatus,
  { label: string; cor: string; bgBadge: string }
> = {
  rascunho: {
    label: "Rascunho",
    cor: "text-slate-600 dark:text-slate-400",
    bgBadge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
  },
  enviado_assinatura: {
    label: "Enviado p/ Assinatura",
    cor: "text-blue-600 dark:text-blue-400",
    bgBadge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  ativo: {
    label: "Ativo / Vigente",
    cor: "text-emerald-600 dark:text-emerald-400",
    bgBadge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  suspenso: {
    label: "Suspenso",
    cor: "text-amber-600 dark:text-amber-400",
    bgBadge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  rescindido: {
    label: "Rescindido",
    cor: "text-rose-600 dark:text-rose-400",
    bgBadge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  vencido: {
    label: "Vencido",
    cor: "text-zinc-600 dark:text-zinc-400",
    bgBadge: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800",
  },
};

export const STATUS_CONTRATO_LABELS: Record<ContratoRepresentacaoStatus, string> = {
  rascunho: CONTRATO_STATUS_CONFIG.rascunho.label,
  enviado_assinatura: CONTRATO_STATUS_CONFIG.enviado_assinatura.label,
  ativo: CONTRATO_STATUS_CONFIG.ativo.label,
  suspenso: CONTRATO_STATUS_CONFIG.suspenso.label,
  rescindido: CONTRATO_STATUS_CONFIG.rescindido.label,
  vencido: CONTRATO_STATUS_CONFIG.vencido.label,
};

export const STATUS_CONTRATO_COLORS: Record<ContratoRepresentacaoStatus, string> = {
  rascunho: CONTRATO_STATUS_CONFIG.rascunho.bgBadge,
  enviado_assinatura: CONTRATO_STATUS_CONFIG.enviado_assinatura.bgBadge,
  ativo: CONTRATO_STATUS_CONFIG.ativo.bgBadge,
  suspenso: CONTRATO_STATUS_CONFIG.suspenso.bgBadge,
  rescindido: CONTRATO_STATUS_CONFIG.rescindido.bgBadge,
  vencido: CONTRATO_STATUS_CONFIG.vencido.bgBadge,
};

export type TipoComissaoRepresentacao = "fixa" | "gatilho_volume";

export type ModeloFaturamentoRepresentacao = "centralizado_nexo" | "direto_parceiro";

export const MODELO_FATURAMENTO_CONFIG: Record<
  ModeloFaturamentoRepresentacao,
  { label: string; sigla: string; desc: string; badge: string }
> = {
  centralizado_nexo: {
    label: "Faturamento Centralizado (Nota Única Nexo)",
    sigla: "Nexo Central",
    desc: "A Nexo emite NF única ao cliente, desconta imposto retido e comissão e repassa o líquido ao parceiro.",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  direto_parceiro: {
    label: "Faturamento Direto pelo Parceiro (RT / Comissão)",
    sigla: "Direto Veículo",
    desc: "O parceiro fatura diretamente ao cliente e paga a comissão de representação à Nexo após recebimento.",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
};

export type StatusPagamentoCliente = "pendente" | "pago" | "atrasado";
export type StatusRepasseParceiro = "aguardando_cliente" | "pronto_para_repasse" | "liquidado";

export interface RegraGatilhoFaixa {
  faixa: number;
  de: number;
  ate: number | null;
  comissao_percentual: number;
}

export interface ContratoRepresentacao {
  id: string;
  tenant_cnpj: string;
  tenant_id?: string | null;
  parceiro_id: string;
  numero_contrato: string;
  status: ContratoRepresentacaoStatus;
  produtos_representados: string[];
  territorio: string;

  // Modelos de Faturamento Habilitados
  permite_faturamento_centralizado_nexo: boolean;
  aliquota_imposto_nexo_percentual: number;
  permite_faturamento_direto_parceiro: boolean;
  prazo_repasse_dias: number;

  // Remuneração
  tipo_comissao: TipoComissaoRepresentacao;
  comissao_fixa_percentual?: number | null;
  regras_gatilho: RegraGatilhoFaixa[];

  // Garantias
  garantia_comissao_pos_rescisao: boolean;
  comissao_sobre_renovacoes: boolean;
  vigencia_meses: number;
  data_inicio?: string | null;
  data_fim?: string | null;
  conteudo_contrato_markdown?: string | null;

  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  parceiro?: {
    id: string;
    razao_social: string;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    chave_pix?: string | null;
    contato_nome?: string | null;
    contato_email?: string | null;
    contato_telefone?: string | null;
  } | null;

  pedidos_count?: number;
  pedidos_volume_total?: number;
}

export interface PedidoFaturamentoIntermediado {
  id: string;
  contrato_representacao_id: string;
  tenant_cnpj: string;
  tenant_id?: string | null;
  pi_id?: string | null;
  cliente_nome: string;
  cliente_cnpj?: string | null;
  modelo_faturamento: ModeloFaturamentoRepresentacao;
  valor_bruto: number;
  aliquota_imposto_aplicada: number;
  valor_imposto_retido: number;
  percentual_comissao_aplicado: number;
  valor_comissao_nexo: number;
  valor_liquido_repasse_parceiro: number;

  status_pagamento_cliente: StatusPagamentoCliente;
  status_repasse: StatusRepasseParceiro;
  data_recebimento_cliente?: string | null;
  data_repasse_efetuado?: string | null;
  chave_pix_comprovante?: string | null;
  observacoes?: string | null;

  created_by?: string | null;
  created_at: string;
  updated_at: string;

  contrato?: ContratoRepresentacao | null;
}

export interface SplitFinancialsResult {
  valorBruto: number;
  modelo: ModeloFaturamentoRepresentacao;
  aliquotaImposto: number;
  valorImpostoRetido: number;
  percentualComissao: number;
  valorComissaoNexo: number;
  valorLiquidoRepasseParceiro: number;
}

export const RegraGatilhoFaixaSchema = z.object({
  faixa: z.number().int().min(1),
  de: z.number().min(0),
  ate: z.number().min(0).nullable(),
  comissao_percentual: z.number().min(0).max(100),
});

export const ContratoRepresentacaoSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_cnpj: z.string().default("68.279.031/0001-67"),
  parceiro_id: z.string().uuid({ message: "Selecione o parceiro/veículo" }),
  numero_contrato: z.string().min(1, "Número do contrato é obrigatório"),
  status: z
    .enum(["rascunho", "enviado_assinatura", "ativo", "suspenso", "rescindido", "vencido"])
    .default("rascunho"),
  produtos_representados: z.array(z.string()).default([]),
  territorio: z.string().default("Distrito Federal e Entorno"),

  permite_faturamento_centralizado_nexo: z.boolean().default(true),
  aliquota_imposto_nexo_percentual: z.number().min(0).max(100).default(6.0),
  permite_faturamento_direto_parceiro: z.boolean().default(true),
  prazo_repasse_dias: z.number().int().min(1).max(90).default(3),

  tipo_comissao: z.enum(["fixa", "gatilho_volume"]).default("fixa"),
  comissao_fixa_percentual: z.number().min(0).max(100).nullable().optional(),
  regras_gatilho: z.array(RegraGatilhoFaixaSchema).default([]),

  garantia_comissao_pos_rescisao: z.boolean().default(true),
  comissao_sobre_renovacoes: z.boolean().default(true),
  vigencia_meses: z.number().int().min(1).max(120).default(12),
  data_inicio: z.string().nullable().optional(),
  data_fim: z.string().nullable().optional(),
  conteudo_contrato_markdown: z.string().nullable().optional(),
});

export const PedidoFaturamentoIntermediadoSchema = z.object({
  id: z.string().uuid().optional(),
  contrato_representacao_id: z.string().uuid({ message: "Selecione o contrato de representação" }),
  tenant_cnpj: z.string().default("68.279.031/0001-67"),
  pi_id: z.string().uuid().nullable().optional(),
  cliente_nome: z.string().min(1, "Nome do cliente é obrigatório"),
  cliente_cnpj: z.string().nullable().optional(),
  modelo_faturamento: z.enum(["centralizado_nexo", "direto_parceiro"]),
  valor_bruto: z.number().min(0.01, "Valor bruto deve ser maior que zero"),
  aliquota_imposto_aplicada: z.number().min(0).max(100).default(6.0),
  percentual_comissao_aplicado: z.number().min(0).max(100),
  status_pagamento_cliente: z.enum(["pendente", "pago", "atrasado"]).default("pendente"),
  status_repasse: z.enum(["aguardando_cliente", "pronto_para_repasse", "liquidado"]).default("aguardando_cliente"),
  data_recebimento_cliente: z.string().nullable().optional(),
  data_repasse_efetuado: z.string().nullable().optional(),
  chave_pix_comprovante: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});
