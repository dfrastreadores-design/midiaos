// Route: /pedidos-insercao
// Redirecionamento transparente e compatibilidade para o módulo unificado de Pedidos de Inserção (/pi)

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pedidos-insercao")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/pi",
      search,
    });
  },
});
