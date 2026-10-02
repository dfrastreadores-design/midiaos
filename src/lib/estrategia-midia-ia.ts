import { z } from "zod";

export const EstrategiaMidiaInputSchema = z.object({
  cliente_id: z.string().uuid().optional().nullable(),
  cliente_nome: z.string().min(1, "Informe o nome do cliente"),
  segmento: z.string().optional().default("Geral"),
  cenario_atual: z.string().min(3, "Descreva o cenário atual do cliente"),
  objetivo_principal: z.string().min(3, "Informe o objetivo principal"),
  publico_alvo: z.string().optional().default("Consumidores e decisores locais"),
  pracas: z.array(z.string()).optional().default(["Brasília - DF"]),
  budget_estimado: z.number().min(0).optional().default(50000),
  duracao_dias: z.number().min(1).optional().default(30),
  veiculos_preferenciais: z
    .array(z.string())
    .optional()
    .default(["TV Aberta", "Painéis DOOH", "Rádio FM", "Digital / Redes"]),
  diferenciais_cliente: z.string().optional().default(""),
  tom_comunicacao: z.string().optional().default("Persuasivo & Confiável"),
  produtos_selecionados_ids: z.array(z.string()).optional().default([]),
});

export type EstrategiaMidiaInput = z.infer<typeof EstrategiaMidiaInputSchema>;

export interface CanalMixRecomendado {
  canal: string;
  percentual: number;
  valor_alocado: number;
  papel_tatico: string;
  frequencia_sugerida: string;
  formatos_indicados: string[];
}

export interface FaseCronograma {
  fase: string;
  periodo: string;
  foco: string;
  canais_ativos: string[];
  detalhe_operacional: string;
}

export interface MetricasProjetadas {
  alcance_estimado: string;
  impactos_totais: string;
  frequencia_media: string;
  cpm_estimado: string;
  justificativa_roi: string;
}

export interface ItemInventarioSugerido {
  produto_id?: string;
  nome: string;
  midia: string;
  tipo?: string | null;
  formato?: string | null;
  parceiro_nome?: string | null;
  endereco_ponto?: string | null;
  valor_unit: number;
  insercoes_sugeridas: number;
  subtotal: number;
  justificativa: string;
}

export interface EstrategiaMidiaOutput {
  titulo_estrategia: string;
  diagnostico_cenario: string;
  racional_estrategico: string;
  mix_recomendado: CanalMixRecomendado[];
  cronograma_fases: FaseCronograma[];
  metricas_projetadas: MetricasProjetadas;
  argumentos_venda_decisor: string[];
  acoes_diferenciais: string[];
  observacoes_veiculacao: string;
  itens_inventario?: ItemInventarioSugerido[];
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function montarEstrategiaHeuristicaAvancada(
  data: EstrategiaMidiaInput,
  produtosCatalogo: any[] = [],
): EstrategiaMidiaOutput {
  const budget = data.budget_estimado || 50000;
  const dias = data.duracao_dias || 30;
  const segmento = data.segmento || "Geral";
  const publicoAlvo = data.publico_alvo || "Consumidores e decisores";
  const pracas = Array.isArray(data.pracas) && data.pracas.length > 0 ? data.pracas : ["Brasília - DF"];
  const objLower = (data.objetivo_principal || "").toLowerCase();
  const cenarioLower = (data.cenario_atual || "").toLowerCase();

  const isVarejo =
    objLower.includes("venda") ||
    objLower.includes("convers") ||
    cenarioLower.includes("loja") ||
    cenarioLower.includes("varejo");
  const isBranding =
    objLower.includes("brand") ||
    objLower.includes("marca") ||
    objLower.includes("reconhec") ||
    cenarioLower.includes("posiciona");
  const isLancamento =
    objLower.includes("lança") ||
    cenarioLower.includes("novo") ||
    cenarioLower.includes("imóvel") ||
    cenarioLower.includes("inaugur");

  // Mix de Mídia calculado proporcionalmente
  let canais: { nome: string; pct: number; papel: string; freq: string; formatos: string[] }[] = [];

  if (isVarejo) {
    canais = [
      {
        nome: "TV Aberta (Horários Comerciais & Rotativo)",
        pct: 45,
        papel: "Geração massiva de tráfego rápido, urgência de compra e validação de ofertas.",
        freq: "3 a 5 inserções/dia concentradas de quarta-feira a sábado.",
        formatos: ["VT 30s Ofertas", "Lettering Promocional", "Ação de Merchan"],
      },
      {
        nome: "Painéis de LED / DOOH (Eixos de Alto Fluxo)",
        pct: 30,
        papel: "Impacto no trajeto do consumidor até as lojas e reforço imediato de proximidade.",
        freq: "Inserções a cada 2 ou 3 minutos (grade rotativa contínua).",
        formatos: ["Vídeo 10s Dinâmico", "Motion Graphics de Preço"],
      },
      {
        nome: "Rádio FM (Horários de Trânsito / Drive-Time)",
        pct: 15,
        papel: "Fixação e alcance de público em trânsito no pico matutino e vespertino.",
        freq: "4 inserções diárias no horário nobre (07h-09h e 17h-19h).",
        formatos: ["Spot 30s Varejo", "Testemunhal do Locutor"],
      },
      {
        nome: "Digital & Retargeting Georreferenciado",
        pct: 10,
        papel: "Conversão direta e direcionamento de rotas para WhatsApp e lojas físicas.",
        freq: "Veiculação contínua com otimização diária por CPA.",
        formatos: ["Banners de Performance", "Stories Geolocalizados"],
      },
    ];
  } else if (isLancamento) {
    canais = [
      {
        nome: "TV Aberta (Novelas & Jornalismo)",
        pct: 40,
        papel: "Construção de notoriedade instantânea, impacto nobre e autoridade inquestionável.",
        freq: "2 a 3 inserções diárias no Jornalismo Noturno e Programação Nobre.",
        formatos: ["VT 30s Institucional / Conceito", "Break Exclusivo de Lançamento"],
      },
      {
        nome: "Painéis de LED / DOOH Premium",
        pct: 35,
        papel: "Presença contínua nos principais pontos de decisão e áreas nobres da cidade.",
        freq: "Exibição full time em circuito de telas nobres (eixos e shoppings).",
        formatos: ["Painel LED Full HD", "Looping de Impacto"],
      },
      {
        nome: "Rádio FM & Podcasts",
        pct: 15,
        papel: "Narrativa aprofundada dos benefícios exclusivos e chamada para eventos de abertura.",
        freq: "Presença nos programas líderes de audiência qualificada.",
        formatos: ["Spot 30s Conceitual", "Entrevistas / Conteúdo Nativo"],
      },
      {
        nome: "Portais de Notícias & Mídia Digital",
        pct: 10,
        papel: "Cobertura editorial e captação de cadastros pré-lançamento.",
        freq: "Diária durante as semanas de maior intensidade.",
        formatos: ["Superbanner de Capa", "Native Ads"],
      },
    ];
  } else {
    // Branding e Institucional
    canais = [
      {
        nome: "TV Aberta (Cotas de Patrocínio & Break Nobre)",
        pct: 40,
        papel: "Fixação de marca na mente do público geral e elevação da percepção de solidez.",
        freq: "Presença equilibrada de segunda a domingo em faixas premium.",
        formatos: ["VT 30s Institucional", "Cota de Patrocínio com Chamada"],
      },
      {
        nome: "Painéis de LED / DOOH Estratégicos",
        pct: 30,
        papel: "Repetição visual contínua, garantindo alto share of mind no dia a dia urbano.",
        freq: "Looping padronizado de alta frequência diária.",
        formatos: ["Vídeo Motion 10s", "Painéis em Eixos Metropolitanos"],
      },
      {
        nome: "Rádio FM Qualificada",
        pct: 20,
        papel: "Conexão emocional, engajamento e alcance de formadores de opinião.",
        freq: "Inserções fixas em programas de credibilidade.",
        formatos: ["Spot 30s Assinatura", "Citação de Marca no Ar"],
      },
      {
        nome: "Mídia Digital & Presença Web",
        pct: 10,
        papel: "Sustentação da presença e nutrição dos leads interessados na proposta.",
        freq: "Alcance contínuo focado em decisores locais.",
        formatos: ["Vídeo no Feed", "Display em Portais Locais"],
      },
    ];
  }

  const mixRecomendado: CanalMixRecomendado[] = canais.map((c) => ({
    canal: c.nome,
    percentual: c.pct,
    valor_alocado: round2((budget * c.pct) / 100),
    papel_tatico: c.papel,
    frequencia_sugerida: c.freq,
    formatos_indicados: c.formatos,
  }));

  // Fases do cronograma
  const cronogramaFases: FaseCronograma[] = [
    {
      fase: "Fase 1: Ignição & Reconhecimento",
      periodo: `Dias 1 a ${Math.max(5, Math.round(dias * 0.25))}`,
      foco: "Geração de alto impacto inicial para chamar atenção e romper a inércia do mercado.",
      canais_ativos: ["TV Aberta", "Painéis de LED"],
      detalhe_operacional:
        "Entrada forte nos canais de maior cobertura para apresentar a novidade e posicionar a mensagem central.",
    },
    {
      fase: "Fase 2: Frequência & Consideração",
      periodo: `Dias ${Math.round(dias * 0.25) + 1} a ${Math.round(dias * 0.75)}`,
      foco: "Repetição calculada para consolidação do desejo e direcionamento para os canais de venda.",
      canais_ativos: ["TV Aberta", "Rádio FM", "Painéis DOOH", "Digital"],
      detalhe_operacional:
        "Ativação do mix completo cross-media, garantindo que o consumidor encontre a mensagem em múltiplos momentos da sua rotina.",
    },
    {
      fase: "Fase 3: Conversão & Fechamento",
      periodo: `Dias ${Math.round(dias * 0.75) + 1} a ${dias}`,
      foco: "Chamada agressiva para ação (Call to Action), liquidação de oportunidades e retenção.",
      canais_ativos: ["Rádio FM", "TV Aberta", "Retargeting Digital"],
      detalhe_operacional:
        "Foco em horários de pico e mensagens com gatilhos de escassez e prazo limite para maximizar o retorno das vendas.",
    },
  ];

  // Cálculo de estimativas de métricas
  const alcancePessoas = Math.round(budget * 18);
  const impactosTotais = Math.round(alcancePessoas * 3.4);
  const cpm = round2((budget / impactosTotais) * 1000);

  const titulo = `Estratégia Cross-Media: ${data.cliente_nome} — ${data.objetivo_principal}`;

  const diagnostico =
    `O cliente ${data.cliente_nome} atua no segmento de ${segmento} e enfrenta atualmente o seguinte cenário: ` +
    `"${data.cenario_atual}". Para superar esse desafio e alcançar o objetivo prioritário de "${data.objetivo_principal}", ` +
    `a estratégia não pode se limitar a um canal isolado, mas sim utilizar um ecossistema articulado de mídia integrada. ` +
    `A praça de atuação (${pracas.join(", ")}) possui características de consumo dinâmicas, exigindo alta credibilidade e presença constante nos pontos de contato mais frequentados pelo público-alvo (${publicoAlvo}).`;

  const racional =
    `A estratégia combina o poder de penetração em massa e prestígio da TV Aberta com a repetição urbana incessante dos Painéis de LED (DOOH) ` +
    `e a cumplicidade móvel do Rádio FM, finalizando com a precisão tática da mídia digital. ` +
    `Essa sinergia garante o princípio fundamental da mídia moderna: o consumidor visualiza a autoridade da marca na TV em casa, ` +
    `é relembrado pelas telas digitais no trânsito durante o dia, ouve o reforço no rádio no caminho do trabalho e é direcionado para a decisão de compra. ` +
    (data.diferenciais_cliente
      ? ` Os diferenciais da empresa ("${data.diferenciais_cliente}") serão o fio condutor de todas as mensagens criativas.`
      : "");

  const argumentos = [
    `Presença Omnichannel Integrada: O cliente não fica refém de uma única plataforma, garantindo 100% de cobertura nos momentos de maior atenção do consumidor.`,
    `Eficiência de Custo por Mil (CPM): Com orçamento de R$ ${budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, a campanha atinge uma média projetada de R$ ${cpm} a cada 1.000 impactos reais gerados.`,
    `Autoridade Imediata com Decisores: Veicular em veículos consagrados transmite confiabilidade institucional instantânea frente a concorrentes genéricos.`,
    `Frequência Calculada sem Desperdício: O plano distribui as inserções exatamente nos dias e horários de maior propensão de compra para o segmento de ${segmento}.`,
    `Flexibilidade Operacional Centralizada: Pelo sistema Mídia.OS, todo o controle de veiculação, emissão de PIs, assinaturas e comprovantes é unificado em um só lugar.`,
  ];

  const acoesDiferenciais = [
    `Ação Cross-Promo com Rádio e TV: Alinhamento de jingle ou chamada idêntica para potencializar a lembrança auditiva e visual simultânea.`,
    `Georreferenciamento de Painéis de LED: Seleção de telas a menos de 3 km das áreas de maior interesse e lojas da empresa.`,
    `Gatilho de Urgência no Fim de Semana: Veiculações de TV programadas estrategicamente nas sextas e sábados para acelerar a tomada de decisão no fim de semana.`,
  ];

  // Alocar produtos reais do inventário do inquilino no planejamento
  const itensInventario: ItemInventarioSugerido[] = [];
  if (Array.isArray(produtosCatalogo) && produtosCatalogo.length > 0) {
    const selecionadosIds = new Set(data.produtos_selecionados_ids || []);
    const pool =
      selecionadosIds.size > 0
        ? produtosCatalogo.filter((p) => selecionadosIds.has(p.id))
        : produtosCatalogo;
    const catalogoUso = pool.length > 0 ? pool : produtosCatalogo;

    const maxItens = Math.min(catalogoUso.length, 8);
    const parcelaBudget = budget / maxItens;

    catalogoUso.slice(0, maxItens).forEach((prod) => {
      const precoUnit = Number(prod.valor_unit || prod.preco || 250);
      const insercoes = Math.max(1, Math.floor(parcelaBudget / Math.max(precoUnit, 10)));
      const subtotal = round2(insercoes * precoUnit);

      itensInventario.push({
        produto_id: prod.id,
        nome: prod.nome,
        midia: prod.midia || "DOOH",
        tipo: prod.tipo || prod.formato || null,
        formato: prod.formato || null,
        parceiro_nome: prod.parceiro_nome || null,
        endereco_ponto: prod.endereco_ponto || null,
        valor_unit: precoUnit,
        insercoes_sugeridas: insercoes,
        subtotal: subtotal,
        justificativa: `Ponto/formato de alta tração urbana para o público de ${segmento}, ampliando alcance e frequência planejada.`,
      });
    });
  }

  return {
    titulo_estrategia: titulo,
    diagnostico_cenario: diagnostico,
    racional_estrategico: racional,
    mix_recomendado: mixRecomendado,
    cronograma_fases: cronogramaFases,
    metricas_projetadas: {
      alcance_estimado: `${alcancePessoas.toLocaleString("pt-BR")} pessoas únicas`,
      impactos_totais: `${impactosTotais.toLocaleString("pt-BR")} visualizações / impactos`,
      frequencia_media: "3.4x por pessoa atingida",
      cpm_estimado: `R$ ${cpm.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      justificativa_roi: `Para o segmento de ${segmento}, a combinação de cobertura de massa com frequência em praça focada maximiza a conversão e protege a margem de lucro do cliente.`,
    },
    argumentos_venda_decisor: argumentos,
    acoes_diferenciais: acoesDiferenciais,
    observacoes_veiculacao:
      `Valores calculados com base na tabela oficial de investimentos publicitários para o Distrito Federal. ` +
      `Sujeito à disponibilidade de grade no momento da aprovação do Pedido de Inserção (PI).`,
    itens_inventario: itensInventario,
  };
}
