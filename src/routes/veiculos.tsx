import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/veiculos")({
  beforeLoad: () => {
    throw redirect({ to: "/rede-inventario" });
  },
  component: () => null,
});
