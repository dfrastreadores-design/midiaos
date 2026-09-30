import { extractPdfText } from "@/lib/pdf-extract";
import { extractPptxText } from "@/lib/pptx-extract";

export type ParsedPropostaData = {
  cliente_id: string | null;
  cliente_avulso: string | null;
  agencia_id: string | null;
  campanha: string;
  valor_negociado: number;
  valor_tabela: number;
  validade: string;
  observacao: string;
  rawText: string;
};

export async function extractDocumentText(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") {
    return await extractPdfText(file);
  }
  if (ext === "pptx" || ext === "ppt") {
    return await extractPptxText(file);
  }
  throw new Error(
    "Formato não suportado. Por favor envie um arquivo PDF (.pdf) ou PowerPoint (.pptx).",
  );
}

function parseCurrencyBR(str: string): number {
  if (!str) return 0;
  // Limpa caracteres estranhos exceto dígitos, pontos e vírgulas
  const clean = str.trim().replace(/[^\d.,]/g, "");
  if (!clean) return 0;

  // Se tiver vírgula e ponto (ex: 12.500,00 ou 12,500.00)
  if (clean.includes(",") && clean.includes(".")) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      // 12.500,00 (padrão BR)
      return parseFloat(clean.replace(/\./g, "").replace(",", "."));
    } else {
      // 12,500.00 (padrão US)
      return parseFloat(clean.replace(/,/g, ""));
    }
  }

  // Apenas vírgula (ex: 12500,00)
  if (clean.includes(",")) {
    return parseFloat(clean.replace(",", "."));
  }

  // Apenas ponto (ex: 12500.00)
  return parseFloat(clean) || 0;
}

export function parsePropostaDocument(
  fileName: string,
  text: string,
  clientes: Array<{ id: string; razao_social?: string; nome_fantasia?: string | null }> = [],
  agencias: Array<{ id: string; razao_social?: string; nome_fantasia?: string | null }> = [],
): ParsedPropostaData {
  const lowerText = text.toLowerCase();
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  // 1. Tenta identificar o Cliente existente
  let matchedClienteId: string | null = null;
  let matchedClienteAvulso: string | null = null;

  for (const c of clientes) {
    const nome = (c.nome_fantasia || c.razao_social || "").trim().toLowerCase();
    if (nome.length >= 3) {
      if (lowerText.includes(nome) || baseName.toLowerCase().includes(nome)) {
        matchedClienteId = c.id;
        break;
      }
    }
  }

  // Se não encontrou cliente cadastrado, tenta capturar nome de cliente avulso no texto
  if (!matchedClienteId) {
    const matchCli = text.match(/(?:cliente|anunciante|empresa|para|a\/c)[:\s]+([^\n\r,;]{3,60})/i);
    if (matchCli && matchCli[1]) {
      const candidate = matchCli[1].trim();
      if (
        !candidate.toLowerCase().includes("proposta") &&
        !candidate.toLowerCase().includes("comercial")
      ) {
        matchedClienteAvulso = candidate;
      }
    }
  }

  // 2. Tenta identificar Agência existente
  let matchedAgenciaId: string | null = null;
  for (const a of agencias) {
    const nome = (a.nome_fantasia || a.razao_social || "").trim().toLowerCase();
    if (nome.length >= 3) {
      if (lowerText.includes(nome) || baseName.toLowerCase().includes(nome)) {
        matchedAgenciaId = a.id;
        break;
      }
    }
  }

  // 3. Tenta identificar Campanha
  let campanha = "";
  const matchCamp = text.match(/(?:campanha|projeto|título|proposta|tema)[:\s]+([^\n\r]{3,80})/i);
  if (matchCamp && matchCamp[1]) {
    campanha = matchCamp[1].trim();
  }

  // Se não achou na busca por regex, limpa o nome do arquivo
  if (!campanha || campanha.length < 3) {
    campanha = baseName
      .replace(/^proposta\s*(comercial)?\s*[-_]?\s*/i, "")
      .replace(/^apresenta[çc][aã]o\s*[-_]?\s*/i, "")
      .replace(/[-_]/g, " ")
      .trim();
  }
  if (!campanha) {
    campanha = "Proposta Comercial " + new Date().getFullYear();
  }

  // 4. Identificar Valores Financeiros
  const valoresEncontrados: number[] = [];

  // Procura por valores próximos a palavras-chave financeiras
  const keywords =
    /(?:investimento|total|valor\s*(?:negociado|líquido|bruto)?|preço)[:\s]*R?\$?\s*([\d\.,]{3,15})/gi;
  let matchVal;
  while ((matchVal = keywords.exec(text)) !== null) {
    const v = parseCurrencyBR(matchVal[1]);
    if (v > 0 && v < 100_000_000) {
      valoresEncontrados.push(v);
    }
  }

  // Se não achou com palavra-chave, procura por R$ valor
  if (valoresEncontrados.length === 0) {
    const generalRegex = /R\$\s*([\d\.,]{3,15})/gi;
    while ((matchVal = generalRegex.exec(text)) !== null) {
      const v = parseCurrencyBR(matchVal[1]);
      if (v > 50 && v < 100_000_000) {
        valoresEncontrados.push(v);
      }
    }
  }

  let valorNegociado = 0;
  let valorTabela = 0;

  if (valoresEncontrados.length > 0) {
    // Ordena do maior para o menor
    const sorted = [...valoresEncontrados].sort((a, b) => b - a);
    valorNegociado = sorted[0]; // maior valor ou valor principal
    valorTabela = sorted[0];
    if (sorted.length > 1 && sorted[0] > sorted[1]) {
      // Se tiver mais de um valor, o maior pode ser tabela e o outro negociado
      valorTabela = sorted[0];
      valorNegociado = sorted[1];
    }
  }

  // 5. Identificar Validade
  let validade = "";
  const matchDate = text.match(
    /(?:validade|v[aá]lido\s*at[eé]|vencimento)[:\s]*(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/i,
  );
  if (matchDate) {
    const [, dia, mes, ano] = matchDate;
    validade = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  } else {
    // Padrão: 10 dias úteis a partir de hoje
    const d = new Date();
    d.setDate(d.getDate() + 14);
    validade = d.toISOString().slice(0, 10);
  }

  // 6. Observações
  const cleanSnippet = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 10 && !l.startsWith("[Slide"))
    .slice(0, 6)
    .join("\n");

  const observacao =
    `Proposta importada a partir do arquivo "${fileName}".\n\nResumo extraído:\n${cleanSnippet}`.slice(
      0,
      1900,
    );

  return {
    cliente_id: matchedClienteId,
    cliente_avulso: matchedClienteAvulso,
    agencia_id: matchedAgenciaId,
    campanha,
    valor_negociado: valorNegociado,
    valor_tabela: valorTabela,
    validade,
    observacao,
    rawText: text,
  };
}
