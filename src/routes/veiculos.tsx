import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/veiculos")({
  beforeLoad: () => {
    throw redirect({ to: "/produtos" });
  },
  component: () => null,
});
