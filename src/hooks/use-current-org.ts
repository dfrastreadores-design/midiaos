import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentOrg, type OrganizacaoInfo } from "@/lib/organizacoes.functions";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export function useCurrentOrg() {
  const { user } = useAuth();
  const fetchFn = useServerFn(getCurrentOrg);

  const { data, isLoading } = useQuery<OrganizacaoInfo>({
    queryKey: ["current-org", user?.id],
    queryFn: () => fetchFn(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const org = data ?? {
    id: null,
    nome: "Mídia.OS",
    slug: "midiaos",
    site_url: null,
    logo_url: null,
    tagline: "Sistema Integrado de Gestão Comercial e Mídia 360°",
    termos_proposta: null,
    cor_primaria: "#0f172a",
    isNexo: false,
  };

  const isNexo = !!org.isNexo;

  // Atualizar CSS variable para cor primária da organização se informada
  useEffect(() => {
    if (org?.cor_primaria && typeof document !== "undefined") {
      document.documentElement.style.setProperty("--brand-primary", org.cor_primaria);
    }
  }, [org?.cor_primaria]);

  return {
    org,
    isNexo,
    loading: isLoading,
    hasOrg: !!org.id && org.slug !== "midiaos",
    nome: org.nome,
    slug: org.slug,
    siteUrl: org.site_url || (isNexo ? "https://nexomidiaerepresentacao.com.br" : null),
    logoUrl: org.logo_url,
    tagline: org.tagline,
    termosProposta: org.termos_proposta,
    corPrimaria: org.cor_primaria,
    templateConfig: org.templateConfig,
  };
}
