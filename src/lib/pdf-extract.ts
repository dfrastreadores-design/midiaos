// Extrai texto de um PDF no navegador de forma 100% resiliente
// Suporta pdfjs-dist com isolamento de Worker Blob (evitando bloqueios de MIME type)
// e possui fallback binário inteligente caso o Worker ou o Canvas falhem.

function cleanPdfString(raw: string): string {
  return raw
    .replace(/\\([()\\\/bfnrt])/g, (_, c) => {
      const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" };
      return map[c] || c;
    })
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function extractStringsFromText(content: string): string[] {
  const chunks: string[] = [];

  // 1. Strings isoladas: (texto) Tj
  const singleRegex = /\(([\s\S]*?)\)\s*Tj/g;
  let match;
  while ((match = singleRegex.exec(content)) !== null) {
    const text = cleanPdfString(match[1]).trim();
    if (text) chunks.push(text);
  }

  // 2. Arrays de strings com kerning: [(Parte 1) -20 (Parte 2)] TJ
  const arrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
  while ((match = arrayRegex.exec(content)) !== null) {
    const innerRegex = /\(([\s\S]*?)\)/g;
    let innerMatch;
    const lineParts: string[] = [];
    while ((innerMatch = innerRegex.exec(match[1])) !== null) {
      const part = cleanPdfString(innerMatch[1]);
      if (part) lineParts.push(part);
    }
    if (lineParts.length > 0) {
      chunks.push(lineParts.join(""));
    }
  }

  return chunks;
}

async function decompressDeflateStream(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === "undefined") return null;

  try {
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    writer.write(bytes as any);
    writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder("latin1").decode(merged);
  } catch {
    return null;
  }
}

// Extrator binário de emergência para PDFs (executa se o pdfjs-dist falhar)
export async function extractTextFromPdfBufferDirectly(buf: ArrayBuffer): Promise<string> {
  const u8 = new Uint8Array(buf);
  const latin1Str = new TextDecoder("latin1").decode(u8);
  const extractedLines: string[] = [];

  // Localiza blocos de stream ... endstream
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;

  while ((streamMatch = streamPattern.exec(latin1Str)) !== null) {
    const streamStart = streamMatch.index + streamMatch[0].indexOf("\n") + 1;
    const streamContentStr = streamMatch[1];
    const streamBytes = u8.subarray(streamStart, streamStart + streamContentStr.length);

    let decompressed: string | null = null;
    if (streamBytes.length > 2 && (streamBytes[0] === 0x78 || streamBytes[0] === 0x1f)) {
      decompressed = await decompressDeflateStream(streamBytes);
    }

    const textToAnalyze = decompressed || streamContentStr;
    const foundStrings = extractStringsFromText(textToAnalyze);
    if (foundStrings.length > 0) {
      extractedLines.push(...foundStrings);
    }
  }

  // Se não encontrou textos estruturados em streams, busca textos legíveis gerais
  if (extractedLines.length === 0) {
    const generalMatches = latin1Str.match(/[A-Z0-9À-ÿ][A-Z0-9À-ÿ\s,.\-/:$%()]{4,}/gi) || [];
    extractedLines.push(...generalMatches.slice(0, 500));
  }

  return extractedLines.join("\n").trim();
}

export async function extractPdfText(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("extractPdfText só pode ser usado no navegador");
  }

  const buf = await file.arrayBuffer();

  try {
    const pdfjsLib = await import("pdfjs-dist");

    // Configura o worker de forma segura usando Blob URL para evitar restrições de MIME type
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default as string;
        try {
          const resp = await fetch(workerUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            const jsBlob = new Blob([blob], { type: "application/javascript" });
            pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(jsBlob);
          } else {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          }
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        }
      } catch (workerErr) {
        console.warn("[pdf-extract] Aviso ao configurar worker, usando modo fallback:", workerErr);
      }
    }

    const pdf = await pdfjsLib.getDocument({
      data: buf,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    let texto = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const linha = content.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ");
      texto += linha + "\n\n";
    }

    const resultado = texto.trim();
    if (resultado.length >= 10) {
      return resultado;
    }
  } catch (err) {
    console.warn("[pdf-extract] pdfjs-dist falhou, ativando extrator nativo de emergência:", err);
  }

  // Fallback nativo: descompactação e leitura direta do binário do PDF
  const fallbackText = await extractTextFromPdfBufferDirectly(buf);
  if (fallbackText && fallbackText.length >= 10) {
    return fallbackText;
  }

  // Último recurso: leitura pura de texto do arquivo
  try {
    const raw = await file.text();
    if (raw && raw.length >= 10) return raw;
  } catch {}

  throw new Error("Não foi possível extrair o texto do arquivo selecionado. Verifique se o arquivo não está corrompido ou protegido por senha.");
}
