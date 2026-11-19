// ==============================================================================
// MÍDIA.OS 4.0 — OOH INTELLIGENCE (TIPOS E MODELOS)
// Mapa Inteligente, Score OOH (0 a 100), Perfil do Ativo e Marketplace
// ==============================================================================

export interface PontoOohInteligente {
  id: string;
  nome: string;
  midia: "OOH" | "DOOH" | "Indoor" | "Mobiliário" | "Rádio" | "Outros";
  tipo: string; // Ex: Frontlight, Painel LED, Top Sight, Abrigo de Ônibus, Empena
  formato: string; // Ex: 9x3m, 8x4m Digital P6
  dimensao?: string;
  endereco: string;
  bairro?: string;
  cidade: string;
  estado?: string;
  praca: string;
  latitude: number;
  longitude: number;
  status: "disponivel" | "reservado" | "ocupado" | "manutencao";
  disponibilidade_a_partir?: string;
  valor_tabela: number;
  valor_minimo_negociavel: number;
  impactos_mes_estimados: number;
  fluxo_diario_estimado: number; // Veículos + Pedestres
  foto_url?: string | null;
  video_url?: string | null;

  // IA Score OOH (0 a 100)
  score_ooh: number;
  score_detalhes: {
    visibilidade: number; // 0-25 (altura, ângulo, iluminação)
    fluxo: number; // 0-25 (densidade de tráfego pendular)
    publico_qualificacao: number; // 0-25 (poder aquisitivo classes A/B/C)
    localizacao_eixo: number; // 0-15 (cruzamentos, semáforos, shoppings)
    eficiencia_cpm: number; // 0-10 (custo por mil impactos competitivo)
  };

  // Perfil Inteligente do Ativo
  perfil_ativo: {
    audiencia_estimada_mes: number;
    classes_predominantes: string[]; // ["Classe A", "Classe B"]
    faixa_etaria_predominante: string;
    melhor_periodo_venda: string; // "Black Friday, Dia das Mães, Q4"
    campanhas_indicadas: string[]; // ["Automotivo", "Imobiliário", "Varejo", "Saúde"]
    clientes_potenciais_crm: Array<{ id: string; nome: string; segmento: string; match_score: number }>;
    justificativa_estrategica: string;
  };

  // Marketplace & Parcerias
  origem: "proprio" | "parceiro";
  parceiro_nome?: string | null;
  parceiro_id?: string | null;
}

export interface CenarioOohIa {
  id: "economico" | "recomendado" | "premium";
  nome: string;
  descricao: string;
  investimento_total: number;
  quantidade_pontos: number;
  impactos_totais: number;
  alcance_estimado: number;
  frequencia_media: number;
  cpm_medio: number;
  score_medio_ooh: number;
  pontos: PontoOohInteligente[];
  diferenciais: string[];
  destaque?: boolean;
}

export interface FiltroMarketplaceOoh {
  busca_texto?: string;
  cidade?: string;
  formato?: string;
  midia?: string;
  origem?: "todos" | "proprio" | "parceiro";
  status?: string;
  score_minimo?: number;
  valor_maximo?: number;
}
