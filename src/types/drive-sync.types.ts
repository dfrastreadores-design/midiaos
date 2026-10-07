export interface DriveFileInfo {
  fileId: string;
  name: string;
  type: "pdf" | "xlsx" | "pptx" | "image" | "outros";
  sizeText?: string;
  viewUrl: string;
  downloadUrl: string;
}

export interface DriveFolderInfo {
  name: string;
  folderId: string;
  url: string;
  partnerNameNormalized: string;
  files: DriveFileInfo[];
}

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
