/**
 * MÓDULO DE CATEGORIAS DE SERVIÇOS E REPRESENTAÇÃO COMERCIAL — MÍDIA.OS
 * Especializado para agências de representação de mídia e veículos parceiros
 * (ex: modelo Nexo Estratégia Mídia e Comunicação)
 */

export type PartnerStatus = "ativo" | "inativo" | "em_negociacao";

export type TipoVeiculoPartner =
  | "TV"
  | "Radio"
  | "Painel OOH/DOOH"
  | "Portal de Notícias"
  | "Impresso"
  | "Mídia em Ônibus/Transporte"
  | "Redes Sociais & Influenciadores"
  | "Outros";

export interface Partner {
  id: string;
  tenant_id?: string | null;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  logo_url?: string | null;
  contato_nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  site?: string | null;
  tipo_veiculo: TipoVeiculoPartner | string;
  comissao_padrao_percentual: number;
  status: PartnerStatus;
  observacoes?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  redes_sociais?: Record<string, any> | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Campos calculados em listagem
  produtos_count?: number;
  produtos_valor_total?: number;
  comissao_media?: number;
}

export type PartnerInput = Omit<Partner, "id" | "created_at" | "updated_at" | "produtos_count" | "produtos_valor_total" | "comissao_media"> & {
  id?: string;
};

export type CategoriaMidiaRepresentacao =
  | "tv_audio"
  | "ooh_dooh"
  | "digital_portais"
  | "impressa_outros"
  | "servicos_proprios";

export type TipoCobrancaRepresentacao =
  | "insercao"
  | "diaria"
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "por_clique"
  | "cpm";

export interface EspecificacoesTecnicas {
  resolucao?: string;
  formato_video_audio?: string;
  dimensoes_metros_pixels?: string;
  duracao_segundos?: number;
  limite_tamanho_mb?: number;
  frequencia_loop?: string;
  publico_estimado?: string;
  observacoes_tecnicas?: string;
}

export interface MediaServiceCatalogItem {
  id: string;
  tenant_id?: string | null;
  partner_id?: string | null;
  is_own_product: boolean;
  nome_produto: string;
  categoria_midia: CategoriaMidiaRepresentacao | string;
  tipo_cobranca: TipoCobrancaRepresentacao;
  valor_tabela: number;
  valor_negociado_minimo?: number | null;
  comissao_percentual_especifica?: number | null;
  quantidade_disponivel: number;
  estoque_espacos: number;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  especificacoes_tecnicas?: EspecificacoesTecnicas | Record<string, any> | null;
  fotos?: string[];
  imagem_url?: string | null;
  ativo: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joins informativos
  partner?: {
    id: string;
    nome_fantasia?: string | null;
    razao_social: string;
    logo_url?: string | null;
    tipo_veiculo?: string | null;
    comissao_padrao_percentual: number;
  } | null;
}

export type MediaServiceCatalogInput = Omit<MediaServiceCatalogItem, "id" | "created_at" | "updated_at" | "partner"> & {
  id?: string;
};

export const CATEGORIAS_MIDIA_CONFIG: Record<
  CategoriaMidiaRepresentacao,
  {
    label: string;
    descricao: string;
    exemplos: string[];
    corBadge: string;
    color: string;
  }
> = {
  tv_audio: {
    label: "TV & Áudio",
    descricao: "Comerciais de TV, Rádio, Podcasts e Testemunhais",
    exemplos: [
      "Comercial 30s Horário Nobre",
      "Spot de Rádio 30s",
      "Testemunhal ao Vivo",
      "Patrocínio de Programa",
      "Cota Rotativa",
    ],
    corBadge: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800/40",
    color: "bg-amber-600",
  },
  ooh_dooh: {
    label: "OOH / DOOH",
    descricao: "Painéis de LED, Outdoors, Frontlights e Mídia Urbana",
    exemplos: [
      "Painel de LED Digital",
      "Outdoor Estático 9x3m",
      "Frontlight Rodoviário",
      "Abrigo de Ônibus",
      "Totem Vertical Mall",
      "Telas em Elevadores",
    ],
    corBadge: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800/40",
    color: "bg-emerald-600",
  },
  digital_portais: {
    label: "Digital & Portais",
    descricao: "Portais de Notícias, Banners, Redes Sociais e Cobertura",
    exemplos: [
      "Banner Topo Super Leaderboard",
      "Artigo Patrocinado / Publieditorial",
      "Stories / Reels Patrocinados",
      "Disparo de Newsletter",
      "Mídia Programática Local",
    ],
    corBadge: "bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-800/40",
    color: "bg-sky-600",
  },
  impressa_outros: {
    label: "Mídia Impressa & Outros",
    descricao: "Jornais, Revistas, Encartes e Mídia em Transporte",
    exemplos: [
      "Página Inteira em Jornal",
      "Encarte Promocional",
      "Adesivagem de Frota / Busdoor",
      "Revista Especial do Setor",
    ],
    corBadge: "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800/40",
    color: "bg-violet-600",
  },
  servicos_proprios: {
    label: "Serviços Próprios da Representação",
    descricao: "Planejamento 360°, Produção de Conteúdo e Inteligência de Mídia",
    exemplos: [
      "Planejamento Estratégico de Mídia 360°",
      "Produção e Roteirização de VT/Spot",
      "Gravação e Edição de Vídeo",
      "Gestão e Monitoramento de Veiculação",
      "Assessoria Comercial de Mídia",
    ],
    corBadge: "bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800/40",
    color: "bg-indigo-600",
  },
};

export const TIPOS_COBRANCA_CONFIG: Record<
  TipoCobrancaRepresentacao,
  {
    label: string;
    sufixo: string;
    descricao: string;
  }
> = {
  insercao: {
    label: "Inserção Unitária",
    sufixo: "/ inserção",
    descricao: "Cobrança por cada exibição ou veiculação individual",
  },
  diaria: {
    label: "Diária",
    sufixo: "/ dia",
    descricao: "Cobrança por dia de exibição ininterrupta ou programada",
  },
  semanal: {
    label: "Semanal",
    sufixo: "/ semana",
    descricao: "Cobrança por ciclo de 7 dias de veiculação",
  },
  quinzenal: {
    label: "Quinzenal",
    sufixo: "/ bi-semana",
    descricao: "Padrão de bi-semana para Outdoor e painéis estáticos",
  },
  mensal: {
    label: "Mensal",
    sufixo: "/ mês",
    descricao: "Contrato mensal para contratos contínuos ou portais",
  },
  por_clique: {
    label: "Por Clique (CPC)",
    sufixo: "/ clique",
    descricao: "Cobrança baseada no tráfego direcionado aos canais do cliente",
  },
  cpm: {
    label: "CPM (Mil Impressões)",
    sufixo: "/ mil impressões",
    descricao: "Custo por cada lote de 1.000 visualizações ou exibições da mídia",
  },
};

export const TIPOS_COBRANCA_LABELS: Record<string, string> = {
  insercao: "Inserção Unitária",
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  por_clique: "Por Clique (CPC)",
  cpm: "CPM (Mil Impressões)",
};

export const TIPOS_VEICULO_LIST: TipoVeiculoPartner[] = [
  "TV",
  "Radio",
  "Painel OOH/DOOH",
  "Portal de Notícias",
  "Impresso",
  "Mídia em Ônibus/Transporte",
  "Redes Sociais & Influenciadores",
  "Outros",
];

export const STATUS_PARTNER_CONFIG: Record<
  PartnerStatus,
  {
    label: string;
    cor: string;
    bgBadge: string;
  }
> = {
  ativo: {
    label: "Ativo",
    cor: "text-emerald-600",
    bgBadge: "bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:border-emerald-800",
  },
  em_negociacao: {
    label: "Em Negociação",
    cor: "text-amber-600",
    bgBadge: "bg-amber-500/15 text-amber-700 border-amber-300 dark:border-amber-800",
  },
  inativo: {
    label: "Inativo",
    cor: "text-slate-500",
    bgBadge: "bg-slate-500/15 text-slate-700 border-slate-300 dark:border-slate-700",
  },
};
