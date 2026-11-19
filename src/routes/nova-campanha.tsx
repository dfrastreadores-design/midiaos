import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AssistenteCriarCampanha } from "@/components/vendas/AssistenteCriarCampanha";

export const Route = createFileRoute("/nova-campanha")({
  head: () => ({ meta: [{ title: "Assistente de Vendas — Criar Campanha — Mídia.OS" }] }),
  component: NovaCampanhaPage,
});

function NovaCampanhaPage() {
  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <AssistenteCriarCampanha />
      </div>
    </AppShell>
  );
}
