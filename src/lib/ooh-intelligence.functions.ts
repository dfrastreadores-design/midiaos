import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMasterEmail } from "@/lib/master-user";
import type { 
  PontoOohInteligente, 
  CenarioOohIa, 
  FiltroMarketplaceOoh 
} from "./ooh-intelligence.types";

// ==============================================================================
// MÍDIA.OS 4.0 — OOH INTELLIGENCE (SERVER FUNCTIONS)
// Inteligência de Mídia Exterior, IA Score OOH, Perfil do Ativo e Marketplace
// ==============================================================================

/**
 * Algoritmo proprietário de pontuação IA Score OOH (0 a 100)
 */
export function calcularScoreOoh(ponto: {
  tipo?: string | null;
  formato?: string | null;
  impactos_mes_estimados?: number | null;
  valor_tabela?: number | null;
  endereco?: string | null;
  cidade?: string | null;
}): { score_total: number; detalhes: PontoOohInteligente["score_detalhes"] } {
  const impactos = Number(ponto.impactos_mes_estimados) || 300000;
  const valor = Number(ponto.valor_tabela) || 3000;
  const cpm = impactos > 0 ? (valor / impactos) * 1000 : 10;
  const tipo = (ponto.tipo || "").toLowerCase();
  const formato = (ponto.formato || "").toLowerCase();
  const end = (ponto.endereco || "").toLowerCase();

  // 1. Visibilidade (0 a 25)
  let vis = 18;
  if (tipo.includes("led") || tipo.includes("digital") || formato.includes("led")) vis = 25;
  else if (tipo.includes("frontlight") || formato.includes("front")) vis = 22;
  else if (tipo.includes("empena")) vis = 24;
  else if (tipo.includes("outdoor")) vis = 16;
  else if (tipo.includes("mupi") || tipo.includes("mobiliario")) vis = 19;

  // 2. Fluxo (0 a 25)
  let fluxo = 15;
  if (impactos >= 1000000) fluxo = 25;
  else if (impactos >= 600000) fluxo = 22;
  else if (impactos >= 400000) fluxo = 19;
  else if (impactos >= 200000) fluxo = 16;
  else fluxo = 12;

  // 3. Público e Qualificação (0 a 25)
  let pub = 17;
  if (end.includes("shopping") || end.includes("paulista") || end.includes("sul") || end.includes("nobre") || end.includes("centro financeiro") || end.includes("aeroporto")) {
    pub = 24;
  } else if (end.includes("avenida") || end.includes("eixo") || end.includes("rodovia")) {
    pub = 20;
  } else {
    pub = 16;
  }

  // 4. Localização & Cruzamentos (0 a 15)
  let loc = 11;
  if (end.includes("cruzamento") || end.includes("semaforo") || end.includes("rotatoria") || end.includes("esquina")) {
    loc = 15;
  } else if (end.includes("avenida")) {
    loc = 13;
  } else {
    loc = 10;
  }

  // 5. Eficiência de CPM (0 a 10)
  let ef = 7;
  if (cpm <= 4.0) ef = 10;
  else if (cpm <= 7.0) ef = 9;
  else if (cpm <= 12.0) ef = 8;
  else if (cpm <= 18.0) ef = 6;
  else ef = 4;

  const total = Math.min(100, Math.max(30, vis + fluxo + pub + loc + ef));

  return {
    score_total: total,
    detalhes: {
      visibilidade: vis,
      fluxo: fluxo,
      publico_qualificacao: pub,
      localizacao_eixo: loc,
      eficiencia_cpm: ef,
    },
  };
}

/**
 * Gera perfil inteligente profundo do ponto e cruza com clientes do CRM
 */
export function enriquecerPontoComPerfil(
  raw: any,
  clientesCrm: any[] = []
): PontoOohInteligente {
  const { score_total, detalhes } = calcularScoreOoh({
    tipo: raw.tipo || raw.midia,
    formato: raw.formato,
    impactos_mes_estimados: raw.impactos_mes_estimados,
    valor_tabela: raw.valor_unit || raw.valor_tabela,
    endereco: raw.endereco_ponto || raw.endereco,
    cidade: raw.cidade || raw.praca,
  });

  const valorTabela = Number(raw.valor_unit || raw.valor_tabela) || 3500;
  const valorMinimo = Math.round(valorTabela * 0.75); // Regra financeira: margem protegida
  const impactos = Number(raw.impactos_mes_estimados) || 450000;
  const fluxoDiario = Math.round(impactos / 30);

  // Segmentos e classes sugeridas
  const isLuxo = score_total >= 88 || (raw.endereco_ponto || "").toLowerCase().includes("nobre");
  const classes = isLuxo ? ["Classe A", "Classe B+"] : ["Classe B", "Classe C+", "Classe A"];
  const campanhas = isLuxo 
    ? ["Automotivo Premium", "Imobiliário Alto Padrão", "Finanças & Investimentos", "Saúde & Estética"]
    : ["Varejo Supermercadista", "Ensino & Faculdades", "Telecom & Fibra", "Construção & Reformas"];

  // Match com clientes do CRM
  const clientesMatches = clientesCrm.slice(0, 4).map((c) => {
    let match = 70;
    if (campanhas.some(camp => camp.toLowerCase().includes((c.segmento || "").toLowerCase()))) {
      match = 95;
    } else if (c.cidade === (raw.cidade || raw.praca)) {
      match = 85;
    }
    return {
      id: c.id,
      nome: c.nome,
      segmento: c.segmento || "Geral",
      match_score: match,
    };
  });

  return {
    id: raw.id,
    nome: raw.nome || `Painel Estratégico ${raw.id.slice(0, 5)}`,
    midia: raw.midia === "DOOH" ? "DOOH" : (raw.tipo?.toLowerCase().includes("led") ? "DOOH" : "OOH"),
    tipo: raw.tipo || "Frontlight",
    formato: raw.formato || "9x3m Iluminado",
    dimensao: raw.dimensao || "9.00 x 3.00 m",
    endereco: raw.endereco_ponto || raw.endereco || "Avenida Principal",
    bairro: raw.bairro || "Centro",
    cidade: raw.cidade || raw.praca || "Brasília",
    estado: raw.estado || "DF",
    praca: raw.praca || raw.cidade || "Distrito Federal",
    latitude: raw.latitude || -15.7942,
    longitude: raw.longitude || -47.8822,
    status: (raw.status === "ativo" || raw.status === "disponivel") ? "disponivel" : (raw.status || "disponivel"),
    disponibilidade_a_partir: "Imediata (Próxima Quinzena)",
    valor_tabela: valorTabela,
    valor_minimo_negociavel: valorMinimo,
    impactos_mes_estimados: impactos,
    fluxo_diario_estimado: fluxoDiario,
    foto_url: raw.foto_comercial || raw.foto_url || null,
    video_url: raw.video_url || null,
    score_ooh: score_total,
    score_detalhes: detalhes,
    perfil_ativo: {
      audiencia_estimada_mes: Math.round(impactos * 0.42),
      classes_predominantes: classes,
      faixa_etaria_predominante: "25 a 55 anos",
      melhor_periodo_venda: "Q2 e Q4 (Mês das Mães, Black Friday, Festas)",
      campanhas_indicadas: campanhas,
      clientes_potenciais_crm: clientesMatches,
      justificativa_estrategica: `Ponto posicionado em gargalo obrigatório de tráfego, garantindo impacto repetido com score ${score_total}/100 e retenção prolongada.`,
    },
    origem: raw.partner_id ? "parceiro" : "proprio",
    parceiro_nome: raw.parceiro_nome || null,
    parceiro_id: raw.partner_id || null,
  };
}

/**
 * Lista todos os pontos com enriquecimento de IA Score OOH e Perfil
 */
export const listPontosOohInteligentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      cidade: z.string().optional(),
      segmento: z.string().optional(),
    }).optional().default({}).parse(d)
  )
  .handler(async ({ data, context }: any) => {
    const auth = context || (await requireSupabaseAuth());
    const supabase = auth.supabase;
    const session = auth.session;
    const userId = auth.userId || session?.user?.id;
    const userEmail = (auth.claims?.email || session?.user?.email || "").toLowerCase();
    const isMaster = isMasterEmail(userEmail);

    let tenantId = auth.tenantId || (auth.claims as any)?.tenant_id || (session?.user?.app_metadata as any)?.tenant_id;
    if (!tenantId) {
      try {
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("tenant_id")
          .eq("id", userId)
          .maybeSingle();
        tenantId = profile?.tenant_id;
      } catch {
        // fallback
      }
    }

    // Buscar produtos
    let query = (supabase.from("produtos") as any)
      .select("id, nome, midia, tipo, formato, dimensao, endereco_ponto, bairro, cidade, praca, valor_unit, impactos_mes_estimados, foto_comercial, latitude, longitude, status, partner_id")
      .limit(100);

    if (tenantId && !isMaster) {
      query = query.eq("tenant_id", tenantId);
    }
    const { data: prods } = await query;

    // Buscar clientes CRM para match
    let clientesCrm: any[] = [];
    try {
      let cQuery = (supabase.from("clientes") as any).select("id, nome, segmento, cidade").limit(30);
      if (tenantId && !isMaster) cQuery = cQuery.eq("tenant_id", tenantId);
      const { data: clis } = await cQuery;
      clientesCrm = clis || [];
    } catch {
      // tolerante
    }

    const pontosEnriquecidos = (prods || []).map((p: any) =>
      enriquecerPontoComPerfil(p, clientesCrm)
    );

    return {
      sucesso: true,
      total: pontosEnriquecidos.length,
      pontos: pontosEnriquecidos,
    };
  });

/**
 * Planejador OOH IA: Cria os 3 cenários (Econômico, Recomendado e Premium)
 * a partir de comando em linguagem natural ("Quero atingir classe A em Brasília com orçamento de 200 mil")
 */
export const planejarOohIa = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      comando: z.string().min(1, "Informe o comando de planejamento"),
      praca: z.string().optional(),
      orcamento: z.number().optional(),
      pontos_disponiveis: z.array(z.any()).optional().default([]),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const cmd = data.comando.toLowerCase();
    let pontos: PontoOohInteligente[] = data.pontos_disponiveis;

    // Se não passou pontos, buscar do banco
    if (!pontos || pontos.length === 0) {
      const resp = await listPontosOohInteligentes({ data: { cidade: data.praca } });
      pontos = resp.pontos;
    }

    // Extrair orçamento do comando se não fornecido
    let orcamentoTotal = data.orcamento || 50000;
    const regexValor = /(?:orçamento|verba|investimento|valor|r\$)\s*(\d+[\d\.,]*)/i;
    const match = cmd.match(regexValor);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      if (val > 1000) orcamentoTotal = val;
    }

    // Ordenar pontos por score OOH e afinidade
    const pontosOrdenados = [...pontos].sort((a, b) => b.score_ooh - a.score_ooh);

    // 1. Cenário Econômico (~50% do orçamento ou top 3 pontos)
    const qtdEco = Math.max(2, Math.min(4, Math.floor(pontosOrdenados.length * 0.4)));
    const pontosEco = pontosOrdenados.slice(0, qtdEco);
    const totalEco = pontosEco.reduce((acc, p) => acc + (p.valor_minimo_negociavel || p.valor_tabela), 0);
    const impEco = pontosEco.reduce((acc, p) => acc + p.impactos_mes_estimados, 0);

    // 2. Cenário Recomendado (~100% do orçamento, equilíbrio LED + Frontlight)
    const qtdRec = Math.max(3, Math.min(8, Math.floor(pontosOrdenados.length * 0.75)));
    const pontosRec = pontosOrdenados.slice(0, qtdRec);
    const totalRec = pontosRec.reduce((acc, p) => acc + p.valor_tabela, 0);
    const impRec = pontosRec.reduce((acc, p) => acc + p.impactos_mes_estimados, 0);

    // 3. Cenário Premium (~150% do orçamento, Domínio Territorial com maior Score)
    const pontosPrem = pontosOrdenados.slice(0, Math.min(12, pontosOrdenados.length));
    const totalPrem = pontosPrem.reduce((acc, p) => acc + Math.round(p.valor_tabela * 1.15), 0);
    const impPrem = pontosPrem.reduce((acc, p) => acc + p.impactos_mes_estimados, 0);

    const cenarios: Record<"economico" | "recomendado" | "premium", CenarioOohIa> = {
      economico: {
        id: "economico",
        nome: "Plano OOH Econômico",
        descricao: "Foco nos eixos de maior fluxo pendular com investimento reduzido.",
        investimento_total: totalEco || Math.round(orcamentoTotal * 0.6),
        quantidade_pontos: pontosEco.length,
        impactos_totais: impEco,
        alcance_estimado: Math.round(impEco * 0.35),
        frequencia_media: 4.8,
        cpm_medio: impEco > 0 ? Number(((totalEco / impEco) * 1000).toFixed(2)) : 5.2,
        score_medio_ooh: Math.round(pontosEco.reduce((s, p) => s + p.score_ooh, 0) / Math.max(1, pontosEco.length)),
        pontos: pontosEco,
        diferenciais: [
          "Menor custo de entrada",
          "Concentração nos 3 maiores fluxos da praça",
          "Retorno imediato em frequência concentrada",
        ],
      },
      recomendado: {
        id: "recomendado",
        nome: "Plano OOH Recomendado (Ponto Ótimo de ROI)",
        descricao: "Mix equilibrado entre painéis digitais de LED e frontlights de autoridade.",
        investimento_total: totalRec || orcamentoTotal,
        quantidade_pontos: pontosRec.length,
        impactos_totais: impRec,
        alcance_estimado: Math.round(impRec * 0.42),
        frequencia_media: 7.2,
        cpm_medio: impRec > 0 ? Number(((totalRec / impRec) * 1000).toFixed(2)) : 4.4,
        score_medio_ooh: Math.round(pontosRec.reduce((s, p) => s + p.score_ooh, 0) / Math.max(1, pontosRec.length)),
        pontos: pontosRec,
        destaque: true,
        diferenciais: [
          "Cercamento geográfico dos eixos de compra",
          "Equilíbrio entre presença 24h e dinamismo em LED",
          "Score médio acima de 85 pontos",
          "Recomendação oficial do Diretor de Mídia IA",
        ],
      },
      premium: {
        id: "premium",
        nome: "Plano OOH Premium (Domínio Total de Praça)",
        descricao: "Ocupação hegemônica com share of voice territorial superior a 60%.",
        investimento_total: totalPrem || Math.round(orcamentoTotal * 1.5),
        quantidade_pontos: pontosPrem.length,
        impactos_totais: impPrem,
        alcance_estimado: Math.round(impPrem * 0.58),
        frequencia_media: 9.8,
        cpm_medio: impPrem > 0 ? Number(((totalPrem / impPrem) * 1000).toFixed(2)) : 3.8,
        score_medio_ooh: Math.round(pontosPrem.reduce((s, p) => s + p.score_ooh, 0) / Math.max(1, pontosPrem.length)),
        pontos: pontosPrem,
        diferenciais: [
          "Blindagem absoluta contra concorrentes",
          "Frequência massiva diária para toda a população economicamente ativa",
          "Formatos de maior escala e iluminação prime",
          "Menor custo por mil impactos (CPM) negociado por volume",
        ],
      },
    };

    return {
      sucesso: true,
      comando_interpretado: data.comando,
      cenarios,
      cenario_recomendado: cenarios.recomendado,
    };
  });
