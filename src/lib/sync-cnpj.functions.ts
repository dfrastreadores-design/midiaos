import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSyncCnpjLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        limit: z.number().min(1).max(10000).optional().default(5000),
        status: z.enum(["atualizado", "sem_alteracao", "erro", "ignorado"]).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("sync_cnpj_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const [{ count: totC }, { count: pendC }, { count: totA }, { count: pendA }] =
      await Promise.all([
        context.supabase
          .from("clientes")
          .select("*", { count: "exact", head: true })
          .not("cnpj", "is", null),
        context.supabase
          .from("clientes")
          .select("*", { count: "exact", head: true })
          .not("cnpj", "is", null)
          .is("cnpj_sync_at", null),
        context.supabase
          .from("agencias")
          .select("*", { count: "exact", head: true })
          .not("cnpj", "is", null),
        context.supabase
          .from("agencias")
          .select("*", { count: "exact", head: true })
          .not("cnpj", "is", null)
          .is("cnpj_sync_at", null),
      ]);

    return {
      rows: rows ?? [],
      stats: {
        clientes_total: totC ?? 0,
        clientes_pendentes: pendC ?? 0,
        agencias_total: totA ?? 0,
        agencias_pendentes: pendA ?? 0,
      },
    };
  });
