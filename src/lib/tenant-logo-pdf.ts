// Carrega a logo do tenant (cadastrada no painel proprietário) como data URL,
// para uso em geradores de PDF (PI, propostas etc.).
import { getMyTenantBranding } from "@/lib/tenants.functions";
import { getLogoSignedUrl } from "@/lib/logo-url";

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

let cache: { value: string | null; at: number } | null = null;
const TTL = 10 * 60_000;

export async function getMyTenantLogoDataUrl(): Promise<string | null> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  try {
    const b = await getMyTenantBranding();
    const path = b?.logo_url;
    if (!path) {
      cache = { value: null, at: Date.now() };
      return null;
    }
    const signed = await getLogoSignedUrl(path);
    if (!signed) {
      cache = { value: null, at: Date.now() };
      return null;
    }
    const data = await urlToDataUrl(signed);
    cache = { value: data, at: Date.now() };
    return data;
  } catch {
    return null;
  }
}

// Prefere a logo da emissora (cadastrada em Configurações → Emissoras).
// Se não houver, faz fallback para a logo do tenant.
export async function getEmissoraOrTenantLogoDataUrl(
  emissoraLogoPath?: string | null,
): Promise<string | null> {
  if (emissoraLogoPath) {
    const signed = await getLogoSignedUrl(emissoraLogoPath);
    if (signed) {
      const data = await urlToDataUrl(signed);
      if (data) return data;
    }
  }
  return getMyTenantLogoDataUrl();
}
