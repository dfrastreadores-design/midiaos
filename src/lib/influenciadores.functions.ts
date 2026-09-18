import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null));

const InfluenciadorSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(160),
  tipo: z.enum(["influenciador", "criador"]).default("influenciador"),
  nicho: optStr(120),
  cidade: optStr(120),
  estado: optStr(2),
  email: z
    .string()
    .trim()
    .email()
    .max(180)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  telefone: optStr(40),
  whatsapp: optStr(40),
  instagram: optStr(120),
  tiktok: optStr(120),
  youtube: optStr(200),
  facebook: optStr(200),
  twitter: optStr(120),
  outras_redes: optStr(500),
  seguidores_total: z.number().int().min(0).max(10_000_000_000).optional().nullable(),
  cache_valor: z.number().min(0).optional().nullable(),
  observacoes: optStr(2000),
  ativo: z.boolean().default(true),
});

async function assertAccess(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("producao")) {
    throw new Error("Acesso restrito ao módulo de Influenciadores.");
  }
}

export const listInfluenciadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAccess(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("influenciadores")
      .select("*")
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertInfluenciador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InfluenciadorSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAccess(context.supabase, context.userId);
    const payload: any = { ...data };
    if (!payload.id) payload.created_by = context.userId;
    const q = data.id
      ? context.supabase
          .from("influenciadores")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single()
      : context.supabase.from("influenciadores").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteInfluenciador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAccess(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("influenciadores")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
