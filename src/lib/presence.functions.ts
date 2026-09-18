import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Atualiza o campo last_active_at do perfil do usuário autenticado. */
export const touchLastActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
