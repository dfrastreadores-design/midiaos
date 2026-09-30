import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/site")({
  head: () => ({
    meta: [
      { title: "mídia.OS — Sistema comercial para emissoras, rádios e portais" },
      {
        name: "description",
        content:
          "Aumente as vendas do seu veículo de comunicação: CRM, propostas, PI digital, briefings, financeiro e dashboards em uma única plataforma. Implantação em 7 dias. Agende uma demonstração gratuita.",
      },
      {
        property: "og:title",
        content: "mídia.OS — Sistema comercial para veículos de comunicação",
      },
      {
        property: "og:description",
        content:
          "Do briefing à PI assinada: a plataforma que organiza e acelera as vendas de TVs, rádios, portais e mídia OOH/DOOH. Demonstração gratuita.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://midiaos.online/site" },
      {
        name: "twitter:title",
        content: "mídia.OS — Sistema comercial para veículos de comunicação",
      },
      {
        name: "twitter:description",
        content: "Do briefing à PI assinada — uma plataforma feita para quem vende mídia.",
      },
    ],
    links: [{ rel: "canonical", href: "https://midiaos.online/site" }],
  }),
  component: SiteLayout,
});
