import * as XLSX from "xlsx";
import { extractPdfText } from "./pdf-extract";
import { formatCNPJ, onlyDigits } from "./cnpj";

export type DocumentoProcessado = {
  tipo: "pdf" | "excel" | "csv" | "outro";
  nomeArquivo: string;
  tamanhoBytes: number;
  textoCompleto: string;
  dadosTabela?: Record<string, any>[];
  parceiroDetectado?: {
    nome?: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
  };
};

/**
 * Lê e analisa arquivos PDF, Excel (.xlsx, .xls) ou CSV de ponta a ponta.
 * Extrai texto contínuo, tabelas tabulares e busca pistas de metadados
 * como CNPJ, telefones, e-mails e nome do parceiro comercial.
 */
export async function processarArquivoImportacao(file: File): Promise<DocumentoProcessado> {
  const nomeLower = file.name.toLowerCase();
  let texto = "";
  let tipo: DocumentoProcessado["tipo"] = "outro";
  const dadosTabela: Record<string, any>[] = [];

  if (nomeLower.endsWith(".pdf")) {
    tipo = "pdf";
    texto = await extractPdfText(file);
  } else if (nomeLower.endsWith(".xlsx") || nomeLower.endsWith(".xls") || nomeLower.endsWith(".csv")) {
    tipo = nomeLower.endsWith(".csv") ? "csv" : "excel";
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parts: string[] = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const csv = XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
        if (rows.length > 0) {
          dadosTabela.push(...rows);
        }
        parts.push(`=== ABA: ${sheetName} ===\n${csv}`);
      }
      texto = parts.join("\n\n");
    } catch (err: any) {
      console.warn("Falha ao abrir planilha com XLSX, lendo como texto simples:", err?.message);
      texto = await file.text();
    }
  } else {
    texto = await file.text();
  }

  // 1. Regex para detecção de CNPJ (com máscara ou 14 dígitos precedidos por CNPJ)
  let cnpjDetectado: string | undefined;
  const cnpjFormattedMatch = texto.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  if (cnpjFormattedMatch) {
    cnpjDetectado = cnpjFormattedMatch[0];
  } else {
    const cnpjRawMatch = texto.match(/(?:cnpj[:\s=]*)([0-9]{14})/i);
    if (cnpjRawMatch) {
      cnpjDetectado = formatCNPJ(cnpjRawMatch[1]);
    }
  }

  // 2. Regex para e-mail comercial
  const emailMatch = texto.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const emailDetectado = emailMatch ? emailMatch[0] : undefined;

  // 3. Regex para telefone / WhatsApp
  const telMatch = texto.match(
    /(?:(?:whatsapp|contato|fone|tel|celular)[:\s]*)?\(?\b([1-9]{2})\)?\s*(9?\d{4})[-.\s]?(\d{4})\b/i,
  );
  const telDetectado = telMatch ? `(${telMatch[1]}) ${telMatch[2]}-${telMatch[3]}` : undefined;

  // 4. Extrai sugestão de nome a partir do nome do arquivo (ex: "Midia Kit - TV Cars 2026.pdf" -> "TV Cars 2026")
  let nomeSugerido: string | undefined;
  const cleanFileName = file.name
    .replace(/\.(pdf|xlsx|xls|csv)$/i, "")
    .replace(/midia[-_\s]*kit|apresentacao|tabela[-_\s]*de[-_\s]*precos|tabela|tarifario|proposta/gi, "")
    .replace(/[-_]/g, " ")
    .trim();
  if (cleanFileName.length >= 3 && cleanFileName.length <= 50) {
    nomeSugerido = cleanFileName;
  }

  return {
    tipo,
    nomeArquivo: file.name,
    tamanhoBytes: file.size,
    textoCompleto: texto,
    dadosTabela: dadosTabela.length > 0 ? dadosTabela : undefined,
    parceiroDetectado: {
      nome: nomeSugerido,
      cnpj: cnpjDetectado,
      email: emailDetectado,
      telefone: telDetectado,
    },
  };
}
