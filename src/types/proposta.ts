export type PropostaStatus = "rascunho" | "enviada" | "aprovada" | "recusada" | "convertida" | "finalizada";

export type PropostaItem = {
  tipo: string;
  programa: string | null;
  horario: string | null;
  formato: string | null;
  mes?: number;
  ano?: number;
  insercoes_dia: number;
  dias_semana: string[];
  dias_mes: number[];
  desconto: number;
  valor_unit: number;
  valor_tabela: number;
  valor_negociado: number;
  total_insercoes: number;
  dias_veiculacao?: number | null;
  link_modelo?: string | null;
};

export type Proposta = {
  id: string;
  numero: string;
  campanha: string;
  status: PropostaStatus;
  valor_negociado: number;
  valor_tabela: number;
  valor_desconto: number;
  comissao_pct: number;
  total_insercoes: number;
  cliente_id: string | null;
  agencia_id: string | null;
  executivo_id: string | null;
  cliente_avulso: string | null;
  validade: string | null;
  observacao: string | null;
  criado_por: string | null;
  briefing_id?: string | null;
  itens?: PropostaItem[];
  isCopy?: boolean;
  cliente?: { razao_social: string; nome_fantasia: string | null } | null;
  agencia?: { razao_social: string; nome_fantasia: string | null } | null;
};
