import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RedeInventarioManager } from "@/components/inventario/RedeInventarioManager";

export const Route = createFileRoute("/rede-inventario")({
  head: () => ({ meta: [{ title: "Rede de Inventário — Mídia.OS" }] }),
  component: RedeInventarioPage,
});

function RedeInventarioPage() {
  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <RedeInventarioManager />
      </div>
    </AppShell>
  );
}
