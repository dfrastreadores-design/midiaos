import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/inventario")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/site/inventario",
      search,
    });
  },
  component: () => null,
});
