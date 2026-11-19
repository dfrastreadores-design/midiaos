// ==============================================================================
// COPILOTO IA DE PLANEJAMENTO DE MÍDIA — MÍDIA.OS 3.0
// Tipos e Modelos de Domínio do Estrategista Sênior de Mídia
// ==============================================================================

export interface ChatMensagemCopiloto {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  acoes_sugeridas?: string[];
}

export interface BriefingPlanejamentoIa {
  cliente_id?: string | null;
  cliente_nome: string;
  razao_social?: string | null;
  cnpj?: string | null;
  segmento: string;
  praca_alvo: string;
  orcamento_total: number;
  duracao_dias: number;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  publico_alvo: {
    perfil: string;
    faixa_etaria: string;
    classe_social: string;
    habitos_deslocamento: string;
  };
  concorrentes_diretos?: string[];
  diferenciais_marca?: string;
  historico_crm?: string;
}

export interface DiagnosticoEstrategicoIa {
  analise_mercado: string;
  oportunidades_territoriais: string;
  desafios_comunicacao: string;
  posicionamento_concorrencia: string;
  matriz_swot_resumo: {
    forcas: string[];
    fraquezas: string[];
    oportunidades: string[];
    ameacas: string[];
  };
}

export interface ObjetivosCampanhaIa {
  objetivo_primario: string;
  objetivos_secundarios: string[];
  kpis_projetados: {
    alcance_pessoas_unicas: number;
    impactos_visuais_totais: number;
    frequencia_media: number;
    cpm_estimado: number;
    share_of_voice_estimado_pct: number;
  };
}

export interface PilarEstrategicoIa {
  nome: string;
  nota: number; // 1 a 10
  descricao: string;
}

export interface FaseCronogramaIa {
  fase: string;
  nome: string;
  dias: string;
  objetivo: string;
  foco_tatico: string;
  canais_principais: string[];
}

export interface EstrategiaRecomendadaIa {
  tese_central: string;
  racional_estrategico: string;
  pilares: {
    afinidade_territorial: PilarEstrategicoIa;
    frequencia_impacto: PilarEstrategicoIa;
    visibilidade_autoridade: PilarEstrategicoIa;
    mobilidade_jornada: PilarEstrategicoIa;
    ativacao_conversao: PilarEstrategicoIa;
  };
  cronograma_fases: FaseCronogramaIa[];
}

export interface PontoPlanoMidiaIa {
  id: string;
  produto_id?: string;
  nome: string;
  midia: string;
  tipo: string;
  formato: string;
  endereco: string;
  bairro?: string;
  cidade: string;
  praca: string;
  impactos_mes: number;
  valor_tabela: number;
  valor_negociado: number;
  desconto_pct: number;
  foto_url?: string | null;
  justificativa_estrategica: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CanalDistribuicaoIa {
  canal: string;
  percentual: number;
  valor: number;
  impactos_estimados: number;
  papel_estrategico: string;
  cor_identificadora?: string;
}

export interface DistribuicaoInvestimentoIa {
  valor_total: number;
  mix_canais: CanalDistribuicaoIa[];
  resumo_alocacao: string;
}

export interface DefesaComercialIa {
  racional_investimento: string;
  blindagem_territorial: string;
  comparativo_contra_digital: {
    vantagens_midia_fisica_dooh: string[];
    argumento_complementaridade: string;
  };
  respostas_objecoes: Array<{
    objecao: string;
    resposta_estrategica: string;
    gatilho_mental: string;
  }>;
  gatilhos_fechamento_rapido: string[];
}

export interface CenarioSimuladoIa {
  id: "conservador" | "recomendado" | "agressivo";
  nome: string;
  descricao: string;
  investimento_total: number;
  alcance_estimado: number;
  impactos_totais: number;
  frequencia_media: number;
  cpm: number;
  diferenciais: string[];
  destaque?: boolean;
}

export interface ApresentacaoExecutivaIa {
  titulo_apresentacao: string;
  subtitulo: string;
  slides_estrutura: Array<{
    numero: number;
    titulo: string;
    conteudo_principal: string;
    pontos_chave: string[];
  }>;
  conclusao_executiva: string;
}

export interface AprendizadoContinuoIa {
  id_sessao?: string;
  status_aprovacao: "rascunho" | "aprovado" | "ajustado" | "recusado";
  feedback_usuario?: string | null;
  estrelas_avaliacao?: number | null;
  motivo_ajuste_recusa?: string | null;
  segmento: string;
  orcamento: number;
  canais_aprovados?: string[];
  data_registro?: string;
}

export interface PlanejamentoEstrategicoCompleto {
  id: string;
  versao: number;
  created_at: string;
  updated_at: string;
  status: "rascunho" | "em_revisao" | "aprovado" | "convertido_pi";
  proposta_id?: string | null;
  pi_id?: string | null;
  
  // As 9 Seções Oficiais Obrigatórias:
  briefing: BriefingPlanejamentoIa;
  diagnostico: DiagnosticoEstrategicoIa;
  objetivos: ObjetivosCampanhaIa;
  estrategia: EstrategiaRecomendadaIa;
  plano_midia: PontoPlanoMidiaIa[];
  distribuicao_investimento: DistribuicaoInvestimentoIa;
  defesa_comercial: DefesaComercialIa;
  cenarios: {
    ativo: "conservador" | "recomendado" | "agressivo";
    lista: CenarioSimuladoIa[];
  };
  apresentacao_executiva: ApresentacaoExecutivaIa;

  // Histórico de Aprendizado e Chat:
  mensagens_chat: ChatMensagemCopiloto[];
  aprendizado?: AprendizadoContinuoIa | null;
}
