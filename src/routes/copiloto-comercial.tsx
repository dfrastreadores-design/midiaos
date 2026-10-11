import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CopilotoComercialView } from "@/components/copiloto/CopilotoComercialView";

export const Route = createFileRoute("/copiloto-comercial")({
  head: () => ({
    meta: [
      {
        title: "Copiloto Comercial IA — Mídia.OS",
      },
    ],
  }),
  component: CopilotoComercialPage,
});

function CopilotoComercialPage() {
  return (
    <AppShell>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <CopilotoComercialView />
      </div>
    </AppShell>
  );
}
