import { createFileRoute } from "@tanstack/react-router";
import { executarSyncCnpjPasso } from "@/lib/sync-cnpj.server";

export const Route = createFileRoute("/api/public/hooks/sync-cnpj")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await executarSyncCnpjPasso();
          return Response.json(result);
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => Response.json({ ok: true, hint: "POST chamado pelo pg_cron" }),
    },
  },
});
