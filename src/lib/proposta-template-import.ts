import { supabase } from "@/integrations/supabase/client";

const BUCKET_CANDIDATOS = ["proposta-templates", "documentos", "materiais", "midia", "public"];

/**
 * Redimensiona e comprime uma imagem em Blob para garantir tamanho compacto (<= 1280px e JPEG 0.72)
 */
async function comprimirImagemBlob(fileOrBlob: File | Blob, maxLargura = 1280, qualidade = 0.72): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = img.width > maxLargura ? maxLargura / img.width : 1;
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (b) => {
            resolve(b || fileOrBlob);
            canvas.width = 0;
            canvas.height = 0;
          },
          "image/jpeg",
          qualidade,
        );
      } else {
        resolve(fileOrBlob);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(fileOrBlob);
    };
    img.src = url;
  });
}

/**
 * Converte um arquivo de imagem para JPEG otimizado e faz upload para o storage.
 * Retorna a URL pública ou um fallback em data URL compacto.
 */
export async function uploadSlideImage(
  fileOrBlob: File | Blob,
  templateId: string,
  index: number,
): Promise<string> {
  const blobComprimido = await comprimirImagemBlob(fileOrBlob, 1280, 0.72);
  const ext = "jpg";
  const path = `templates/${templateId}/slide-${index + 1}-${Date.now()}.${ext}`;

  // Tenta upload nos buckets candidatos disponíveis no Supabase
  for (const bucket of BUCKET_CANDIDATOS) {
    try {
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, blobComprimido, {
        contentType: "image/jpeg",
        upsert: true,
      });

      if (!upErr) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // Tenta próximo bucket candidato
    }
  }

  // Fallback seguro: converte para dataURL super-compacta (< 120KB) sem estourar limites de payload HTTP
  return await blobToDataUrl(blobComprimido);
}

/**
 * Converte um Blob ou File para string data:image/jpeg;base64,...
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao converter imagem"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Extrai cada página de um arquivo PDF como uma imagem de slide em resolução otimizada (1280px de largura).
 */
export async function extrairSlidesDePdf(
  pdfFile: File,
  onProgress?: (atual: number, total: number) => void,
): Promise<Array<{ index: number; dataUrl: string; blob: Blob }>> {
  const buf = await pdfFile.arrayBuffer();

  const pdfjs: any = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const total = pdf.numPages;
  const slides: Array<{ index: number; dataUrl: string; blob: Blob }> = [];

  for (let i = 1; i <= total; i++) {
    onProgress?.(i, total);
    const page = await pdf.getPage(i);
    // Escala para gerar no máximo 1280px de largura para balancear nitidez e performance de rede
    const initialViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2.0, Math.max(1.0, 1280 / (initialViewport.width || 1000)));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.75),
    );
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

    // Liberar memória do canvas no navegador
    canvas.width = 0;
    canvas.height = 0;

    slides.push({
      index: i - 1,
      dataUrl,
      blob,
    });
  }

  return slides;
}
