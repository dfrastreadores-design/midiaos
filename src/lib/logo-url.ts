// Helper para o bucket privado `client-logos`.
// `logo_url` no banco pode ser:
//  - um path puro (ex.: "abc.png") — formato novo após bucket virar privado
//  - uma publicUrl antiga (".../client-logos/abc.png") — dados legados
// Em ambos os casos extraímos o path e geramos uma signed URL temporária.
import { supabase } from "@/integrations/supabase/client";

export function logoStoragePath(stored: string | null | undefined): string | null {
  if (!stored || typeof stored !== "string") return null;
  const s = stored.trim();
  if (!s || s === "undefined" || s === "null" || s === "[object Object]") return null;

  const marker = "/client-logos/";
  const i = s.indexOf(marker);
  if (i >= 0) {
    const extracted = s.slice(i + marker.length).split("?")[0].trim();
    return extracted && extracted !== "undefined" && extracted !== "null" ? extracted : null;
  }

  // Se já for uma URL absoluta externa ou data URI, não é um path do storage
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:") || s.startsWith("//")) {
    return null;
  }

  return s;
}

export async function getLogoSignedUrl(
  stored: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!stored || typeof stored !== "string") return null;
  const s = stored.trim();
  if (!s || s === "undefined" || s === "null" || s === "[object Object]") return null;

  // Se for URL externa completa ou Data URI, usa diretamente sem consultar o storage
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:") || s.startsWith("//")) {
    return s;
  }

  const rawPath = logoStoragePath(s);
  if (!rawPath) return null;
  const cleanPath = rawPath.replace(/^\/+/, "").trim();
  if (!cleanPath || cleanPath === "undefined" || cleanPath === "null") return null;

  try {
    const { data, error } = await supabase.storage
      .from("client-logos")
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }

    // Fallback defensivo para o bucket parceiro público caso não encontre no client-logos
    const { data: pubData } = supabase.storage.from("partner-logos").getPublicUrl(cleanPath);
    return pubData?.publicUrl || null;
  } catch {
    return null;
  }
}

