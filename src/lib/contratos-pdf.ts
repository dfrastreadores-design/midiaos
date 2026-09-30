import jsPDF from "jspdf";
import type { Contrato } from "./contratos.functions";

export function gerarPdfContrato(
  contrato: Contrato,
  empresaBranding?: { nome?: string | null; cnpj?: string | null },
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const M = 18;
  const usableWidth = pageWidth - 2 * M;
  let y = M;

  // --- CABEÇALHO ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("INSTRUMENTO PARTICULAR DE CONTRATO", M, 11);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const empNome = empresaBranding?.nome || "Mídia OS";
  doc.text(empNome, M, 17);
  doc.text(`CONTRATO Nº: ${contrato.numero}`, pageWidth - M, 11, { align: "right" });
  doc.text(`Status: ${contrato.status.toUpperCase()}`, pageWidth - M, 17, { align: "right" });

  y = 32;

  // Título do Contrato
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(contrato.titulo, M, y, { maxWidth: usableWidth });
  y += 8;

  // Linha divisória
  doc.setDrawColor(203, 213, 225);
  doc.line(M, y, pageWidth - M, y);
  y += 6;

  // Conteúdo do Contrato
  const texto = contrato.conteudo_gerado || contrato.observacoes || "Conteúdo contratual não preenchido.";
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");

  const lines = doc.splitTextToSize(texto, usableWidth);
  const lineHeight = 4.8;

  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > pageHeight - 25) {
      doc.addPage();
      y = M + 5;
    }
    doc.text(lines[i], M, y);
    y += lineHeight;
  }

  // Bloco de Assinaturas
  if (y + 35 > pageHeight - 25) {
    doc.addPage();
    y = M + 10;
  } else {
    y += 15;
  }

  const lineW = 75;
  doc.setDrawColor(148, 163, 184);
  doc.line(M, y, M + lineW, y);
  doc.line(pageWidth - M - lineW, y, pageWidth - M, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(empNome, M + lineW / 2, y + 4.5, { align: "center" });

  const contraparte =
    contrato.cliente?.razao_social ||
    contrato.parceiro?.razao_social ||
    contrato.agencia?.razao_social ||
    "CONTRATANTE";
  doc.text(contraparte, pageWidth - M - lineW / 2, y + 4.5, { align: "center" });

  // Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount} — Contrato emitido eletronicamente via Mídia OS`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
  }

  doc.save(`Contrato_${contrato.numero}.pdf`);
}
