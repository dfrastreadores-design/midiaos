export type TipoClassificacaoDrive =
  | "parceiro"
  | "produto_convencional"
  | "ponto_geolocalizado"
  | "projeto_especial"
  | "tabela_comercial"
  | "material_institucional"
  | "nao_classificado";

export type StatusAutorizacaoComercial =
  | "autorizado"
  | "pendente_revisao"
  | "sem_contrato"
  | "vigencia_expirada"
  | "escopo_incompativel";

export type TipoConflitoDuplicidade =
  | "novo"
  | "existente_identico"
  | "conflito_valor"
  | "conflito_condicoes"
  | "possivel_duplicata";

export interface DriveFileInfo {
  fileId: string;
  name: string;
  type: "pdf" | "xlsx" | "pptx" | "image" | "outros";
  sizeText?: string;
  viewUrl: string;
  downloadUrl: string;
  mimeType?: string;
  parentFolderId?: string;
  parentFolderName?: string;
  folderPath?: string;
  modifiedTime?: string;
}

export interface DriveFolderInfo {
  name: string;
  folderId: string;
  url: string;
  partnerNameNormalized: string;
  files: DriveFileInfo[];
  parentFolderId?: string;
  subfolders?: DriveFolderInfo[];
}

export interface DriveRastreabilidade {
  drive_file_id: string;
  drive_file_url: string;
  drive_folder_id: string;
  caminho_pasta: string;
  ultima_verificacao: string;
}

export interface DriveAutorizacaoComercialInfo {
  status: StatusAutorizacaoComercial;
  autorizado_para_venda: boolean;
  contrato_id?: string;
  numero_contrato?: string;
  vigencia_inicio?: string;
  vigencia_fim?: string;
  motivo_pendencia?: string;
}

export interface DriveDuplicidadeInfo {
  status: TipoConflitoDuplicidade;
  existe_no_banco: boolean;
  id_existente?: string;
  descricao_conflito?: string;
  valores_comparados?: {
    campo: string;
    valor_extraido: any;
    valor_existente: any;
  }[];
}

export interface DriveDadosExtraidos {
  codigo?: string;
  midia?: string;
  tipo?: string;
  formato?: string;
  valor_tabela?: number;
  valor_negociado_minimo?: number;
  comissao_pct?: number;
  duracao_segundos?: number;
  insercoes_dia?: number;
  insercoes_padrao?: number;
  condicoes_comerciais?: string;
  regras_desconto?: string[];
  
  // Dados de localização física
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
  link_maps?: string;
  sentido_via?: string;
  ponto_referencia?: string;
  
  // Dados de projetos especiais e pacotes
  entregaveis?: string[];
  formato_pacote?: string;
  periodo_campanha?: string;
  quantidade_disponivel?: number;
}

export interface DrivePreviewItem {
  id: string; // ID temporário da prévia
  tipo: TipoClassificacaoDrive;
  titulo: string;
  subtitulo?: string;
  parceiro_nome: string;
  parceiro_cnpj?: string | null;
  parceiro_id_existente?: string | null;
  
  documento_origem: {
    file_id: string;
    nome_arquivo: string;
    view_url: string;
    tipo_arquivo: string;
    pasta_nome: string;
    caminho_completo: string;
  };
  
  rastreabilidade: DriveRastreabilidade;
  dados_extraidos: DriveDadosExtraidos;
  autorizacao: DriveAutorizacaoComercialInfo;
  duplicidade: DriveDuplicidadeInfo;
  
  pendencias: string[];
  selecionado: boolean;
  observacoes?: string;
}

export interface DriveParceiroAgrupado {
  nome: string;
  razao_social?: string;
  cnpj?: string;
  pasta_drive_url: string;
  pasta_id: string;
  existe_no_banco: boolean;
  parceiro_id?: string;
  autorizacao_status: StatusAutorizacaoComercial;
  contrato_vigente: boolean;
  total_produtos: number;
  total_pontos_fisicos: number;
  total_projetos: number;
  total_tabelas: number;
  total_materiais: number;
  pendencias: string[];
  itens: DrivePreviewItem[];
}

export interface DriveApiConfigInfo {
  modo_conexao: "api_oficial" | "varredura_publica_fallback" | "simulacao";
  autenticado: boolean;
  tipo_autenticacao: "service_account" | "api_key" | "nenhuma";
  service_account_email?: string | null;
  root_folder_id: string;
  root_folder_name?: string;
  instrucoes_autenticacao?: string;
}

export interface DrivePreviewReport {
  tenant_id: string;
  tenant_cnpj: string;
  tenant_nome: string;
  timestamp: string;
  config: DriveApiConfigInfo;
  
  resumo: {
    total_pastas_analisadas: number;
    total_arquivos_descobertos: number;
    total_parceiros_identificados: number;
    total_produtos_convencionais: number;
    total_pontos_geolocalizados: number;
    total_projetos_especiais: number;
    total_tabelas_precos: number;
    total_materiais_institucionais: number;
    total_nao_classificados: number;
    total_autorizados_venda: number;
    total_pendentes_revisao: number;
    total_conflitos_duplicidade: number;
  };
  
  parceiros: DriveParceiroAgrupado[];
  itens: DrivePreviewItem[];
  pendencias_gerais: string[];
}

// Mantido para compatibilidade com rotas legadas
export interface PartnerSyncDetail {
  partnerId: string;
  nome: string;
  status: "criado" | "atualizado";
  produtosAtualizados: number;
  arquivosAnexados: number;
  arquivos: DriveFileInfo[];
  segmentos: string[];
}

export interface DriveSyncSummary {
  success: boolean;
  totalPartners: number;
  totalProductsCreated: number;
  totalFilesProcessed: number;
  sucesso: boolean;
  tenantId: string;
  tenantCnpj: string;
  novosParceiros: number;
  parceirosAtualizados: number;
  totalParceirosProcessados: number;
  produtosAtualizados: number;
  arquivosAnexados: number;
  itensDuplicados: number;
  detalhes: PartnerSyncDetail[];
  timestamp: string;
  mensagem: string;
}
