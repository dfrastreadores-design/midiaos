import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OohIntelligenceView } from "@/components/ooh/OohIntelligenceView";

export const Route = createFileRoute("/ooh-intelligence")({
  head: () => ({
    meta: [
      {
        title: "MÍDIA.OS 4.0 — OOH Intelligence (Mapa, Audiência & Inventário Inteligente)",
      },
    ],
  }),
  component: OohIntelligencePage,
});

function OohIntelligencePage() {
  return (
    <AppShell>
      <div className="w-full h-full">
        <OohIntelligenceView />
      </div>
    </AppShell>
  );
}
