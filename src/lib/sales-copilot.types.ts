// ==============================================================================
// MÍDIA.OS 4.0 — SALES COPILOT (TIPOS E MODELOS)
// Diretor Comercial IA, Negociação Inteligente, IA Checking e Proposta Interativa
// ==============================================================================

export interface AnaliseDiretorComercialIa {
  cliente_id?: string | null;
  cliente_nome: string;
  segmento: string;
  ticket_medio_historico: number;
  probabilidade_fechamento_pct: number;
  temperatura_lead: "frio" | "morno" | "quente" | "fechamento_iminente";
  potencial_expansao: string;
  historico_resumo: string;
  argumentos_chave: string[];
}

export interface RespostaComercialRapida {
  tipo: "cliente_achou_caro" | "como_defender" | "whatsapp_fechamento" | "roteiro_reuniao_diretoria";
  titulo: string;
  texto_resposta: string;
  copia_whatsapp?: string;
  gatilhos_usados: string[];
}

export interface NegociacaoInteligenteIa {
  valor_tabela: number;
  valor_proposta: number;
  desconto_aplicado_pct: number;
  desconto_maximo_autorizado_pct: number;
  alcada_necessaria: "executivo" | "gerente" | "diretoria";
  margem_contribuicao_estimada_pct: number;
  contraproposta_sugerida: {
    valor: number;
    beneficio_adicional: string; // Ex: "Incluir 2 dias extras de LED no final de semana"
    argumento_fechamento: string;
  };
}

export interface PropostaInterativaOnline {
  token: string;
  url_compartilhavel: string;
  titulo: string;
  cliente_nome: string;
  valor_total: number;
  periodo_dias: number;
  status: "aberta" | "visualizada" | "aprovada" | "recusada";
  data_expiracao: string;
  estrategia_resumo: string;
  total_impactos: number;
}

export interface IaCheckingResultado {
  pi_id?: string;
  status_auditoria: "conforme" | "divergente" | "qualidade_baixa" | "reprovado";
  confianca_ia_pct: number;
  data_verificada: string;
  geolocalizacao_conferida: boolean;
  qualidade_instalacao_nota: number; // 1 a 10
  analise_imagem: string;
  alertas: string[];
}

export interface MetricasDashboardComercial4 {
  previsao_receita_ponderada: number;
  total_em_negociacao: number;
  taxa_conversao_pct: number;
  midias_mais_vendidas: Array<{ midia: string; share_pct: number; receita: number }>;
  pontos_mais_rentaveis: Array<{ nome: string; score: number; receita_gerada: number }>;
  segmentos_lucrativos: Array<{ segmento: string; volume: number }>;
  insights_memoria_ia: string[];
}
