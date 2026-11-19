import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

const mdPath = path.resolve("DOCUMENTACAO_COMPLETA_MIDIA_OS.md");
const pdfPath = path.resolve("DOCUMENTACAO_COMPLETA_MIDIA_OS.pdf");

const markdown = fs.readFileSync(mdPath, "utf-8");

const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4",
});

const pageWidth = 210;
const pageHeight = 297;
const marginX = 20;
const marginY = 22;
const contentWidth = pageWidth - marginX * 2;
const maxContentY = pageHeight - marginY - 10;

let currentY = marginY;

function addHeaderFooter(docInstance) {
  const totalPages = docInstance.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    docInstance.setPage(i);

    // Skip header on cover page (page 1)
    if (i > 1) {
      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8);
      docInstance.setTextColor(130, 140, 155);
      docInstance.text("Mídia.OS 2.6.0 — Documentação Técnica e Funcional Completa", marginX, 12);
      docInstance.setDrawColor(225, 230, 240);
      docInstance.setLineWidth(0.3);
      docInstance.line(marginX, 14, pageWidth - marginX, 14);
    }

    // Footer on all pages
    docInstance.setFont("helvetica", "normal");
    docInstance.setFontSize(8);
    docInstance.setTextColor(140, 150, 165);
    docInstance.text(
      "Mídia.OS • Plataforma SaaS de Inteligência Comercial e Mídia",
      marginX,
      pageHeight - 12
    );
    docInstance.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 12,
      { align: "right" }
    );
  }
}

function checkPageBreak(requiredSpace = 10) {
  if (currentY + requiredSpace > maxContentY) {
    doc.addPage();
    currentY = marginY;
  }
}

// ==========================================
// 1. CAPA PROFISSIONAL (PAGE 1)
// ==========================================
// Background accent
doc.setFillColor(15, 23, 42); // slate-900
doc.rect(0, 0, pageWidth, 85, "F");

// Top badge
doc.setFillColor(124, 58, 237); // purple-600
doc.roundedRect(marginX, 25, 45, 7, 2, 2, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(8);
doc.setTextColor(255, 255, 255);
doc.text("DOCUMENTO OFICIAL", marginX + 3.5, 29.5);

// Title
doc.setFont("helvetica", "bold");
doc.setFontSize(26);
doc.setTextColor(255, 255, 255);
doc.text("MÍDIA.OS", marginX, 45);

// Subtitle
doc.setFont("helvetica", "normal");
doc.setFontSize(14);
doc.setTextColor(203, 213, 225);
doc.text("Documentação Técnica e Funcional Completa", marginX, 54);

doc.setFontSize(10);
doc.setTextColor(148, 163, 184);
doc.text("Plataforma SaaS Multi-Tenant Omnichannel de Gestão Comercial e Operações de Mídia", marginX, 63);

// Details box
currentY = 105;
doc.setFillColor(248, 250, 252);
doc.setDrawColor(226, 232, 240);
doc.roundedRect(marginX, currentY, contentWidth, 68, 3, 3, "FD");

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(30, 41, 59);
doc.text("Dados de Engenharia e Arquitetura", marginX + 8, currentY + 12);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(71, 85, 105);

const meta = [
  ["Versão da Plataforma:", "2.6.0 Enterprise Multi-Tenant (White-Label)"],
  ["Data de Emissão:", "Outubro de 2026"],
  ["Ambiente:", "Produção Oficial (Política Zero Perda de Dados Ativa)"],
  ["Stack Tecnológico:", "TanStack Start + Nitro SSR + React 19 + Supabase + PostgreSQL"],
  ["Motor de IA:", "Google Gemini 2.5 Flash (@google/genai)"],
  ["Status de Homologação:", "100% de Testes Aprovados (40/40)"]
];

let metaY = currentY + 20;
for (const [label, val] of meta) {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text(label, marginX + 8, metaY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(val, marginX + 56, metaY);
  metaY += 7.5;
}

currentY = 195;
doc.setFont("helvetica", "italic");
doc.setFontSize(9);
doc.setTextColor(100, 116, 139);
doc.text(
  "Este documento contém a descrição exaustiva de requisitos, mapa de telas, modelo relacional,",
  marginX,
  currentY
);
doc.text(
  "fluxos operacionais, diretrizes de segurança e roadmap de evolução do produto Mídia.OS.",
  marginX,
  currentY + 5
);

// Start content on Page 2
doc.addPage();
currentY = marginY;

// ==========================================
// 2. PROCESSADOR DE MARKDOWN PARA PDF
// ==========================================
const lines = markdown.split("\n");

let inCodeBlock = false;
let codeBuffer = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trimEnd();

  // Handle Code Blocks
  if (line.startsWith("```")) {
    if (inCodeBlock) {
      // Flush code block
      checkPageBreak(codeBuffer.length * 4.2 + 8);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      const blockHeight = codeBuffer.length * 4.2 + 6;
      doc.roundedRect(marginX, currentY, contentWidth, blockHeight, 2, 2, "FD");

      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);

      let lineY = currentY + 4.5;
      for (const cLine of codeBuffer) {
        doc.text(cLine.substring(0, 85), marginX + 3.5, lineY);
        lineY += 4.2;
      }
      currentY += blockHeight + 4;
      codeBuffer = [];
      inCodeBlock = false;
    } else {
      inCodeBlock = true;
      codeBuffer = [];
    }
    continue;
  }

  if (inCodeBlock) {
    codeBuffer.push(line);
    continue;
  }

  // Headings
  if (line.startsWith("# ")) {
    checkPageBreak(25);
    currentY += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(line.replace("# ", ""), marginX, currentY);
    currentY += 3;
    doc.setDrawColor(124, 58, 237); // purple-600
    doc.setLineWidth(0.8);
    doc.line(marginX, currentY, marginX + 45, currentY);
    currentY += 6;
    continue;
  }

  if (line.startsWith("## ")) {
    checkPageBreak(18);
    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(line.replace("## ", ""), marginX, currentY);
    currentY += 2;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY, marginX + contentWidth, currentY);
    currentY += 5;
    continue;
  }

  if (line.startsWith("### ")) {
    checkPageBreak(12);
    currentY += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);
    doc.text(line.replace("### ", ""), marginX, currentY);
    currentY += 5;
    continue;
  }

  // Blockquotes
  if (line.startsWith("> ")) {
    checkPageBreak(10);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(147, 51, 234);
    const quoteText = line.replace("> ", "");
    const splitQuote = doc.splitTextToSize(quoteText, contentWidth - 10);
    const boxHeight = splitQuote.length * 4.2 + 5;
    doc.rect(marginX, currentY, 2, boxHeight, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(splitQuote, marginX + 6, currentY + 4);
    currentY += boxHeight + 3;
    continue;
  }

  // Table rows or separators
  if (line.startsWith("|") && line.endsWith("|")) {
    if (line.includes("---")) {
      continue; // Skip markdown divider
    }
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

    checkPageBreak(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    if (cols.length === 3) {
      // 3-col format (ex: Rota, Nome, Objetivo)
      const col1 = cols[0].substring(0, 24);
      const col2 = cols[1].replace(/\*\*/g, "").substring(0, 28);
      const col3 = doc.splitTextToSize(cols[2], contentWidth - 75);

      const rowHeight = Math.max(col3.length * 3.6, 6);
      checkPageBreak(rowHeight + 2);

      doc.setFont("helvetica", "bold");
      doc.text(col1, marginX, currentY + 3.5);
      doc.setFont("helvetica", "normal");
      doc.text(col2, marginX + 26, currentY + 3.5);
      doc.text(col3, marginX + 72, currentY + 3.5);

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(marginX, currentY + rowHeight + 1, marginX + contentWidth, currentY + rowHeight + 1);

      currentY += rowHeight + 2;
      continue;
    }
  }

  // Bullet items
  if (line.startsWith("- ") || line.startsWith("* ")) {
    checkPageBreak(6);
    const bulletText = line.substring(2);
    const splitText = doc.splitTextToSize(bulletText, contentWidth - 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("•", marginX + 1.5, currentY + 3.5);
    doc.text(splitText, marginX + 6, currentY + 3.5);
    currentY += splitText.length * 4.2 + 1;
    continue;
  }

  // Numbered list
  if (/^\d+\.\s/.test(line)) {
    checkPageBreak(6);
    const numMatch = line.match(/^(\d+\.)\s(.*)$/);
    if (numMatch) {
      const numPrefix = numMatch[1];
      const text = numMatch[2];
      const splitText = doc.splitTextToSize(text, contentWidth - 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(numPrefix, marginX + 1, currentY + 3.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(splitText, marginX + 8, currentY + 3.5);
      currentY += splitText.length * 4.2 + 1.5;
      continue;
    }
  }

  // Horizontal divider
  if (line === "---") {
    checkPageBreak(6);
    currentY += 2;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY, marginX + contentWidth, currentY);
    currentY += 4;
    continue;
  }

  // Empty line
  if (line.trim() === "") {
    currentY += 2.5;
    continue;
  }

  // Normal text paragraph
  const splitText = doc.splitTextToSize(line, contentWidth);
  checkPageBreak(splitText.length * 4.2 + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(splitText, marginX, currentY + 3.5);
  currentY += splitText.length * 4.2 + 2;
}

// Add headers, footers and page numbers
addHeaderFooter(doc);

// Output to PDF
const pdfData = doc.output();
fs.writeFileSync(pdfPath, Buffer.from(pdfData, "binary"));

console.log(`✅ Documentação PDF gerada com sucesso: ${pdfPath}`);
console.log(`📄 Total de páginas geradas: ${doc.getNumberOfPages()}`);
