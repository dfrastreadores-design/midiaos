import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const salvarPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        device_type: z.enum(["desktop", "android", "ios", "outro"]).optional(),
        user_agent: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId, tenantId } = context;

    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: userId,
        tenant_id: tenantId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        device_type: data.device_type ?? "desktop",
        user_agent: data.user_agent ?? null,
        ativo: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      console.warn("Aviso ao salvar push_subscription:", error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  });

export const removerPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ endpoint: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("endpoint", data.endpoint)
      .eq("user_id", userId);

    if (error) {
      console.warn("Aviso ao desativar push_subscription:", error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  });
