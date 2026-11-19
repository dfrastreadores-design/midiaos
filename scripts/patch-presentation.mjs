import fs from "node:fs";

let code = fs.readFileSync("src/lib/proposta-presentation.ts", "utf-8");

// 1. Add organizacao to PropostaApresentacao type
code = code.replace(
  "  itens?: Item[];\n};",
  `  organizacao?: {
    id?: string | null;
    nome?: string;
    slug?: string;
    site_url?: string | null;
    logo_url?: string | null;
    tagline?: string | null;
    termos_proposta?: string | null;
    cor_primaria?: string | null;
    isNexo?: boolean;
  } | null;
  itens?: Item[];
};`
);

// 2. Enhance gerarPdfPropostaSimplificada with Organization branding & White-label
const oldSimplificadaHeader = `  // 1. Header (Logo + Título)
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", 15, 15, 40, 25, undefined, "FAST");
    } catch {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(clienteNome.slice(0, 15), 15, 25);
    }
  } else {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("MÍDIA.OS", 15, 25);
  }`;

const newSimplificadaHeader = `  const org = (p as any).organizacao;
  const isNexo = org?.isNexo || org?.slug === "nexo" || org?.nome?.toLowerCase().includes("nexo");
  const emissorNome = org?.nome || (isNexo ? "Nexo Mídia e Representação" : "Mídia.OS");
  const emissorTagline = org?.tagline || (isNexo ? "Hub de Negócios e Soluções Estratégicas em Mídia" : "Sistema Integrado de Gestão Comercial e Mídia 360°");
  const emissorSite = org?.site_url || (isNexo ? "https://nexomidiaerepresentacao.com.br" : "");
  const emissorTermos = org?.termos_proposta || (isNexo ? "A Nexo Mídia e Representação atua como Hub Estratégico conectando marcas aos melhores veículos e soluções 360° no Distrito Federal." : "");

  // 1. Header (Logo + Título Emissor)
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", 15, 15, 40, 25, undefined, "FAST");
    } catch {
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(clienteNome.slice(0, 15), 15, 25);
    }
  } else if (isNexo) {
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("NEXO MÍDIA E REPRESENTAÇÃO", 15, 22);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Hub de Negócios e Soluções Estratégicas em Mídia", 15, 27);
    doc.setTextColor(59, 130, 246);
    doc.text("nexomidiaerepresentacao.com.br", 15, 32);
  } else {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(emissorNome, 15, 25);
  }`;

code = code.replace(oldSimplificadaHeader, newSimplificadaHeader);

// 3. Update footer in gerarPdfPropostaSimplificada
const oldFooterSimplificada = `  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  doc.text(
    \`\${p.executivo?.nome || "Mídia.OS"} | (61) 9 8474-6857 | rafaelnexomidia@gmail.com\`,
    W / 2,
    H - 10,
    { align: "center" },
  );`;

const newFooterSimplificada = `  // Defesa Institucional / Termos da Organização
  if (emissorTermos && finalY < H - 35) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, finalY + 12, W - 30, 16, 1.5, 1.5, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("TERMOS & DEFESA INSTITUCIONAL:", 18, finalY + 17);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(emissorTermos, 18, finalY + 22, { maxWidth: W - 36 });
  }

  // Footer Dinâmico
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140);
  doc.text(
    \`\${p.executivo?.nome ? \`\${p.executivo.nome} | \` : ""}\${emissorNome}\${emissorSite ? \` | \${emissorSite}\` : ""}\`,
    W / 2,
    H - 10,
    { align: "center" },
  );`;

code = code.replace(oldFooterSimplificada, newFooterSimplificada);

fs.writeFileSync("src/lib/proposta-presentation.ts", code, "utf-8");
console.log("src/lib/proposta-presentation.ts updated successfully");
