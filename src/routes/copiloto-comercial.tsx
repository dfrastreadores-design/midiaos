import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CopilotoPlanejamentoMasterView } from "@/components/copiloto/CopilotoPlanejamentoMasterView";

export const Route = createFileRoute("/copiloto-comercial")({
  head: () => ({
    meta: [
      {
        title: "Copiloto IA de Planejamento de Mídia — Mídia.OS 3.0",
      },
    ],
  }),
  component: CopilotoPlanejamentoPage,
});

function CopilotoPlanejamentoPage() {
  return (
    <AppShell>
      <div className="w-full h-full">
        <CopilotoPlanejamentoMasterView />
      </div>
    </AppShell>
  );
}
