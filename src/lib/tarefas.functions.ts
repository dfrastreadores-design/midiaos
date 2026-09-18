import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatusEnum = z.enum(["a_fazer", "fazendo", "concluido"]);
const PrioridadeEnum = z.enum(["baixa", "media", "alta"]);

const TarefaInput = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(4000).nullable().optional(),
  status: StatusEnum.optional(),
  prioridade: PrioridadeEnum.optional(),
  prazo: z.string().nullable().optional(),
  responsavel: z.string().max(120).nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  agencia_id: z.string().uuid().nullable().optional(),
  pi_id: z.string().uuid().nullable().optional(),
  proposta_id: z.string().uuid().nullable().optional(),
  projeto_id: z.string().uuid().nullable().optional(),
});

export const listTarefas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("tarefas")
      .select(
        "*, cliente:cliente_id(razao_social,nome_fantasia), agencia:agencia_id(razao_social,nome_fantasia), pi:pi_id(numero), proposta:proposta_id(numero), projeto:projeto_id(nome)"
      )
      .eq("user_id", userId)
      .order("status", { ascending: true })
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listTarefasVencendo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const limite = hoje.toISOString();
    const { data, error } = await supabase
      .from("tarefas")
      .select("id, titulo, prazo, prioridade, status")
      .eq("user_id", userId)
      .neq("status", "concluido")
      .not("prazo", "is", null)
      .lte("prazo", limite)
      .order("prazo", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TarefaInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: Record<string, unknown> = {
      titulo: data.titulo.trim(),
      descricao: data.descricao?.trim() || null,
      status: data.status ?? "a_fazer",
      prioridade: data.prioridade ?? "media",
      prazo: data.prazo || null,
      responsavel: data.responsavel?.trim() || null,
      cliente_id: data.cliente_id || null,
      agencia_id: data.agencia_id || null,
      pi_id: data.pi_id || null,
      proposta_id: data.proposta_id || null,
      projeto_id: data.projeto_id || null,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("tarefas")
        .update(payload as never)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    // próxima ordem na coluna alvo
    const { data: last } = await supabase
      .from("tarefas")
      .select("ordem")
      .eq("user_id", userId)
      .eq("status", payload.status as string)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    payload.user_id = userId;
    payload.ordem = ((last?.ordem as number | undefined) ?? -1) + 1;
    const { data: row, error } = await supabase
      .from("tarefas")
      .insert(payload as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const moveTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: StatusEnum,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: last } = await supabase
      .from("tarefas")
      .select("ordem")
      .eq("user_id", userId)
      .eq("status", data.status)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrdem = ((last?.ordem as number | undefined) ?? -1) + 1;
    const { error } = await supabase
      .from("tarefas")
      .update({ status: data.status, ordem: nextOrdem })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("tarefas")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
