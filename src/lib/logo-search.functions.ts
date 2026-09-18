import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LogoResultado = {
  nome: string;
  dominio: string;
  icone: string; // url
};

export const buscarLogos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const q = encodeURIComponent(data.query.trim());
    const res = await fetch(`https://api.brandfetch.io/v2/search/${q}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Falha na busca de logos: ${res.status}`);
    const json = (await res.json()) as Array<{
      name?: string;
      domain?: string;
      icon?: string;
      brandId?: string;
    }>;
    const results: LogoResultado[] = (json ?? [])
      .filter((b) => b.domain)
      .slice(0, 12)
      .map((b) => ({
        nome: b.name || b.domain || "",
        dominio: b.domain!,
        // fallback para Clearbit caso icon do brandfetch falhe
        icone: b.icon || `https://logo.clearbit.com/${b.domain}`,
      }));
    return { results };
  });

const ALLOWED_LOGO_HOSTS = new Set([
  "logo.clearbit.com",
  "cdn.brandfetch.io",
  "asset.brandfetch.io",
  "brandfetch.io",
  "api.brandfetch.io",
]);

export const baixarLogoDataUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ url: z.string().url().max(1000) }).parse(d),
  )
  .handler(async ({ data }) => {
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      throw new Error("URL inválida");
    }
    if (parsed.protocol !== "https:") throw new Error("Somente https é permitido");
    const host = parsed.hostname.toLowerCase();
    const allowed = Array.from(ALLOWED_LOGO_HOSTS).some(
      (h) => host === h || host.endsWith("." + h),
    );
    if (!allowed) throw new Error("Domínio não permitido para download de logo");

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), { signal: ac.signal, redirect: "follow" });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) throw new Error(`Falha ao baixar logo: ${res.status}`);
    const ct = res.headers.get("content-type") || "image/png";
    if (!ct.startsWith("image/")) throw new Error("Conteúdo não é uma imagem");
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 5 * 1024 * 1024) throw new Error("Logo maior que 5MB");
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return { dataUrl: `data:${ct};base64,${b64}` };
  });

