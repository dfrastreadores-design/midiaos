import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/proposta-online/$token")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/p/$token",
      params: { token: params.token },
      replace: true,
    });
  },
  component: () => null,
});
