import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAnyRole } from "@/lib/roles.server";

const TIPOS_MIDIA = [
  "tv",
  "radio",
  "portal",
  "ooh",
  "dooh",
  "influencer",
  "redes_sociais",
  "outros",
] as const;

const EmissoraSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(120),
  razao_social: z.string().max(200).nullable().optional(),
  nome_fantasia: z.string().max(200).nullable().optional(),
  cnpj: z.string().max(20).nullable().optional(),
  cpf: z.string().max(20).nullable().optional(),
  pessoa_tipo: z.enum(["pj", "cpf"]).default("pj"),
  nome_artistico: z.string().max(200).nullable().optional(),
  tipo_midia: z.enum(TIPOS_MIDIA).nullable().optional(),
  comissao_padrao_pct: z.number().min(0).max(100).nullable().optional(),
  inscricao_estadual: z.string().max(40).nullable().optional(),
  inscricao_municipal: z.string().max(40).nullable().optional(),
  endereco: z.string().max(300).nullable().optional(),
  cidade: z.string().max(120).nullable().optional(),
  uf: z.string().max(2).nullable().optional(),
  cep: z.string().max(15).nullable().optional(),
  telefone: z.string().max(40).nullable().optional(),
  email: z.string().max(120).nullable().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  observacoes: z.string().max(4000).nullable().optional(),
  entrega_material: z.string().max(4000).nullable().optional(),
  padrao: z.boolean().default(false),
  ativo: z.boolean().default(true),
});

export const listEmissoras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("emissoras")
      .select("*")
      .order("padrao", { ascending: false })
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveEmissora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmissoraSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase as never, userId, ["admin"]);
    const { id, ...payload } = data;
    // Se marcar como padrão, desmarca as outras do mesmo tenant
    if (payload.padrao) {
      await supabase
        .from("emissoras")
        .update({ padrao: false } as never)
        .neq("id", id ?? "00000000-0000-0000-0000-000000000000");
    }
    if (id) {
      const { error } = await supabase
        .from("emissoras")
        .update(payload as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      // tenant_id é preenchido por trigger/default? Se não, busca do profile.
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      const tenant_id = (prof as { tenant_id?: string } | null)?.tenant_id;
      if (!tenant_id) throw new Error("Tenant não identificado");
      const { data: created, error } = await supabase
        .from("emissoras")
        .insert({ ...payload, tenant_id } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: created.id as string };
    }
  });

export const excluirEmissora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase as never, userId, ["admin"]);
    const { error } = await supabase.from("emissoras").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
