import { createFileRoute } from "@tanstack/react-router";
import { FluxOohSplitScreen } from "@/components/inventory/FluxOohSplitScreen";

export const Route = createFileRoute("/site/inventario")({
  head: () => ({
    meta: [
      { title: "Inventário & Mapa OOH — Mídia.OS" },
      {
        name: "description",
        content:
          "Explore os melhores pontos de mídia exterior, painéis digitais de LED, frontlights e outdoors. Geolocalização e disponibilidade em tempo real.",
      },
      { property: "og:title", content: "Inventário & Mapa Interativo OOH — Mídia.OS" },
      {
        property: "og:description",
        content:
          "Consulte o mapa interativo de mídia exterior com disponibilidade e métricas em tempo real.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    busca: typeof search.busca === "string" ? search.busca : undefined,
    cidade: typeof search.cidade === "string" ? search.cidade : undefined,
    midia: typeof search.midia === "string" ? search.midia : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    ativoId: typeof search.ativoId === "string" ? search.ativoId : undefined,
  }),
  component: SiteInventarioPage,
});

function SiteInventarioPage() {
  const search = Route.useSearch();

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <FluxOohSplitScreen
        initialSearch={search.busca}
        initialCidade={search.cidade}
        initialMidia={search.midia}
        initialStatus={search.status}
        initialAtivoId={search.ativoId}
      />
    </div>
  );
}
