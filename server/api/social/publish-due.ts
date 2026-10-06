import { defineEventHandler } from "h3";
import { supabaseAdmin } from "../../src/integrations/supabase/client.server";

/**
 * Nitro Handler / Cron Webhook para publicação de posts agendados
 * Rota: /api/social/publish-due
 */
export default defineEventHandler(async (event) => {
  const agora = new Date().toISOString();

  // 1. Busca posts com status 'scheduled' cuja data programada já chegou
  const { data: postsVencidos, error: fetchErr } = await (supabaseAdmin.from("social_scheduled_posts") as any)
    .select("*, client:clientes(razao_social, nome_fantasia), account:client_social_accounts(platform, account_name)")
    .eq("status", "scheduled")
    .lte("scheduled_for", agora)
    .limit(50);

  if (fetchErr) {
    return {
      success: false,
      error: fetchErr.message,
      processed: 0,
    };
  }

  if (!postsVencidos || postsVencidos.length === 0) {
    return {
      success: true,
      message: "Nenhum post agendado pendente para publicação no momento.",
      processed: 0,
      timestamp: agora,
    };
  }

  const resultados = [];

  for (const post of postsVencidos) {
    try {
      // Atualiza temporariamente para 'publishing'
      await (supabaseAdmin.from("social_scheduled_posts") as any)
        .update({ status: "publishing" })
        .eq("id", post.id);

      // Simulação de disparo de API oficial (Meta Graph API / Google / TikTok / LinkedIn)
      const fakePostId = `pub_${post.platforms?.[0] || "social"}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Marca como 'published' com o ID retornado
      const { data: pubData, error: pubErr } = await (supabaseAdmin.from("social_scheduled_posts") as any)
        .update({
          status: "published",
          published_post_id: fakePostId,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .select()
        .single();

      if (pubErr) throw new Error(pubErr.message);

      resultados.push({
        id: post.id,
        status: "published",
        published_post_id: fakePostId,
        cliente: post.client?.nome_fantasia || post.client?.razao_social,
      });
    } catch (err: any) {
      // Registra falha com a mensagem de erro
      await (supabaseAdmin.from("social_scheduled_posts") as any)
        .update({
          status: "failed",
          error_message: err?.message || "Falha na comunicação com a API da plataforma",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      resultados.push({
        id: post.id,
        status: "failed",
        error: err?.message,
      });
    }
  }

  return {
    success: true,
    message: `${resultados.filter((r) => r.status === "published").length} post(s) publicado(s) com sucesso.`,
    total_encontrados: postsVencidos.length,
    processados: resultados,
    timestamp: new Date().toISOString(),
  };
});
