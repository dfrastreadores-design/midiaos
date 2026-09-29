import { supabase } from "@/integrations/supabase/client";

export function isFullUrl(pathOrUrl: string | null | undefined): boolean {
  if (!pathOrUrl) return false;
  return (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("data:") ||
    pathOrUrl.startsWith("blob:")
  );
}

/**
 * Obtém a URL resolvida de uma foto de produto armazenada.
 * Se já for uma URL completa, retorna imediatamente.
 * Se for um path de storage, tenta obter publicUrl do bucket `produto-fotos`
 * ou signedUrl caso esteja em um bucket privado como `client-logos`.
 */
export async function getProdutoFotoUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  const trimmed = stored.trim();
  if (!trimmed) return null;

  if (isFullUrl(trimmed)) {
    return trimmed;
  }

  // Se já contiver o marcador de bucket da URL do Supabase, normaliza
  if (trimmed.includes("/produto-fotos/")) {
    const p = trimmed.split("/produto-fotos/")[1]?.split("?")[0];
    if (p) stored = p;
  }

  // Tenta resolver como URL pública de produto-fotos
  try {
    const { data } = supabase.storage.from("produto-fotos").getPublicUrl(stored);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  } catch {
    // continua fallback
  }

  // Fallback para signed url temporária
  try {
    const { data: signed } = await supabase.storage
      .from("produto-fotos")
      .createSignedUrl(stored, 86400);
    if (signed?.signedUrl) return signed.signedUrl;
  } catch {
    // continua fallback
  }

  // Fallback secundário para client-logos
  try {
    const { data: signedLogo } = await supabase.storage
      .from("client-logos")
      .createSignedUrl(stored, 86400);
    if (signedLogo?.signedUrl) return signedLogo.signedUrl;
  } catch {
    // falhou fallback
  }

  return null;
}

/**
 * Faz upload de uma foto de produto (JPG, PNG, WEBP) de até 8MB.
 * Prioriza o bucket dedicado 'produto-fotos', com fallback seguro para 'client-logos'.
 */
export async function uploadProdutoFoto(file: File): Promise<{ url: string; path: string }> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("A foto deve ter no máximo 8MB");
  }

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Formato não suportado. Por favor, envie uma imagem JPG, PNG, WEBP ou GIF.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `prod-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  // 1. Tenta gravar no bucket dedicado 'produto-fotos'
  let upRes = await supabase.storage.from("produto-fotos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  // 2. Se o bucket ainda não existir, tenta em 'client-logos' como fallback seguro
  if (
    upRes.error &&
    (upRes.error.message.toLowerCase().includes("not found") ||
      upRes.error.message.toLowerCase().includes("bucket"))
  ) {
    upRes = await supabase.storage.from("client-logos").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upRes.error) throw new Error(`Falha no upload: ${upRes.error.message}`);

    const { data: signed } = await supabase.storage
      .from("client-logos")
      .createSignedUrl(path, 86400 * 30);
    return { url: signed?.signedUrl || path, path };
  }

  if (upRes.error) {
    throw new Error(`Falha no upload da foto: ${upRes.error.message}`);
  }

  const { data: pubData } = supabase.storage.from("produto-fotos").getPublicUrl(path);
  return { url: pubData?.publicUrl || path, path };
}
