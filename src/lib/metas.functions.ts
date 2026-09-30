import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MetaSchema = z.object({
  id: z.string().uuid().optional(),
  executivo_id: z.string().uuid(),
  ano: z.number().int().min(2024).max(2100),
  mes: z.number().int().min(1).max(12),
  valor_meta: z.number().min(0),
  observacao: z.string().max(500).optional().nullable(),
});

export const listMetas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ano: z.number().int(), mes: z.number().int().min(1).max(12) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const [
      { data: metas, error: mErr },
      { data: execs, error: eErr },
      { data: roles, error: rErr },
    ] = await Promise.all([
      context.supabase.from("metas_executivo").select("*").eq("ano", data.ano).eq("mes", data.mes),
      context.supabase.from("profiles").select("id, nome, email, ativo"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    if (mErr) throw new Error(mErr.message);
    if (eErr) throw new Error(eErr.message);
    if (rErr) throw new Error(rErr.message);

    const execIds = new Set(
      (roles ?? [])
        .filter((r) => r.role === "executivo" || r.role === "admin")
        .map((r) => r.user_id),
    );
    const executivos = (execs ?? []).filter((p) => execIds.has(p.id) && p.ativo);
    const metaByUser = new Map((metas ?? []).map((m) => [m.executivo_id, m]));
    return executivos.map((e) => ({
      executivo: e,
      meta: metaByUser.get(e.id) ?? null,
    }));
  });

export const upsertMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MetaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, created_by: context.userId };
    const { data: row, error } = await context.supabase
      .from("metas_executivo")
      .upsert(payload, { onConflict: "executivo_id,ano,mes" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
