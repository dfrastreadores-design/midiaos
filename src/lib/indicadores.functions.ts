import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const IndicadorSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  telefone: z.string().optional().nullable().or(z.literal("")),
  cpf_cnpj: z.string().optional().nullable().or(z.literal("")),
  chave_pix: z.string().optional().nullable().or(z.literal("")),
  tipo_chave_pix: z.string().default("cpf"),
  banco_nome: z.string().optional().nullable().or(z.literal("")),
  percentual_comissao_padrao: z.number().min(0).max(100).default(5),
  observacoes: z.string().optional().nullable().or(z.literal("")),
  ativo: z.boolean().default(true),
});

export type IndicadorInput = z.infer<typeof IndicadorSchema>;

export const listIndicadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();

    if (!profile?.tenant_id) return [];

    const { data, error } = await context.supabase
      .from("indicadores")
      .select(`
        *,
        clientes:clientes(count),
        comissoes:comissoes_indicacao(valor_comissao, status)
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("nome", { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((ind: any) => {
      const clientesCount = ind.clientes?.[0]?.count ?? 0;
      const comissoes = ind.comissoes || [];
      const totalPendente = comissoes
        .filter((c: any) => c.status === "pendente")
        .reduce((s: number, c: any) => s + Number(c.valor_comissao || 0), 0);
      const totalPago = comissoes
        .filter((c: any) => c.status === "pago")
        .reduce((s: number, c: any) => s + Number(c.valor_comissao || 0), 0);

      return {
        ...ind,
        clientes_count: clientesCount,
        total_comissao_pendente: totalPendente,
        total_comissao_paga: totalPago,
      };
    });
  });

export const upsertIndicador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IndicadorSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();

    if (!profile?.tenant_id) throw new Error("Usuário sem inquilino");

    const payload = {
      ...data,
      tenant_id: profile.tenant_id,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("indicadores")
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", profile.tenant_id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("indicadores")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return inserted;
    }
  });

export const deleteIndicador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();

    if (!profile?.tenant_id) throw new Error("Usuário sem inquilino");

    const { error } = await context.supabase
      .from("indicadores")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", profile.tenant_id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listComissoesIndicacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();

    if (!profile?.tenant_id) return [];

    const { data, error } = await context.supabase
      .from("comissoes_indicacao")
      .select(`
        *,
        indicador:indicadores(id, nome, chave_pix, tipo_chave_pix, telefone),
        cliente:clientes(id, razao_social, nome_fantasia),
        pi:pis(id, numero_pi, valor_negociado)
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

export const liquidarComissaoIndicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; comprovante_url?: string; observacoes?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();

    if (!profile?.tenant_id) throw new Error("Usuário sem inquilino");

    const { data: updated, error } = await context.supabase
      .from("comissoes_indicacao")
      .update({
        status: "pago",
        pago_em: new Date().toISOString(),
        comprovante_pagamento_url: data.comprovante_url || null,
        observacoes: data.observacoes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated;
  });
