import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/pi-share/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const token = params.token;

        const { data: link, error } = await supabaseAdmin
          .from("pi_share_links")
          .select("pi_id, signed_url, expires_at, access_count")
          .eq("token", token)
          .maybeSingle();

        if (error || !link) {
          return new Response("Link inválido ou expirado.", { status: 404 });
        }
        if (new Date(link.expires_at).getTime() < Date.now()) {
          return new Response("Este link expirou.", { status: 410 });
        }

        // Captura metadados do acesso
        const headers = request.headers;
        const ip =
          headers.get("cf-connecting-ip") ||
          headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          headers.get("x-real-ip") ||
          null;
        const userAgent = headers.get("user-agent") || null;
        const referer = headers.get("referer") || null;
        const acessadoEm = new Date().toISOString();

        // Atualiza contadores no link
        await supabaseAdmin
          .from("pi_share_links")
          .update({
            last_access_at: acessadoEm,
            access_count: (link.access_count ?? 0) + 1,
          })
          .eq("token", token);

        // Registra no histórico do PI
        await supabaseAdmin.from("pi_historico").insert({
          pi_id: link.pi_id,
          acao: "abertura_link_compartilhado",
          detalhes: {
            token,
            acessado_em: acessadoEm,
            ip,
            user_agent: userAgent,
            referer,
          },
        });

        throw redirect({ href: link.signed_url });
      },
    },
  },
});
