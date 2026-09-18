// Helper para o bucket privado `client-logos`.
// `logo_url` no banco pode ser:
//  - um path puro (ex.: "abc.png") — formato novo após bucket virar privado
//  - uma publicUrl antiga (".../client-logos/abc.png") — dados legados
// Em ambos os casos extraímos o path e geramos uma signed URL temporária.
import { supabase } from "@/integrations/supabase/client";

export function logoStoragePath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const marker = "/client-logos/";
  const i = stored.indexOf(marker);
  if (i >= 0) return stored.slice(i + marker.length).split("?")[0];
  // já é um path puro
  if (stored.startsWith("http")) return null;
  return stored;
}

export async function getLogoSignedUrl(
  stored: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const path = logoStoragePath(stored);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("client-logos")
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
