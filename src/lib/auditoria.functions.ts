import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Apenas administradores podem visualizar o histórico.");
}

export const listAuditoriaAlteracoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tabela: z.string().max(60).optional(),
        user_id: z.string().uuid().optional(),
        operacao: z.enum(["INSERT", "UPDATE", "DELETE"]).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = supabaseAdmin
      .from("auditoria_alteracoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.tabela) q = q.eq("tabela", data.tabela);
    if (data.user_id) q = q.eq("user_id", data.user_id);
    if (data.operacao) q = q.eq("operacao", data.operacao);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((rows ?? []).map((r) => r.user_id).filter(Boolean) as string[]),
    );
    let nameMap = new Map<string, { nome: string; email: string }>();
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, nome, email")
        .in("id", userIds);
      nameMap = new Map((profs ?? []).map((p) => [p.id, { nome: p.nome, email: p.email }]));
    }
    return (rows ?? []).map((r) => ({
      ...r,
      autor: r.user_id ? (nameMap.get(r.user_id) ?? null) : null,
    }));
  });
