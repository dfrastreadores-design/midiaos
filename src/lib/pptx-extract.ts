// Extrai texto de apresentações PowerPoint (.pptx) no navegador usando jszip
export async function extractPptxText(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("extractPptxText só pode ser usado no navegador");
  }

  const JSZipModule = await import("jszip");
  const JSZip = (JSZipModule as any).default || JSZipModule;
  const zip = new JSZip();
  const loaded = await zip.loadAsync(file);

  let fullText = "";
  const slideFiles = Object.keys(loaded.files)
    .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
      return numA - numB;
    });

  for (let i = 0; i < slideFiles.length; i++) {
    const slidePath = slideFiles[i];
    const xml = await loaded.files[slidePath].async("text");
    // Extrai o texto contido nas tags <a:t>...</a:t>
    const matches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/gs);
    if (matches && matches.length > 0) {
      const slideLines = matches
        .map((m: any) =>
          m
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim(),
        )
        .filter(Boolean);

      if (slideLines.length > 0) {
        fullText += `[Slide ${i + 1}]\n` + slideLines.join(" ") + "\n\n";
      }
    }
  }

  return fullText.trim();
}
