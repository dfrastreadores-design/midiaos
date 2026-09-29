import { supabase } from "@/integrations/supabase/client";

const BUCKET = "proposta-templates";

/**
 * Converte um arquivo de imagem para JPEG de alta definição e faz upload para o storage.
 * Retorna a URL pública ou um fallback em data URL.
 */
export async function uploadSlideImage(
  fileOrBlob: File | Blob,
  templateId: string,
  index: number
): Promise<string> {
  const ext = "jpg";
  const path = `templates/${templateId}/slide-${index + 1}-${Date.now()}.${ext}`;

  try {
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, fileOrBlob, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (!upErr) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (e) {
    console.warn("Storage upload fallback:", e);
  }

  // Fallback: converte para dataURL para garantir funcionamento imediato mesmo sem bucket configurado
  return await blobToDataUrl(fileOrBlob);
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
 * Extrai cada página de um arquivo PDF como uma imagem de slide em alta resolução (1920x1080 aprox).
 */
export async function extrairSlidesDePdf(
  pdfFile: File,
  onProgress?: (atual: number, total: number) => void
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
    // Escala para gerar aproximadamente 1920px de largura
    const initialViewport = page.getViewport({ scale: 1 });
    const scale = Math.max(1.5, 1920 / (initialViewport.width || 1000));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));

    slides.push({
      index: i - 1,
      dataUrl,
      blob,
    });
  }

  return slides;
}
