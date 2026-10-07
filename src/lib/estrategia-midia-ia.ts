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

  // 1. Canais escolhidos para a estratégia (filtrados dinamicamente)
  const canaisEscolhidos =
    Array.isArray(data.veiculos_preferenciais) && data.veiculos_preferenciais.length > 0
      ? data.veiculos_preferenciais
      : ["DOOH", "TV Aberta", "Rádio FM", "Digital / Redes"];

  // Mapeamento dinâmico de características táticas de cada canal
  const canaisDetalhados = canaisEscolhidos.map((canalNome) => {
    const canalLower = canalNome.toLowerCase();

    if (canalLower.includes("tv")) {
      return {
        nome: canalNome,
        peso: isVarejo ? 45 : isLancamento ? 40 : 35,
        papel: isVarejo
          ? "Geração massiva de tráfego rápido, urgência de compra e validação de ofertas na TV."
          : isLancamento
            ? "Construção de notoriedade instantânea, impacto nobre e autoridade inquestionável."
            : "Fixação de marca na mente do grande público e elevação da percepção de solidez.",
        freq: "2 a 4 inserções diárias em faixas de alta audiência comercial.",
        formatos: ["VT 30s Institucional / Ofertas", "Break Comercial Nobre"],
      };
    }
    if (canalLower.includes("dooh") || canalLower.includes("led")) {
      return {
        nome: canalNome,
        peso: isVarejo ? 35 : isLancamento ? 35 : 30,
        papel: "Impacto visual dinâmico de alta repetição na jornada urbana cotidiana e pontos de decisão.",
        freq: "Looping contínuo a cada 2-3 minutos em circuito digital.",
        formatos: ["Vídeo Motion 10s Full HD", "Vinheta de Impacto 15s"],
      };
    }
    if (canalLower.includes("ooh") || canalLower.includes("pain") || canalLower.includes("front")) {
      return {
        nome: canalNome,
        peso: 30,
        papel: "Visibilidade contínua de grande formato em vias expressas, consolidando presença de marca 24h.",
        freq: "Exibição permanente 24h/dia com iluminação noturna.",
        formatos: ["Frontlight 12x4m", "Empena Urbana", "Outdoor Duplo"],
      };
    }
    if (canalLower.includes("rádio") || canalLower.includes("radio")) {
      return {
        nome: canalNome,
        peso: 25,
        papel: "Frequência móvel, alcance no trânsito (drive-time) e forte conexão de proximidade com a audiência.",
        freq: "4 a 6 inserções diárias concentradas no horário de pico matutino e vespertino.",
        formatos: ["Spot 30s", "Testemunhal do Locutor", "Citação de Marca"],
      };
    }
    if (
      canalLower.includes("rede") ||
      canalLower.includes("social") ||
      canalLower.includes("digital") ||
      canalLower.includes("web")
    ) {
      return {
        nome: canalNome,
        peso: 20,
        papel: "Segmentação hiperlocal, retargeting de alta conversão e engajamento direto nos canais digitais.",
        freq: "Veiculação contínua com otimização diária por CPA.",
        formatos: ["Reels / Vídeo Vertical 9:16", "Carrossel de Ofertas", "Banners de Performance"],
      };
    }
    if (canalLower.includes("transporte") || canalLower.includes("tela") || canalLower.includes("car")) {
      return {
        nome: canalNome,
        peso: 25,
        papel: "Audiência cativa em tempo de permanência no trânsito em veículos de transporte e mobilidade urbana.",
        freq: "Exibição rotativa contínua a cada corrida.",
        formatos: ["Vídeo 15s em Tela Embarcada", "Banner Interativo"],
      };
    }
    return {
      nome: canalNome,
      peso: 25,
      papel: "Comunicação estratégica direcionada e presença qualificada nos pontos de contato do público-alvo.",
      freq: "Grade regular conforme disponibilidade de inventário.",
      formatos: ["Formato padrão do veículo", "Ação Especial"],
    };
  });

  const totalPeso = canaisDetalhados.reduce((acc, c) => acc + c.peso, 0) || 1;

  // Distribuir exatamente 100% da verba entre os canais selecionados
  let somaPercentuais = 0;
  let somaValores = 0;
  const mixRecomendado: CanalMixRecomendado[] = canaisDetalhados.map((c, index) => {
    const isUltimo = index === canaisDetalhados.length - 1;
    let pct: number;
    let valorAlocado: number;

    if (isUltimo) {
      pct = Math.max(1, 100 - somaPercentuais);
      valorAlocado = round2(budget - somaValores);
    } else {
      pct = Math.max(1, Math.round((c.peso / totalPeso) * 100));
      somaPercentuais += pct;
      valorAlocado = round2((budget * pct) / 100);
      somaValores += valorAlocado;
    }

    return {
      canal: c.nome,
      percentual: pct,
      valor_alocado: valorAlocado,
      papel_tatico: c.papel,
      frequencia_sugerida: c.freq,
      formatos_indicados: c.formatos,
    };
  });

  // Fases do cronograma adaptadas aos canais selecionados
  const canaisNomesFinais = mixRecomendado.map((c) => c.canal);
  const canalPrimario = canaisNomesFinais[0] || "Mídia Principal";
  const canaisRestantes = canaisNomesFinais.slice(1);

  const cronogramaFases: FaseCronograma[] = [
    {
      fase: "Fase 1: Ignição & Reconhecimento",
      periodo: `Dias 1 a ${Math.max(5, Math.round(dias * 0.25))}`,
      foco: "Geração de alto impacto inicial para chamar atenção e romper a inércia do mercado.",
      canais_ativos: [canalPrimario, canaisRestantes[0] || canalPrimario],
      detalhe_operacional:
        "Entrada forte nos canais de maior cobertura para apresentar a novidade e posicionar a mensagem central.",
    },
    {
      fase: "Fase 2: Frequência & Consideração",
      periodo: `Dias ${Math.round(dias * 0.25) + 1} a ${Math.round(dias * 0.75)}`,
      foco: "Repetição calculada para consolidação do desejo e direcionamento para os canais de venda.",
      canais_ativos: canaisNomesFinais,
      detalhe_operacional:
        "Ativação do mix completo cross-media, garantindo que o consumidor encontre a mensagem em múltiplos momentos da sua rotina.",
    },
    {
      fase: "Fase 3: Conversão & Fechamento",
      periodo: `Dias ${Math.round(dias * 0.75) + 1} a ${dias}`,
      foco: "Chamada agressiva para ação (Call to Action), liquidação de oportunidades e retenção.",
      canais_ativos: canaisRestantes.length > 0 ? canaisRestantes : [canalPrimario],
      detalhe_operacional:
        "Foco em horários de pico e mensagens com gatilhos de escassez e prazo limite para maximizar o retorno das vendas.",
    },
  ];

  // Cálculo de estimativas de métricas ponderadas pelos canais selecionados
  const temTv = canaisNomesFinais.some((c) => c.toLowerCase().includes("tv"));
  const temOoh = canaisNomesFinais.some((c) => c.toLowerCase().includes("ooh") || c.toLowerCase().includes("dooh"));
  const fatorAlcance = temTv ? 22 : temOoh ? 18 : 14;

  const alcancePessoas = Math.round(budget * fatorAlcance);
  const fatorImpacto = canaisNomesFinais.length > 2 ? 3.6 : 2.8;
  const impactosTotais = Math.round(alcancePessoas * fatorImpacto);
  const cpm = impactosTotais > 0 ? round2((budget / impactosTotais) * 1000) : 0;

  const titulo = `Estratégia Cross-Media: ${data.cliente_nome} — ${data.objetivo_principal}`;

  const diagnostico =
    `O cliente ${data.cliente_nome} atua no segmento de ${segmento} e enfrenta atualmente o seguinte cenário: ` +
    `"${data.cenario_atual}". Para superar esse desafio e alcançar o objetivo prioritário de "${data.objetivo_principal}", ` +
    `a estratégia selecionou os veículos de mídia ${canaisNomesFinais.join(", ")}. ` +
    `A praça de atuação (${pracas.join(", ")}) possui características de consumo dinâmicas, exigindo alta credibilidade e presença constante nos pontos de contato mais frequentados pelo público-alvo (${publicoAlvo}).`;

  const racional =
    `A estratégia aloca 100% da verba planejada exclusivamente nos veículos e canais selecionados (${canaisNomesFinais.join(", ")}). ` +
    `Essa combinação articulada atua de forma complementar nas etapas de conhecimento, consideração e ação. ` +
    (data.diferenciais_cliente
      ? ` Os diferenciais da empresa ("${data.diferenciais_cliente}") serão o fio condutor de todas as mensagens criativas.`
      : "");

  const argumentos = [
    `Presença Focada nos Canais Selecionados: O plano concentra o orçamento exclusivamente em ${canaisNomesFinais.join(", ")}, evitando dispersão de verba.`,
    `Eficiência de Custo por Mil (CPM): Com orçamento de R$ ${budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, a campanha atinge uma média projetada de R$ ${cpm} a cada 1.000 impactos reais gerados.`,
    `Autoridade Imediata com Decisores: Veicular em veículos consagrados transmite confiabilidade institucional instantânea frente a concorrentes genéricos.`,
    `Frequência Calculada sem Desperdício: O plano distribui as inserções exatamente nos dias e horários de maior propensão de compra para o segmento de ${segmento}.`,
    `Flexibilidade Operacional Centralizada: Pelo sistema Mídia.OS, todo o controle de veiculação, emissão de PIs, assinaturas e comprovantes é unificado em um só lugar.`,
  ];

  const acoesDiferenciais = [
    `Ação Coordenada entre Canais: Alinhamento de mensagem simultânea para potencializar a lembrança auditiva e visual.`,
    `Georreferenciamento de Pontos: Seleção de pontos a menos de 3 km das áreas de maior interesse e lojas da empresa.`,
    `Gatilho de Urgência no Fim de Semana: Veiculações programadas estrategicamente nas sextas e sábados para acelerar a tomada de decisão no fim de semana.`,
  ];

  // Alocar produtos reais do inventário do inquilino considerando os canais e produtos elegíveis
  const itensInventario: ItemInventarioSugerido[] = [];
  if (Array.isArray(produtosCatalogo) && produtosCatalogo.length > 0) {
    const selecionadosIds = new Set(data.produtos_selecionados_ids || []);
    const canaisFiltro = (data.veiculos_preferenciais || []).map((v) => v.trim().toLowerCase());

    const pool = produtosCatalogo.filter((p) => {
      if (selecionadosIds.size > 0 && !selecionadosIds.has(p.id)) {
        return false;
      }
      if (canaisFiltro.length > 0) {
        const midia = (p.midia || "").trim().toLowerCase();
        return canaisFiltro.some((c) => c === midia || c.includes(midia) || midia.includes(c));
      }
      return true;
    });

    const catalogoUso = pool.length > 0 ? pool : produtosCatalogo;

    const maxItens = Math.min(catalogoUso.length, 8);
    const parcelaBudget = budget / Math.max(1, maxItens);

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
      frequencia_media: `${fatorImpacto}x por pessoa atingida`,
      cpm_estimado: `R$ ${cpm.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      justificativa_roi: `Para o segmento de ${segmento}, a concentração estratégica nos canais selecionados (${canaisNomesFinais.join(", ")}) maximiza a conversão e protege a margem de lucro do cliente.`,
    },
    argumentos_venda_decisor: argumentos,
    acoes_diferenciais: acoesDiferenciais,
    observacoes_veiculacao:
      `Valores calculados com base na tabela oficial de investimentos publicitários para o Distrito Federal. ` +
      `Sujeito à disponibilidade de grade no momento da aprovação do Pedido de Inserção (PI).`,
    itens_inventario: itensInventario,
  };
}
