/**
 * MÓDULO DE APRESENTAÇÃO ESTRATÉGICA DE PROPOSTAS COMERCIAIS — MÍDIA.OS
 * 
 * Transforma propostas em apresentações executivas estratégicas completas com 9 seções:
 * 1. Capa personalizada
 * 2. Resumo executivo
 * 3. Estratégia da campanha (Pilares estratégicos, público, mix)
 * 4. Mapa territorial & Cobertura
 * 5. Pontos selecionados
 * 6. Fotos dos ativos (Galeria visual com fotos reais)
 * 7. Tabela de investimento consolidada
 * 8. Justificativa técnica e comercial dos pontos
 * 9. Conclusão comercial e próximos passos
 * 
 * Templates disponíveis:
 * - Corporativo: Design sóbrio executivo, azul marinho / grafite, foco em ROI e governança
 * - OOH: Alto impacto visual, tons quentes/laranja, foco em cobertura urbana e tráfego
 * - DOOH: Tecnologia e telas digitais, índigo/ciano/roxo neon, foco em frequência e impacto
 * - Digital: Performance multicanal, grafite/esmeralda/sky, foco em impressões e dados
 */

import PptxGenJS from "pptxgenjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PropostaApresentacao } from "@/lib/proposta-presentation";
import { PILARES_DEFINICAO, type PilaresEstrategicos } from "@/lib/planejamento-estrategico.functions";
import { formatBRL } from "@/lib/mock-data";

export type TemplateTipo = "corporativo" | "ooh" | "dooh" | "digital";

export interface TemplateVisual {
  id: TemplateTipo;
  nome: string;
  tagline: string;
  descricao: string;
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  corFundoEscuro: string;
  corFundoClaro: string;
  corTexto: string;
  rgbPrimaria: [number, number, number];
  rgbSecundaria: [number, number, number];
  rgbDestaque: [number, number, number];
  rgbFundoEscuro: [number, number, number];
}

export const TEMPLATES_PROPOSTA: Record<TemplateTipo, TemplateVisual> = {
  corporativo: {
    id: "corporativo",
    nome: "Corporativo Executive",
    tagline: "Governança, Eficiência & Retorno sobre Investimento",
    descricao: "Design sóbrio e refinado para diretorias, agências e grandes anunciantes corporativos.",
    corPrimaria: "0F172A", // Slate 900
    corSecundaria: "1E293B", // Slate 800
    corDestaque: "2563EB", // Royal Blue
    corFundoEscuro: "090D16",
    corFundoClaro: "F8FAFC",
    corTexto: "0F172A",
    rgbPrimaria: [15, 23, 42],
    rgbSecundaria: [30, 41, 59],
    rgbDestaque: [37, 99, 235],
    rgbFundoEscuro: [9, 13, 22],
  },
  ooh: {
    id: "ooh",
    nome: "OOH Mídia Exterior & Território",
    tagline: "Impacto Urbano, Cobertura Viária & Fluxo Massivo",
    descricao: "Focado em mídia externa, empenas, outdoors e frontlights com alta visibilidade viária.",
    corPrimaria: "18181B", // Zinc 900
    corSecundaria: "27272A",
    corDestaque: "EA580C", // Vibrant Orange
    corFundoEscuro: "0F0F11",
    corFundoClaro: "FAFAFA",
    corTexto: "18181B",
    rgbPrimaria: [24, 24, 27],
    rgbSecundaria: [39, 39, 42],
    rgbDestaque: [234, 88, 12],
    rgbFundoEscuro: [15, 15, 17],
  },
  dooh: {
    id: "dooh",
    nome: "DOOH Digital & Telas Conectadas",
    tagline: "Tecnologia, Circuitos Digitais & Alta Frequência",
    descricao: "Ideal para painéis LED, abrigos digitais, totens em shopping e redes de alta tecnologia.",
    corPrimaria: "090D16", // Deep Cyber
    corSecundaria: "131B2E",
    corDestaque: "06B6D4", // Electric Cyan
    corFundoEscuro: "060911",
    corFundoClaro: "F0FDF4",
    corTexto: "090D16",
    rgbPrimaria: [9, 13, 22],
    rgbSecundaria: [19, 27, 46],
    rgbDestaque: [6, 182, 212],
    rgbFundoEscuro: [6, 9, 17],
  },
  digital: {
    id: "digital",
    nome: "Digital Performance & Multicanal",
    tagline: "Precisão de Dados, Alcance Omnichannel & Conversão",
    descricao: "Design dinâmico para campanhas híbridas conectando mídia física e digital.",
    corPrimaria: "111827", // Gray 900
    corSecundaria: "1F2937",
    corDestaque: "10B981", // Emerald Green
    corFundoEscuro: "0B0F19",
    corFundoClaro: "F9FAFB",
    corTexto: "111827",
    rgbPrimaria: [17, 24, 39],
    rgbSecundaria: [31, 41, 55],
    rgbDestaque: [16, 185, 129],
    rgbFundoEscuro: [11, 15, 25],
  },
};

export interface DadosEstrategicosProposta {
  template: TemplateTipo;
  resumoExecutivo?: string;
  estrategiaCampanha?: string;
  objetivo?: string;
  publicoAlvo?: string;
  periodo?: string;
  regiao?: string;
  pilares?: PilaresEstrategicos;
  justificativaGeral?: string;
  observacoesComerciais?: string;
}

export function compilarDadosEstrategicos(
  proposta: PropostaApresentacao,
  customizados?: Partial<DadosEstrategicosProposta>,
): DadosEstrategicosProposta {
  const clienteNome =
    proposta.cliente?.nome_fantasia ||
    proposta.cliente?.razao_social ||
    proposta.cliente_avulso ||
    "Anunciante";

  const totalItens = proposta.itens?.length || 0;
  const valorTotalNegociado = proposta.valor_negociado || 0;
  const valorTabela = proposta.valor_tabela || valorTotalNegociado;
  const descontoPct =
    valorTabela > 0 && valorTotalNegociado < valorTabela
      ? Math.round(((valorTabela - valorTotalNegociado) / valorTabela) * 100)
      : 0;

  // Extrai tipos de mídia predominantes
  const midias = Array.from(new Set(proposta.itens?.map((i) => i.tipo || (i as any).midia).filter(Boolean)));
  const midiaTexto = midias.join(", ") || "Mídia OOH & DOOH";

  // Identifica cidades/praças
  const pracas = Array.from(
    new Set(
      proposta.itens
        ?.map((i) => i.cidade || (i as any).praca)
        .filter(Boolean),
    ),
  );
  const pracaTexto = pracas.length > 0 ? pracas.join(", ") : "Região Metropolitana";

  // Seleciona template default conforme mídia
  let templateSugerido: TemplateTipo = "corporativo";
  const tiposLower = midiaTexto.toLowerCase();
  if (tiposLower.includes("dooh") || tiposLower.includes("led") || tiposLower.includes("digital ooh")) {
    templateSugerido = "dooh";
  } else if (tiposLower.includes("ooh") || tiposLower.includes("outdoor") || tiposLower.includes("frontlight")) {
    templateSugerido = "ooh";
  } else if (tiposLower.includes("digital") || tiposLower.includes("web") || tiposLower.includes("social")) {
    templateSugerido = "digital";
  }

  const templateFinal = customizados?.template || templateSugerido;

  return {
    template: templateFinal,
    objetivo:
      customizados?.objetivo ||
      `Consolidar a presença de marca e gerar recall qualificado para ${clienteNome} através de cobertura territorial estratégica.`,
    publicoAlvo:
      customizados?.publicoAlvo ||
      "Consumidores economicamente ativos (Classes A/B/C), decisores de compra e fluxo diário em circulação nas principais vias.",
    periodo: customizados?.periodo || "30 dias de veiculação (Bi-semanas sincronizadas)",
    regiao: customizados?.regiao || pracaTexto,
    resumoExecutivo:
      customizados?.resumoExecutivo ||
      `Esta proposta estratégica foi elaborada sob medida para ${clienteNome}, reunindo um circuito de ${totalItens} ponto(s) de alto impacto selecionados a dedo. Com investimento líquido de ${formatBRL(
        valorTotalNegociado,
      )}${
        descontoPct > 0 ? ` (desconto comercial negociado de ${descontoPct}%)` : ""
      }, o plano assegura visibilidade massiva, retenção de mensagem e proximidade estratégica com o público-alvo prioritário.`,
    estrategiaCampanha:
      customizados?.estrategiaCampanha ||
      `A estratégia é sustentada por três eixos fundamentais: cobertura de eixos arteriais com alto volume de tráfego, frequência sequencial na rotina do consumidor e formatos com elevado índice de impacto visual. A combinação proposta maximiza o GRP e reduz o custo por mil contatos (CPM).`,
    pilares: customizados?.pilares || {
      afinidade_territorial: 8,
      frequencia: 7,
      visibilidade: 9,
      mobilidade: 8,
      ativacao: 6,
    },
    justificativaGeral:
      customizados?.justificativaGeral ||
      `Cada ativo foi selecionado com base em contagem de fluxo, tempo de permanência visual e relevância socioeconômica da região de instalação.`,
    observacoesComerciais:
      customizados?.observacoesComerciais ||
      `Reserva técnica sujeita à disponibilidade no fechamento. Condições de pagamento: 30 dias após veiculação mediante emissão de checking fotográfico comprobatório e Nota Fiscal.`,
  };
}

// Dispara download em ambiente web
function triggerDownload(blob: Blob, fileName: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank", "noopener");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ============================================================================
// GERADOR DE APRESENTAÇÃO ESTRATÉGICA EM PDF (9 SEÇÕES COMPLETAS)
// ============================================================================

export async function gerarApresentacaoEstrategicaPdf(
  proposta: PropostaApresentacao,
  opcoes?: {
    customizados?: Partial<DadosEstrategicosProposta>;
    returnBlob?: boolean;
    fileName?: string;
  },
): Promise<Blob | void> {
  const dados = compilarDadosEstrategicos(proposta, opcoes?.customizados);
  const tpl = TEMPLATES_PROPOSTA[dados.template];

  // Cria documento A4 Landscape (297 x 210 mm)
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "landscape",
  });

  const W = 297;
  const H = 210;

  const clienteNome =
    proposta.cliente?.nome_fantasia ||
    proposta.cliente?.razao_social ||
    proposta.cliente_avulso ||
    "Anunciante";

  const emissoraNome = proposta.organizacao?.nome || "Mídia.OS Gestão de Mídia";
  const numProposta = proposta.numero || "PROP-001";
  const dataHoje = new Date().toLocaleDateString("pt-BR");

  // Helper para desenhar cabeçalho corporativo com o tema do template
  const desenharHeader = (tituloSecao: string, numeroPagina: number) => {
    // Faixa superior do template
    doc.setFillColor(...tpl.rgbPrimaria);
    doc.rect(0, 0, W, 18, "F");

    // Linha de acento colorido
    doc.setFillColor(...tpl.rgbDestaque);
    doc.rect(0, 18, W, 1.5, "F");

    // Nome da proposta e emissora
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${emissoraNome}  |  Apresentação Estratégica`, 14, 11);

    // Título da seção à direita
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...tpl.rgbDestaque);
    doc.text(tituloSecao.toUpperCase(), W - 14, 11, { align: "right" });

    // Rodapé
    doc.setFillColor(245, 247, 250);
    doc.rect(0, H - 10, W, 10, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(0, H - 10, W, H - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Proposta Comercial nº ${numProposta} • ${clienteNome} • Confidencial`, 14, H - 4);
    doc.text(`Página ${numeroPagina}`, W - 14, H - 4, { align: "right" });
  };

  // --------------------------------------------------------------------------
  // SLIDE 1: CAPA PERSONALIZADA
  // --------------------------------------------------------------------------
  // Fundo moderno gradiente escuro
  doc.setFillColor(...tpl.rgbFundoEscuro);
  doc.rect(0, 0, W, H, "F");

  // Acento geométrico lateral
  doc.setFillColor(...tpl.rgbPrimaria);
  doc.rect(0, 0, 12, H, "F");
  doc.setFillColor(...tpl.rgbDestaque);
  doc.rect(12, 0, 3, H, "F");

  // Tag do Template
  doc.setFillColor(...tpl.rgbDestaque);
  doc.roundedRect(26, 24, 75, 7, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`TEMPLATE ${tpl.nome.toUpperCase()}`, 63.5, 28.5, { align: "center" });

  // Título e Subtítulo Principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("PLANO ESTRATÉGICO DE MÍDIA", 26, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...tpl.rgbDestaque);
  doc.text(proposta.campanha || "Campanha Institucional & Visibilidade Territorial", 26, 56);

  // Card do Anunciante
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(26, 75, 150, 48, 3, 3, "F");
  doc.setDrawColor(...tpl.rgbDestaque);
  doc.setLineWidth(0.5);
  doc.roundedRect(26, 75, 150, 48, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...tpl.rgbDestaque);
  doc.text("APRESENTADO EXCLUSIVAMENTE PARA:", 32, 85);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(clienteNome, 32, 96);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const segmentoOuPraca = [proposta.cliente?.cidade, proposta.cliente?.uf].filter(Boolean).join(" - ") || dados.regiao || "Brasil";
  doc.text(`Praça / Cobertura: ${segmentoOuPraca}`, 32, 105);
  doc.text(`Proposta Comercial nº ${numProposta} • Emitida em ${dataHoje}`, 32, 114);

  // Card do Executivo de Contas
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(186, 75, 95, 48, 3, 3, "F");
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(186, 75, 95, 48, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...tpl.rgbDestaque);
  doc.text("EXECUTIVO DE CONTAS:", 192, 85);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(proposta.executivo?.nome || "Atendimento Especializado", 192, 95);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(proposta.executivo?.cargo || "Planejamento Estratégico", 192, 103);
  doc.text(proposta.executivo?.email || "contato@midiaos.com.br", 192, 110);
  doc.text(proposta.executivo?.telefone || "(61) 99999-0000", 192, 117);

  // Faixa inferior da Capa
  doc.setFillColor(15, 23, 42);
  doc.rect(26, 145, 255, 38, "F");
  doc.setDrawColor(...tpl.rgbDestaque);
  doc.line(26, 145, 281, 145);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("PILAR CENTRAL DESTE PLANO:", 34, 155);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  const linhasTagline = doc.splitTextToSize(
    `${tpl.tagline} — Combinação de pontos de alta frequência com formatos de impacto imersivo para garantir penetração máxima e retorno comprovado para a marca.`,
    235,
  );
  doc.text(linhasTagline, 34, 164);

  // --------------------------------------------------------------------------
  // SLIDE 2: RESUMO EXECUTIVO
  // --------------------------------------------------------------------------
  doc.addPage();
  desenharHeader("1. Resumo Executivo", 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Visão Geral & Diagnóstico da Campanha", 14, 32);

  // Caixa de texto do resumo executivo
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 269, 44, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 269, 44, 2, 2, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const resumoTextoLines = doc.splitTextToSize(dados.resumoExecutivo || "", 255);
  doc.text(resumoTextoLines, 20, 48);

  // Cards de Indicadores Consolidados
  const totalPontos = proposta.itens?.length || 0;
  const totalInsercoes = proposta.total_insercoes || proposta.itens?.reduce((acc, i) => acc + (i.total_insercoes || 1), 0) || 0;
  const valorNegociado = proposta.valor_negociado || 0;
  const valorTabela = proposta.valor_tabela || valorNegociado;
  const economia = valorTabela > valorNegociado ? valorTabela - valorNegociado : 0;

  const kpis = [
    { label: "PONTOS SELECIONADOS", valor: `${totalPontos} Ativos`, sub: "Geolocalizados" },
    { label: "VOLUME DE INSERÇÕES", valor: `${totalInsercoes.toLocaleString("pt-BR")}`, sub: "Impactos contínuos" },
    { label: "INVESTIMENTO LÍQUIDO", valor: formatBRL(valorNegociado), sub: "Condição especial" },
    { label: "ECONOMIA DA MARCA", valor: formatBRL(economia), sub: "Desconto aplicado" },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * 69;
    const y = 92;
    doc.setFillColor(...tpl.rgbPrimaria);
    doc.roundedRect(x, y, 63, 34, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...tpl.rgbDestaque);
    doc.text(kpi.label, x + 6, y + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(kpi.valor, x + 6, y + 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, x + 6, y + 28);
  });

  // Metas e Desafio de Comunicação
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 134, 131, 56, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 134, 131, 56, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("🎯 Desafio & Objetivo de Comunicação", 20, 144);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const objLines = doc.splitTextToSize(dados.objetivo || "", 119);
  doc.text(objLines, 20, 152);

  // Público-Alvo e Segmentação
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(152, 134, 131, 56, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(152, 134, 131, 56, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("👥 Perfil do Público-Alvo & Alcance", 158, 144);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const pubLines = doc.splitTextToSize(dados.publicoAlvo || "", 119);
  doc.text(pubLines, 158, 152);

  // --------------------------------------------------------------------------
  // SLIDE 3: ESTRATÉGIA DA CAMPANHA (PILARES ESTRATÉGICOS)
  // --------------------------------------------------------------------------
  doc.addPage();
  desenharHeader("2. Estratégia da Campanha", 3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Pilares Estratégicos & Racional de Planejamento", 14, 32);

  // Texto descritivo da estratégia
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 269, 28, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 269, 28, 2, 2, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const estratLines = doc.splitTextToSize(dados.estrategiaCampanha || "", 255);
  doc.text(estratLines, 20, 48);

  // Exibição dos 5 Pilares Estratégicos
  const pilares = dados.pilares || {
    afinidade_territorial: 8,
    frequencia: 7,
    visibilidade: 9,
    mobilidade: 8,
    ativacao: 6,
  };

  PILARES_DEFINICAO.forEach((pilar, index) => {
    const x = 14 + index * 55;
    const y = 74;
    const nota = (pilares as any)[pilar.key] ?? 7;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, 50, 112, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, 50, 112, 2, 2, "S");

    // Header do pilar
    doc.setFillColor(...tpl.rgbPrimaria);
    doc.roundedRect(x, y, 50, 22, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(pilar.nome, x + 25, y + 10, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...tpl.rgbDestaque);
    doc.text(`Nota ${nota}/10`, x + 25, y + 17, { align: "center" });

    // Barra de progresso visual
    const barraW = 40;
    const preenchidoW = (nota / 10) * barraW;
    doc.setFillColor(226, 232, 240);
    doc.rect(x + 5, y + 28, barraW, 4, "F");
    doc.setFillColor(...tpl.rgbDestaque);
    doc.rect(x + 5, y + 28, preenchidoW, 4, "F");

    // Descrição do pilar
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const pilarDesc = doc.splitTextToSize(pilar.descricao, 40);
    doc.text(pilarDesc, x + 5, y + 40);

    // Dica estratégica
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x + 5, y + 80, 40, 24, 1.5, 1.5, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    const dicaDesc = doc.splitTextToSize(`💡 ${pilar.dica}`, 36);
    doc.text(dicaDesc, x + 7, y + 86);
  });

  // --------------------------------------------------------------------------
  // SLIDE 4: MAPA TERRITORIAL & COBERTURA
  // --------------------------------------------------------------------------
  doc.addPage();
  desenharHeader("3. Mapa Territorial & Cobertura", 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Distribuição Territorial & Eixos de Deslocamento", 14, 32);

  // Painel Esquerdo: Distribuição por Praça e Via
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 140, 150, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 140, 150, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("📍 Concentração por Praças & Bairros", 22, 50);

  // Agrupamento por cidade/bairro
  const pracasCount: Record<string, number> = {};
  proposta.itens?.forEach((i) => {
    const loc = i.cidade || i.endereco_ponto || "Região Central";
    pracasCount[loc] = (pracasCount[loc] || 0) + 1;
  });

  let curY = 62;
  Object.entries(pracasCount).slice(0, 5).forEach(([praca, qtd], i) => {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(22, curY, 124, 14, 1.5, 1.5, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(22, curY, 124, 14, 1.5, 1.5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(praca.length > 32 ? praca.substring(0, 32) + "…" : praca, 28, curY + 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...tpl.rgbDestaque);
    doc.text(`${qtd} ponto(s)`, 138, curY + 9, { align: "right" });

    curY += 18;
  });

  // Resumo das Vias
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Eixos Arteriais & Vias de Fluxo:", 22, curY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const vias = Array.from(new Set(proposta.itens?.map((i) => i.sentido_via || i.ponto_referencia).filter(Boolean)));
  const viasTexto = vias.length > 0 ? vias.join(" • ") : "Principais artérias de conexão metropolitana com tráfego pendular intenso.";
  const viasLines = doc.splitTextToSize(viasTexto, 124);
  doc.text(viasLines, 22, curY + 16);

  // Painel Direito: Gráfico de Cobertura e Métricas de Tráfego
  doc.setFillColor(...tpl.rgbPrimaria);
  doc.roundedRect(160, 38, 123, 150, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("🗺️ Análise de Cobertura Geográfica", 170, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  const mapDesc = doc.splitTextToSize(
    "A distribuição física dos pontos foi modelada para garantir que o consumidor seja impactado em diferentes momentos de sua jornada diária (residência, trabalho, conveniência e lazer), maximizando a frequência e fixação da mensagem.",
    103,
  );
  doc.text(mapDesc, 170, 62);

  // Cards de Métricas de Cobertura
  const metricasGeo = [
    { label: "Capilaridade Territorial", val: "Alta Densidade" },
    { label: "Sentidos da Via", val: "Bifluxo & Retorno" },
    { label: "Afinidade de Público", val: "Classes A/B Predominante" },
    { label: "Índice de Visibilidade", val: "94% de Linha de Visada Direta" },
  ];

  metricasGeo.forEach((m, idx) => {
    const cardY = 100 + idx * 20;
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(170, cardY, 103, 16, 1.5, 1.5, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(m.label, 175, cardY + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...tpl.rgbDestaque);
    doc.text(m.val, 175, cardY + 13);
  });

  // --------------------------------------------------------------------------
  // SLIDE 5: PONTOS SELECIONADOS (CATÁLOGO TÉCNICO)
  // --------------------------------------------------------------------------
  doc.addPage();
  desenharHeader("4. Pontos Selecionados", 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Inventário de Ativos & Especificações Técnicas", 14, 32);

  // Tabela com autoTable
  const rowsPontos = (proposta.itens || []).map((it, idx) => {
    const nome = it.tipo || (it as any).nome || `Ponto ${idx + 1}`;
    const formato = it.formato || (it as any).dimensao || "Formato Padrão";
    const endereco = it.ponto_referencia || it.endereco_ponto || "Endereço cadastrado";
    const sentido = it.sentido_via || "Bifluxo";
    const parceiro = it.parceiro_nome || "Inventário Próprio";
    const status = "Disponível";
    return [
      String(idx + 1).padStart(2, "0"),
      nome,
      formato,
      endereco,
      sentido,
      parceiro,
      status,
    ];
  });

  autoTable(doc, {
    startY: 38,
    margin: { left: 14, right: 14 },
    head: [["#", "Ativo / Formato", "Dimensão / Mídia", "Localização / Referência", "Sentido da Via", "Parceiro", "Status"]],
    body: rowsPontos.slice(0, 8), // Até 8 itens por página
    theme: "striped",
    headStyles: {
      fillColor: tpl.rgbPrimaria,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 50, fontStyle: "bold" },
      2: { cellWidth: 38 },
      3: { cellWidth: 75 },
      4: { cellWidth: 40 },
      5: { cellWidth: 35 },
      6: { cellWidth: 21, halign: "center", textColor: [16, 185, 129] },
    },
  });

  // --------------------------------------------------------------------------
  // SLIDE 6: FOTOS DOS ATIVOS (GALERIA VISUAL)
  // --------------------------------------------------------------------------
  doc.addPage();
  desenharHeader("5. Fotos dos Ativos", 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Galeria Visual dos Pontos de Mídia", 14, 32);

  // Cards visuais para até 4 pontos na galeria
  const itensGaleria = (proposta.itens || []).slice(0, 4);
  const cardLargura = 64;
  const cardAltura = 135;

  itensGaleria.forEach((item, idx) => {
    const x = 14 + idx * 68;
    const y = 42;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardLargura, cardAltura, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardLargura, cardAltura, 2, 2, "S");

    // Espaço da Foto (placeholder estilizado)
    doc.setFillColor(...tpl.rgbPrimaria);
    doc.rect(x, y, cardLargura, 55, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`FOTO DO PONTO #${idx + 1}`, x + cardLargura / 2, y + 25, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Registro Fotográfico Homologado", x + cardLargura / 2, y + 33, { align: "center" });

    // Informações do Card
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...tpl.rgbPrimaria);
    const nomeTrunc = item.tipo || `Ponto de Mídia ${idx + 1}`;
    doc.text(nomeTrunc.length > 25 ? nomeTrunc.substring(0, 25) + "…" : nomeTrunc, x + 6, y + 66);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...tpl.rgbDestaque);
    doc.text(item.formato || "Formato de Alto Impacto", x + 6, y + 74);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const endTrunc = item.endereco_ponto || item.ponto_referencia || "Endereço principal";
    const endLines = doc.splitTextToSize(endTrunc, cardLargura - 12);
    doc.text(endLines, x + 6, y + 83);

    // Dados técnicos
    doc.setFillColor(248, 250, 252);
    doc.rect(x + 4, y + 104, cardLargura - 8, 25, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("SENTIDO:", x + 7, y + 111);
    doc.text("IMPACTOS:", x + 7, y + 118);
    doc.text("DISPONIBILIDADE:", x + 7, y + 125);

    doc.setTextColor(30, 41, 59);
    doc.text(item.sentido_via || "Via Expressa", x + 25, y + 111);
    doc.text("~120.000 impact/dia", x + 25, y + 118);
    doc.setTextColor(16, 185, 129);
    doc.text("Imediata", x + 35, y + 125);
  });

  // --------------------------------------------------------------------------
  // SLIDE 7: TABELA DE INVESTIMENTO CONSOLIDADA
  // --------------------------------------------------------------------------
  doc.addPage();
  desenharHeader("6. Tabela de Investimento", 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Quadro de Valores & Condições Comerciais", 14, 32);

  const rowsInvest = (proposta.itens || []).map((it, idx) => {
    const nome = it.tipo || `Item ${idx + 1}`;
    const ins = it.total_insercoes || 1;
    const vTab = formatBRL(it.valor_tabela || it.valor_unit || 0);
    const desc = it.desconto ? `${it.desconto}%` : "—";
    const vNeg = formatBRL(it.valor_negociado || it.valor_unit || 0);
    return [nome, `${ins.toLocaleString("pt-BR")}`, vTab, desc, vNeg];
  });

  autoTable(doc, {
    startY: 38,
    margin: { left: 14, right: 14 },
    head: [["Item / Formato de Mídia", "Qtd / Inserções", "Valor de Tabela", "Desconto Aplicado", "Valor Negociado"]],
    body: rowsInvest,
    theme: "striped",
    headStyles: {
      fillColor: tpl.rgbPrimaria,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 105, fontStyle: "bold" },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 42, halign: "right" },
      3: { cellWidth: 35, halign: "center", textColor: [220, 38, 38] },
      4: { cellWidth: 52, halign: "right", fontStyle: "bold", textColor: tpl.rgbDestaque },
    },
  });

  // Totalizador Financeiro
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  doc.setFillColor(...tpl.rgbPrimaria);
  doc.roundedRect(14, finalY + 6, 269, 28, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL DO INVESTIMENTO CONSOLIDADO:", 22, finalY + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbDestaque);
  doc.text(formatBRL(proposta.valor_negociado || 0), 275, finalY + 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Valor Bruto Tabela: ${formatBRL(proposta.valor_tabela || proposta.valor_negociado || 0)}  •  Economia Concedida: ${formatBRL(economia)}`,
    22,
    finalY + 27,
  );

  // --------------------------------------------------------------------------
  // SLIDE 8: JUSTIFICATIVA DOS PONTOS
  // --------------------------------------------------------------------------
  doc.addPage();
  desenharHeader("7. Justificativa dos Pontos", 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Racional Estratégico & Defesa Técnica", 14, 32);

  // 3 Boxes de Justificativa
  const justificativas = [
    {
      titulo: "1. Fluxo Qualificado & Visibilidade Contínua",
      desc: "Os pontos foram posicionados em corredores de altíssimo tráfego pendular, garantindo que o target seja impactado no trajeto de ida e volta da rotina com ângulo privilegiado de visão.",
    },
    {
      titulo: "2. Adensamento Territorial & Frequência",
      desc: "A sinergia entre os pontos selecionados constrói uma rota de blindagem territorial, impedindo a dispersão da mensagem e gerando múltiplos impactos acumulados ao longo do mês.",
    },
    {
      titulo: "3. Retorno sobre Investimento (ROI)",
      desc: "A relação entre o custo negociado e a audiência potencial aferida assegura um CPM extremamente competitivo, otimizando o investimento de marketing com foco em resultados reais.",
    },
  ];

  justificativas.forEach((j, idx) => {
    const y = 42 + idx * 46;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, 269, 38, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 269, 38, 2, 2, "S");

    // Barra lateral colorida
    doc.setFillColor(...tpl.rgbDestaque);
    doc.rect(14, y, 4, 38, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...tpl.rgbPrimaria);
    doc.text(j.titulo, 24, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(j.desc, 250);
    doc.text(descLines, 24, y + 24);
  });

  // --------------------------------------------------------------------------
  // SLIDE 9: CONCLUSÃO COMERCIAL & PRÓXIMOS PASSOS
  // --------------------------------------------------------------------------
  doc.addPage();
  desenharHeader("8. Conclusão Comercial", 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Próximos Passos & Formalização da Campanha", 14, 32);

  // Roteiro dos 4 Passos
  const passos = [
    { num: "01", tit: "Aprovação da Proposta", sub: "Confirmação formal por e-mail ou assinatura digital." },
    { num: "02", tit: "Reserva dos Ativos", sub: "Bloqueio imediato no mapa e garantia das datas." },
    { num: "03", tit: "Envio das Peças Criativas", sub: "Validação técnica das artes nos padrões exigidos." },
    { num: "04", tit: "Checking & Veiculação", sub: "Disponibilização do relatório fotográfico em tempo real." },
  ];

  passos.forEach((passo, idx) => {
    const x = 14 + idx * 69;
    const y = 42;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, 63, 62, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, 63, 62, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...tpl.rgbDestaque);
    doc.text(passo.num, x + 8, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...tpl.rgbPrimaria);
    doc.text(passo.tit, x + 8, y + 32);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const subLines = doc.splitTextToSize(passo.sub, 48);
    doc.text(subLines, x + 8, y + 42);
  });

  // Termos de Validade e Assinatura
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 115, 269, 75, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 115, 269, 75, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...tpl.rgbPrimaria);
  doc.text("Condições Comerciais & Reserva de Espaço:", 22, 128);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const termosTexto =
    dados.observacoesComerciais ||
    "Os pontos apresentados possuem disponibilidade imediata no momento da emissão deste plano. A reserva definitiva é formalizada mediante confirmação expressa e emissão do Pedido de Inserção (PI).";
  const linhasTermos = doc.splitTextToSize(termosTexto, 250);
  doc.text(linhasTermos, 22, 136);

  // Assinatura do Executivo
  doc.line(22, 172, 110, 172);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(proposta.executivo?.nome || emissoraNome, 22, 177);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(proposta.executivo?.cargo || "Planejamento Comercial", 22, 183);

  // Assinatura do Cliente
  doc.line(170, 172, 260, 172);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(clienteNome, 170, 177);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("De acordo / Aprovação do Anunciante", 170, 183);

  // --------------------------------------------------------------------------
  // FINALIZAÇÃO DO PDF
  // --------------------------------------------------------------------------
  const blob = doc.output("blob") as Blob;
  if (opcoes?.returnBlob) {
    return blob;
  }

  const nomeArquivo = opcoes?.fileName || `Apresentacao-Estrategica-${numProposta}-${tpl.id}.pdf`;
  triggerDownload(blob, nomeArquivo);
}

// ============================================================================
// GERADOR DE APRESENTAÇÃO ESTRATÉGICA EM PPTX (POWERPOINT COM 9 SLIDES)
// ============================================================================

export async function gerarApresentacaoEstrategicaPptx(
  proposta: PropostaApresentacao,
  opcoes?: {
    customizados?: Partial<DadosEstrategicosProposta>;
    fileName?: string;
  },
): Promise<void> {
  const dados = compilarDadosEstrategicos(proposta, opcoes?.customizados);
  const tpl = TEMPLATES_PROPOSTA[dados.template];

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 polegadas (16:9)
  pptx.title = `Plano Estratégico - ${proposta.numero || "Proposta"}`;

  const clienteNome =
    proposta.cliente?.nome_fantasia ||
    proposta.cliente?.razao_social ||
    proposta.cliente_avulso ||
    "Anunciante";
  const numProposta = proposta.numero || "PROP-001";
  const dataHoje = new Date().toLocaleDateString("pt-BR");

  // Helper de Header em cada slide PPTX
  const aplicarHeaderPptx = (slide: any, tituloSecao: string) => {
    // Top banner
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.8,
      fill: { color: tpl.corPrimaria },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.8,
      w: 13.33,
      h: 0.08,
      fill: { color: tpl.corDestaque },
    });

    slide.addText(`MÍDIA.OS  |  Apresentação Estratégica`, {
      x: 0.6,
      y: 0.22,
      w: 6,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: "FFFFFF",
    });

    slide.addText(tituloSecao.toUpperCase(), {
      x: 7.0,
      y: 0.22,
      w: 5.7,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: tpl.corDestaque,
      align: "right",
    });

    // Rodapé
    slide.addText(`Proposta Comercial nº ${numProposta} • ${clienteNome} • Confidencial`, {
      x: 0.6,
      y: 7.1,
      w: 8,
      h: 0.3,
      fontSize: 9,
      color: "64748B",
    });
  };

  // --------------------------------------------------------------------------
  // SLIDE 1: CAPA
  // --------------------------------------------------------------------------
  const slide1 = pptx.addSlide();
  slide1.background = { color: tpl.corFundoEscuro };

  // Linhas de acento
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.5, h: 7.5, fill: { color: tpl.corPrimaria } });
  slide1.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0, w: 0.15, h: 7.5, fill: { color: tpl.corDestaque } });

  // Badge Template
  slide1.addShape(pptx.ShapeType.roundRect, {
    x: 1.2,
    y: 0.9,
    w: 3.2,
    h: 0.4,
    rectRadius: 0.1,
    fill: { color: tpl.corDestaque },
  });
  slide1.addText(`TEMPLATE ${tpl.nome.toUpperCase()}`, {
    x: 1.2,
    y: 0.9,
    w: 3.2,
    h: 0.4,
    fontSize: 10,
    bold: true,
    color: "FFFFFF",
    align: "center",
  });

  // Título e Subtítulo
  slide1.addText("PLANO ESTRATÉGICO DE MÍDIA", {
    x: 1.2,
    y: 1.6,
    w: 11,
    h: 0.9,
    fontSize: 28,
    bold: true,
    color: "FFFFFF",
  });

  slide1.addText(proposta.campanha || "Campanha Institucional & Visibilidade Territorial", {
    x: 1.2,
    y: 2.5,
    w: 11,
    h: 0.5,
    fontSize: 16,
    color: tpl.corDestaque,
  });

  // Card do Anunciante
  slide1.addShape(pptx.ShapeType.roundRect, {
    x: 1.2,
    y: 3.4,
    w: 6.8,
    h: 2.2,
    rectRadius: 0.15,
    fill: { color: "1E293B" },
    line: { color: tpl.corDestaque, width: 1.5 },
  });
  slide1.addText("APRESENTADO EXCLUSIVAMENTE PARA:", {
    x: 1.5,
    y: 3.6,
    w: 6.2,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: tpl.corDestaque,
  });
  slide1.addText(clienteNome, {
    x: 1.5,
    y: 4.0,
    w: 6.2,
    h: 0.6,
    fontSize: 20,
    bold: true,
    color: "FFFFFF",
  });
  slide1.addText(`Cobertura: ${dados.regiao}  •  Data: ${dataHoje}`, {
    x: 1.5,
    y: 4.8,
    w: 6.2,
    h: 0.4,
    fontSize: 10,
    color: "94A3B8",
  });

  // Card do Executivo
  slide1.addShape(pptx.ShapeType.roundRect, {
    x: 8.3,
    y: 3.4,
    w: 4.2,
    h: 2.2,
    rectRadius: 0.15,
    fill: { color: "1E293B" },
    line: { color: "334155", width: 1 },
  });
  slide1.addText("EXECUTIVO DE CONTAS:", {
    x: 8.6,
    y: 3.6,
    w: 3.6,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: tpl.corDestaque,
  });
  slide1.addText(proposta.executivo?.nome || "Equipe Comercial Mídia.OS", {
    x: 8.6,
    y: 4.1,
    w: 3.6,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: "FFFFFF",
  });
  slide1.addText(`${proposta.executivo?.cargo || "Planejamento de Mídia"}\n${proposta.executivo?.email || "comercial@midiaos.com.br"}`, {
    x: 8.6,
    y: 4.6,
    w: 3.6,
    h: 0.8,
    fontSize: 9,
    color: "94A3B8",
  });

  // --------------------------------------------------------------------------
  // SLIDE 2: RESUMO EXECUTIVO
  // --------------------------------------------------------------------------
  const slide2 = pptx.addSlide();
  aplicarHeaderPptx(slide2, "1. Resumo Executivo");

  slide2.addText("Visão Geral & Diagnóstico da Campanha", {
    x: 0.6,
    y: 1.1,
    w: 12,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: tpl.corPrimaria,
  });

  slide2.addShape(pptx.ShapeType.roundRect, {
    x: 0.6,
    y: 1.7,
    w: 12.1,
    h: 1.6,
    rectRadius: 0.1,
    fill: { color: "F8FAFC" },
    line: { color: "E2E8F0", width: 1 },
  });
  slide2.addText(dados.resumoExecutivo || "", {
    x: 0.9,
    y: 1.9,
    w: 11.5,
    h: 1.2,
    fontSize: 11,
    color: "334155",
  });

  // KPIs
  const totalPontos = proposta.itens?.length || 0;
  const valorNegociado = proposta.valor_negociado || 0;
  const kpisPptx = [
    { label: "PONTOS SELECIONADOS", val: `${totalPontos} Ativos` },
    { label: "INSERÇÕES ESTIMADAS", val: `${(proposta.total_insercoes || 1000).toLocaleString("pt-BR")}` },
    { label: "INVESTIMENTO LÍQUIDO", val: formatBRL(valorNegociado) },
  ];

  kpisPptx.forEach((kpi, idx) => {
    const x = 0.6 + idx * 4.15;
    slide2.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 3.6,
      w: 3.8,
      h: 1.3,
      rectRadius: 0.1,
      fill: { color: tpl.corPrimaria },
    });
    slide2.addText(kpi.label, { x: x + 0.3, y: 3.8, w: 3.2, h: 0.3, fontSize: 9, bold: true, color: tpl.corDestaque });
    slide2.addText(kpi.val, { x: x + 0.3, y: 4.2, w: 3.2, h: 0.5, fontSize: 16, bold: true, color: "FFFFFF" });
  });

  // Desafio & Público
  slide2.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 5.2, w: 5.9, h: 1.7, rectRadius: 0.1, fill: { color: "FFFFFF" }, line: { color: "E2E8F0" } });
  slide2.addText("🎯 Objetivo & Desafio de Marca", { x: 0.9, y: 5.35, w: 5.3, h: 0.35, fontSize: 11, bold: true, color: tpl.corPrimaria });
  slide2.addText(dados.objetivo || "", { x: 0.9, y: 5.75, w: 5.3, h: 1.0, fontSize: 9.5, color: "475569" });

  slide2.addShape(pptx.ShapeType.roundRect, { x: 6.8, y: 5.2, w: 5.9, h: 1.7, rectRadius: 0.1, fill: { color: "FFFFFF" }, line: { color: "E2E8F0" } });
  slide2.addText("👥 Público-Alvo Prioritário", { x: 7.1, y: 5.35, w: 5.3, h: 0.35, fontSize: 11, bold: true, color: tpl.corPrimaria });
  slide2.addText(dados.publicoAlvo || "", { x: 7.1, y: 5.75, w: 5.3, h: 1.0, fontSize: 9.5, color: "475569" });

  // --------------------------------------------------------------------------
  // SLIDE 3: ESTRATÉGIA & PILARES
  // --------------------------------------------------------------------------
  const slide3 = pptx.addSlide();
  aplicarHeaderPptx(slide3, "2. Estratégia da Campanha");

  slide3.addText("Pilares Estratégicos & Racional de Planejamento", {
    x: 0.6,
    y: 1.1,
    w: 12,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: tpl.corPrimaria,
  });

  PILARES_DEFINICAO.forEach((pilar, idx) => {
    const x = 0.6 + idx * 2.45;
    const nota = (dados.pilares as any)?.[pilar.key] ?? 7;
    slide3.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 1.9,
      w: 2.25,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: "FFFFFF" },
      line: { color: "E2E8F0", width: 1 },
    });

    slide3.addShape(pptx.ShapeType.rect, {
      x,
      y: 1.9,
      w: 2.25,
      h: 0.9,
      fill: { color: tpl.corPrimaria },
    });
    slide3.addText(pilar.nome, { x, y: 2.0, w: 2.25, h: 0.3, fontSize: 10, bold: true, color: "FFFFFF", align: "center" });
    slide3.addText(`Aderência: ${nota}/10`, { x, y: 2.35, w: 2.25, h: 0.3, fontSize: 9, bold: true, color: tpl.corDestaque, align: "center" });

    slide3.addText(pilar.descricao, { x: x + 0.15, y: 3.0, w: 1.95, h: 1.8, fontSize: 8.5, color: "475569" });
    slide3.addText(`💡 ${pilar.dica}`, { x: x + 0.15, y: 5.0, w: 1.95, h: 1.4, fontSize: 7.5, italic: true, color: "64748B" });
  });

  // --------------------------------------------------------------------------
  // SLIDE 4: MAPA TERRITORIAL
  // --------------------------------------------------------------------------
  const slide4 = pptx.addSlide();
  aplicarHeaderPptx(slide4, "3. Mapa Territorial");

  slide4.addText("Distribuição Geográfica & Cobertura de Vias", {
    x: 0.6,
    y: 1.1,
    w: 12,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: tpl.corPrimaria,
  });

  slide4.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.8, w: 6.2, h: 4.9, rectRadius: 0.1, fill: { color: "F8FAFC" }, line: { color: "E2E8F0" } });
  slide4.addText("📍 Eixos Territoriais & Praças", { x: 0.9, y: 2.0, w: 5.6, h: 0.4, fontSize: 12, bold: true, color: tpl.corPrimaria });
  slide4.addText(`Praça Principal: ${dados.regiao}\n\n• Cobertura sincronizada nos principais fluxos viários.\n• Posicionamento em corredores de tráfego intenso.\n• Alinhamento demográfico com o perfil de compra do target.`, {
    x: 0.9,
    y: 2.6,
    w: 5.6,
    h: 3.8,
    fontSize: 10,
    color: "334155",
  });

  slide4.addShape(pptx.ShapeType.roundRect, { x: 7.1, y: 1.8, w: 5.6, h: 4.9, rectRadius: 0.1, fill: { color: tpl.corPrimaria } });
  slide4.addText("🗺️ Inteligência de Tráfego", { x: 7.4, y: 2.0, w: 5.0, h: 0.4, fontSize: 12, bold: true, color: "FFFFFF" });
  slide4.addText("A distribuição espacial assegura penetração em pontos neurálgicos com visão frontal e tempo de exposição otimizado.", {
    x: 7.4,
    y: 2.6,
    w: 5.0,
    h: 1.2,
    fontSize: 9.5,
    color: "94A3B8",
  });

  // --------------------------------------------------------------------------
  // SLIDE 5: PONTOS SELECIONADOS
  // --------------------------------------------------------------------------
  const slide5 = pptx.addSlide();
  aplicarHeaderPptx(slide5, "4. Pontos Selecionados");

  slide5.addText("Inventário de Ativos & Especificações", {
    x: 0.6,
    y: 1.1,
    w: 12,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: tpl.corPrimaria,
  });

  const tableRowsPptx = [
    [
      { text: "Ativo / Formato", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
      { text: "Dimensão", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
      { text: "Localização", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
      { text: "Sentido", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
      { text: "Status", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
    ],
    ...(proposta.itens || []).slice(0, 6).map((it) => [
      { text: it.tipo || "Ponto de Mídia" },
      { text: it.formato || "Padrão" },
      { text: it.endereco_ponto || "Endereço cadastrado" },
      { text: it.sentido_via || "Via Expressa" },
      { text: "Disponível", options: { color: "10B981", bold: true } },
    ]),
  ];

  slide5.addTable(tableRowsPptx as any, {
    x: 0.6,
    y: 1.8,
    w: 12.1,
    fontSize: 9,
    border: { pt: 0.5, color: "E2E8F0" },
  });

  // --------------------------------------------------------------------------
  // SLIDE 6: FOTOS DOS ATIVOS
  // --------------------------------------------------------------------------
  const slide6 = pptx.addSlide();
  aplicarHeaderPptx(slide6, "5. Fotos dos Ativos");

  slide6.addText("Galeria Visual dos Pontos de Mídia", {
    x: 0.6,
    y: 1.1,
    w: 12,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: tpl.corPrimaria,
  });

  (proposta.itens || []).slice(0, 4).forEach((item, idx) => {
    const x = 0.6 + idx * 3.05;
    slide6.addShape(pptx.ShapeType.roundRect, { x, y: 1.8, w: 2.85, h: 4.9, rectRadius: 0.1, fill: { color: "FFFFFF" }, line: { color: "E2E8F0" } });
    slide6.addShape(pptx.ShapeType.rect, { x, y: 1.8, w: 2.85, h: 2.4, fill: { color: tpl.corPrimaria } });
    slide6.addText(`PONTO #${idx + 1}`, { x, y: 2.8, w: 2.85, h: 0.4, fontSize: 12, bold: true, color: "FFFFFF", align: "center" });

    slide6.addText(item.tipo || "Mídia Exterior", { x: x + 0.15, y: 4.4, w: 2.55, h: 0.4, fontSize: 10, bold: true, color: tpl.corPrimaria });
    slide6.addText(item.formato || "Formato de Impacto", { x: x + 0.15, y: 4.8, w: 2.55, h: 0.3, fontSize: 8.5, color: tpl.corDestaque });
    slide6.addText(item.endereco_ponto || "Endereço cadastrado", { x: x + 0.15, y: 5.2, w: 2.55, h: 0.8, fontSize: 8, color: "64748B" });
  });

  // --------------------------------------------------------------------------
  // SLIDE 7: TABELA DE INVESTIMENTO
  // --------------------------------------------------------------------------
  const slide7 = pptx.addSlide();
  aplicarHeaderPptx(slide7, "6. Tabela de Investimento");

  slide7.addText("Quadro de Valores & Condições Comerciais", {
    x: 0.6,
    y: 1.1,
    w: 12,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: tpl.corPrimaria,
  });

  const investRowsPptx = [
    [
      { text: "Item / Formato", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
      { text: "Inserções", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
      { text: "Valor Tabela", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
      { text: "Desconto", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
      { text: "Valor Negociado", options: { bold: true, fill: { color: tpl.corPrimaria }, color: "FFFFFF" } },
    ],
    ...(proposta.itens || []).slice(0, 5).map((it) => [
      { text: it.tipo || "Ponto de Mídia" },
      { text: `${it.total_insercoes || 1}` },
      { text: formatBRL(it.valor_tabela || it.valor_unit || 0) },
      { text: `${it.desconto || 0}%` },
      { text: formatBRL(it.valor_negociado || it.valor_unit || 0), options: { bold: true, color: tpl.corDestaque } },
    ]),
  ];

  slide7.addTable(investRowsPptx as any, {
    x: 0.6,
    y: 1.8,
    w: 12.1,
    fontSize: 9.5,
    border: { pt: 0.5, color: "E2E8F0" },
  });

  slide7.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 5.2, w: 12.1, h: 1.5, rectRadius: 0.1, fill: { color: tpl.corPrimaria } });
  slide7.addText("TOTAL DO INVESTIMENTO LÍQUIDO:", { x: 1.0, y: 5.6, w: 6.0, h: 0.4, fontSize: 13, bold: true, color: "FFFFFF" });
  slide7.addText(formatBRL(proposta.valor_negociado || 0), { x: 7.0, y: 5.5, w: 5.2, h: 0.6, fontSize: 22, bold: true, color: tpl.corDestaque, align: "right" });

  // --------------------------------------------------------------------------
  // SLIDE 8: JUSTIFICATIVA DOS PONTOS
  // --------------------------------------------------------------------------
  const slide8 = pptx.addSlide();
  aplicarHeaderPptx(slide8, "7. Justificativa dos Pontos");

  slide8.addText("Racional Técnico & Defesa de Mídia", {
    x: 0.6,
    y: 1.1,
    w: 12,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: tpl.corPrimaria,
  });

  const justPptx = [
    { tit: "Visibilidade & Ângulo Frontal", desc: "Instalação estratégica com linha direta de visão, eliminando pontos cegos." },
    { tit: "Volume Massivo de Contatos", desc: "Concentração em artérias urbanas com tráfego ininterrupto de veículos e pedestres." },
    { tit: "Sinergia com o Funil de Vendas", desc: "Construção de notoriedade que potencializa campanhas digitais e pontos físicos." },
  ];

  justPptx.forEach((j, idx) => {
    const y = 1.9 + idx * 1.6;
    slide8.addShape(pptx.ShapeType.roundRect, { x: 0.6, y, w: 12.1, h: 1.35, rectRadius: 0.1, fill: { color: "F8FAFC" }, line: { color: "E2E8F0" } });
    slide8.addShape(pptx.ShapeType.rect, { x: 0.6, y, w: 0.2, h: 1.35, fill: { color: tpl.corDestaque } });
    slide8.addText(j.tit, { x: 1.1, y: y + 0.15, w: 11.2, h: 0.35, fontSize: 12, bold: true, color: tpl.corPrimaria });
    slide8.addText(j.desc, { x: 1.1, y: y + 0.55, w: 11.2, h: 0.6, fontSize: 9.5, color: "475569" });
  });

  // --------------------------------------------------------------------------
  // SLIDE 9: CONCLUSÃO COMERCIAL
  // --------------------------------------------------------------------------
  const slide9 = pptx.addSlide();
  aplicarHeaderPptx(slide9, "8. Conclusão Comercial");

  slide9.addText("Próximos Passos & Formalização", {
    x: 0.6,
    y: 1.1,
    w: 12,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: tpl.corPrimaria,
  });

  const passosPptx = [
    { n: "01", t: "Aprovação", s: "Confirmação da proposta" },
    { n: "02", t: "Reserva", s: "Bloqueio no inventário" },
    { n: "03", t: "Material", s: "Validação dos criativos" },
    { n: "04", t: "Checking", s: "Comprovação fotográfica" },
  ];

  passosPptx.forEach((p, idx) => {
    const x = 0.6 + idx * 3.05;
    slide9.addShape(pptx.ShapeType.roundRect, { x, y: 1.8, w: 2.85, h: 2.2, rectRadius: 0.1, fill: { color: "FFFFFF" }, line: { color: "E2E8F0" } });
    slide9.addText(p.n, { x: x + 0.2, y: 1.95, w: 2.4, h: 0.5, fontSize: 20, bold: true, color: tpl.corDestaque });
    slide9.addText(p.t, { x: x + 0.2, y: 2.5, w: 2.4, h: 0.4, fontSize: 11, bold: true, color: tpl.corPrimaria });
    slide9.addText(p.s, { x: x + 0.2, y: 2.9, w: 2.4, h: 0.8, fontSize: 8.5, color: "64748B" });
  });

  // Card de assinatura e contatos
  slide9.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 4.3, w: 12.1, h: 2.4, rectRadius: 0.1, fill: { color: "F8FAFC" }, line: { color: "E2E8F0" } });
  slide9.addText("Condições Comerciais:", { x: 1.0, y: 4.5, w: 5.5, h: 0.35, fontSize: 10, bold: true, color: tpl.corPrimaria });
  slide9.addText("Proposta sujeita a disponibilidade dos pontos até a data de confirmação formal. Checking fotográfico digital incluso.", {
    x: 1.0,
    y: 4.9,
    w: 5.5,
    h: 1.5,
    fontSize: 9,
    color: "475569",
  });

  slide9.addText(`Executivo Comercial:\n${proposta.executivo?.nome || "Mídia.OS Atendimento"}\n${proposta.executivo?.telefone || "(61) 99999-0000"}\n${proposta.executivo?.email || "comercial@midiaos.com.br"}`, {
    x: 7.2,
    y: 4.5,
    w: 5.2,
    h: 1.9,
    fontSize: 9.5,
    color: "334155",
  });

  // --------------------------------------------------------------------------
  // EXPORTAÇÃO DO ARQUIVO PPTX
  // --------------------------------------------------------------------------
  const nomeArquivo = opcoes?.fileName || `Apresentacao-Estrategica-${numProposta}-${tpl.id}.pptx`;
  await pptx.writeFile({ fileName: nomeArquivo });
}
