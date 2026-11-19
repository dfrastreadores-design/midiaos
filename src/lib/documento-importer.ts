import * as XLSX from "xlsx";
import JSZip from "jszip";
import { extractPdfText, extractImagesFromPdfBuffer } from "./pdf-extract";
import { formatCNPJ, onlyDigits } from "./cnpj";
import { uint8ArrayToBase64, getMimeTypeFromExt, detectMimeTypeFromBytes } from "./binary-image-utils";

export interface ImagemExtraida {
  id: string;
  nomeArquivo: string;
  dataUrl: string; // "data:image/jpeg;base64,..."
  tipoMime: string;
  tamanhoBytes: number;
  slideOuPagina?: number;
  contextoTexto?: string;
  largura?: number;
  altura?: number;
  produtoIdAssociado?: string | null;
}

export type DocumentoProcessado = {
  tipo: "pdf" | "excel" | "csv" | "pptx" | "docx" | "imagem" | "outro";
  nomeArquivo: string;
  tamanhoBytes: number;
  textoCompleto: string;
  dadosTabela?: Record<string, any>[];
  imagensExtraidas: ImagemExtraida[];
  parceiroDetectado?: {
    nome?: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
    site?: string;
    cidade?: string;
    uf?: string;
  };
  totalPaginasOuSlides?: number;
};

/**
 * Lê e analisa arquivos comerciais de parceiros: PDF, PowerPoint (.pptx),
 * Word (.docx), Excel (.xlsx, .xls, .csv) e Imagens (.png, .jpg, .webp).
 *
 * Extrai texto completo, tabelas, metadados de parceiro e fotografias/imagens
 * originais embutidas em alta resolução com associação a slides/páginas.
 */
export async function processarArquivoImportacao(file: File): Promise<DocumentoProcessado> {
  const nomeLower = file.name.toLowerCase();
  let texto = "";
  let tipo: DocumentoProcessado["tipo"] = "outro";
  const dadosTabela: Record<string, any>[] = [];
  const imagensExtraidas: ImagemExtraida[] = [];
  let totalPaginasOuSlides: number | undefined;

  // 1. PDF
  if (nomeLower.endsWith(".pdf")) {
    tipo = "pdf";
    try {
      texto = await extractPdfText(file);
    } catch (e: any) {
      console.warn("[documento-importer] Aviso ao extrair texto do PDF:", e);
      texto = `Mídia Kit PDF: ${file.name}`;
    }

    try {
      const buf = await file.arrayBuffer();
      const imgs = await extractImagesFromPdfBuffer(buf, file.name);
      if (imgs.length > 0) {
        imagensExtraidas.push(...imgs);
      }
    } catch (imgErr) {
      console.warn("[documento-importer] Aviso ao extrair imagens do PDF:", imgErr);
    }
  }

  // 2. POWERPOINT (.pptx)
  else if (nomeLower.endsWith(".pptx")) {
    tipo = "pptx";
    try {
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);

      // Localiza todos os slides (ppt/slides/slide{N}.xml)
      const slideFiles: { num: number; path: string }[] = [];
      zip.forEach((relPath) => {
        const m = relPath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
        if (m) {
          slideFiles.push({ num: parseInt(m[1], 10), path: relPath });
        }
      });
      slideFiles.sort((a, b) => a.num - b.num);
      totalPaginasOuSlides = slideFiles.length;

      // Mapeia relacionamentos de cada slide com imagens em ppt/media/
      const slideImageMap = new Map<number, string[]>();
      for (const sf of slideFiles) {
        const relPath = `ppt/slides/_rels/slide${sf.num}.xml.rels`;
        const relFile = zip.file(relPath);
        if (relFile) {
          try {
            const relXml = await relFile.async("text");
            const targetMatches = relXml.matchAll(/Target="(?:\.\.\/)*media\/([^"]+)"/gi);
            const mediaList: string[] = [];
            for (const tm of targetMatches) {
              if (tm[1]) mediaList.push(tm[1].toLowerCase());
            }
            if (mediaList.length > 0) {
              slideImageMap.set(sf.num, mediaList);
            }
          } catch {}
        }
      }

      // Extrai imagens embutidas em ppt/media/*
      const mediaFiles: { name: string; zipPath: string }[] = [];
      zip.forEach((relPath) => {
        if (/^ppt\/media\/[^/]+$/i.test(relPath)) {
          const parts = relPath.split("/");
          mediaFiles.push({ name: parts[parts.length - 1], zipPath: relPath });
        }
      });

      // Extrai cada imagem binária e converte para Data URI
      const extraidasMap = new Map<string, ImagemExtraida>();
      let imgIndex = 0;
      for (const mf of mediaFiles) {
        try {
          const fileObj = zip.file(mf.zipPath);
          if (!fileObj) continue;
          const u8 = await fileObj.async("uint8array");
          // Ignora imagens minúsculas (ícones de interface, bullets de menos de 3KB)
          if (u8.length < 3000) continue;

          imgIndex++;
          const ext = mf.name.split(".").pop() || "jpg";
          const mime = detectMimeTypeFromBytes(u8) || getMimeTypeFromExt(ext);
          const b64 = uint8ArrayToBase64(u8);

          // Verifica se pertence a um slide específico
          let assignedSlide: number | undefined;
          for (const [sNum, targets] of slideImageMap.entries()) {
            if (targets.includes(mf.name.toLowerCase())) {
              assignedSlide = sNum;
              break;
            }
          }

          const imgObj: ImagemExtraida = {
            id: `pptx-img-${Date.now()}-${imgIndex}`,
            nomeArquivo: mf.name,
            dataUrl: `data:${mime};base64,${b64}`,
            tipoMime: mime,
            tamanhoBytes: u8.length,
            slideOuPagina: assignedSlide,
          };
          extraidasMap.set(mf.name.toLowerCase(), imgObj);
          imagensExtraidas.push(imgObj);
        } catch (imgErr) {
          console.warn("[documento-importer] Erro ao extrair imagem do PPTX:", mf.name, imgErr);
        }
      }

      // Lê texto de cada slide estruturado
      const slideTexts: string[] = [];
      for (const sf of slideFiles) {
        try {
          const sFile = zip.file(sf.path);
          if (!sFile) continue;
          const sXml = await sFile.async("text");

          // Extrai nós de texto <a:t>
          const tMatches = sXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
          const words = tMatches.map((m) => m.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
          const slideCleanText = words.join(" ");

          slideTexts.push(`=== SLIDE ${sf.num} ===\n${slideCleanText}`);

          // Associa texto do slide às imagens do mesmo slide
          const targets = slideImageMap.get(sf.num) || [];
          for (const t of targets) {
            const img = extraidasMap.get(t);
            if (img && !img.contextoTexto) {
              img.contextoTexto = slideCleanText.slice(0, 300);
            }
          }
        } catch {}
      }

      texto = slideTexts.join("\n\n");
    } catch (err: any) {
      console.warn("[documento-importer] Falha ao processar PPTX via JSZip:", err?.message);
      texto = `Apresentação PPTX: ${file.name}`;
    }
  }

  // 3. WORD (.docx)
  else if (nomeLower.endsWith(".docx")) {
    tipo = "docx";
    try {
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);

      // Lê documento principal word/document.xml
      const docXmlFile = zip.file("word/document.xml");
      if (docXmlFile) {
        const docXml = await docXmlFile.async("text");
        // Extrai parágrafos <w:p> e textos <w:t>
        const pMatches = docXml.match(/<w:p[^>]*>([\s\S]*?)<\/w:p>/gi) || [];
        const lines = pMatches
          .map((p) => {
            const tMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
            return tMatches.map((m) => m.replace(/<[^>]+>/g, "")).join("");
          })
          .map((l) => l.trim())
          .filter(Boolean);

        texto = lines.join("\n");
      }

      // Extrai imagens de word/media/*
      let imgDocIndex = 0;
      zip.forEach(async (relPath, fileObj) => {
        if (/^word\/media\/[^/]+$/i.test(relPath)) {
          try {
            const u8 = await fileObj.async("uint8array");
            if (u8.length < 3000) return;
            imgDocIndex++;
            const name = relPath.split("/").pop() || "foto.jpg";
            const ext = name.split(".").pop() || "jpg";
            const mime = detectMimeTypeFromBytes(u8) || getMimeTypeFromExt(ext);
            const b64 = uint8ArrayToBase64(u8);
            imagensExtraidas.push({
              id: `docx-img-${Date.now()}-${imgDocIndex}`,
              nomeArquivo: name,
              dataUrl: `data:${mime};base64,${b64}`,
              tipoMime: mime,
              tamanhoBytes: u8.length,
            });
          } catch {}
        }
      });
    } catch (err: any) {
      console.warn("[documento-importer] Falha ao processar DOCX:", err?.message);
      texto = `Documento DOCX: ${file.name}`;
    }
  }

  // 4. PLANILHAS EXCEL (.xlsx, .xls, .csv)
  else if (nomeLower.endsWith(".xlsx") || nomeLower.endsWith(".xls") || nomeLower.endsWith(".csv")) {
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
  }

  // 5. IMAGENS (.png, .jpg, .jpeg, .webp)
  else if (
    nomeLower.endsWith(".png") ||
    nomeLower.endsWith(".jpg") ||
    nomeLower.endsWith(".jpeg") ||
    nomeLower.endsWith(".webp")
  ) {
    tipo = "imagem";
    try {
      const buf = await file.arrayBuffer();
      const u8 = new Uint8Array(buf);
      const ext = nomeLower.split(".").pop() || "jpg";
      const mime = detectMimeTypeFromBytes(u8) || getMimeTypeFromExt(ext);
      const b64 = uint8ArrayToBase64(u8);

      imagensExtraidas.push({
        id: `img-direta-${Date.now()}`,
        nomeArquivo: file.name,
        dataUrl: `data:${mime};base64,${b64}`,
        tipoMime: mime,
        tamanhoBytes: file.size,
      });

      texto = `Fotografia Comercial / Ponto de Mídia: ${file.name} (${Math.round(file.size / 1024)} KB)`;
    } catch (err: any) {
      console.warn("[documento-importer] Falha ao processar imagem:", err?.message);
    }
  }

  // 6. OUTROS FORMATOS
  else {
    try {
      texto = await file.text();
    } catch {
      texto = `Arquivo Comercial: ${file.name}`;
    }
  }

  // DETECÇÃO DE METADADOS COMERCIAIS E DO PARCEIRO
  // 1. CNPJ
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

  // 2. E-mail comercial
  const emailMatch = texto.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const emailDetectado = emailMatch ? emailMatch[0] : undefined;

  // 3. Telefone / WhatsApp
  const telMatch = texto.match(
    /(?:(?:whatsapp|contato|fone|tel|celular)[:\s]*)?\(?\b([1-9]{2})\)?\s*(9?\d{4})[-.\s]?(\d{4})\b/i
  );
  const telDetectado = telMatch ? `(${telMatch[1]}) ${telMatch[2]}-${telMatch[3]}` : undefined;

  // 4. Site / URL
  const siteMatch = texto.match(/\bhttps?:\/\/(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s"']*)?/i);
  const siteDetectado = siteMatch ? siteMatch[0] : undefined;

  // 5. Cidade e UF
  let cidadeDetectada: string | undefined;
  let ufDetectada: string | undefined;
  const ufMatch = texto.match(/\b(?:DF|SP|RJ|MG|GO|PR|SC|RS|BA|PE|CE|ES|MT|MS|AM|PA)\b/);
  if (ufMatch) {
    ufDetectada = ufMatch[0];
  }
  if (/águas claras|aguas claras/i.test(texto)) {
    cidadeDetectada = "Águas Claras";
    ufDetectada = ufDetectada || "DF";
  } else if (/taguatinga/i.test(texto)) {
    cidadeDetectada = "Taguatinga";
    ufDetectada = ufDetectada || "DF";
  } else if (/bras[ií]lia/i.test(texto)) {
    cidadeDetectada = "Brasília";
    ufDetectada = ufDetectada || "DF";
  } else if (/s[aã]o paulo/i.test(texto)) {
    cidadeDetectada = "São Paulo";
    ufDetectada = ufDetectada || "SP";
  } else if (/rio de janeiro/i.test(texto)) {
    cidadeDetectada = "Rio de Janeiro";
    ufDetectada = ufDetectada || "RJ";
  } else if (/goi[aâ]nia/i.test(texto)) {
    cidadeDetectada = "Goiânia";
    ufDetectada = ufDetectada || "GO";
  } else if (/belo horizonte/i.test(texto)) {
    cidadeDetectada = "Belo Horizonte";
    ufDetectada = ufDetectada || "MG";
  } else if (/curitiba/i.test(texto)) {
    cidadeDetectada = "Curitiba";
    ufDetectada = ufDetectada || "PR";
  }

  // 6. Sugestão de nome a partir do nome do arquivo
  let nomeSugerido: string | undefined;
  const cleanFileName = file.name
    .replace(/\.(pdf|pptx|docx|xlsx|xls|csv|png|jpg|jpeg|webp)$/i, "")
    .replace(/midia[-_\s]*kit|apresentacao|tabela[-_\s]*de[-_\s]*precos|tabela|tarifario|proposta|midia/gi, "")
    .replace(/[-_]/g, " ")
    .trim();
  if (cleanFileName.length >= 3 && cleanFileName.length <= 60) {
    nomeSugerido = cleanFileName;
  }

  return {
    tipo,
    nomeArquivo: file.name,
    tamanhoBytes: file.size,
    textoCompleto: texto,
    dadosTabela: dadosTabela.length > 0 ? dadosTabela : undefined,
    imagensExtraidas,
    totalPaginasOuSlides,
    parceiroDetectado: {
      nome: nomeSugerido,
      cnpj: cnpjDetectado,
      email: emailDetectado,
      telefone: telDetectado,
      site: siteDetectado,
      cidade: cidadeDetectada,
      uf: ufDetectada,
    },
  };
}
