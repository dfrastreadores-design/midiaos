/**
 * TIPOS OFICIAIS — MIDIA OS PROSPECT (FASE 1)
 *
 * Mapeamento das 6 tabelas auxiliares da Fase 1, status canônicos e interfaces de workers.
 * Modelagem em conformidade com o Modelo A (OWN) e isolamento multi-tenant.
 */

export type ProspectStatus =
  | "descoberto"
  | "em_qualificacao"
  | "qualificado"
  | "contatado"
  | "interessado"
  | "reuniao_agendada"
  | "proposta_solicitada"
  | "convertido_cliente"
  | "descartado"
  | "bloqueado_optout";

export type ProspectCanal = "whatsapp" | "email" | "telefone" | "telefone_fixo" | "linkedin" | "outro";

export type ProspectInteractionStatus =
  | "agendado"
  | "enviando"
  | "enviado"
  | "enviado_pre_bloqueio"
  | "pendente_reconciliacao"
  | "entregue"
  | "lido"
  | "respondido"
  | "falha_temporaria"
  | "falha_definitiva"
  | "cancelado_optout";

export type ProspectBlocklistCanal = "todos" | "whatsapp" | "email" | "telefone";

export interface ProspectContato {
  nome: string;
  cargo?: string;
  funcao?: string;
  email?: string;
  telefone?: string;
  aniversario?: string;
  departamento?: string;
  tipo_canal?: ProspectCanal;
  fonte_origem?: string;
  url_fonte?: string;
  coletado_em?: string;
  atualizado_em?: string;
  confiabilidade?: "baixa" | "media" | "alta" | "verificada";
  situacao_contato?: "ativo" | "bloqueado_optout" | "invalido" | "desatualizado";
}

/** Tabela 1/6: Configurações do tenant */
export interface ProspectSettings {
  id: string;
  tenant_id: string;
  limite_diario_disparos: number;
  janela_envio_inicio: string; // HH:MM:SS
  janela_envio_fim: string;    // HH:MM:SS
  dias_uteis_apenas: boolean;
  score_minimo_qualificacao: number;
  dias_quarentena_reprospeccao: number;
  canais_ativos: string[];
  created_at: string;
  updated_at: string;
}

/** Tabela 2/6: Buscas e diagnósticos de mercado */
export interface ProspectSearch {
  id: string;
  tenant_id: string;
  usuario_id: string;
  termo_busca: string;
  filtros: Record<string, any>;
  total_encontrados: number;
  total_importados: number;
  origem: string;
  created_at: string;
}

/** Tabela 3/6: Leads corporativos (Modelo A - Carteira Individual) */
export interface ProspectCompany {
  id: string;
  tenant_id: string;
  search_id?: string | null;
  executivo_id: string; // Modelo A: Pertence estritamente ao executivo
  cnpj?: string | null;
  razao_social: string;
  nome_fantasia?: string | null;
  cnae_principal?: string | null;
  cnae_descricao?: string | null;
  segmento?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  website?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  score_prospect: number;
  status: ProspectStatus;
  origem_captura: string;
  contatos: ProspectContato[];
  motivo_descarte?: string | null;
  convertido_cliente_id?: string | null;
  convertido_em?: string | null;
  created_at: string;
  updated_at: string;
}

/** Tabela 4/6: Campanhas comerciais e réguas de prospecção */
export interface ProspectCampaign {
  id: string;
  tenant_id: string;
  nome: string;
  descricao?: string | null;
  status: "rascunho" | "ativa" | "pausada" | "concluida" | "cancelada";
  tipo_midia_alvo?: string | null;
  regra_segmentacao: Record<string, any>;
  template_whatsapp?: string | null;
  template_email?: string | null;
  limite_por_executivo: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Tabela 5/6: Fila e histórico transacional de interações */
export interface ProspectInteraction {
  id: string;
  tenant_id: string;
  company_id: string;
  campaign_id?: string | null;
  executivo_id: string;
  canal: "whatsapp" | "email" | "telefone" | "reuniao" | "linkedin";
  direcao: "outbound" | "inbound";
  destinatario_normalizado: string;
  status: ProspectInteractionStatus;
  fencing_token?: string | null;
  chave_idempotencia?: string | null;
  provedor_msg_id?: string | null;
  resposta_provedor?: Record<string, any> | null;
  erro_detalhe?: string | null;
  agendado_para?: string | null;
  enviado_em?: string | null;
  entregue_em?: string | null;
  lido_em?: string | null;
  respondido_em?: string | null;
  created_at: string;
}

/** Tabela 6/6: Blocklist e Opt-Out mandatório */
export interface ProspectBlocklist {
  id: string;
  tenant_id: string;
  destinatario_normalizado: string; // Telefone E.164 ou E-mail em minúsculas
  canal: ProspectBlocklistCanal;
  motivo?: string | null;
  solicitado_em: string;
  origem: string;
  created_at: string;
}

