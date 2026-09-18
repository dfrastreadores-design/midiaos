// Extrai texto de um PDF no navegador usando pdfjs-dist
// IMPORTANTE: pdfjs-dist usa DOMMatrix no escopo do módulo, então não pode
// ser importado durante SSR. Carregamos dinamicamente apenas no cliente.

export async function extractPdfText(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("extractPdfText só pode ser usado no navegador");
  }
  const pdfjsLib = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as string;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let texto = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const linha = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    texto += linha + "\n\n";
  }
  return texto.trim();
}
