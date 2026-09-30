import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const BriefingSchema = z.object({
  id: z.string().uuid().optional(),
  status: z.string().default("novo"),
  tipo_entidade: z.enum(["cliente", "agencia"]),
  razao_social: z.string().min(1).max(255),
  nome_fantasia: z.string().max(255).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  contato_nome: z.string().max(255).optional().nullable(),
  contato_email: z
    .string()
    .email()
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  contato_telefone: z.string().max(40).optional().nullable(),
  campanha: z.string().min(1).max(255),
  objetivo: z.string().max(5000).optional().nullable(),
  periodo_estimado: z.string().max(255).optional().nullable(),
  verba_estimada: z.number().min(0).optional().nullable(),
  produtos: z.array(z.string().uuid()).optional().nullable(),
  produto_interesse: z.string().max(2000).optional().nullable(),
  tempo_contrato: z.string().max(255).optional().nullable(),
  segmento_cliente: z.string().max(255).optional().nullable(),
  perfil_audiencia: z.string().max(5000).optional().nullable(),
  concorrentes: z.string().max(5000).optional().nullable(),
  tom_comunicacao: z.string().max(2000).optional().nullable(),
  expectativa_resultado: z.string().max(5000).optional().nullable(),
  distribuicao_entregas: z.string().max(5000).optional().nullable(),
  historico_cliente: z.string().max(5000).optional().nullable(),
  detalhes_adicionais: z.string().max(10000).optional().nullable(),
});

export type BriefingType = z.infer<typeof BriefingSchema>;

export const listBriefings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("briefings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getBriefing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("briefings")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BriefingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: any = { ...rest, created_by: context.userId };
    const q = id
      ? context.supabase.from("briefings").update(payload).eq("id", id).select().single()
      : context.supabase.from("briefings").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);

    // Notifica admins quando novo briefing for criado
    if (!id && row) {
      const { data: admins } = await context.supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "executivo"]);
      if (admins && admins.length > 0) {
        const notifs = admins.map((a: any) => ({
          user_id: a.user_id,
          tipo: "outro",
          titulo: "Novo Briefing Recebido",
          mensagem: `Novo briefing: ${row.razao_social} - ${row.campanha}`,
          link: `/briefings?id=${row.id}`,
          metadata: { briefing_id: row.id },
        }));
        await context.supabase.from("notificacoes").insert(notifs as never);
      }
    }
    return row;
  });

export const deleteBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("briefings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateBriefingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["novo", "em_analise", "em_proposta", "concluido", "recusado"]),
        motivo_recusa: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload: any = { status: data.status };
    if (data.motivo_recusa !== undefined) payload.motivo_recusa = data.motivo_recusa;
    const { error } = await context.supabase.from("briefings").update(payload).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
