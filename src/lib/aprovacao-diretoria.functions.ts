import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "assinaturas";

/** Cria (ou recupera pendente) o link público de aprovação da Diretoria. */
export const criarLinkAprovacaoDiretoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: existente } = await supabaseAdmin
      .from("pi_aprovacoes_diretoria")
      .select("token, status")
      .eq("pi_id", data.pi_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existente && existente.status === "pendente") {
      return { token: existente.token };
    }
    const token = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
    const { data: pi } = await supabaseAdmin
      .from("pis")
      .select("tenant_id, status")
      .eq("id", data.pi_id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("pi_aprovacoes_diretoria")
      .insert({
        pi_id: data.pi_id,
        token,
        status: "pendente",
        criado_por: userId,
        tenant_id: pi?.tenant_id ?? null,
      });
    if (error) throw new Error(error.message);
    if (pi && (pi.status === "rascunho" || pi.status === "reprovado")) {
      await supabaseAdmin
        .from("pis")
        .update({ status: "aguardando_aprovacao" } as never)
        .eq("id", data.pi_id);
    }
    return { token };
  });

/** Público: dados do PI para tela de aprovação da Diretoria. */
export const getPiAprovacaoPorToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { data: aprov } = await supabaseAdmin
      .from("pi_aprovacoes_diretoria")
      .select(
        "id, pi_id, status, aprovador_nome, aprovador_cargo, assinatura_url, decidido_em, motivo_reprovacao",
      )
      .eq("token", data.token)
      .maybeSingle();
    if (!aprov) throw new Error("Link inválido ou expirado");

    let assinatura_signed_url: string | null = null;
    if (aprov.assinatura_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(aprov.assinatura_url, 60 * 60);
      assinatura_signed_url = signed?.signedUrl ?? null;
    }

    const { data: pi } = await supabaseAdmin
      .from("pis")
      .select(`*, cliente:clientes(*), agencia:agencias(*), itens:pi_itens(*)`)
      .eq("id", aprov.pi_id)
      .single();
    if (!pi) throw new Error("PI não encontrado");

    let atendimento: { nome: string; email: string } | null = null;
    if (pi.executivo_id) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("nome,email")
        .eq("id", pi.executivo_id)
        .maybeSingle();
      if (prof) atendimento = { nome: prof.nome, email: prof.email };
    }

    type Contato = { nome?: string; funcao?: string; email?: string; telefone?: string };
    const enrich = (ent: Record<string, unknown> | null | undefined) => {
      if (!ent) return ent;
      const contatos = (ent.contatos as Contato[] | undefined) ?? [];
      const principal = contatos[0] ?? {};
      const telefone =
        principal.telefone || contatos.find((c: any) => c?.telefone)?.telefone || null;
      const email = principal.email || contatos.find((c: any) => c?.email)?.email || null;
      const responsavel = principal.nome
        ? `${principal.nome}${principal.funcao ? ` (${principal.funcao})` : ""}`
        : null;
      return {
        ...ent,
        ie: (ent.inscricao_estadual as string | null) ?? null,
        im: (ent.inscricao_municipal as string | null) ?? null,
        telefone,
        email,
        responsavel,
      };
    };

    const enrichedPi = {
      ...pi,
      cliente: enrich(pi.cliente as Record<string, unknown> | null),
      agencia: enrich(pi.agencia as Record<string, unknown> | null),
      atendimento,
    };

    return { aprovacao: { ...aprov, assinatura_signed_url }, pi: enrichedPi };
  });

/** Público: registra aprovação ou reprovação da Diretoria com assinatura desenhada. */
export const registrarAprovacaoDiretoria = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(10).max(100),
        decisao: z.enum(["aprovado", "reprovado"]),
        nome: z.string().trim().min(3).max(120),
        cargo: z.string().trim().max(120).optional(),
        motivo: z.string().max(500).optional(),
        assinatura_data_url: z
          .string()
          .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/)
          .max(2_500_000)
          .optional(),
        user_agent: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      null;

    const { data: aprov } = await supabaseAdmin
      .from("pi_aprovacoes_diretoria")
      .select("id, status, pi_id, criado_por")
      .eq("token", data.token)
      .maybeSingle();
    if (!aprov) throw new Error("Link inválido");
    if (aprov.status !== "pendente") throw new Error("Esta solicitação já foi decidida");

    let assinaturaPath: string | null = null;
    if (data.decisao === "aprovado") {
      if (!data.assinatura_data_url) throw new Error("Assinatura obrigatória para aprovar");
      const m = data.assinatura_data_url.match(/^data:image\/([a-z]+);base64,(.+)$/);
      if (!m) throw new Error("Assinatura inválida");
      const bytes = Buffer.from(m[2], "base64");
      if (bytes.length < 200) throw new Error("Assinatura muito curta");
      if (bytes.length > 2 * 1024 * 1024) throw new Error("Assinatura muito grande");
      assinaturaPath = `diretoria/${aprov.pi_id}/${aprov.id}.png`;
      const up = await supabaseAdmin.storage.from(BUCKET).upload(assinaturaPath, bytes, {
        contentType: `image/${m[1] === "jpeg" ? "jpeg" : m[1]}`,
        upsert: true,
      });
      if (up.error) throw new Error(up.error.message);
    }

    const { error } = await supabaseAdmin
      .from("pi_aprovacoes_diretoria")
      .update({
        status: data.decisao,
        aprovador_nome: data.nome,
        aprovador_cargo: data.cargo ?? null,
        assinatura_url: assinaturaPath,
        motivo_reprovacao: data.decisao === "reprovado" ? (data.motivo ?? null) : null,
        ip,
        user_agent: data.user_agent ?? null,
        decidido_em: new Date().toISOString(),
      })
      .eq("id", aprov.id);
    if (error) throw new Error(error.message);

    // Atualiza status do PI
    const { data: piAtual } = await supabaseAdmin
      .from("pis")
      .select("status, numero, campanha, executivo_id, cliente_id, agencia_id")
      .eq("id", aprov.pi_id)
      .maybeSingle();

    if (piAtual && !["cancelado", "substituido", "faturado"].includes(piAtual.status)) {
      if (data.decisao === "aprovado") {
        await supabaseAdmin
          .from("pis")
          .update({
            status: "aprovado",
            aprovado_por: aprov.criado_por ?? null,
            aprovado_em: new Date().toISOString(),
            motivo_reprovacao: null,
          } as never)
          .eq("id", aprov.pi_id);
      } else {
        await supabaseAdmin
          .from("pis")
          .update({
            status: "reprovado",
            motivo_reprovacao: data.motivo ?? "Reprovado pela Diretoria",
          } as never)
          .eq("id", aprov.pi_id);
      }

      await supabaseAdmin.from("pi_historico").insert({
        pi_id: aprov.pi_id,
        cliente_id: piAtual.cliente_id,
        agencia_id: piAtual.agencia_id,
        acao:
          data.decisao === "aprovado"
            ? "Aprovado pela Diretoria (link)"
            : "Reprovado pela Diretoria (link)",
        detalhes: {
          aprovador: data.nome,
          cargo: data.cargo ?? null,
          ip,
          motivo: data.motivo ?? null,
        },
      } as never);

      if (piAtual.executivo_id) {
        await supabaseAdmin.from("notificacoes").insert({
          user_id: piAtual.executivo_id,
          tipo: "pi_aprovado" as never,
          titulo: `PI ${piAtual.numero} ${data.decisao === "aprovado" ? "aprovado" : "reprovado"} pela Diretoria`,
          mensagem: `${piAtual.campanha} — ${data.decisao === "aprovado" ? "aprovado" : "reprovado"} por ${data.nome}.`,
          link: `/pi?id=${aprov.pi_id}`,
          metadata: { ref_id: aprov.pi_id, evento: `diretoria_${data.decisao}` } as never,
        } as never);
      }
    }

    return { ok: true, decisao: data.decisao };
  });

/** Retorna assinatura da Diretoria pelo pi_id (via aprovação por link), para uso no PDF. */
export const getAssinaturaDiretoriaPorLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: aprov } = await supabaseAdmin
      .from("pi_aprovacoes_diretoria")
      .select("aprovador_nome, assinatura_url, status")
      .eq("pi_id", data.pi_id)
      .eq("status", "aprovado")
      .order("decidido_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!aprov?.assinatura_url) return { dataUrl: null, nome: aprov?.aprovador_nome ?? null };
    const { data: file } = await supabaseAdmin.storage.from(BUCKET).download(aprov.assinatura_url);
    if (!file) return { dataUrl: null, nome: aprov.aprovador_nome ?? null };
    const buf = Buffer.from(await file.arrayBuffer());
    return {
      dataUrl: `data:image/png;base64,${buf.toString("base64")}`,
      nome: aprov.aprovador_nome ?? null,
    };
  });

/** Lista o status mais recente de aprovação da Diretoria por PI (do tenant do usuário). */
export const listStatusAprovacaoDiretoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = (prof as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId)
      return [] as Array<{
        pi_id: string;
        status: string;
        aprovador_nome: string | null;
        decidido_em: string | null;
        created_at: string;
      }>;
    const { data } = await supabaseAdmin
      .from("pi_aprovacoes_diretoria")
      .select("pi_id, status, aprovador_nome, decidido_em, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    const map = new Map<
      string,
      {
        pi_id: string;
        status: string;
        aprovador_nome: string | null;
        decidido_em: string | null;
        created_at: string;
      }
    >();
    for (const row of (data ?? []) as Array<{
      pi_id: string;
      status: string;
      aprovador_nome: string | null;
      decidido_em: string | null;
      created_at: string;
    }>) {
      if (!map.has(row.pi_id)) map.set(row.pi_id, row);
    }
    return Array.from(map.values());
  });
