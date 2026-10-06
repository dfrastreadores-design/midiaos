import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/social/publish-due")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const agora = new Date().toISOString();

        const { data: postsVencidos, error: fetchErr } = await (supabaseAdmin.from("social_scheduled_posts") as any)
          .select("*, client:clientes(razao_social, nome_fantasia)")
          .eq("status", "scheduled")
          .lte("scheduled_for", agora)
          .limit(50);

        if (fetchErr) {
          return new Response(JSON.stringify({ success: false, error: fetchErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const resultados = [];
        for (const post of postsVencidos || []) {
          try {
            const fakePostId = `pub_${post.platforms?.[0] || "social"}_${Date.now()}`;
            await (supabaseAdmin.from("social_scheduled_posts") as any)
              .update({
                status: "published",
                published_post_id: fakePostId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", post.id);

            resultados.push({ id: post.id, status: "published" });
          } catch (e: any) {
            resultados.push({ id: post.id, status: "failed", error: e?.message });
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            total_encontrados: postsVencidos?.length || 0,
            processados: resultados,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const agora = new Date().toISOString();

        const { data: postsVencidos } = await (supabaseAdmin.from("social_scheduled_posts") as any)
          .select("*")
          .eq("status", "scheduled")
          .lte("scheduled_for", agora)
          .limit(50);

        return new Response(
          JSON.stringify({ success: true, count: postsVencidos?.length || 0 }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
