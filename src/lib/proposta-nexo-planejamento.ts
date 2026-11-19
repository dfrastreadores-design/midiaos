/**
 * GERADOR DE APRESENTAÇÃO DE PLANEJAMENTO DE MÍDIA — MODELO OFICIAL NEXO (6 SLIDES)
 * 
 * Implementa com fidelidade visual absoluta o modelo executivo oficial da NEXO:
 * - Slide 1: Capa (Logo Nexo, Cliente em destaque, Subtítulo, Descrição, 3 Cards/Pills coloridos e barra tricolor)
 * - Slide 2: Defesa comercial da proposta (3 Pilares com ícones circulares, Leitura rápida e Sugestão de composição)
 * - Slide 3 e 4: Planejamento + investimento (Tabelas com 1 Mês, 3 Meses e 6 Meses, agrupadas por região/cluster)
 * - Slide 5: Mapa único dos pontos selecionados (Esquema territorial + Referência com links clicáveis "Abrir" para o Google Maps)
 * - Slide 6: Encerramento e próximos passos (Próximos passos sugeridos + Card "Conte com a NEXO" e CTA)
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PropostaApresentacao } from "@/lib/proposta-presentation";
import logoNexoPng from "@/assets/logo-nexo.png";

// Cores Oficiais da Identidade Visual NEXO
export const CORES_NEXO = {
  azul: [37, 99, 235] as [number, number, number],      // #2563EB
  laranja: [234, 88, 12] as [number, number, number],   // #EA580C
  roxo: [124, 58, 237] as [number, number, number],     // #7C3AED
  escuro: [15, 23, 42] as [number, number, number],     // #0F172A
  textoCorpo: [30, 41, 59] as [number, number, number], // #1E293B
  mutado: [100, 116, 139] as [number, number, number],  // #64748B
  cardBg: [248, 250, 252] as [number, number, number],  // #F8FAFC
  borda: [226, 232, 240] as [number, number, number],   // #E2E8F0
  branco: [255, 255, 255] as [number, number, number],
};

function formatarNumero(num: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(num || 0));
}

function formatarMoeda(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
}

// Converte a imagem de logo importada para Data URL segura
let logoNexoCacheDataUrl: string | null = null;
async function obterLogoNexoDataUrl(): Promise<string | null> {
  if (logoNexoCacheDataUrl) return logoNexoCacheDataUrl;
  try {
    const res = await fetch(logoNexoPng);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoNexoCacheDataUrl = (reader.result as string) || null;
        resolve(logoNexoCacheDataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPdfPlanejamentoNexoOficial(
  proposta: PropostaApresentacao,
  opcoes?: {
    customizados?: {
      resumoExecutivo?: string;
      objetivo?: string;
    };
    returnBlob?: boolean;
    fileName?: string;
  },
): Promise<Blob | void> {
  // A4 Paisagem (297 x 210 mm)
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "landscape",
  });

  const W = 297;
  const H = 210;

  const clienteNome = (
    proposta.cliente?.nome_fantasia ||
    proposta.cliente?.razao_social ||
    proposta.cliente_avulso ||
    "BRASCAR"
  ).toUpperCase();

  const logoData = await obterLogoNexoDataUrl();

  // Itens da proposta normalizados
  const itens = (proposta.itens || []).map((it, idx) => {
    const valorNegociado = Number(it.valor_negociado || it.valor_unit || 5000);
    const dimensoes =
      (it as any).dimensoes ||
      it.formato ||
      (it.tipo?.includes("DOOH") ? "1920x1080px (LED)" : "9m × 3,60m");

    const localizacao =
      it.programa ||
      it.endereco_ponto ||
      it.ponto_referencia ||
      `Ponto de Mídia ${idx + 1}`;

    const sentidoVia = (it as any).sentido_via || "";
    const labelCompleto = sentidoVia
      ? `${localizacao} · ${sentidoVia}`
      : localizacao;

    const mapsUrl =
      (it as any).link_maps ||
      ((it as any).latitude && (it as any).longitude
        ? `https://www.google.com/maps?q=${(it as any).latitude},${(it as any).longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${localizacao} ${it.cidade || "Distrito Federal"}`,
          )}`);

    return {
      numero: String(idx + 1).padStart(2, "0"),
      nome: labelCompleto,
      localizacao,
      dimensoes,
      valor1Mes: valorNegociado,
      valor3Meses: Math.round(valorNegociado * 0.88), // ~12% de desconto no plano de 3 meses
      valor6Meses: Math.round(valorNegociado * 0.78), // ~22% de desconto no plano de 6 meses
      mapsUrl,
      cidade: it.cidade || "Distrito Federal",
      tipo: it.tipo || "Frontlight",
    };
  });

  // Agrupamento de itens por cluster/região para os Slides 3 e 4
  const cluster1Nome = "SOBRADINHO | COBERTURA LOCAL";
  const cluster2Nome = "BR-020 E ACESSOS ESTRATÉGICOS";

  const itensCluster1 = itens.slice(0, Math.min(9, Math.ceil(itens.length / 2) || 1));
  const itensCluster2 = itens.slice(itensCluster1.length);

  // Helper para desenhar a barra de degradê tricolor Nexo (Azul, Laranja, Roxo)
  const desenharBarraTricolorNexo = (y: number, espessura = 2) => {
    const segW = W / 3;
    doc.setFillColor(...CORES_NEXO.azul);
    doc.rect(0, y, segW, espessura, "F");

    doc.setFillColor(...CORES_NEXO.laranja);
    doc.rect(segW, y, segW, espessura, "F");

    doc.setFillColor(...CORES_NEXO.roxo);
    doc.rect(segW * 2, y, segW, espessura, "F");
  };

  // Helper para desenhar o Header Oficial das páginas 2 a 6
  const desenharHeaderSlideNexo = (
    subtituloTag: string,
    tituloSlide: string,
    numeroPaginaStr: string,
  ) => {
    // Fundo branco limpo
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");

    // Logo NEXO no canto superior esquerdo
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", 16, 8, 38, 14, undefined, "FAST");
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(...CORES_NEXO.azul);
        doc.text("NEXO", 16, 18);
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...CORES_NEXO.azul);
      doc.text("NEXO", 16, 18);
      doc.setFontSize(7.5);
      doc.setTextColor(...CORES_NEXO.mutado);
      doc.text("Estratégia • Mídia • Representação", 16, 23);
    }

    // Tag da Seção e Título no canto superior direito
    if (subtituloTag) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...CORES_NEXO.mutado);
      doc.text(subtituloTag.toUpperCase(), W - 16, 14, { align: "right" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...CORES_NEXO.escuro);
    doc.text(tituloSlide, W - 16, 21, { align: "right" });

    // Linha tricolor fina sob o header
    desenharBarraTricolorNexo(26, 1.2);

    // Número da página no canto inferior direito
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CORES_NEXO.mutado);
    doc.text(numeroPaginaStr, W - 16, H - 10, { align: "right" });
  };

  // ==========================================================================
  // SLIDE 1: CAPA OFICIAL NEXO
  // ==========================================================================
  // Fundo branco puro
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  // Logo Nexo grande no topo
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", 24, 18, 56, 20, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(...CORES_NEXO.azul);
      doc.text("NEXO", 24, 32);
      doc.setFontSize(9);
      doc.setTextColor(...CORES_NEXO.mutado);
      doc.text("Estratégia • Mídia • Representação", 24, 38);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...CORES_NEXO.azul);
    doc.text("NEXO", 24, 32);
    doc.setFontSize(9);
    doc.setTextColor(...CORES_NEXO.mutado);
    doc.text("Estratégia • Mídia • Representação", 24, 38);
  }

  // Título e Subtítulos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("PLANEJAMENTO DE MÍDIA EXTERIOR", 24, 58);

  // Nome do Anunciante em destaque
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text(clienteNome, 24, 76);

  // Praças e Acessos
  const pracaOuAcessos =
    proposta.cliente?.cidade
      ? `${proposta.cliente.cidade} • Vias e acessos estratégicos`
      : "Sobradinho • BR-020 • acessos estratégicos";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text(pracaOuAcessos, 24, 88);

  // Descrição Institucional da Nexo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...CORES_NEXO.textoCorpo);
  const textoCapa =
    "Proposta comercial da NEXO com foco em presença local, cobertura de fluxo e flexibilidade para composição da campanha conforme a estratégia do cliente.";
  doc.text(doc.splitTextToSize(textoCapa, 230), 24, 104);

  // 3 Badges/Pills arredondadas na base da Capa
  const pillY = 138;
  const pillH = 26;
  const pillW = 74;

  // Pill 1: Azul (Total de opções)
  doc.setFillColor(...CORES_NEXO.azul);
  doc.roundedRect(24, pillY, pillW, pillH, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(String(itens.length || 14).padStart(2, "0"), 36, pillY + 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("opções de mídia", 52, pillY + 16);

  // Pill 2: Laranja (Cluster 1)
  doc.setFillColor(...CORES_NEXO.laranja);
  doc.roundedRect(104, pillY, pillW, pillH, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(String(itensCluster1.length || 9).padStart(2, "0"), 116, pillY + 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("faces na praça local", 132, pillY + 16);

  // Pill 3: Roxo (Cluster 2)
  doc.setFillColor(...CORES_NEXO.roxo);
  doc.roundedRect(184, pillY, pillW, pillH, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(String(itensCluster2.length || 5).padStart(2, "0"), 196, pillY + 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("eixo rodoviário & acessos", 212, pillY + 16);

  // Rodapé da Capa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text("PROPOSTA FINAL • NEXO | Estratégia • Mídia • Representação", 24, H - 12);
  desenharBarraTricolorNexo(H - 6, 2.5);

  // ==========================================================================
  // SLIDE 2: DEFESA COMERCIAL DA PROPOSTA
  // ==========================================================================
  doc.addPage();
  desenharHeaderSlideNexo(clienteNome, "Defesa comercial da proposta", "02");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("Uma estratégia de mídia que transforma visibilidade em oportunidades de negócio.", 16, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  const textoDefesa =
    opcoes?.customizados?.resumoExecutivo ||
    `Selecionamos um conjunto de fronts capazes de combinar impacto estratégico na região de atuação com pontos de fluxo viário e acessos metropolitanos. A ideia é dar à ${clienteNome} uma campanha flexível, com opções para trabalhar cobertura local e circulação regional dentro do mesmo planejamento.`;
  doc.text(doc.splitTextToSize(textoDefesa, 155), 16, 45);

  // Coluna Esquerda: 3 Pilares Estruturados
  const pilaresData = [
    {
      titulo: "Presença local",
      cor: CORES_NEXO.azul,
      desc: "Frentes posicionadas em áreas de circulação da região para fortalecer reconhecimento e proximidade com o público local.",
    },
    {
      titulo: "Fluxo estratégico",
      cor: CORES_NEXO.laranja,
      desc: "Pontos no corredor principal e nos acessos ampliam a visibilidade para quem entra, sai e circula entre cidades e regiões.",
    },
    {
      titulo: "Campanha modular",
      cor: CORES_NEXO.roxo,
      desc: "Cada mídia tem investimento individual, permitindo montar a campanha conforme prioridade, prazo e orçamento do cliente.",
    },
  ];

  pilaresData.forEach((pil, i) => {
    const cardY = 66 + i * 35;
    doc.setFillColor(...CORES_NEXO.cardBg);
    doc.setDrawColor(...CORES_NEXO.borda);
    doc.roundedRect(16, cardY, 155, 30, 2.5, 2.5, "FD");

    // Círculo colorido
    doc.setFillColor(...pil.cor);
    doc.circle(26, cardY + 15, 5, "F");

    // Textos do Pilar
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...CORES_NEXO.escuro);
    doc.text(pil.titulo, 36, cardY + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...CORES_NEXO.mutado);
    doc.text(doc.splitTextToSize(pil.desc, 130), 36, cardY + 18);
  });

  // Coluna Direita: Cards "Leitura rápida" e "Sugestão de composição"
  const colDirX = 180;
  const colDirW = 101;

  // Box 1: Leitura rápida
  doc.setFillColor(...CORES_NEXO.cardBg);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(colDirX, 36, colDirW, 58, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("Leitura rápida", colDirX + 8, 46);

  const bulletsRapidos = [
    { cor: CORES_NEXO.azul, txt: "Investimentos por ponto, sem necessidade de pacote fechado." },
    { cor: CORES_NEXO.laranja, txt: "Mapa único com links de acesso para facilitar visualização." },
    { cor: CORES_NEXO.roxo, txt: "Proposta pronta para ajustes conforme estratégia comercial." },
  ];

  bulletsRapidos.forEach((b, idx) => {
    const bY = 54 + idx * 11;
    doc.setFillColor(...b.cor);
    doc.circle(colDirX + 11, bY + 1.5, 2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...CORES_NEXO.textoCorpo);
    doc.text(doc.splitTextToSize(b.txt, colDirW - 22), colDirX + 17, bY + 2.5);
  });

  // Box 2: Sugestão de composição inicial
  doc.setFillColor(...CORES_NEXO.cardBg);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(colDirX, 102, colDirW, 68, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("Sugestão de composição inicial", colDirX + 8, 112);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES_NEXO.textoCorpo);
  doc.text("• Presença local estratégica para fixação da marca", colDirX + 8, 120);
  doc.text("• Complemento em vias troncais de alto fluxo", colDirX + 8, 126);
  doc.text("• Reforço nos acessos quando houver necessidade de amplitude", colDirX + 8, 132);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text(
    doc.splitTextToSize("Essa construção ajuda a equilibrar frequência contínua, cobertura territorial e alta percepção de valor.", colDirW - 16),
    colDirX + 8,
    144,
  );

  // ==========================================================================
  // SLIDE 3: PLANEJAMENTO + INVESTIMENTO (CLUSTER 1 / COBERTURA LOCAL)
  // ==========================================================================
  doc.addPage();
  desenharHeaderSlideNexo(cluster1Nome, "Planejamento + investimento", "03");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text("Pontos voltados à presença local e à lembrança de marca dentro da região.", 16, 33);

  const tableBody1 = (itensCluster1.length > 0 ? itensCluster1 : itens).map((it) => [
    it.numero,
    it.nome,
    it.dimensoes,
    formatarNumero(it.valor1Mes),
    formatarNumero(it.valor3Meses),
    formatarNumero(it.valor6Meses),
  ]);

  autoTable(doc, {
    startY: 37,
    margin: { left: 16, right: 16 },
    head: [["Nº", "LOCALIZAÇÃO / OBJETIVO", "DIMENSÕES", "1 MÊS", "3 MESES", "6 MESES"]],
    body: tableBody1,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: CORES_NEXO.escuro,
      lineColor: CORES_NEXO.borda,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: CORES_NEXO.escuro,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 26, halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      // Desenha a pílula azul na coluna Nº das linhas do corpo
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...CORES_NEXO.azul);
        doc.roundedRect(data.cell.x + 2, data.cell.y + 1, data.cell.width - 4, data.cell.height - 2, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(String(data.cell.raw), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.2, {
          align: "center",
        });
      }
    },
  });

  const finalY1 = (doc as any).lastAutoTable?.finalY || 140;

  // Nota de rodapé da tabela
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text(
    "* Valores em R$ por face. Os prazos de 3 e 6 meses representam investimento mensal conforme período contratado.",
    16,
    finalY1 + 5,
  );

  // Box Destaque do Slide 3
  doc.setFillColor(...CORES_NEXO.cardBg);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(16, finalY1 + 8, W - 32, 12, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES_NEXO.escuro);
  const destaquesTxt =
    itensCluster1.length > 0
      ? `Destaques para cobertura local: ${itensCluster1.slice(0, 3).map((i) => i.localizacao).join(", ")}.`
      : "Destaques para cobertura local: Rotas de alta frequência e adensamento urbano.";
  doc.text(destaquesTxt, 22, finalY1 + 15.5);

  // ==========================================================================
  // SLIDE 4: PLANEJAMENTO + INVESTIMENTO (CLUSTER 2 / EIXOS E ACESSOS)
  // ==========================================================================
  doc.addPage();
  desenharHeaderSlideNexo(cluster2Nome, "Planejamento + investimento", "04");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text("Cobertura complementar de fluxo rodoviário e entradas estratégicas da região.", 16, 33);

  const tableBody2 = (itensCluster2.length > 0 ? itensCluster2 : itens.slice(0, 5)).map((it) => [
    it.numero,
    it.nome,
    it.dimensoes,
    formatarNumero(it.valor1Mes),
    formatarNumero(it.valor3Meses),
    formatarNumero(it.valor6Meses),
  ]);

  autoTable(doc, {
    startY: 37,
    margin: { left: 16, right: 16 },
    head: [["Nº", "LOCALIZAÇÃO / OBJETIVO", "DIMENSÕES", "1 MÊS", "3 MESES", "6 MESES"]],
    body: tableBody2,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: CORES_NEXO.escuro,
      lineColor: CORES_NEXO.borda,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: CORES_NEXO.escuro,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 26, halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data) => {
      // Desenha a pílula laranja ou roxa na coluna Nº das linhas do corpo
      if (data.section === "body" && data.column.index === 0) {
        doc.setFillColor(...CORES_NEXO.laranja);
        doc.roundedRect(data.cell.x + 2, data.cell.y + 1, data.cell.width - 4, data.cell.height - 2, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(String(data.cell.raw), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.2, {
          align: "center",
        });
      }
    },
  });

  const finalY2 = (doc as any).lastAutoTable?.finalY || 120;

  // Box "Como montar a campanha"
  doc.setFillColor(...CORES_NEXO.cardBg);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(16, finalY2 + 8, W - 32, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("Como montar a campanha", 22, finalY2 + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES_NEXO.textoCorpo);
  const instrucaoMontagem = `A ${clienteNome} pode selecionar os pontos de maior interesse sem pacote fechado. Isso permite adequar a campanha ao momento comercial, ao prazo de veiculação e ao investimento disponível.`;
  doc.text(doc.splitTextToSize(instrucaoMontagem, W - 44), 22, finalY2 + 22);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text(
    'Obs.: "—" indica prazo sem valor cadastrado no inventário atual. Todos os espaços seguem sujeitos à confirmação prévia de disponibilidade e reserva.',
    16,
    finalY2 + 37,
  );

  // ==========================================================================
  // SLIDE 5: MAPA ÚNICO DOS PONTOS SELECIONADOS
  // ==========================================================================
  doc.addPage();
  desenharHeaderSlideNexo("COBERTURA NEXO + LINKS DE ACESSO", "Mapa único dos pontos selecionados", "05");

  // Área Esquerda: Mapa Cartográfico Esquemático
  const mapaCanvasX = 16;
  const mapaCanvasY = 32;
  const mapaCanvasW = 168;
  const mapaCanvasH = 145;

  doc.setFillColor(...CORES_NEXO.cardBg);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(mapaCanvasX, mapaCanvasY, mapaCanvasW, mapaCanvasH, 2.5, 2.5, "FD");

  // Traçado viário esquemático
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(mapaCanvasX + 15, mapaCanvasY + mapaCanvasH - 25, mapaCanvasX + mapaCanvasW - 20, mapaCanvasY + 30);
  doc.line(mapaCanvasX + 35, mapaCanvasY + mapaCanvasH - 10, mapaCanvasX + 75, mapaCanvasY + 20);
  doc.line(mapaCanvasX + 60, mapaCanvasY + 95, mapaCanvasX + mapaCanvasW - 10, mapaCanvasY + 80);

  // Caixa de Identificação do Mapa
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(mapaCanvasX + 8, mapaCanvasY + 8, 62, 18, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("MAPA DE COBERTURA", mapaCanvasX + 12, mapaCanvasY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text("Pontos mapeados & eixos estratégicos", mapaCanvasX + 12, mapaCanvasY + 21);

  // Pins de marcação no mapa esquemático
  const pinsExemplo = [
    { num: "01-02", x: mapaCanvasX + 115, y: mapaCanvasY + 36, cor: CORES_NEXO.azul },
    { num: "03", x: mapaCanvasX + 124, y: mapaCanvasY + 45, cor: CORES_NEXO.azul },
    { num: "04-05", x: mapaCanvasX + 127, y: mapaCanvasY + 54, cor: CORES_NEXO.azul },
    { num: "06-07", x: mapaCanvasX + 118, y: mapaCanvasY + 56, cor: CORES_NEXO.azul },
    { num: "08-09", x: mapaCanvasX + 130, y: mapaCanvasY + 38, cor: CORES_NEXO.azul },
    { num: "10-11", x: mapaCanvasX + 144, y: mapaCanvasY + 42, cor: CORES_NEXO.laranja },
    { num: "12", x: mapaCanvasX + 48, y: mapaCanvasY + 98, cor: CORES_NEXO.roxo },
    { num: "13", x: mapaCanvasX + 72, y: mapaCanvasY + 92, cor: CORES_NEXO.roxo },
    { num: "14", x: mapaCanvasX + 32, y: mapaCanvasY + 130, cor: CORES_NEXO.roxo },
  ];

  pinsExemplo.forEach((p) => {
    doc.setFillColor(...p.cor);
    doc.circle(p.x, p.y, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(p.num, p.x, p.y + 1.6, { align: "center" });
  });

  // Legenda do Mapa Esquemático
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(mapaCanvasX + 8, mapaCanvasY + mapaCanvasH - 18, mapaCanvasW - 16, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    "Pontos de referência por região/landmark. Traçado viário esquemático para posicionamento e rotas.",
    mapaCanvasX + 12,
    mapaCanvasY + mapaCanvasH - 10,
  );

  // Coluna Direita: Referência dos Pontos com Links Diretos no Google Maps
  const refBoxX = 190;
  const refBoxW = 91;

  doc.setFillColor(...CORES_NEXO.cardBg);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(refBoxX, mapaCanvasY, refBoxW, mapaCanvasH, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("Referência dos pontos", refBoxX + 8, mapaCanvasY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text("Com link direto para abertura no mapa", refBoxX + 8, mapaCanvasY + 16);

  // Lista dos itens com botão clicável "Abrir"
  const maxItensNoMapa = Math.min(10, itens.length);
  for (let i = 0; i < maxItensNoMapa; i++) {
    const item = itens[i];
    const rowY = mapaCanvasY + 24 + i * 11.5;

    // Badge número
    const corBadge = i < 5 ? CORES_NEXO.azul : i < 8 ? CORES_NEXO.laranja : CORES_NEXO.roxo;
    doc.setFillColor(...corBadge);
    doc.roundedRect(refBoxX + 8, rowY - 3.5, 12, 6.5, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(item.numero, refBoxX + 14, rowY + 1, { align: "center" });

    // Nome truncado do Ponto
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...CORES_NEXO.escuro);
    const labelCurto = item.localizacao.length > 24 ? item.localizacao.slice(0, 24) + "..." : item.localizacao;
    doc.text(labelCurto, refBoxX + 23, rowY + 1);

    // Botão / Link "Abrir" (Clicável no PDF!)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...CORES_NEXO.azul);
    const linkX = refBoxX + refBoxW - 18;
    doc.textWithLink("Abrir", linkX, rowY + 1, { url: item.mapsUrl });

    doc.setDrawColor(...CORES_NEXO.azul);
    doc.setLineWidth(0.2);
    doc.line(linkX, rowY + 2, linkX + 11, rowY + 2);
  }

  // ==========================================================================
  // SLIDE 6: ENCERRAMENTO E PRÓXIMOS PASSOS
  // ==========================================================================
  doc.addPage();
  desenharHeaderSlideNexo(clienteNome, "Encerramento e próximos passos", "06");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("Uma proposta pronta para evoluir com o cliente.", 16, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...CORES_NEXO.mutado);
  const textoEncerramento =
    `A ${clienteNome} pode usar este planejamento como base para definir a melhor combinação de pontos, prazos e intensidade de campanha. A partir da seleção final, a NEXO poderá ajustar a composição, validar disponibilidade e avançar com a operacionalização.`;
  doc.text(doc.splitTextToSize(textoEncerramento, 155), 16, 45);

  // Coluna Esquerda: Próximos passos sugeridos
  doc.setFillColor(...CORES_NEXO.cardBg);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(16, 62, 155, 95, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("Próximos passos sugeridos", 26, 75);

  const passosLista = [
    { cor: CORES_NEXO.azul, t: "Selecionar os pontos prioritários para a campanha." },
    { cor: CORES_NEXO.laranja, t: "Definir o prazo de veiculação ideal para cada frente." },
    { cor: CORES_NEXO.roxo, t: "Confirmar disponibilidade, produção e instalação." },
    { cor: CORES_NEXO.azul, t: "Ajustar investimento final conforme estratégia comercial." },
  ];

  passosLista.forEach((p, idx) => {
    const py = 88 + idx * 16;
    doc.setFillColor(...p.cor);
    doc.circle(30, py + 1.5, 2.5, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...CORES_NEXO.textoCorpo);
    doc.text(p.t, 38, py + 3);
  });

  // Coluna Direita: Box "Conte com a NEXO"
  const ctaBoxX = 180;
  const ctaBoxW = 101;

  doc.setFillColor(...CORES_NEXO.cardBg);
  doc.setDrawColor(...CORES_NEXO.borda);
  doc.roundedRect(ctaBoxX, 62, ctaBoxW, 95, 2.5, 2.5, "FD");

  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", ctaBoxX + 12, 70, 48, 17, undefined, "FAST");
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...CORES_NEXO.azul);
      doc.text("NEXO", ctaBoxX + 12, 80);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("Conte com a NEXO", ctaBoxX + 12, 98);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...CORES_NEXO.mutado);
  const textoCta =
    "Estratégia, mídia e representação conectadas para transformar planejamento em resultado.";
  doc.text(doc.splitTextToSize(textoCta, ctaBoxW - 24), ctaBoxX + 12, 106);

  // Botão CTA Azul Arredondado
  doc.setFillColor(...CORES_NEXO.azul);
  doc.roundedRect(ctaBoxX + 12, 124, ctaBoxW - 24, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Seguimos à disposição para os", ctaBoxX + ctaBoxW / 2, 131.5, { align: "center" });
  doc.text("ajustes finais.", ctaBoxX + ctaBoxW / 2, 137, { align: "center" });

  // Rodapé Final
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...CORES_NEXO.escuro);
  doc.text("NEXO • Estratégia • Mídia • Representação", 16, H - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CORES_NEXO.mutado);
  doc.text("Conectando estratégia, mídia e representação para gerar presença e resultado.", 16, H - 9);

  desenharBarraTricolorNexo(H - 4, 2);

  // ==========================================================================
  // RETORNO / SALVAMENTO DO DOCUMENTO
  // ==========================================================================
  const blob = doc.output("blob") as Blob;
  if (opcoes?.returnBlob) return blob;

  const nomeArquivo =
    opcoes?.fileName ||
    `Planejamento-Nexo-${clienteNome.replace(/[^a-zA-Z0-9]/g, "-")}-${proposta.numero || "Oficial"}.pdf`;

  doc.save(nomeArquivo);
}
