import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  max_usuarios: number | null;
  modulos: string[];
  is_default: boolean;
  ativo: boolean;
};

export const MODULOS_DISPONIVEIS: { key: string; label: string }[] = [
  { key: "centralizadores", label: "Centralizadores & Planejadores" },
  { key: "assinaturas", label: "Central de Assinaturas" },
  { key: "pi", label: "Pedidos de Inserção" },
  { key: "propostas", label: "Propostas" },
  { key: "briefings", label: "Briefings" },
  { key: "projetos", label: "Projetos Especiais" },
  { key: "influenciadores", label: "Influenciadores" },
  { key: "permuta", label: "Permuta" },
  { key: "financeiro", label: "Financeiro" },
  { key: "crm", label: "CRM / Atendimento" },
  { key: "calendario", label: "Calendário" },
  { key: "metas", label: "Metas" },
  { key: "relatorios", label: "Relatórios" },
  { key: "landing_pages", label: "Landing Pages" },
];

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data: userAuth } = await ctx.supabase.auth.getUser();
  if (userAuth?.user?.email?.toLowerCase() === "rafaelrodrigo.as@gmail.com") {
    return;
  }
  const { data, error } = await ctx.supabase.rpc("is_super_admin", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data)
    throw new Error("Acesso restrito ao proprietário da plataforma (rafaelrodrigo.as@gmail.com)");
}

/** Lista planos (qualquer autenticado lê o catálogo). */
export const listPlanos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("planos")
      .select("*")
      .order("preco_mensal", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Plano[];
  });

const PlanoInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1),
  descricao: z.string().nullable().optional(),
  preco_mensal: z.coerce.number().min(0),
  max_usuarios: z.coerce.number().int().positive().nullable().optional(),
  modulos: z.array(z.string()).default([]),
  is_default: z.boolean().default(false),
  ativo: z.boolean().default(true),
});

export const upsertPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PlanoInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.is_default) {
      await context.supabase
        .from("planos")
        .update({ is_default: false })
        .neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const { data: row, error } = await context.supabase
      .from("planos")
      .upsert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as Plano;
  });

export const deletePlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase.from("planos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Vincula um tenant a um plano e (opcionalmente) ajusta overrides. */
const TenantPlanoInput = z.object({
  tenant_id: z.string().uuid(),
  plano_id: z.string().uuid().nullable(),
  max_usuarios_override: z.coerce.number().int().positive().nullable().optional(),
  modulos_override: z.array(z.string()).nullable().optional(),
});

export const setTenantPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TenantPlanoInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase
      .from("tenants")
      .update({
        plano_id: data.plano_id,
        max_usuarios_override: data.max_usuarios_override ?? null,
        modulos_override: data.modulos_override ?? null,
      })
      .eq("id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Retorna os módulos efetivos + limite/contagem de usuários da empresa do usuário logado. */
export const getMyTenantPlano = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();
    if (!prof?.tenant_id) {
      return {
        tenant_id: null,
        modulos: [] as string[],
        user_limit: null as number | null,
        user_count: 0,
        plano: null as Plano | null,
      };
    }
    const [{ data: modulos }, { data: limit }, { data: count }, { data: tenant }] =
      await Promise.all([
        context.supabase.rpc("tenant_modulos", { _tenant_id: prof.tenant_id }),
        context.supabase.rpc("tenant_user_limit", { _tenant_id: prof.tenant_id }),
        context.supabase.rpc("tenant_user_count", { _tenant_id: prof.tenant_id }),
        context.supabase.from("tenants").select("plano_id").eq("id", prof.tenant_id).single(),
      ]);
    let plano: Plano | null = null;
    if (tenant?.plano_id) {
      const { data: p } = await context.supabase
        .from("planos")
        .select("*")
        .eq("id", tenant.plano_id)
        .single();
      plano = (p as Plano) ?? null;
    }
    return {
      tenant_id: prof.tenant_id as string,
      modulos: (modulos ?? []) as string[],
      user_limit: (limit ?? null) as number | null,
      user_count: (count ?? 0) as number,
      plano,
    };
  });
