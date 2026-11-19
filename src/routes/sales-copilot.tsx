import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SalesCopilotView } from "@/components/copiloto/SalesCopilotView";

export const Route = createFileRoute("/sales-copilot")({
  head: () => ({
    meta: [
      {
        title: "MÍDIA.OS 4.0 — Sales Copilot (Diretor Comercial IA & Fechamento)",
      },
    ],
  }),
  component: SalesCopilotPage,
});

function SalesCopilotPage() {
  return (
    <AppShell>
      <div className="w-full h-full">
        <SalesCopilotView />
      </div>
    </AppShell>
  );
}
