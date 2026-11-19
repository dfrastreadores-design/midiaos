import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StrategicPlanning } from "@/components/planning/StrategicPlanning";

export const Route = createFileRoute("/planejamento")({
  head: () => ({ meta: [{ title: "Planejamento Estratégico — Mídia.OS" }] }),
  component: PlanejamentoPage,
});

function PlanejamentoPage() {
  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <StrategicPlanning />
      </div>
    </AppShell>
  );
}
