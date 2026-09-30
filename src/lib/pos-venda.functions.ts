import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "pos-venda-anexos";

function novoToken() {
  return crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
}

/** Lista pós-vendas por PI (autenticado). */
export const listPosVendasDoPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("pos_vendas")
      .select("*")
      .eq("pi_id", data.pi_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Cria (ou recupera) uma comprovação de pós-venda para o PI. */
export const gerarPosVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ex } = await supabase
      .from("pos_vendas")
      .select("id, token")
      .eq("pi_id", data.pi_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ex) return { id: ex.id, token: ex.token };

    const token = novoToken();
    const { data: ins, error } = await supabase
      .from("pos_vendas")
      .insert({ pi_id: data.pi_id, token, status: "pendente", created_by: userId } as never)
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id, token: ins.token };
  });

/** Atualiza mensagem / link de provas. */
export const atualizarPosVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        mensagem: z.string().max(2000).nullable().optional(),
        link_provas: z.string().url().max(500).nullable().optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pos_vendas")
      .update({
        mensagem: data.mensagem ?? null,
        link_provas: data.link_provas ? data.link_provas : null,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Marca como enviada (quando o executivo clica em compartilhar). */
export const marcarPosVendaEnviada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("pos_vendas")
      .update({ status: "enviada", enviada_em: new Date().toISOString() } as never)
      .eq("id", data.id)
      .neq("status", "visualizada");
    return { ok: true };
  });

/** Lista anexos da pós-venda + URLs assinadas (1h). */
export const listPosVendaAnexos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pos_venda_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("pos_venda_anexos")
      .select("*")
      .eq("pos_venda_id", data.pos_venda_id)
      .order("created_at", { ascending: false });
    const out: Array<{
      id: string;
      nome: string;
      path: string;
      mime: string | null;
      tamanho: number | null;
      created_at: string;
      signed_url: string | null;
    }> = [];
    for (const a of rows ?? []) {
      const { data: signed } = await context.supabase.storage
        .from(BUCKET)
        .createSignedUrl(a.path, 3600);
      out.push({
        id: a.id,
        nome: a.nome,
        path: a.path,
        mime: a.mime,
        tamanho: a.tamanho,
        created_at: a.created_at,
        signed_url: signed?.signedUrl ?? null,
      });
    }
    return out;
  });

/** Faz upload de um arquivo de prova (base64). */
export const uploadPosVendaAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pos_venda_id: z.string().uuid(),
        nome: z.string().min(1).max(200),
        mime: z.string().min(1).max(120),
        data_base64: z.string().min(10).max(15_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const bytes = Buffer.from(data.data_base64, "base64");
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10MB");
    const safe = data.nome.replace(/[^\w.\-]+/g, "_");
    const path = `${data.pos_venda_id}/${Date.now()}-${safe}`;
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.mime, upsert: false });
    if (up.error) throw new Error(up.error.message);
    const { error } = await supabase.from("pos_venda_anexos").insert({
      pos_venda_id: data.pos_venda_id,
      nome: data.nome,
      path,
      mime: data.mime,
      tamanho: bytes.length,
      created_by: userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true, path };
  });

export const removerPosVendaAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("pos_venda_anexos")
      .select("path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.path) await context.supabase.storage.from(BUCKET).remove([row.path]);
    await context.supabase.from("pos_venda_anexos").delete().eq("id", data.id);
    return { ok: true };
  });

// =================== PÚBLICAS (sem auth) — usadas em /pos-venda/$token ===================

export const getPosVendaPublica = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pv } = await supabaseAdmin
      .from("pos_vendas")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!pv) throw new Error("Link inválido");

    // marca como visualizada na primeira abertura
    if (pv.status !== "visualizada") {
      await supabaseAdmin
        .from("pos_vendas")
        .update({ status: "visualizada", visualizada_em: new Date().toISOString() } as never)
        .eq("id", pv.id);
    }

    const { data: pi } = await supabaseAdmin
      .from("pis")
      .select(
        `
        id, numero, campanha, periodo_inicio, periodo_fim,
        mes_veiculacao, ano_veiculacao, total_insercoes, valor_negociado,
        cliente:clientes(razao_social, nome_fantasia),
        agencia:agencias(razao_social, nome_fantasia),
        itens:pi_itens(*)
      `,
      )
      .eq("id", pv.pi_id)
      .single();

    const { data: anexos } = await supabaseAdmin
      .from("pos_venda_anexos")
      .select("*")
      .eq("pos_venda_id", pv.id)
      .order("created_at", { ascending: false });

    const anexosOut: Array<{
      id: string;
      nome: string;
      path: string;
      mime: string | null;
      tamanho: number | null;
      created_at: string;
      signed_url: string | null;
    }> = [];
    for (const a of anexos ?? []) {
      const { data: signed } = await supabaseAdmin.storage
        .from("pos-venda-anexos")
        .createSignedUrl(a.path, 60 * 60);
      anexosOut.push({
        id: a.id,
        nome: a.nome,
        path: a.path,
        mime: a.mime,
        tamanho: a.tamanho,
        created_at: a.created_at,
        signed_url: signed?.signedUrl ?? null,
      });
    }

    let executivo: { nome: string | null; email: string | null; whatsapp: string | null } | null =
      null;
    const { data: piExec } = await supabaseAdmin
      .from("pis")
      .select("executivo_id")
      .eq("id", pv.pi_id)
      .maybeSingle();
    if (piExec?.executivo_id) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("nome, email, whatsapp")
        .eq("id", piExec.executivo_id)
        .maybeSingle();
      executivo = prof
        ? { nome: prof.nome, email: prof.email, whatsapp: (prof as any).whatsapp ?? null }
        : null;
    }

    return { pos_venda: pv, pi, anexos: anexosOut, executivo };
  });
