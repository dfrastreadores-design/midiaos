import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { onlyDigits } from "@/lib/cnpj";

export const setExecutivoAtendimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tipo: z.enum(["cliente", "agencia"]),
        id: z.string().uuid(),
        executivo_id: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: adm } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!adm) throw new Error("Apenas administradores podem reatribuir o atendimento.");
    const table = data.tipo === "cliente" ? "clientes" : "agencias";
    const { error } = await supabase.from(table).update({ executivo_id: data.executivo_id } as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const listExecutivos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["executivo", "admin"]);
    if (rErr) throw new Error(rErr.message);
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (ids.length === 0) return [];
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, nome, email, ativo")
      .in("id", ids)
      .eq("ativo", true)
      .order("nome");
    if (pErr) throw new Error(pErr.message);
    return profiles ?? [];
  });

export const findByCnpj = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tipo: z.enum(["cliente", "agencia"]),
        cnpj: z.string().min(1).max(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const digits = onlyDigits(data.cnpj);
    if (digits.length !== 14) return null;
    const table = data.tipo === "cliente" ? "clientes" : "agencias";
    const formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
    const { data: rows, error } = await context.supabase
      .from(table)
      .select("id, razao_social, nome_fantasia, cnpj, executivo_id")
      .or(`cnpj.eq.${digits},cnpj.eq.${formatted}`)
      .limit(1);
    if (error) throw new Error(error.message);
    const match = (rows ?? [])[0];
    if (!match) return null;
    let executivo_nome: string | null = null;
    if (match.executivo_id) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("nome")
        .eq("id", match.executivo_id)
        .maybeSingle();
      executivo_nome = prof?.nome ?? null;
    }
    return { ...match, executivo_nome };
  });
