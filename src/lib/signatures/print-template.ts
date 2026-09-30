import type { DocumentoAssinatura, Signatario } from "@/types/assinaturas.types";

/**
 * Gera o HTML formal para impressão de folha de rosto / quadro oficial de assinaturas físicas.
 * O usuário pode imprimir diretamente pelo navegador ou salvar como PDF.
 */
export function gerarHtmlDocumentoImpressao(
  documento: DocumentoAssinatura,
  signatarios: Signatario[],
  empresaInfo: {
    nome: string;
    cnpj?: string;
    logoSrc?: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
  }
): string {
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const signatariosHtml = signatarios
    .map(
      (s) => `
    <div style="flex: 1 1 45%; min-width: 280px; margin-bottom: 35px; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 6px; page-break-inside: avoid;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #475569; margin-bottom: 8px;">
        ${s.tipo_participante.toUpperCase()} — MÉTODO: ${s.metodo === "manual" ? "ASSINATURA MANUAL (FÍSICA)" : "ASSINATURA DIGITAL"}
      </div>
      <div style="height: 60px; border-bottom: 1.5px solid #0f172a; margin-bottom: 10px; display: flex; align-items: flex-end; justify-content: center;">
        <span style="font-size: 10px; color: #94a3b8; font-style: italic;">(Espaço reservado para rubrica / assinatura)</span>
      </div>
      <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${s.nome}</div>
      ${s.cpf_cnpj ? `<div style="font-size: 12px; color: #334155;"><strong>CPF/CNPJ:</strong> ${s.cpf_cnpj}</div>` : ""}
      ${s.cargo ? `<div style="font-size: 12px; color: #334155;"><strong>Cargo:</strong> ${s.cargo}</div>` : ""}
      ${s.empresa ? `<div style="font-size: 12px; color: #334155;"><strong>Empresa:</strong> ${s.empresa}</div>` : ""}
      <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
        Data da Assinatura: _____ / _____ / 20____
      </div>
    </div>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Documento para Assinatura Manual — ${documento.titulo}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 30px;
      background-color: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .logo-container {
      max-width: 180px;
    }
    .company-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-meta {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    .doc-title {
      font-size: 18px;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f1f5f9;
      border-radius: 4px;
    }
    .info-box {
      border: 1px solid #e2e8f0;
      background-color: #f8fafc;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 25px;
      font-size: 12px;
    }
    .signatures-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: space-between;
      margin-top: 20px;
    }
    .witness-section {
      margin-top: 30px;
      border-top: 1px solid #cbd5e1;
      padding-top: 20px;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .btn-print {
      background-color: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir este Documento</button>
  </div>

  <div class="header">
    <div>
      <div class="company-title">${empresaInfo.nome}</div>
      ${empresaInfo.cnpj ? `<div style="font-size: 12px; color: #64748b;">CNPJ: ${empresaInfo.cnpj}</div>` : ""}
      ${empresaInfo.endereco ? `<div style="font-size: 11px; color: #64748b;">${empresaInfo.endereco}</div>` : ""}
    </div>
    <div class="doc-meta">
      <div><strong>Documento:</strong> ${documento.numero || "S/N"}</div>
      <div><strong>Versão:</strong> v${documento.versao}</div>
      <div><strong>Data de Emissão:</strong> ${dataHoje}</div>
      <div><strong>Identificador Seguro:</strong> ${documento.id.slice(0, 12)}...</div>
    </div>
  </div>

  <div class="doc-title">${documento.titulo}</div>

  <div class="info-box">
    <strong>INSTRUÇÕES PARA ASSINATURA MANUAL (COLETA FÍSICA):</strong><br/>
    1. Imprima este documento em via legível.<br/>
    2. Cada signatário deve apor sua rubrica no espaço indicado e preencher a data.<br/>
    3. Após a coleta de todas as assinaturas físicas, digitalize ou fotografe as páginas com nitidez.<br/>
    4. Faça o upload do arquivo assinado (PDF, JPG ou PNG) no Mídia OS para conferência e validação documental.
  </div>

  ${
    documento.descricao
      ? `<div style="font-size: 13px; margin-bottom: 25px; color: #334155; line-height: 1.6;">
          <strong>Objeto / Descrição:</strong><br/>
          ${documento.descricao.replace(/\n/g, "<br/>")}
        </div>`
      : ""
  }

  <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #0f172a; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">
    Quadro Oficial de Signatários
  </div>

  <div class="signatures-grid">
    ${signatariosHtml}
  </div>

  <div class="witness-section">
    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 15px;">
      Testemunhas (Opcional / Quando Aplicável)
    </div>
    <div style="display: flex; gap: 30px; justify-content: space-between;">
      <div style="flex: 1; border-top: 1px solid #0f172a; padding-top: 8px;">
        <div style="font-size: 11px; color: #475569;">1. Nome: ____________________________________</div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">CPF: __________________ Ass: ________________</div>
      </div>
      <div style="flex: 1; border-top: 1px solid #0f172a; padding-top: 8px;">
        <div style="font-size: 11px; color: #475569;">2. Nome: ____________________________________</div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">CPF: __________________ Ass: ________________</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>Gerado via Mídia OS — Módulo Universal de Assinaturas</div>
    <div>Documento ID: ${documento.id} | Hash: SHA-256</div>
    <div>Página 1 de 1</div>
  </div>
</body>
</html>
  `;
}
