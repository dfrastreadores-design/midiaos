export type DocumentoTipo =
  | "proposta"
  | "contrato"
  | "contrato_prestacao"
  | "contrato_parceiro"
  | "contrato_cliente"
  | "contrato_agencia"
  | "pi"
  | "termo"
  | "autorizacao"
  | "aditivo"
  | "distrato"
  | "declaracao"
  | "comercial"
  | "operacional"
  | "financeiro"
  | "prestacao_contas"
  | "personalizado";

export type AssinaturaStatus =
  | "nao_necessita_assinatura"
  | "aguardando_definicao"
  | "aguardando_assinatura"
  | "enviado_para_assinatura"
  | "assinado_parcialmente"
  | "assinado"
  | "recusado"
  | "cancelado"
  | "expirado"
  | "assinado_manualmente"
  | "documento_assinado_recebido"
  | "aguardando_conferencia";

export type MetodoAssinatura = "digital" | "manual" | "hibrido";
export type OrdemAssinatura = "simultanea" | "sequencial";

export type TipoParticipante =
  | "cliente"
  | "parceiro"
  | "nexo"
  | "agencia"
  | "testemunha"
  | "outro";

export type SignatarioStatus =
  | "pendente"
  | "enviado"
  | "visualizado"
  | "assinado"
  | "recusado";

export type ConferenciaStatus = "pendente" | "aprovado" | "rejeitado" | "solicitado_novo";

export interface Signatario {
  id: string;
  documento_id: string;
  tenant_id?: string;
  nome: string;
  cpf_cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  cargo?: string | null;
  empresa?: string | null;
  tipo_participante: TipoParticipante;
  ordem: number;
  metodo: "digital" | "manual";
  status: SignatarioStatus;
  token: string;
  assinado_em?: string | null;
  assinatura_imagem_url?: string | null;
  documento_identificacao_url?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  geolocalizacao?: Record<string, any> | null;
  recusado_motivo?: string | null;
  recusado_em?: string | null;
  lembretes_count: number;
  ultimo_lembrete_em?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentoAssinatura {
  id: string;
  tenant_id?: string;
  documento_tipo: DocumentoTipo;
  referencia_tipo?: string | null;
  referencia_id?: string | null;
  titulo: string;
  numero?: string | null;
  descricao?: string | null;
  status: AssinaturaStatus;
  necessita_assinatura: boolean;
  metodo_preferencial: MetodoAssinatura;
  ordem_tipo: OrdemAssinatura;
  versao: number;
  versao_anterior_id?: string | null;

  documento_original_url?: string | null;
  documento_impresso_url?: string | null;
  documento_assinado_url?: string | null;
  documento_manual_upload_url?: string | null;

  conferencia_status: ConferenciaStatus;
  conferencia_observacoes?: string | null;
  conferencia_por?: string | null;
  conferencia_em?: string | null;

  ia_analise?: {
    paginas_detectadas?: number;
    campos_assinatura_encontrados?: number;
    assinaturas_detectadas?: number;
    possiveis_inconsistencias?: string[];
    pontos_atencao?: string[];
    resumo_analise?: string;
    conferido_em?: string;
    disclaimer?: string;
  } | null;

  provedor_assinatura: "interno" | "docusign" | "clicksign" | "zapsign" | string;
  provedor_envelope_id?: string | null;
  provedor_metadata?: Record<string, any> | null;
  certificado_url?: string | null;

  validade_limite?: string | null;
  lembretes_enviados: number;
  ultimo_lembrete_em?: string | null;
  metadata?: Record<string, any> | null;

  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Relações em consultas
  signatarios?: Signatario[];
  historico?: AssinaturaHistoricoItem[];
}

export interface AssinaturaHistoricoItem {
  id: string;
  documento_id: string;
  tenant_id?: string;
  signatario_id?: string | null;
  acao: string;
  descricao: string;
  detalhes?: Record<string, any> | null;
  user_id?: string | null;
  created_at: string;
  signatario?: { nome: string; email?: string } | null;
}

export interface AssinaturaConfigTenant {
  id?: string;
  tenant_id: string;
  metodos_permitidos: MetodoAssinatura[];
  provedor_padrao: "interno" | "docusign" | "clicksign" | "zapsign";
  provedor_configs: Record<string, { api_key?: string; api_url?: string; webhook_secret?: string }>;
  bloqueios: {
    bloquear_campanha_sem_contrato?: boolean;
    bloquear_opec_sem_pi?: boolean;
    bloquear_faturamento_sem_assinatura?: boolean;
  };
  prazo_padrao_dias: number;
  lembretes_automaticos: boolean;
  lembretes_frequencia_dias: number;
  lembretes_max: number;
  canais_notificacao: string[];
  signatarios_padrao: Array<{
    nome: string;
    email: string;
    cargo: string;
    cpf_cnpj?: string;
    tipo_participante: TipoParticipante;
    metodo: "digital" | "manual";
  }>;
}

export const LABELS_DOCUMENTO_TIPO: Record<DocumentoTipo, string> = {
  proposta: "Proposta Comercial",
  contrato: "Contrato",
  contrato_prestacao: "Contrato de Prestação de Serviços",
  contrato_parceiro: "Contrato com Parceiro",
  contrato_cliente: "Contrato com Cliente",
  contrato_agencia: "Contrato com Agência",
  pi: "Pedido de Inserção (PI)",
  termo: "Termo de Adesão / Compromisso",
  autorizacao: "Autorização de Veiculação",
  aditivo: "Aditivo Contratual",
  distrato: "Distrato",
  declaracao: "Declaração",
  comercial: "Documento Comercial",
  operacional: "Documento Operacional",
  financeiro: "Documento Financeiro",
  prestacao_contas: "Prestação de Contas",
  personalizado: "Documento Personalizado",
};

export const LABELS_ASSINATURA_STATUS: Record<AssinaturaStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  nao_necessita_assinatura: { label: "Não necessita assinatura", variant: "secondary" },
  aguardando_definicao: { label: "Aguardando definição", variant: "outline" },
  aguardando_assinatura: { label: "Aguardando assinatura", variant: "warning" },
  enviado_para_assinatura: { label: "Enviado para assinatura", variant: "default" },
  assinado_parcialmente: { label: "Assinado parcialmente", variant: "warning" },
  assinado: { label: "Assinado", variant: "success" },
  recusado: { label: "Recusado", variant: "destructive" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  expirado: { label: "Expirado", variant: "destructive" },
  assinado_manualmente: { label: "Assinado manualmente", variant: "success" },
  documento_assinado_recebido: { label: "Documento assinado recebido", variant: "default" },
  aguardando_conferencia: { label: "Aguardando conferência", variant: "warning" },
};
