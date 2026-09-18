import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyTenantBranding } from "@/lib/tenants.functions";
import { getLogoSignedUrl } from "@/lib/logo-url";
import { useAuth } from "@/hooks/use-auth";
import { setTrialMode } from "@/lib/trial-watermark";

export function useTenantBranding() {
  const { user } = useAuth();
  const fetchFn = useServerFn(getMyTenantBranding);
  const { data } = useQuery({
    queryKey: ["my-tenant-branding"],
    queryFn: () => fetchFn(),
    enabled: !!user,
    staleTime: 10 * 60_000,
  });

  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLogoSrc(null);
    if (!data?.logo_url) return;
    getLogoSignedUrl(data.logo_url).then((url) => {
      if (!cancelled) setLogoSrc(url);
    });
    return () => { cancelled = true; };
  }, [data?.logo_url]);

  // Marca o modo "teste" para que PDFs gerados recebam a tarja de documento sem valor.
  useEffect(() => {
    const isTrial = data?.status === "trial" || data?.plano === "demo" || data?.plano === "teste";
    setTrialMode(!!isTrial, "MidiaOS");
  }, [data?.status, data?.plano]);

  // Aplica cor primária dinâmica (modo Connect / white-label).
  useEffect(() => {
    if (data?.cor_primaria) {
      document.documentElement.style.setProperty("--brand-primary", data.cor_primaria);
    }
  }, [data?.cor_primaria]);

  // Favicon dinâmico: usa a logo do tenant enquanto logado; restaura ao sair.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const head = document.head;
    let link = head.querySelector<HTMLLinkElement>("link[rel~='icon']");
    const originalHref = link?.getAttribute("data-original") ?? link?.href ?? "/favicon.ico";
    if (link && !link.getAttribute("data-original")) {
      link.setAttribute("data-original", originalHref);
    }
    if (logoSrc) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        head.appendChild(link);
      }
      link.href = logoSrc;
    } else if (link) {
      link.href = originalHref;
    }
  }, [logoSrc]);



  const produtoMarca = (data?.produto_marca || "midiaos") as "midiaos" | "connect";
  const produtoNome = produtoMarca === "connect" ? "MidiaOS Connect" : "Mídia.OS";

  return {
    logoSrc,
    nome: data?.nome_fantasia || data?.razao_social || null,
    produtoMarca,
    produtoNome,
    isConnect: produtoMarca === "connect",
  };
}

