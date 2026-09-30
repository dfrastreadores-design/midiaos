import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotificacaoConfig = {
  ativo_inicio: boolean;
  dias_antes_inicio: number;
  ativo_fim: boolean;
  dias_antes_fim: number;
  ativo_progresso: boolean;
  marcos_percentual: number[];
  ativo_validade: boolean;
  dias_antes_validade: number;
};

export const getNotificacaoConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("notificacao_config")
      .select("*")
      .eq("id", true)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as NotificacaoConfig;
  });

export const updateNotificacaoConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        ativo_inicio: z.boolean(),
        dias_antes_inicio: z.number().int().min(0).max(60),
        ativo_fim: z.boolean(),
        dias_antes_fim: z.number().int().min(0).max(60),
        ativo_progresso: z.boolean(),
        marcos_percentual: z.array(z.number().int().min(1).max(100)).max(10),
        ativo_validade: z.boolean(),
        dias_antes_validade: z.number().int().min(0).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notificacao_config")
      .update({ ...data, updated_at: new Date().toISOString(), updated_by: userId })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMinhasNotificacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const marcarNotificacaoLida = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid().optional(), todas: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("notificacoes").update({ lida: true }).eq("user_id", userId);
    if (data.id) q = q.eq("id", data.id);
    else q = q.eq("lida", false);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Núcleo do agendador. Chamado pela rota pública (cron) ou manualmente por admin. */
export async function executarAgendadorNotificacoes() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const isoHoje = hoje.toISOString().slice(0, 10);

  const { data: cfg, error: cfgErr } = await supabaseAdmin
    .from("notificacao_config")
    .select("*")
    .eq("id", true)
    .single();
  if (cfgErr || !cfg) throw new Error(cfgErr?.message || "config ausente");

  // Admins (destinatários sempre + executivo)
  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const adminIds = (admins ?? []).map((r) => r.user_id as string);

  const notifs: Array<{
    user_id: string;
    tipo: string;
    titulo: string;
    mensagem: string;
    link: string;
    metadata: Record<string, unknown>;
  }> = [];

  const pushFor = (recipients: string[], n: Omit<(typeof notifs)[number], "user_id">) => {
    const seen = new Set<string>();
    for (const uid of recipients) {
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      notifs.push({ user_id: uid, ...n });
    }
  };

  // ===== PIs ativos =====
  if (cfg.ativo_inicio || cfg.ativo_fim || cfg.ativo_progresso) {
    const { data: pis } = await supabaseAdmin
      .from("pis")
      .select("id,numero,campanha,periodo_inicio,periodo_fim,executivo_id,status,total_insercoes")
      .in("status", ["aprovado", "faturado", "enviado"])
      .not("status", "in", "(substituido,cancelado)");

    for (const pi of pis ?? []) {
      const recipients = [pi.executivo_id as string | null, ...adminIds].filter(
        Boolean,
      ) as string[];
      const link = `/pi?id=${pi.id}`;

      if (cfg.ativo_inicio && pi.periodo_inicio) {
        const diff = diasEntre(isoHoje, pi.periodo_inicio);
        if (diff >= 0 && diff <= cfg.dias_antes_inicio) {
          pushFor(recipients, {
            tipo: "campanha_iniciando",
            titulo: `Campanha inicia em ${diff} dia(s)`,
            mensagem: `${pi.numero} — ${pi.campanha} inicia em ${formatBR(pi.periodo_inicio)}`,
            link,
            metadata: { ref_id: pi.id, evento: `inicio-${pi.periodo_inicio}` },
          });
        }
      }

      if (cfg.ativo_fim && pi.periodo_fim) {
        const diff = diasEntre(isoHoje, pi.periodo_fim);
        if (diff >= 0 && diff <= cfg.dias_antes_fim) {
          pushFor(recipients, {
            tipo: "campanha_finalizando",
            titulo: `Campanha encerra em ${diff} dia(s)`,
            mensagem: `${pi.numero} — ${pi.campanha} encerra em ${formatBR(pi.periodo_fim)}`,
            link,
            metadata: { ref_id: pi.id, evento: `fim-${pi.periodo_fim}` },
          });
        }
      }

      if (cfg.ativo_progresso && pi.periodo_inicio && pi.periodo_fim) {
        const pct = pctExecutado(pi.periodo_inicio, pi.periodo_fim, isoHoje);
        for (const marco of cfg.marcos_percentual as number[]) {
          if (pct >= marco && pct < marco + 5) {
            pushFor(recipients, {
              tipo: "campanha_progresso",
              titulo: `Campanha atingiu ${marco}% do período`,
              mensagem: `${pi.numero} — ${pi.campanha} está em ${pct}% de execução`,
              link,
              metadata: { ref_id: pi.id, evento: `marco-${marco}` },
            });
          }
        }
      }
    }
  }

  // ===== Propostas =====
  if (cfg.ativo_validade) {
    const { data: props } = await supabaseAdmin
      .from("propostas")
      .select("id,numero,campanha,validade,executivo_id,status")
      .in("status", ["enviada", "rascunho"]);
    for (const p of props ?? []) {
      if (!p.validade) continue;
      const diff = diasEntre(isoHoje, p.validade);
      if (diff >= 0 && diff <= cfg.dias_antes_validade) {
        const recipients = [p.executivo_id as string | null, ...adminIds].filter(
          Boolean,
        ) as string[];
        pushFor(recipients, {
          tipo: "proposta_vencendo",
          titulo: `Proposta vence em ${diff} dia(s)`,
          mensagem: `${p.numero} — ${p.campanha} vence em ${formatBR(p.validade)}`,
          link: `/propostas?id=${p.id}`,
          metadata: { ref_id: p.id, evento: `validade-${p.validade}` },
        });
      }
    }
  }

  // ===== Social Media: lembrete 2 dias antes de cada publicação =====
  try {
    const { SOCIAL_MEDIA_EMAILS, isSocialItem, labelSocialItem, datasPublicacaoSocial } =
      await import("@/lib/social-media-notify");
    if (SOCIAL_MEDIA_EMAILS.length > 0) {
      const { data: socialProfs } = await supabaseAdmin
        .from("profiles")
        .select("id,email")
        .in("email", SOCIAL_MEDIA_EMAILS as never);
      const socialUserIds = (socialProfs ?? []).map((p: any) => p.id as string);
      if (socialUserIds.length > 0) {
        const { data: pisSocial } = await supabaseAdmin
          .from("pis")
          .select(
            "id,numero,campanha,periodo_inicio,status,itens:pi_itens(*),cliente:clientes(razao_social,nome_fantasia)",
          )
          .in("status", ["aprovado", "faturado", "enviado", "veiculado"]);
        for (const pi of pisSocial ?? []) {
          const itens = ((pi as any).itens ?? []).filter(isSocialItem);
          if (itens.length === 0) continue;
          const datas = datasPublicacaoSocial(itens as never, (pi as any).periodo_inicio);
          const cliente =
            (pi as any).cliente?.razao_social ?? (pi as any).cliente?.nome_fantasia ?? "";
          const entregas = itens.map(labelSocialItem).join(" | ");
          for (const dISO of datas) {
            if (diasEntre(isoHoje, dISO) !== 2) continue;
            pushFor(socialUserIds, {
              tipo: "outro",
              titulo: `Publicação em 2 dias — PI ${(pi as any).numero}`,
              mensagem: `${cliente} — ${entregas} programado para ${formatBR(dISO)}.`,
              link: `/pi?id=${(pi as any).id}`,
              metadata: { ref_id: (pi as any).id, evento: `pi_social_lembrete-${dISO}` },
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("social media reminders failed", (e as Error).message);
  }

  // ===== Trial (expira em ≤24h / ≤6h / expirado) =====
  let trialResult = { notif: 0, emails: 0 };
  try {
    const { processarAlertasTrial } = await import("@/lib/trial-alerts.server");
    trialResult = await processarAlertasTrial();
  } catch (e) {
    console.error("trial alerts failed", (e as Error).message);
  }

  if (notifs.length === 0) return { inserted: 0, trial: trialResult };

  // Insere uma a uma; o índice único parcial bloqueia duplicatas silenciosamente
  let inserted = 0;
  for (const n of notifs) {
    const row = {
      user_id: n.user_id,
      tipo: n.tipo as
        | "campanha_iniciando"
        | "campanha_progresso"
        | "campanha_finalizando"
        | "proposta_vencendo"
        | "outro",
      titulo: n.titulo,
      mensagem: n.mensagem,
      link: n.link,
      metadata: n.metadata as never,
    };
    const r = await supabaseAdmin.from("notificacoes").insert(row);
    if (!r.error) inserted++;
  }
  return { inserted, trial: trialResult };
}

function diasEntre(aISO: string, bISO: string) {
  const a = new Date(aISO + "T00:00:00Z").getTime();
  const b = new Date(bISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}
function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function pctExecutado(inicio: string, fim: string, hoje: string) {
  const ini = new Date(inicio + "T00:00:00Z").getTime();
  const f = new Date(fim + "T00:00:00Z").getTime();
  const h = new Date(hoje + "T00:00:00Z").getTime();
  if (h <= ini) return 0;
  if (h >= f) return 100;
  return Math.round(((h - ini) / (f - ini)) * 100);
}

export const rodarAgendadorAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Apenas admin");
    return executarAgendadorNotificacoes();
  });

export const notificarRenovacaoPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        original_id: z.string().uuid(),
        novo_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: original }, { data: novo }] = await Promise.all([
      supabase
        .from("pis")
        .select("numero, campanha, executivo_id")
        .eq("id", data.original_id)
        .single(),
      supabase
        .from("pis")
        .select(
          "numero, campanha, executivo_id, periodo_inicio, periodo_fim, mes_veiculacao, ano_veiculacao",
        )
        .eq("id", data.novo_id)
        .single(),
    ]);
    if (!novo) return { ok: false };

    const fmtBR = (iso?: string | null) => {
      if (!iso) return null;
      const [y, m, d] = iso.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    };
    const vigencia =
      novo.periodo_inicio && novo.periodo_fim
        ? `${fmtBR(novo.periodo_inicio)} a ${fmtBR(novo.periodo_fim)}`
        : `${String(novo.mes_veiculacao ?? "").padStart(2, "0")}/${novo.ano_veiculacao ?? ""}`;

    const titulo = `Contrato renovado — novo PI ${novo.numero}`;
    const mensagem = `Renovação${original?.numero ? ` do PI ${original.numero}` : ""} para "${novo.campanha}". Vigência: ${vigencia}.`;

    const [{ data: admins }, { data: diretorias }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin" as never),
      supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "diretoria" as never),
    ]);
    const uids = new Set<string>();
    if (novo.executivo_id) uids.add(novo.executivo_id as string);
    if (original?.executivo_id) uids.add(original.executivo_id as string);
    if (userId) uids.add(userId);
    for (const r of [...(admins ?? []), ...(diretorias ?? [])]) {
      if ((r as any).user_id) uids.add((r as any).user_id as string);
    }

    const rows = Array.from(uids).map((uid) => ({
      user_id: uid,
      tipo: "pi_renovado",
      titulo,
      mensagem,
      link: `/pi?id=${data.novo_id}`,
      metadata: { ref_id: data.novo_id, original_id: data.original_id, evento: "pi_renovado" },
    }));

    if (rows.length > 0) {
      await supabase.from("notificacoes").insert(rows as never);
    }
    return { ok: true, inserted: rows.length };
  });

// Follow-up automático de renovação: cria/atualiza evento na agenda
// próximo à data de vigência final do PI para o executivo entrar em contato
// e renovar a campanha com o cliente.
export const agendarFollowUpRenovacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        pi_id: z.string().uuid(),
        dias_antes: z.number().int().min(0).max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const diasAntes = data.dias_antes ?? 7;

    const { data: pi } = await supabase
      .from("pis")
      .select(
        "id, numero, campanha, periodo_fim, executivo_id, cliente_id, agencia_id, status, tenant_id",
      )
      .eq("id", data.pi_id)
      .single();
    if (!pi || !pi.periodo_fim) return { ok: false, reason: "sem_periodo_fim" };
    if (["rascunho", "cancelado", "reprovado", "substituido"].includes(String(pi.status))) {
      return { ok: false, reason: "status_invalido" };
    }

    // Data do follow-up: N dias antes de periodo_fim (nunca no passado)
    const fim = new Date(`${String(pi.periodo_fim).slice(0, 10)}T09:00:00-03:00`);
    const alvo = new Date(fim.getTime() - diasAntes * 86400000);
    const hoje = new Date();
    const inicio = alvo < hoje ? fim : alvo;
    const fimEvento = new Date(inicio.getTime() + 30 * 60000);

    const owner = (pi.executivo_id as string | null) ?? userId;
    const titulo = `Follow-up renovação — PI ${pi.numero}`;
    const descricao = `Contato com o cliente para renovar a campanha "${pi.campanha}". Vigência encerra em ${String(pi.periodo_fim).slice(0, 10).split("-").reverse().join("/")}.`;

    // Idempotência: 1 evento por (origem=pi, origem_id=pi.id, subtipo=followup_renovacao)
    const { data: existente } = await supabase
      .from("eventos_calendario")
      .select("id")
      .eq("origem", "pi")
      .eq("origem_id", pi.id)
      .eq("origem_subtipo", "followup_renovacao")
      .maybeSingle();

    const payload = {
      user_id: owner,
      titulo,
      descricao,
      inicio: inicio.toISOString(),
      fim: fimEvento.toISOString(),
      dia_inteiro: false,
      origem: "pi" as const,
      origem_id: pi.id,
      origem_subtipo: "followup_renovacao",
      cliente_id: pi.cliente_id,
      agencia_id: pi.agencia_id,
      cor: "#f59e0b",
      tenant_id: pi.tenant_id,
    };

    if (existente?.id) {
      await supabase
        .from("eventos_calendario")
        .update(payload as never)
        .eq("id", existente.id);
      return { ok: true, updated: true, evento_id: existente.id };
    }
    const { data: novo } = await supabase
      .from("eventos_calendario")
      .insert(payload as never)
      .select("id")
      .single();
    return { ok: true, created: true, evento_id: (novo as { id: string } | null)?.id };
  });
