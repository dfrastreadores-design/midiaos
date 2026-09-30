import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PrestacaoContasDados } from "./prestacao-contas.functions";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function gerarPdfPrestacaoContas(
  dados: PrestacaoContasDados,
  empresaBranding?: { nome?: string | null; cnpj?: string | null; logoSrc?: string | null },
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = M;

  // --- CABEÇALHO ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE PRESTAÇÃO DE CONTAS", M, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const empresaNome = empresaBranding?.nome || "Mídia OS — Gestão e Representação de Mídia";
  doc.text(empresaNome, M, 18);
  if (empresaBranding?.cnpj) {
    doc.text(`CNPJ: ${empresaBranding.cnpj}`, M, 23);
  }

  // Número e Data no canto direito
  doc.setFont("helvetica", "bold");
  doc.text(`PI / CAMPANHA: ${dados.numero}`, pageWidth - M, 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - M, 18, { align: "right" });

  y = 35;

  // --- IDENTIFICAÇÃO DA CAMPANHA ---
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("1. Identificação da Campanha", M, y);
  y += 5;

  const infoGerais = [
    [
      { content: "Campanha:", styles: { fontStyle: "bold" as const, cellWidth: 28 } },
      dados.campanha,
      { content: "Período:", styles: { fontStyle: "bold" as const, cellWidth: 20 } },
      `${dados.periodo_inicio ? new Date(dados.periodo_inicio).toLocaleDateString("pt-BR") : "—"} até ${dados.periodo_fim ? new Date(dados.periodo_fim).toLocaleDateString("pt-BR") : "—"}`,
    ],
    [
      { content: "Cliente:", styles: { fontStyle: "bold" as const } },
      `${dados.cliente?.razao_social || dados.cliente?.nome_fantasia || "—"} (${dados.cliente?.cnpj || "S/ CNPJ"})`,
      { content: "Agência:", styles: { fontStyle: "bold" as const } },
      dados.agencia?.razao_social || dados.agencia?.nome_fantasia || "Venda Direta",
    ],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: infoGerais,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [51, 65, 85] },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // --- RESUMO FINANCEIRO E DE VEICULAÇÃO ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("2. Resumo Financeiro da Operação", M, y);
  y += 5;

  const resumoFin = [
    ["Valor Comercializado (Bruto)", fmtBRL(dados.valor_total)],
    ["Total de Inserções Veiculadas", `${dados.total_insercoes} inserções`],
    ["Total de Repasse aos Parceiros/Veículos", fmtBRL(dados.total_repasse)],
    ["Comissão / Remuneração da Empresa", fmtBRL(dados.total_comissao)],
    ["Total Recebido do Cliente / Agência", fmtBRL(dados.financeiro.recebido)],
    ["Total Efetivamente Repassado aos Veículos", fmtBRL(dados.financeiro.repassado)],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Métrica Financeira", "Valor"]],
    body: resumoFin,
    theme: "striped",
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: "right", fontStyle: "bold" },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // --- RATEIO E REPASSE POR PARCEIRO ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("3. Rateio por Veículo / Parceiro de Mídia", M, y);
  y += 5;

  const parceirosBody = dados.parceiros_rateio.map((p) => [
    p.nome,
    p.cnpj || "—",
    fmtBRL(p.valor_comercializado),
    `${p.comissao_pct}%`,
    fmtBRL(p.comissao_valor),
    fmtBRL(p.repasse_valor),
    p.status_repasse.toUpperCase(),
  ]);

  if (parceirosBody.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Veículo / Parceiro", "CNPJ", "Comercializado", "Comissão %", "Comissão R$", "Repasse Líquido", "Status"]],
      body: parceirosBody,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "center" },
        4: { halign: "right" },
        5: { halign: "right", fontStyle: "bold" },
        6: { halign: "center" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("Nenhum rateio formal de parceiros registrado nesta campanha.", M, y);
    y += 8;
  }

  // --- INSERÇÕES VEICULADAS ---
  if (y > pageHeight - 50) {
    doc.addPage();
    y = M + 5;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("4. Inserções e Formatos Veiculados", M, y);
  y += 5;

  const itensBody = dados.itens_veiculados.map((it) => [
    it.tipo,
    it.programa || "Geral",
    it.formato || "Padrão",
    it.parceiro_nome || "Principal",
    `${it.total_insercoes}`,
    fmtBRL(it.valor_negociado),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Tipo de Mídia", "Programa / Local", "Formato", "Veículo", "Qtd Inserções", "Valor Total"]],
    body: itensBody,
    theme: "striped",
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    columnStyles: {
      4: { halign: "center" },
      5: { halign: "right" },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // --- COMPROVANTES DE VEICULAÇÃO (CHECKING) ---
  if (y > pageHeight - 50) {
    doc.addPage();
    y = M + 5;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("5. Comprovação de Execução & Checking", M, y);
  y += 5;

  const comprovantesBody = dados.comprovantes.map((c) => [
    c.tipo.toUpperCase(),
    c.titulo,
    c.parceiro_nome || "Geral",
    c.data_veiculacao ? new Date(c.data_veiculacao).toLocaleDateString("pt-BR") : "—",
    c.validado ? "VALIDADO" : "PENDENTE",
    c.link_externo || (c.arquivo_url ? "Anexo disponível no sistema" : "—"),
  ]);

  if (comprovantesBody.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Tipo", "Evidência / Checking", "Veículo", "Data", "Auditoria", "Link / Acesso"]],
      body: comprovantesBody,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columnStyles: {
        4: { halign: "center", fontStyle: "bold" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  } else {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("Nenhum comprovante de veiculação cadastrado para esta campanha.", M, y);
    y += 10;
  }

  // --- ASSINATURAS ---
  if (y > pageHeight - 40) {
    doc.addPage();
    y = M + 15;
  }

  y += 5;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Atestamos que todas as inserções e veiculações descritas acima foram rigorosamente executadas de acordo com as especificações contratadas.",
    M,
    y,
    { maxWidth: pageWidth - 2 * M },
  );

  y += 20;
  const lineW = 75;
  doc.setDrawColor(148, 163, 184);
  doc.line(M, y, M + lineW, y);
  doc.line(pageWidth - M - lineW, y, pageWidth - M, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(empresaNome, M + lineW / 2, y + 5, { align: "center" });
  doc.text("CLIENTE / AGÊNCIA", pageWidth - M - lineW / 2, y + 5, { align: "center" });

  // Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount} — Mídia OS — Documento de Prestação de Contas gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" },
    );
  }

  doc.save(`Prestacao_Contas_${dados.numero}.pdf`);
}
