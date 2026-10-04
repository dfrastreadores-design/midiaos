import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CalcItemOut } from "@/components/PriceCalculator";

export const SOLUCOES_PORTFOLIO_NEXO = [
  {
    id: "planejamento_estrategico",
    numero: 1,
    titulo: "Planejamento Estratégico & Inteligência",
    exemplos: "Plano de Comunicação, Plano de Mídia, Posicionamento de Marca, Funil de Vendas",
  },
  {
    id: "compra_negociacao_midia",
    numero: 2,
    titulo: "Compra e Negociação de Mídia (Tradicional & DOOH)",
    exemplos:
      "TV, Rádio, Jornal, Revista, Outdoor, Frontlight, Painéis LED/DOOH, Mobiliário Urbano",
  },
  {
    id: "marketing_digital_redes",
    numero: 3,
    titulo: "Marketing Digital & Redes Sociais",
    exemplos: "Gestão de Redes Sociais, Calendário Editorial, Produção de Conteúdo, Copywriting",
  },
  {
    id: "trafego_pago_performance",
    numero: 4,
    titulo: "Tráfego Pago & Performance",
    exemplos: "Google Ads, Meta Ads, TikTok Ads, Performance Max, Geração de Leads",
  },
  {
    id: "branding_identidade_visual",
    numero: 5,
    titulo: "Branding & Identidade Visual",
    exemplos: "Criação de Marca, Rebranding, Manual de Identidade Visual, Naming",
  },
  {
    id: "design_materiais",
    numero: 6,
    titulo: "Design & Materiais",
    exemplos: "Apresentações, Catálogos, Peças para PDV, Embalagens",
  },
  {
    id: "producao_audiovisual",
    numero: 7,
    titulo: "Produção Audiovisual",
    exemplos:
      "Comerciais de TV, Vídeos Institucionais, Reels/Stories, Captação com Drone, Motion Graphics",
  },
  {
    id: "eventos_feiras_ativacoes",
    numero: 8,
    titulo: "Eventos, Feiras & Ativações",
    exemplos: "Cenografia, Lançamentos, Congressos, Stands",
  },
  {
    id: "patrocinios",
    numero: 9,
    titulo: "Patrocínios",
    exemplos: "Comercialização de cotas para eventos, feiras, festivais, esportes",
  },
  {
    id: "representacao_comercial",
    numero: 10,
    titulo: "Representação Comercial",
    exemplos: "Intermediação de espaços em TVs, Rádios, Portais, Painéis de LED",
  },
  {
    id: "marketing_influencia",
    numero: 11,
    titulo: "Marketing de Influência",
    exemplos: "Seleção, Contrato e Gestão de Influenciadores",
  },
  {
    id: "assessoria_consultoria_comercial",
    numero: 12,
    titulo: "Assessoria e Consultoria Comercial",
    exemplos: "Estruturação de Equipes, CRM, Scripts de Vendas, Treinamentos",
  },
  {
    id: "desenvolvimento_digital",
    numero: 13,
    titulo: "Desenvolvimento Digital",
    exemplos: "Criação de Sites, Landing Pages, E-commerce, Portais, SEO, Hospedagem",
  },
  {
    id: "grafica_impressos",
    numero: 14,
    titulo: "Gráfica / Impressos",
    exemplos: "Panfletos, Folders, Catálogos impressos",
  },
] as const;

export const SEGMENTOS_PRESETS = [
  "Varejo & Comércio",
  "Indústria & Manufatura",
  "Saúde & Clínicas",
  "Serviços Profissionais",
  "Entretenimento & Lazer",
  "Gastronomia & Restaurantes",
  "Imobiliário & Construção",
  "Tecnologia & Startups",
  "Educação & Cursos",
  "Automotivo & Concessionárias",
] as const;

export const MOMENTOS_DOR_PRESETS = [
  "Lançar nova marca ou produto no mercado",
  "Atrair mais tráfego qualificado para o PDV físico",
  "Aumentar vendas e captação de leads digitais",
  "Fortalecer presença e recall de marca regional",
  "Reposicionamento institucional perante a concorrência",
  "Divulgação de evento ou festival com data limite",
] as const;

export const MODELOS_PRECIFICACAO_PRESETS = [
  "Fee mensal recorrente",
  "Valor fechado de projeto",
  "Comissão por representação comercial",
  "Cota de patrocínio",
  "Tabela de mídia com desconto comercial",
] as const;

export const PropostaIaInputSchema = z.object({
  // Bloco 1: Dados do Cliente e Alinhamento Inicial
  cliente_nome: z.string().max(200).nullable().optional(),
  contato_decisor: z.string().max(200).nullable().optional(),
  segmento_atuacao: z.string().max(200).nullable().optional(),
  dor_ou_momento: z.string().max(500).nullable().optional(),

  // Bloco 2: Seleção de Soluções (O Portfólio Nexo)
  solucoes: z.array(z.string()).optional(),

  // Bloco 3: Especificações Técnicas e Escopo
  entregaveis_volumes: z.string().max(1000).nullable().optional(),
  prazos_cronograma: z.string().max(500).nullable().optional(),

  // Bloco 4: Condições Comerciais e Investimento
  modelo_precificacao: z.string().max(200).nullable().optional(),
  orcamento_estimado: z.number().nonnegative().nullable().optional(),
  condicoes_pagamento: z.string().max(500).nullable().optional(),
  condicoes_especiais: z.string().max(500).nullable().optional(),

  // Campos adicionais / legados
  objetivo: z.string().max(300).nullable().optional(),
  publico: z.string().max(300).nullable().optional(),
  midias: z.array(z.string()).optional(),
  canal_macro_preferencia: z.enum(["OFF", "ON", "HIBRIDO", "TODOS"]).optional(),
  periodo_dias: z.number().int().positive().nullable().optional(),
  foco_horario: z.string().max(100).nullable().optional(),
  observacoes: z.string().max(1000).nullable().optional(),
});

export type PropostaIaInput = z.infer<typeof PropostaIaInputSchema>;

export type SugestaoPropostaIa = {
  campanha: string;
  estrategia: string;
  justificativa_comercial: string;
  escopo_detalhado?: string;
  itens: CalcItemOut[];
  totais: {
    valor_tabela: number;
    valor_negociado: number;
    desconto_pct: number;
    total_insercoes: number;
  };
};

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Motor heurístico inteligente de planejamento comercial.
 * Garante 100% de disponibilidade mesmo sem chave externa de LLM ou em caso de limite.
 */
function gerarSugestaoHeuristica(data: PropostaIaInput, produtos: any[]): SugestaoPropostaIa {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const midiasFiltro = data.midias && data.midias.length > 0 ? new Set(data.midias) : null;
  const canalPref = data.canal_macro_preferencia || "TODOS";
  const isProdutoOn = (p: any) =>
    p.canal_macro === "ON" || ["Digital", "Social", "Web", "Portal"].includes(p.midia);
  const isProdutoOff = (p: any) =>
    (p.canal_macro || "OFF") === "OFF" || ["TV", "Radio", "DOOH", "OOH"].includes(p.midia);

  const produtosElegiveis = produtos.filter((p) => {
    if (!p.ativo) return false;
    if (midiasFiltro && !midiasFiltro.has(p.midia)) return false;
    if (canalPref === "OFF" && isProdutoOn(p) && !isProdutoOff(p)) return false;
    if (canalPref === "ON" && isProdutoOff(p) && !isProdutoOn(p)) return false;
    return true;
  });

  const pool = produtosElegiveis.length > 0 ? produtosElegiveis : produtos.filter((p) => p.ativo);

  const foco = (data.foco_horario || "").toLowerCase();
  const obj = (data.dor_ou_momento || data.objetivo || "").toLowerCase();
  const solIds = new Set(data.solucoes || []);

  // Pontuação de relevância de cada produto
  const scored = pool.map((p) => {
    let score = 10;
    const faixa = (p.faixa || "").toLowerCase();
    const nome = (p.nome || "").toLowerCase();
    const prog = (p.programa || "").toLowerCase();

    if (
      foco.includes("nobre") &&
      (faixa.includes("noite") || faixa.includes("nobre") || nome.includes("nobre"))
    )
      score += 30;
    if (
      foco.includes("manh") &&
      (faixa.includes("manh") || prog.includes("bom dia") || nome.includes("manh"))
    )
      score += 30;
    if (foco.includes("rotativ") && Number(p.valor_unit) <= 1500) score += 25;

    // Se selecionou Compra de Mídia ou DOOH
    if (solIds.has("compra_negociacao_midia") || solIds.has("representacao_comercial")) {
      score += 25;
    }

    if (obj.includes("brand") || obj.includes("marca") || obj.includes("institucional")) {
      if (p.midia === "TV" || p.midia === "DOOH") score += 20;
    }
    if (obj.includes("venda") || obj.includes("pdv") || obj.includes("promo")) {
      if (Number(p.valor_unit) < 2000) score += 25;
      if (p.midia === "Radio" || p.midia === "DOOH") score += 20;
    }
    if (obj.includes("lança")) {
      score += 15;
    }

    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Seleciona de 2 a 4 produtos diversificados com suporte a campanhas 360° Phygital
  const selecionadosMap = new Map<string, any>();
  const produtosOff = scored.filter((s) => isProdutoOff(s.p));
  const produtosOn = scored.filter((s) => isProdutoOn(s.p));

  if (
    (canalPref === "HIBRIDO" || canalPref === "TODOS") &&
    produtosOff.length > 0 &&
    produtosOn.length > 0
  ) {
    // Composição 360° balanceada: até 2 produtos de Mídia OFF e até 2 de Mídia ON
    for (const item of produtosOff.slice(0, 2)) {
      const key = `${item.p.midia}_${item.p.tipo}_${item.p.programa}`;
      selecionadosMap.set(key, item.p);
    }
    for (const item of produtosOn.slice(0, 2)) {
      const key = `${item.p.midia}_${item.p.tipo}_${item.p.programa}`;
      selecionadosMap.set(key, item.p);
    }
  } else {
    for (const item of scored) {
      if (selecionadosMap.size >= 4) break;
      const key = `${item.p.midia}_${item.p.tipo}_${item.p.programa}`;
      if (!selecionadosMap.has(key)) {
        selecionadosMap.set(key, item.p);
      }
    }
  }

  const produtosFinal = Array.from(selecionadosMap.values());
  const orcamentoTotal = Number(data.orcamento_estimado) || 0;
  const numProdutos = produtosFinal.length || 1;
  const orcamentoPorProduto = orcamentoTotal > 0 ? orcamentoTotal / numProdutos : 0;

  // Determinar dias do mês para distribuição
  const totalDiasMes = new Date(anoAtual, mesAtual, 0).getDate();
  const diasPeriodo = Math.min(data.periodo_dias || 15, totalDiasMes);

  // Gera dias úteis ou distribuídos
  const diasSugeridos: number[] = [];
  for (let d = 1; d <= diasPeriodo && diasSugeridos.length < 20; d++) {
    const dow = new Date(anoAtual, mesAtual - 1, d).getDay();
    if (dow !== 0 && dow !== 6) {
      // Seg a Sex
      diasSugeridos.push(d);
    }
  }
  if (diasSugeridos.length === 0) diasSugeridos.push(1, 2, 3, 4, 5, 8, 9, 10, 11, 12);

  const itens: CalcItemOut[] = produtosFinal.map((prod) => {
    const valorUnit = Number(prod.valor_unit) || 300;
    let insercoesDia = Number(prod.insercoes_padrao) || 1;
    let diasItem = [...diasSugeridos];

    if (diasItem.length > 12) {
      diasItem = diasItem.slice(0, 12);
    }

    let totalIns = diasItem.length * insercoesDia;
    if (totalIns <= 0) totalIns = 10;

    let valorTabela = round2(valorUnit * totalIns);
    let valorNegociado = valorTabela;
    let desconto = 0;

    // Se há orçamento definido, ajusta desconto ou inserções para encaixar
    if (orcamentoPorProduto > 0) {
      if (valorTabela > orcamentoPorProduto) {
        const proporcao = orcamentoPorProduto / valorTabela;
        if (proporcao >= 0.7) {
          // Desconto comercial plausível até 30%
          desconto = round2((1 - proporcao) * 100);
          valorNegociado = round2(orcamentoPorProduto);
        } else {
          // Reduz dias/inserções para respeitar o budget
          const maxIns = Math.max(1, Math.floor(orcamentoPorProduto / valorUnit));
          totalIns = maxIns;
          diasItem = diasItem.slice(0, Math.min(diasItem.length, totalIns));
          valorTabela = round2(valorUnit * totalIns);
          valorNegociado = valorTabela;
          desconto = 0;
        }
      } else {
        valorNegociado = valorTabela;
        desconto = 0;
      }
    }

    return {
      tipo: prod.tipo || "VT",
      programa: prod.programa || prod.nome || null,
      horario: prod.faixa || null,
      formato: prod.formato || (prod.duracao_segundos ? `${prod.duracao_segundos}s` : null),
      mes: mesAtual,
      ano: anoAtual,
      insercoes_dia: insercoesDia,
      dias_semana: ["Seg", "Ter", "Qua", "Qui", "Sex"],
      dias_mes: diasItem,
      desconto,
      valor_unit: valorUnit,
      valor_tabela: valorTabela,
      valor_negociado: valorNegociado,
      total_insercoes: totalIns,
      dias_veiculacao: diasItem.length,
      link_modelo: prod.link_modelo || null,
      produto_id: prod.id || null,
      canal_macro: prod.canal_macro || "OFF",
      plataforma_rede: prod.plataforma_rede || null,
      metricas_digitais: prod.metricas_digitais || null,
    };
  });

  const totTabela = round2(itens.reduce((acc, i) => acc + i.valor_tabela, 0));
  const totNegociado = round2(itens.reduce((acc, i) => acc + i.valor_negociado, 0));
  const totInsercoes = itens.reduce((acc, i) => acc + i.total_insercoes, 0);
  const descPct = totTabela > 0 ? round2(((totTabela - totNegociado) / totTabela) * 100) : 0;

  // Montagem rica do briefing
  const nomeCliente = data.cliente_nome ? ` — ${data.cliente_nome}` : "";
  const focoMidia =
    data.midias && data.midias.length > 0 ? data.midias.join(" + ") : "Mídia Integrada";

  // Título das soluções contratadas
  const titulosSolucoes = (data.solucoes || [])
    .map((sId) => SOLUCOES_PORTFOLIO_NEXO.find((n) => n.id === sId)?.titulo || sId)
    .filter(Boolean);

  const campanha =
    titulosSolucoes.length > 0
      ? `Proposta Comercial${nomeCliente} (${titulosSolucoes.slice(0, 2).join(" & ")})`
      : `Campanha ${data.dor_ou_momento || data.objetivo || "Comercial"}${nomeCliente} (${focoMidia})`;

  const temOff = produtosFinal.some((p) => isProdutoOff(p));
  const temOn = produtosFinal.some((p) => isProdutoOn(p));

  let sinergiaDefesa = "";
  if (temOff && temOn) {
    sinergiaDefesa =
      "\n\n🔥 DEFESA COMERCIAL — SINERGIA 360° (MUNDO FÍSICO + DIGITAL):\n" +
      "Esta proposta comercial foi arquitetada estrategicamente para explorar a complementaridade de canais Phygital: " +
      "a Mídia OFF (pontos de rua, DOOH, outdoors e veículos tradicionais) constrói autoridade de marca incontestável, credibilidade institucional e recall visual contínuo nos momentos de deslocamento e convívio urbano. " +
      "Concomitantemente, as ativações de Mídia ON (redes sociais, portais e formatos digitais interativos) prolongam essa experiência na ponta dos dedos do consumidor, promovendo engajamento imediato, navegação qualificada e conversão direta via links e métricas mensuráveis.";
  }

  const estrategia =
    `Plano estratégico estruturado com foco em ${data.dor_ou_momento || data.objetivo || "alcance, conversão e consolidação de marca"}. ` +
    `A proposta atende ao momento da empresa ${data.cliente_nome || "do cliente"}` +
    `${data.segmento_atuacao ? ` no segmento de ${data.segmento_atuacao}` : ""}` +
    `${data.contato_decisor ? `, em alinhamento direto com ${data.contato_decisor}` : ""}. ` +
    `\n\nA seleção dos formatos e canais prioriza alta assertividade com o público-alvo (${data.publico || "decisores e consumidores qualificados"}), ` +
    `garantindo máxima rentabilidade sobre o capital investido e distribuição cronológica calculada para acelerar os resultados.` +
    sinergiaDefesa;

  // Escopo Detalhado
  const escopoLinhas: string[] = [];
  if (titulosSolucoes.length > 0) {
    escopoLinhas.push(`• Soluções Nexo Integradas:\n  - ${titulosSolucoes.join("\n  - ")}`);
  }
  if (data.entregaveis_volumes) {
    escopoLinhas.push(`• Volumes & Entregáveis:\n  ${data.entregaveis_volumes}`);
  }
  if (data.prazos_cronograma) {
    escopoLinhas.push(`• Prazos & Cronograma:\n  ${data.prazos_cronograma}`);
  }
  const escopoDetalhado = escopoLinhas.length > 0 ? escopoLinhas.join("\n\n") : undefined;

  // Justificativa Comercial
  const condicoesArr: string[] = [];
  if (data.modelo_precificacao) condicoesArr.push(`Modelo: ${data.modelo_precificacao}`);
  if (data.condicoes_pagamento) condicoesArr.push(`Pagamento: ${data.condicoes_pagamento}`);
  if (data.condicoes_especiais) condicoesArr.push(`Condição Especial: ${data.condicoes_especiais}`);

  const justificativa =
    `A composição da proposta contempla ${itens.length} formatos táticos entregando ${totInsercoes} veiculações/entregáveis planejados${temOff && temOn ? " em campanha 360° Phygital de alto impacto" : ""}, ` +
    `otimizando o budget ${orcamentoTotal > 0 ? `estimado de R$ ${orcamentoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "proposto"} ` +
    `com taxa de desconto comercial de ${descPct}%.` +
    (condicoesArr.length > 0 ? ` (${condicoesArr.join(" • ")})` : "");

  return {
    campanha,
    estrategia,
    justificativa_comercial: justificativa,
    escopo_detalhado: escopoDetalhado,
    itens,
    totais: {
      valor_tabela: totTabela,
      valor_negociado: totNegociado,
      desconto_pct: descPct,
      total_insercoes: totInsercoes,
    },
  };
}

export const sugerirPropostaIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PropostaIaInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<SugestaoPropostaIa> => {
    const { supabase, userId } = context;

    // 1. Obter tenant_id do usuário logado
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    // 2. Buscar produtos do catálogo do inquilino
    let query = supabase.from("produtos").select("*").eq("ativo", true);
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }
    const { data: produtosDb, error: errProd } = await query.order("valor_unit", {
      ascending: false,
    });

    if (errProd) throw new Error(errProd.message);
    if (!produtosDb || produtosDb.length === 0) {
      throw new Error(
        "Seu catálogo ainda não possui produtos ativos cadastrados. Cadastre seus produtos na página de Produtos para que a IA possa elaborar sugestões sob medida.",
      );
    }

    // 3. Tentar chamada à IA (Lovable Gateway / Gemini / OpenAI)
    const apiKey =
      process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const catalogoSimplificado = produtosDb.map((p) => ({
          id: p.id,
          nome: p.nome,
          midia: p.midia,
          canal_macro: p.canal_macro || "OFF",
          plataforma_rede: p.plataforma_rede || null,
          metricas_digitais: p.metricas_digitais || null,
          tipo: p.tipo,
          programa: p.programa,
          formato: p.formato,
          faixa: p.faixa,
          valor_unit: p.valor_unit,
          duracao_segundos: p.duracao_segundos,
          insercoes_padrao: p.insercoes_padrao,
          parceiro_nome: (p as any).parceiro_nome,
        }));

        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        const titulosSolucoes = (data.solucoes || [])
          .map((sId) => SOLUCOES_PORTFOLIO_NEXO.find((n) => n.id === sId)?.titulo || sId)
          .filter(Boolean);

        const systemPrompt = `Você é um Diretor Comercial e Especialista em Mídia e Soluções Comerciais da Nexo Mídia e Representação.
Sua missão é sugerir uma proposta comercial otimizada, estratégica e convincente para o cliente com base no Formulário de Briefing preenchido.
REGRA FUNDAMENTAL: Você deve selecionar produtos de veiculação EXCLUSIVAMENTE a partir do catálogo fornecido. Não invente produtos que não estejam no catálogo.
SINERGIA 360° (PHYGITAL): Caso a proposta combine produtos de Mídia OFF (pontos de rua, DOOH, outdoors, rádio, TV) e Mídia ON (digital, web, redes, portais), ou a preferência seja HÍBRIDO/TODOS, destaque obrigatoriamente na estratégia e na defesa comercial a sinergia entre o mundo físico (construção de autoridade, recall visual massivo e presença urbana) e o mundo digital (engajamento direto, cliques e conversão rápida via links).
Retorne SEMPRE um JSON válido no formato especificado.`;

        const userPrompt = `FORMULÁRIO DE BRIEFING PARA PROPOSTA COMERCIAL (NEXO MÍDIA E REPRESENTAÇÃO):

[BLOCO 1: DADOS DO CLIENTE E ALINHAMENTO INICIAL]
- Nome da Empresa do Cliente: ${data.cliente_nome || "Não informado"}
- Nome e Cargo do Contato/Decisor: ${data.contato_decisor || "Não informado"}
- Segmento de Atuação: ${data.segmento_atuacao || "Não informado"}
- Momento ou Dor Principal do Cliente: ${data.dor_ou_momento || data.objetivo || "Crescimento de vendas e reconhecimento de marca"}

[BLOCO 2: SELEÇÃO DE SOLUÇÕES (PORTFÓLIO NEXO)]
- Soluções Selecionadas: ${titulosSolucoes.length > 0 ? titulosSolucoes.join("; ") : "Mix Comercial Integrado"}

[BLOCO 3: ESPECIFICAÇÕES TÉCNICAS E ESCOPO]
- Volumes, Veiculação ou Entregáveis: ${data.entregaveis_volumes || "Conforme recomendação tática"}
- Prazos e Cronograma de Execução: ${data.prazos_cronograma || (data.periodo_dias ? `${data.periodo_dias} dias` : "30 dias")}

[BLOCO 4: CONDIÇÕES COMERCIAIS E INVESTIMENTO]
- Modelo de Precificação: ${data.modelo_precificacao || "Valor do projeto / Tabela negociada"}
- Valor do Investimento Estimado (Budget): ${data.orcamento_estimado ? `R$ ${data.orcamento_estimado}` : "A definir pela proposta"}
- Condições de Pagamento: ${data.condicoes_pagamento || "Faturamento padrão"}
- Condições Especiais / Bônus: ${data.condicoes_especiais || "Condições especiais aplicáveis"}

[PREFERÊNCIAS TÉCNICAS ADICIONAIS]
- Mídias de preferência: ${data.midias && data.midias.length ? data.midias.join(", ") : "Todas do catálogo"}
- Foco de Horário: ${data.foco_horario || "Equilibrado"}
- Observações adicionais: ${data.observacoes || "Nenhuma"}

CATÁLOGO DE PRODUTOS DISPONÍVEIS:
${JSON.stringify(catalogoSimplificado, null, 2)}

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "campanha": "Nome profissional, atrativo e comercial da proposta/campanha",
  "estrategia": "Texto persuasivo e executivo explicando o racional da estratégia conectada à dor e soluções do cliente",
  "justificativa_comercial": "Resumo das condições comerciais, investimento e retorno esperado",
  "escopo_detalhado": "Texto estruturado com tópicos listando as entregas, soluções e prazos",
  "itens": [
    {
      "tipo": "string (ex: VT, Spot, Painel)",
      "programa": "string (programa, tela ou ponto)",
      "horario": "string (faixa horária)",
      "formato": "string (formato ou duração)",
      "insercoes_dia": number,
      "total_insercoes": number,
      "desconto": number,
      "valor_unit": number,
      "dias_mes": [1, 2, 3, 4, 5]
    }
  ]
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
            if (Array.isArray(parsed.itens) && parsed.itens.length > 0) {
              const itensFormatados: CalcItemOut[] = parsed.itens.map((it: any) => {
                const totalIns = Number(it.total_insercoes) || 10;
                const unit = Number(it.valor_unit) || 100;
                const desc = Number(it.desconto) || 0;
                const valTabela = round2(unit * totalIns);
                const valNegociado = round2(valTabela * (1 - desc / 100));
                const diasMes =
                  Array.isArray(it.dias_mes) && it.dias_mes.length > 0
                    ? it.dias_mes
                    : [1, 2, 3, 4, 5, 8, 9, 10, 11, 12];

                const dbProd = catalogoSimplificado.find(
                  (p) =>
                    it.programa &&
                    (p.programa?.toLowerCase() === it.programa.toLowerCase() ||
                      p.nome?.toLowerCase() === it.programa.toLowerCase()),
                );

                return {
                  tipo: String(it.tipo || dbProd?.tipo || "VT"),
                  programa: it.programa ? String(it.programa) : dbProd?.programa || null,
                  horario: it.horario ? String(it.horario) : dbProd?.faixa || null,
                  formato: it.formato ? String(it.formato) : dbProd?.formato || null,
                  mes: mesAtual,
                  ano: anoAtual,
                  insercoes_dia: Number(it.insercoes_dia) || 1,
                  dias_semana: ["Seg", "Ter", "Qua", "Qui", "Sex"],
                  dias_mes: diasMes,
                  desconto: desc,
                  valor_unit: unit,
                  valor_tabela: valTabela,
                  valor_negociado: valNegociado,
                  total_insercoes: totalIns,
                  dias_veiculacao: diasMes.length,
                  link_modelo: null,
                  produto_id: dbProd?.id || null,
                  canal_macro: dbProd?.canal_macro || "OFF",
                  plataforma_rede: dbProd?.plataforma_rede || null,
                  metricas_digitais: dbProd?.metricas_digitais || null,
                };
              });

              const totTabela = round2(itensFormatados.reduce((a, b) => a + b.valor_tabela, 0));
              const totNegociado = round2(
                itensFormatados.reduce((a, b) => a + b.valor_negociado, 0),
              );
              const totInsercoes = itensFormatados.reduce((a, b) => a + b.total_insercoes, 0);
              const descGeral =
                totTabela > 0 ? round2(((totTabela - totNegociado) / totTabela) * 100) : 0;

              return {
                campanha:
                  parsed.campanha || `Proposta Comercial — ${data.cliente_nome || "Cliente"}`,
                estrategia: parsed.estrategia || "",
                justificativa_comercial: parsed.justificativa_comercial || "",
                escopo_detalhado: parsed.escopo_detalhado || undefined,
                itens: itensFormatados,
                totais: {
                  valor_tabela: totTabela,
                  valor_negociado: totNegociado,
                  desconto_pct: descGeral,
                  total_insercoes: totInsercoes,
                },
              };
            }
          }
        }
      } catch (err) {
        // Fallback suave e instantâneo para o motor heurístico inteligente
        console.warn("Falha na chamada LLM externa, usando motor heurístico:", err);
      }
    }

    // 4. Execução do Motor Heurístico Inteligente
    return gerarSugestaoHeuristica(data, produtosDb);
  });
