import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/site")({
  head: () => ({
    meta: [
      {
        title: "MidiaOS — Gestão para Veículos de Comunicação e Representações Comerciais",
      },
      {
        name: "description",
        content:
          "A solução definitiva para Veículos de Comunicação (TV, Rádio, Portais, OOH/DOOH) e Representações Comerciais de Mídia. Centralize reservas, emita PIs em segundos e automatize comissões.",
      },
      {
        property: "og:title",
        content: "MidiaOS — Plataforma para Veículos de Mídia e Representações",
      },
      {
        property: "og:description",
        content:
          "Elimine planilhas complexas e overbooking na grade. Propostas com assinatura digital e relatórios financeiros precisos.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.midiaos.online/site" },
      {
        name: "twitter:title",
        content: "MidiaOS — Gestão Comercial de Mídia",
      },
      {
        name: "twitter:description",
        content:
          "Plataforma inteligente para Veículos de Comunicação e Empresas de Representação Comercial.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.midiaos.online/site" }],
  }),
  component: SiteLayout,
});
