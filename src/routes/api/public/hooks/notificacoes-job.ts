import { createFileRoute } from "@tanstack/react-router";
import { executarAgendadorNotificacoes } from "@/lib/notificacoes.functions";

function timingSafeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/hooks/notificacoes-job")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ ok: false, error: "CRON_SECRET não configurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const auth = request.headers.get("authorization") ?? "";
        const provided = auth.startsWith("Bearer ")
          ? auth.slice(7)
          : (request.headers.get("x-cron-secret") ?? "");
        if (!provided || !timingSafeEq(provided, secret)) {
          return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const result = await executarAgendadorNotificacoes();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async () =>
        Response.json({ ok: true, hint: "POST com Authorization: Bearer <CRON_SECRET>" }),
    },
  },
});
