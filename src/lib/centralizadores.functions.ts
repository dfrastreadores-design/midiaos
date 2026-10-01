import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  calcularRepasseParceiro,
  calcularRateioMultiParceiros,
  executarTesteFinanceiroObrigatorio,
} from "./calculo-financeiro-midia";

export interface BriefingPlanejamento {
  id: string;
  tenant_id?: string;
  cliente_id?: string | null;
  agencia_id?: string | null;
  titulo: string;
  objetivo: string;
  publico_alvo?: string | null;
  pracas?: string[];
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  orcamento_estimado?: number | null;
  formatos_interesse?: string[];
  restricoes?: string | null;
  status: "rascunho" | "em_planejamento" | "proposta_gerada" | "arquivado";
  created_at: string;
  updated_at: string;
  cliente?: { razao_social: string; nome_fantasia: string } | null;
  agencia?: { razao_social: string; nome_fantasia: string } | null;
}

export interface CotacaoParceiro {
  id: string;
  tenant_id?: string;
  briefing_id?: string | null;
  parceiro_id: string;
  produto_id?: string | null;
  quantidade: number;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  valor_tabela?: number;
  valor_cotado?: number;
  imposto_estimado_pct?: number;
  comissao_estimada_pct?: number;
  disponibilidade_confirmada?: boolean;
  status: "solicitada" | "respondida" | "selecionada" | "recusada";
  observacoes?: string | null;
  created_at: string;
  parceiro?: { razao_social: string; nome_fantasia: string } | null;
  produto?: { nome: string; formato?: string; praca?: string } | null;
}

export interface InconsistenciaSistema {
  tipo:
    | "produto_sem_preco"
    | "produto_sem_parceiro"
    | "produto_sem_disponibilidade"
    | "campanha_sem_pi"
    | "pi_sem_assinatura"
    | "contrato_sem_assinatura"
    | "campanha_sem_comprovante"
    | "recebimento_sem_campanha"
    | "comissao_divergente";
  gravidade: "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
  entidade_tipo: string;
  entidade_id: string;
  link: string;
}

/**
 * 1. VISÃO GERAL DO FLUXO MASTER DO CENTRALIZADOR (ESTEIRA COMPLETA)
 */
export const getPainelCentralizadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [
      { data: clientes },
      { data: parceiros },
      { data: produtos },
      { data: propostas },
      { data: pis },
      { data: contratos },
      { data: transacoes },
      { data: comprovantes },
    ] = await Promise.all([
      supabase.from("clientes").select("id, status", { count: "exact" }),
      supabase.from("parceiros").select("id, status", { count: "exact" }),
      supabase.from("produtos").select("id, status, preco, parceiro_id", { count: "exact" }),
      supabase.from("propostas").select("id, status, valor_total", { count: "exact" }),
      supabase.from("pis").select("id, status, valor_bruto, valor_liquido", { count: "exact" }),
      supabase.from("contratos").select("id, status, valor", { count: "exact" }),
      supabase.from("transacoes_financeiras").select("id, tipo, status, valor", { count: "exact" }),
      supabase.from("comprovantes_execucao").select("id, validado", { count: "exact" }),
    ]);

    // Métricas agregadas do funil
    const totalClientes = clientes?.length || 0;
    const totalParceiros = parceiros?.length || 0;
    const totalProdutos = produtos?.length || 0;
    const totalPropostas = propostas?.length || 0;
    const totalPis = pis?.length || 0;
    const totalContratos = contratos?.length || 0;
    const totalComprovantes = comprovantes?.length || 0;

    // Métricas financeiras
    const totalEntradasPendentes = (transacoes || [])
      .filter((t) => t.tipo === "entrada" && t.status === "pendente")
      .reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);

    const totalRepassesPendentes = (transacoes || [])
      .filter((t) => t.tipo === "saida" && t.status === "pendente")
      .reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);

    return {
      funil: {
        clientes: totalClientes,
        parceiros: totalParceiros,
        produtos: totalProdutos,
        propostas: totalPropostas,
        pis: totalPis,
        contratos: totalContratos,
        comprovantes: totalComprovantes,
      },
      financeiro: {
        aReceber: totalEntradasPendentes,
        aRepassar: totalRepassesPendentes,
      },
    };
  });

/**
 * 2. DETECTOR AUTOMÁTICO DE INCONSISTÊNCIAS OPERACIONAIS E FISCAIS (Seção 80)
 */
export const detectarInconsistenciasSistema = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const inconsistencias: InconsistenciaSistema[] = [];

    // 1. Produtos sem preço ou sem parceiro
    const { data: prods } = await supabase
      .from("produtos")
      .select("id, nome, preco, parceiro_id")
      .eq("status", "ativo")
      .limit(50);

    for (const p of prods || []) {
      if (!p.preco || Number(p.preco) <= 0) {
        inconsistencias.push({
          tipo: "produto_sem_preco",
          gravidade: "alta",
          titulo: `Produto sem preço de tabela: "${p.nome}"`,
          descricao: "O produto está ativo no catálogo mas não possui valor parametrizado.",
          entidade_tipo: "produtos",
          entidade_id: p.id,
          link: `/produtos?id=${p.id}`,
        });
      }
      if (!p.parceiro_id) {
        inconsistencias.push({
          tipo: "produto_sem_parceiro",
          gravidade: "media",
          titulo: `Produto sem parceiro vinculado: "${p.nome}"`,
          descricao: "Produto comercializado sem identificar o veículo de mídia responsável.",
          entidade_tipo: "produtos",
          entidade_id: p.id,
          link: `/produtos?id=${p.id}`,
        });
      }
    }

    // 2. PIs aprovados sem documento de assinatura
    const { data: pisPendentes } = await supabase
      .from("pis")
      .select("id, numero, campanha, status, status_assinatura")
      .in("status", ["aguardando_assinatura", "enviar_opec"])
      .limit(30);

    for (const pi of pisPendentes || []) {
      if (!pi.status_assinatura || pi.status_assinatura === "aguardando_definicao") {
        inconsistencias.push({
          tipo: "pi_sem_assinatura",
          gravidade: "alta",
          titulo: `PI ${pi.numero} sem fluxo de assinatura concluído`,
          descricao: `A campanha "${pi.campanha}" está aguardando assinatura formal ou liberação OPEC.`,
          entidade_tipo: "pis",
          entidade_id: pi.id,
          link: `/pi?id=${pi.id}`,
        });
      }
    }

    // 3. Contratos ativos sem assinatura
    const { data: contratosPendentes } = await supabase
      .from("contratos")
      .select("id, numero, titulo, status")
      .eq("status", "aguardando_assinatura")
      .limit(20);

    for (const c of contratosPendentes || []) {
      inconsistencias.push({
        tipo: "contrato_sem_assinatura",
        gravidade: "alta",
        titulo: `Contrato ${c.numero} aguardando assinatura`,
        descricao: `Documento "${c.titulo}" pendente de coleta digital ou manual de assinaturas.`,
        entidade_tipo: "contratos",
        entidade_id: c.id,
        link: `/contratos?id=${c.id}`,
      });
    }

    return inconsistencias;
  });

/**
 * 3. EXECUÇÃO DO TESTE FINANCEIRO FORMAL (Seção 83)
 */
export const validarRegrasCalculoFinanceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return executarTesteFinanceiroObrigatorio();
  });

/**
 * 4. INTELIGÊNCIA ARTIFICIAL ESTRATÉGICA DE MÍDIA (Planejador por Cliente & Cenário)
 */
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

export interface EstrategiaMidiaOutput {
  titulo_estrategia: string;
  diagnostico_cenario: string;
  racional_estrategico: string;
  mix_recomendado: CanalMixRecomendado[];
  cronograma_fases: FaseCronograma[];
  metricas_projetadas: {
    alcance_estimado: string;
    impactos_totais: string;
    frequencia_media: string;
    cpm_estimado?: string;
    justificativa_roi: string;
  };
  argumentos_venda_decisor: string[];
  acoes_diferenciais: string[];
  observacoes_veiculacao: string;
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
  const objLower = data.objetivo_principal.toLowerCase();
  const cenarioLower = data.cenario_atual.toLowerCase();

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
    `O cliente ${data.cliente_nome} atua no segmento de ${data.segmento} e enfrenta atualmente o seguinte cenário: ` +
    `"${data.cenario_atual}". Para superar esse desafio e alcançar o objetivo prioritário de "${data.objetivo_principal}", ` +
    `a estratégia não pode se limitar a um canal isolado, mas sim utilizar um ecossistema articulado de mídia integrada. ` +
    `A praça de atuação (${data.pracas.join(", ")}) possui características de consumo dinâmicas, exigindo alta credibilidade e presença constante nos pontos de contato mais frequentados pelo público-alvo (${data.publico_alvo}).`;

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
    `Frequência Calculada sem Desperdício: O plano distribui as inserções exatamente nos dias e horários de maior propensão de compra para o segmento de ${data.segmento}.`,
    `Flexibilidade Operacional Centralizada: Pelo sistema Mídia.OS, todo o controle de veiculação, emissão de PIs, assinaturas e comprovantes é unificado em um só lugar.`,
  ];

  const acoesDiferenciais = [
    `Ação Cross-Promo com Rádio e TV: Alinhamento de jingle ou chamada idêntica para potencializar a lembrança auditiva e visual simultânea.`,
    `Georreferenciamento de Painéis de LED: Seleção de telas a menos de 3 km das áreas de maior interesse e lojas da empresa.`,
    `Gatilho de Urgência no Fim de Semana: Veiculações de TV programadas estrategicamente nas sextas e sábados para acelerar a tomada de decisão no fim de semana.`,
  ];

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
      justificativa_roi: `Para o segmento de ${data.segmento}, a combinação de cobertura de massa com frequência em praça focada maximiza a conversão e protege a margem de lucro do cliente.`,
    },
    argumentos_venda_decisor: argumentos,
    acoes_diferenciais: acoesDiferenciais,
    observacoes_veiculacao: `Campanha formatada para ${dias} dias de veiculação contínua com repasse líquido aos parceiros apurado pela Regra Fundamental de Cálculo do Mídia OS.`,
  };
}

export const gerarEstrategiaMidiaIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EstrategiaMidiaInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<EstrategiaMidiaOutput> => {
    const { supabase, userId } = context;

    // 1. Obter tenant do usuário logado
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    // 2. Buscar produtos e parceiros ativos para enriquecer o contexto da IA
    let queryProdutos = supabase
      .from("produtos")
      .select("id, nome, midia, tipo, formato, faixa, preco, valor_unit")
      .eq("status", "ativo");
    if (tenantId) queryProdutos = queryProdutos.eq("tenant_id", tenantId);
    const { data: produtosDb } = await queryProdutos.limit(20);

    // 3. Tentar chamada à IA (Lovable Gateway / Gemini / OpenAI)
    const apiKey =
      process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const catalogoSimplificado = (produtosDb || []).map((p) => ({
          nome: p.nome,
          midia: p.midia,
          tipo: p.tipo,
          faixa: p.faixa,
          formato: p.formato,
          preco: p.valor_unit || p.preco,
        }));

        const systemPrompt = `Você é o Diretor de Planejamento de Mídia e Inteligência Estratégica do sistema Mídia.OS.
Sua missão é criar uma Estratégia de Mídia de altíssimo nível, convincente, assertiva e customizada para o cliente e cenário fornecidos.
Considere as particularidades de cada veículo (TV, Rádio, DOOH/Painéis, Portais e Digital), proponha um mix percentual equilibrado que totalize 100%, 
cronograma em fases, métricas estimadas (alcance, impactos, frequência) e argumentos matadores para que o executivo de contas apresente ao decisor do cliente.
Retorne SEMPRE um JSON válido estritamente no formato solicitado.`;

        const userPrompt = `DADOS DO CLIENTE E CENÁRIO ESTRATÉGICO:
- Cliente: ${data.cliente_nome}
- Segmento: ${data.segmento}
- Cenário Atual: ${data.cenario_atual}
- Objetivo Principal da Campanha: ${data.objetivo_principal}
- Público-Alvo: ${data.publico_alvo}
- Praças de Interesse: ${data.pracas.join(", ")}
- Orçamento Disponível (Budget): R$ ${data.budget_estimado}
- Duração da Campanha: ${data.duracao_dias} dias
- Mídias Preferenciais: ${data.veiculos_preferenciais.join(", ")}
- Diferenciais do Cliente: ${data.diferenciais_cliente || "Qualidade e atendimento"}
- Tom de Comunicação: ${data.tom_comunicacao}

PRODUTOS / FORMATOS DO CATÁLOGO DO TENANT (REFERÊNCIA):
${JSON.stringify(catalogoSimplificado, null, 2)}

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "titulo_estrategia": "string (ex: Estratégia Cross-Media: Nome do Cliente — Foco em Conversão)",
  "diagnostico_cenario": "string (diagnóstico do cenário do cliente e por que o momento exige este plano)",
  "racional_estrategico": "string (lógica tática da conexão dos veículos no funil de compra)",
  "mix_recomendado": [
    {
      "canal": "string (nome do veículo/mídia)",
      "percentual": number (ex: 40),
      "valor_alocado": number (calculado sobre o budget de R$ ${data.budget_estimado}),
      "papel_tatico": "string (papel desse canal no plano)",
      "frequencia_sugerida": "string (ex: 3 inserções/dia)",
      "formatos_indicados": ["string", "string"]
    }
  ],
  "cronograma_fases": [
    {
      "fase": "string (ex: Fase 1: Ignição)",
      "periodo": "string (ex: Dias 1 a 10)",
      "foco": "string",
      "canais_ativos": ["string"],
      "detalhe_operacional": "string"
    }
  ],
  "metricas_projetadas": {
    "alcance_estimado": "string (ex: 850.000 pessoas únicas)",
    "impactos_totais": "string (ex: 2.800.000 impactos)",
    "frequencia_media": "string (ex: 3.3x)",
    "cpm_estimado": "string (ex: R$ 17,85)",
    "justificativa_roi": "string"
  },
  "argumentos_venda_decisor": [
    "string com argumento 1",
    "string com argumento 2",
    "string com argumento 3",
    "string com argumento 4"
  ],
  "acoes_diferenciais": [
    "string com ação criativa 1",
    "string com ação criativa 2"
  ],
  "observacoes_veiculacao": "string"
}`;

        const isLovable = !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY;
        const endpoint = isLovable
          ? "https://ai.gateway.lovable.dev/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const content = json?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (
              parsed.titulo_estrategia &&
              Array.isArray(parsed.mix_recomendado) &&
              parsed.mix_recomendado.length > 0
            ) {
              return parsed as EstrategiaMidiaOutput;
            }
          }
        }
      } catch (err) {
        console.warn("[gerarEstrategiaMidiaIA] Falha na chamada da API de IA, ativando motor heurístico:", err);
      }
    }

    // Fallback de alta precisão estratégica
    return montarEstrategiaHeuristicaAvancada(data, produtosDb || []);
  });

