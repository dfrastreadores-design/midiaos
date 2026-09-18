import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAnyRole } from "@/lib/roles.server";

const TIPOS_MIDIA = ["tv","radio","portal","ooh","dooh","influencer","redes_sociais","outros"] as const;

const RegraSchema = z.object({
  id: z.string().uuid().optional(),
  escopo: z.enum(["global", "fornecedor", "cliente", "campanha", "tipo_midia"]),
  fornecedor_id: z.string().uuid().nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  pi_id: z.string().uuid().nullable().optional(),
  tipo_midia: z.enum(TIPOS_MIDIA).nullable().optional(),
  percentual: z.number().min(0).max(100),
  prioridade: z.number().int().min(0).max(1000).default(100),
  vigencia_inicio: z.string().nullable().optional(),
  vigencia_fim: z.string().nullable().optional(),
  ativa: z.boolean().default(true),
  observacao: z.string().max(2000).nullable().optional(),
});

export const listComissoesRegras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("comissoes_regras")
      .select("*, emissoras:fornecedor_id(nome), clientes:cliente_id(nome_fantasia,razao_social)")
      .order("prioridade", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComissaoRegra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RegraSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAnyRole(context.supabase as never, context.userId, ["admin"]);
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("comissoes_regras").update(payload as never).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: ins, error } = await context.supabase
      .from("comissoes_regras")
      .insert({ ...payload, created_by: context.userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (ins as any).id as string };
  });

export const deleteComissaoRegra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAnyRole(context.supabase as never, context.userId, ["admin"]);
    const { error } = await context.supabase.from("comissoes_regras").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ApuracaoFiltro = z.object({
  inicio: z.string().optional(),
  fim: z.string().optional(),
  fornecedor_id: z.string().uuid().optional(),
  status: z.enum(["prevista", "confirmada", "paga", "cancelada"]).optional(),
});

export const listApuracoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApuracaoFiltro.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("comissoes_apuracao")
      .select("*, emissoras:fornecedor_id(nome,cnpj,cpf,pessoa_tipo), pis:pi_id(numero_pi,cliente_id), clientes:cliente_id(nome_fantasia,razao_social)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.inicio) q = q.gte("competencia", data.inicio);
    if (data.fim) q = q.lte("competencia", data.fim);
    if (data.fornecedor_id) q = q.eq("fornecedor_id", data.fornecedor_id);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const total = ((rows ?? []) as any[]).reduce((s, r) => s + Number(r.valor || 0), 0);
    return { rows: (rows ?? []) as any[], total };
  });

export const updateApuracaoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["prevista", "confirmada", "paga", "cancelada"]),
    pago_em: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAnyRole(context.supabase as never, context.userId, ["admin", "financeiro"]);
    const patch: any = { status: data.status };
    if (data.status === "paga") patch.pago_em = data.pago_em || new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("comissoes_apuracao")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recalcComissoesPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("refresh_comissoes_pi", { p_pi_id: data.pi_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
