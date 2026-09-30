import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listPermutaSaldos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("permuta_saldos")
      .select("*")
      .order("saldo", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPermutaDetalhes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ entidade_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { entidade_id } = data;
    const [pis, recebimentos] = await Promise.all([
      supabaseAdmin
        .from("pis")
        .select("id, numero, campanha, valor_negociado, permuta_detalhes, created_at, status")
        .or(`cliente_id.eq.${entidade_id},agencia_id.eq.${entidade_id}`)
        .eq("permuta", true)
        .neq("status", "cancelado")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("permuta_recebimentos")
        .select("*")
        .or(`cliente_id.eq.${entidade_id},agencia_id.eq.${entidade_id}`)
        .order("data_recebimento", { ascending: false }),
    ]);

    if (pis.error) throw new Error(pis.error.message);
    if (recebimentos.error) throw new Error(recebimentos.error.message);

    return {
      pis: pis.data ?? [],
      recebimentos: recebimentos.data ?? [],
    };
  });

export const createPermutaRecebimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cliente_id: z.string().uuid().nullable(),
        agencia_id: z.string().uuid().nullable(),
        pi_id: z.string().uuid().nullable().optional(),
        descricao: z.string().min(1),
        valor: z.number().positive(),
        data_recebimento: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("permuta_recebimentos")
      .insert({ ...data, criado_por: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePermutaRecebimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("permuta_recebimentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
