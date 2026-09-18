import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CONSENTIMENTO_VERSAO = "2026-06-27";

export const registrarConsentimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        consentimento_lgpd_at: new Date().toISOString(),
        consentimento_versao: CONSENTIMENTO_VERSAO,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, versao: CONSENTIMENTO_VERSAO };
  });

export const exportarMeusDados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, pis, propostas, clientes, briefings, tarefas, auditoria] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("pis").select("*").eq("executivo_id", userId),
      supabase.from("propostas").select("*").eq("executivo_id", userId),
      supabase.from("clientes").select("*").eq("executivo_id", userId),
      supabase.from("briefings").select("*").eq("created_by", userId),
      supabase.from("tarefas").select("*").eq("user_id", userId),
      supabase.from("auditoria_alteracoes").select("*").eq("user_id", userId).limit(500),
    ]);
    await supabase.from("lgpd_solicitacoes").insert({
      user_id: userId,
      tipo: "exportacao",
      status: "concluida",
      observacoes: "Exportação automática gerada pelo titular.",
    });
    return {
      gerado_em: new Date().toISOString(),
      perfil: profile.data,
      pis: pis.data ?? [],
      propostas: propostas.data ?? [],
      clientes: clientes.data ?? [],
      briefings: briefings.data ?? [],
      tarefas: tarefas.data ?? [],
      auditoria: auditoria.data ?? [],
    };
  });

export const solicitarExclusao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ observacoes: z.string().max(1000).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("lgpd_solicitacoes")
      .select("id")
      .eq("user_id", userId)
      .eq("tipo", "exclusao")
      .eq("status", "pendente")
      .maybeSingle();
    if (existing) throw new Error("Você já possui uma solicitação de exclusão pendente.");
    const { error } = await supabase.from("lgpd_solicitacoes").insert({
      user_id: userId,
      tipo: "exclusao",
      status: "pendente",
      observacoes: data.observacoes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarMinhasSolicitacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("lgpd_solicitacoes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
