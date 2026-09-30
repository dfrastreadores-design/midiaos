import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "assinaturas";

/** Upload da assinatura do executivo (PNG base64 dataURL). */
export const uploadAssinaturaExecutivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        dataUrl: z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.user_id !== userId) {
      // só admin pode subir assinatura de outro usuário
      const { data: r } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!r) throw new Error("Sem permissão");
    }
    const m = data.dataUrl.match(/^data:image\/([a-z]+);base64,(.+)$/);
    if (!m) throw new Error("Imagem inválida");
    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > 2 * 1024 * 1024) throw new Error("Imagem muito grande (máx 2MB)");
    const path = `${data.user_id}/assinatura.${ext}`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
      contentType: `image/${m[1]}`,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ assinatura_url: path }).eq("id", data.user_id);
    return { ok: true, path };
  });

export const removerAssinaturaExecutivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.user_id !== userId) {
      const { data: r } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!r) throw new Error("Sem permissão");
    }
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("assinatura_url")
      .eq("id", data.user_id)
      .maybeSingle();
    if (prof?.assinatura_url) {
      await supabaseAdmin.storage.from(BUCKET).remove([prof.assinatura_url]);
    }
    await supabaseAdmin.from("profiles").update({ assinatura_url: null }).eq("id", data.user_id);
    return { ok: true };
  });

/** Retorna a assinatura do executivo de um PI como dataURL (base64). */
export const getAssinaturaExecutivoDoPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: pi } = await supabaseAdmin
      .from("pis")
      .select("executivo_id")
      .eq("id", data.pi_id)
      .maybeSingle();
    if (!pi?.executivo_id) return { dataUrl: null, nome: null };
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("assinatura_url, nome")
      .eq("id", pi.executivo_id)
      .maybeSingle();
    const nome = prof?.nome ?? null;
    if (!prof?.assinatura_url) return { dataUrl: null, nome };
    const { data: file, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(prof.assinatura_url);
    if (error || !file) return { dataUrl: null, nome };
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = prof.assinatura_url.split(".").pop() || "png";
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { dataUrl: `data:${mime};base64,${buf.toString("base64")}`, nome };
  });

/** Versão PÚBLICA: retorna a assinatura do executivo a partir do token de assinatura do cliente. */
export const getAssinaturaExecutivoPorToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { data: assin } = await supabaseAdmin
      .from("pi_assinaturas_cliente")
      .select("pi_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!assin?.pi_id)
      return { exec: { dataUrl: null, nome: null }, dir: { dataUrl: null, nome: null } };

    const { data: pi } = await supabaseAdmin
      .from("pis")
      .select("executivo_id, aprovado_por")
      .eq("id", assin.pi_id)
      .maybeSingle();
    if (!pi) return { exec: { dataUrl: null, nome: null }, dir: { dataUrl: null, nome: null } };

    const getSig = async (uid: string | null) => {
      if (!uid) return { dataUrl: null, nome: null };
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("assinatura_url, nome")
        .eq("id", uid)
        .maybeSingle();
      const nome = prof?.nome ?? null;
      if (!prof?.assinatura_url) return { dataUrl: null, nome };
      const { data: file, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(prof.assinatura_url);
      if (error || !file) return { dataUrl: null, nome };
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = prof.assinatura_url.split(".").pop() || "png";
      const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      return { dataUrl: `data:${mime};base64,${buf.toString("base64")}`, nome };
    };

    const [exec, dir] = await Promise.all([
      getSig(pi.executivo_id as string | null),
      getSig(pi.aprovado_por as string | null),
    ]);

    return { exec, dir };
  });

/** Cria (ou recupera) o link público de assinatura do cliente para um PI. */
export const criarLinkAssinaturaCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: existente } = await supabaseAdmin
      .from("pi_assinaturas_cliente")
      .select("token, status")
      .eq("pi_id", data.pi_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existente && existente.status === "pendente") {
      return { token: existente.token };
    }
    const token = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
    const { error } = await supabaseAdmin
      .from("pi_assinaturas_cliente")
      .insert({ pi_id: data.pi_id, token, status: "pendente", criado_por: userId });
    if (error) throw new Error(error.message);

    // Quando cria o link, muda o status do PI para "aguardando_assinatura"
    await supabaseAdmin
      .from("pis")
      .update({ status: "aguardando_assinatura" } as never)
      .eq("id", data.pi_id);

    return { token };
  });

/** Retorna a assinatura da diretoria de um PI como dataURL (base64). */
export const getAssinaturaDiretoriaDoPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    // 1) Aprovação via link (Diretoria assinou pelo link público)
    const { data: aprovLink } = await supabaseAdmin
      .from("pi_aprovacoes_diretoria")
      .select("aprovador_nome, assinatura_url")
      .eq("pi_id", data.pi_id)
      .eq("status", "aprovado")
      .order("decidido_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aprovLink?.assinatura_url) {
      const { data: file } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(aprovLink.assinatura_url);
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        return {
          dataUrl: `data:image/png;base64,${buf.toString("base64")}`,
          nome: aprovLink.aprovador_nome ?? null,
        };
      }
    }
    // 2) Aprovação interna (usuário admin no sistema) — usa assinatura do perfil
    const { data: pi } = await supabaseAdmin
      .from("pis")
      .select("aprovado_por")
      .eq("id", data.pi_id)
      .maybeSingle();
    if (!pi?.aprovado_por) return { dataUrl: null, nome: aprovLink?.aprovador_nome ?? null };
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("assinatura_url, nome")
      .eq("id", pi.aprovado_por)
      .maybeSingle();
    const nome = prof?.nome ?? null;
    if (!prof?.assinatura_url) return { dataUrl: null, nome };
    const { data: file, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(prof.assinatura_url);
    if (error || !file) return { dataUrl: null, nome };
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = prof.assinatura_url.split(".").pop() || "png";
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { dataUrl: `data:${mime};base64,${buf.toString("base64")}`, nome };
  });

export const getAssinaturaClienteDoPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("pi_assinaturas_cliente")
      .select("nome_assinante, cpf, email, ip, assinado_em, status, token, assinatura_url")
      .eq("pi_id", data.pi_id)
      .eq("status", "assinado")
      .order("assinado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) return null;
    let dataUrl: string | null = null;
    if (row.assinatura_url) {
      const { data: file } = await supabaseAdmin.storage.from(BUCKET).download(row.assinatura_url);
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
      }
    }
    return { ...row, assinatura_data_url: dataUrl };
  });

// ====== PÚBLICAS (sem middleware) — chamadas pela tela /assinar/$token ======

export const getPiPublicoPorToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { data: assin } = await supabaseAdmin
      .from("pi_assinaturas_cliente")
      .select("id, pi_id, status, nome_assinante, cpf, assinado_em, assinatura_url")
      .eq("token", data.token)
      .maybeSingle();
    if (!assin) throw new Error("Link inválido ou expirado");

    let assinatura_signed_url: string | null = null;
    if (assin.assinatura_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(assin.assinatura_url, 60 * 60);
      assinatura_signed_url = signed?.signedUrl ?? null;
    }

    const { data: pi } = await supabaseAdmin
      .from("pis")
      .select(
        `
        *,
        cliente:clientes(*),
        agencia:agencias(*),
        itens:pi_itens(*)
      `,
      )
      .eq("id", assin.pi_id)
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

    // Enriquece cliente/agência com campos esperados pelo PDF
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

    return { assinatura: { ...assin, assinatura_signed_url }, pi: enrichedPi };
  });

export const registrarAssinaturaCliente = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(10).max(100),
        nome: z.string().trim().min(3).max(120),
        cpf: z.string().trim().min(11).max(20),
        email: z.string().email().max(160).optional().or(z.literal("")),
        user_agent: z.string().max(500).optional(),
        assinatura_data_url: z
          .string()
          .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/)
          .max(2_500_000),
        documento_tipo: z.enum(["cnh", "rg"]).optional(),
        documento_data_url: z
          .string()
          .regex(/^data:(image\/(png|jpeg|jpg)|application\/pdf);base64,/)
          .max(8_000_000)
          .optional(),
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
    const { data: assin } = await supabaseAdmin
      .from("pi_assinaturas_cliente")
      .select("id, status, pi_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!assin) throw new Error("Link inválido");
    if (assin.status === "assinado") throw new Error("Este PI já foi assinado");

    // Upload da imagem da assinatura manuscrita
    const m = data.assinatura_data_url.match(/^data:image\/([a-z]+);base64,(.+)$/);
    if (!m) throw new Error("Assinatura inválida");
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length < 200) throw new Error("Assinatura muito curta — desenhe sua assinatura");
    if (bytes.length > 2 * 1024 * 1024) throw new Error("Imagem da assinatura muito grande");
    const path = `cliente/${assin.pi_id}/${assin.id}.png`;
    const up = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
      contentType: `image/${m[1] === "jpeg" ? "jpeg" : m[1]}`,
      upsert: true,
    });
    if (up.error) throw new Error(up.error.message);

    // Upload opcional do documento de identificação (CNH ou RG)
    let docPath: string | null = null;
    let docMime: string | null = null;
    if (data.documento_data_url && data.documento_tipo) {
      const dm = data.documento_data_url.match(
        /^data:(image\/(?:png|jpeg|jpg)|application\/pdf);base64,(.+)$/,
      );
      if (!dm) throw new Error("Documento inválido");
      docMime = dm[1];
      const docBytes = Buffer.from(dm[2], "base64");
      if (docBytes.length < 1024) throw new Error("Documento muito pequeno");
      if (docBytes.length > 6 * 1024 * 1024) throw new Error("Documento muito grande (máx 6MB)");
      const docExt =
        docMime === "application/pdf" ? "pdf" : docMime === "image/png" ? "png" : "jpg";
      docPath = `cliente/${assin.pi_id}/${assin.id}-doc-${data.documento_tipo}.${docExt}`;
      const upDoc = await supabaseAdmin.storage.from(BUCKET).upload(docPath, docBytes, {
        contentType: docMime,
        upsert: true,
      });
      if (upDoc.error) throw new Error(upDoc.error.message);
    }

    const { error } = await supabaseAdmin
      .from("pi_assinaturas_cliente")
      .update({
        status: "assinado",
        nome_assinante: data.nome,
        cpf: data.cpf,
        email: data.email || null,
        ip,
        user_agent: data.user_agent ?? null,
        assinado_em: new Date().toISOString(),
        assinatura_url: path,
        documento_tipo: data.documento_tipo ?? null,
        documento_url: docPath,
        documento_mime: docMime,
      })
      .eq("id", assin.id);
    if (error) throw new Error(error.message);

    // Atualiza status do PI para "aprovado" (assinado pelo cliente)
    const { data: piAtual } = await supabaseAdmin
      .from("pis")
      .select("status, cliente_id, agencia_id, executivo_id, numero, campanha")
      .eq("id", assin.pi_id)
      .maybeSingle();

    if (
      piAtual &&
      piAtual.status !== "cancelado" &&
      piAtual.status !== "substituido" &&
      piAtual.status !== "faturado"
    ) {
      await supabaseAdmin
        .from("pis")
        .update({ status: "enviar_opec", aprovado_em: new Date().toISOString() } as never)
        .eq("id", assin.pi_id);

      await supabaseAdmin.from("pi_historico").insert({
        pi_id: assin.pi_id,
        cliente_id: piAtual.cliente_id,
        agencia_id: piAtual.agencia_id,
        acao: "Assinado pelo cliente",
        detalhes: { assinante: data.nome, cpf: data.cpf, ip },
      } as never);

      // Notifica executivo responsável
      if (piAtual.executivo_id) {
        await supabaseAdmin.from("notificacoes").insert({
          user_id: piAtual.executivo_id,
          tipo: "pi_aprovado" as never,
          titulo: `PI ${piAtual.numero} assinado pelo cliente`,
          mensagem: `${piAtual.campanha} — assinado por ${data.nome}. O status foi alterado para Enviar para OPEC.`,
          link: `/pi?id=${assin.pi_id}`,
          metadata: { ref_id: assin.pi_id, evento: "assinado_cliente" } as never,
        } as never);
      }

      // Notifica usuários com perfil OPEC
      const { data: opecUsers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "opec");

      const opecNotificacoes = (opecUsers ?? []).map((u) => ({
        user_id: u.user_id,
        tipo: "pi_aprovado" as never,
        titulo: `Novo PI assinado — pronto para OPEC`,
        mensagem: `PI ${piAtual.numero} (${piAtual.campanha}) assinado por ${data.nome}. Dê andamento na programação.`,
        link: `/pi?id=${assin.pi_id}`,
        metadata: { ref_id: assin.pi_id, evento: "enviar_opec" } as never,
      }));

      if (opecNotificacoes.length > 0) {
        await supabaseAdmin.from("notificacoes").insert(opecNotificacoes as never);
      }
    }

    return { ok: true };
  });
