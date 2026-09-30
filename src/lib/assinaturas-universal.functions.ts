import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  DocumentoAssinatura,
  Signatario,
  AssinaturaHistoricoItem,
  AssinaturaConfigTenant,
  DocumentoTipo,
  AssinaturaStatus,
  MetodoAssinatura,
  OrdemAssinatura,
  TipoParticipante,
} from "@/types/assinaturas.types";
import { getSignatureProvider } from "./signatures/providers/signature-manager";
import {
  analisarDocumentoManualComIA,
  analisarStatusAssinaturasComIA,
} from "./signatures/ai-assistant";

const BUCKET = "assinaturas";

/**
 * Garante que o bucket de assinaturas exista no storage
 */
async function ensureBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
    }
  } catch (e) {
    console.warn("Storage bucket check:", e);
  }
}

/**
 * 1. LISTAR DOCUMENTOS DE ASSINATURA (COM FILTROS COMPLETOS)
 */
export const listDocumentosAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          search: z.string().optional(),
          status: z.string().optional(),
          documento_tipo: z.string().optional(),
          referencia_tipo: z.string().optional(),
          referencia_id: z.string().uuid().optional(),
          metodo: z.string().optional(),
        })
        .optional()
        .parse(d) || {}
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let query = supabase
      .from("documentos_assinatura")
      .select(`
        *,
        signatarios:assinatura_signatarios(*),
        historico:assinatura_historico(*, signatario:assinatura_signatarios(nome, email))
      `)
      .order("created_at", { ascending: false });

    if (data.status && data.status !== "todos") {
      query = query.eq("status", data.status);
    }
    if (data.documento_tipo && data.documento_tipo !== "todos") {
      query = query.eq("documento_tipo", data.documento_tipo);
    }
    if (data.referencia_tipo) {
      query = query.eq("referencia_tipo", data.referencia_tipo);
    }
    if (data.referencia_id) {
      query = query.eq("referencia_id", data.referencia_id);
    }
    if (data.metodo && data.metodo !== "todos") {
      query = query.eq("metodo_preferencial", data.metodo);
    }
    if (data.search) {
      const s = `%${data.search.trim()}%`;
      query = query.or(`titulo.ilike.${s},numero.ilike.${s},descricao.ilike.${s}`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("Erro ao listar documentos de assinatura:", error.message);
      return [] as DocumentoAssinatura[];
    }
    return (rows || []) as DocumentoAssinatura[];
  });

/**
 * 2. OBTER DOCUMENTO POR ID
 */
export const getDocumentoAssinaturaById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: doc, error } = await supabase
      .from("documentos_assinatura")
      .select(`
        *,
        signatarios:assinatura_signatarios(*),
        historico:assinatura_historico(*, signatario:assinatura_signatarios(nome, email))
      `)
      .eq("id", data.id)
      .maybeSingle();

    if (error || !doc) {
      throw new Error(error?.message || "Documento não encontrado");
    }

    return doc as DocumentoAssinatura;
  });

/**
 * 3. CRIAR OU ATUALIZAR DOCUMENTO DE ASSINATURA
 */
export const upsertDocumentoAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          id: z.string().uuid().optional(),
          documento_tipo: z.string(),
          referencia_tipo: z.string().optional().nullable(),
          referencia_id: z.string().uuid().optional().nullable(),
          titulo: z.string().min(2),
          numero: z.string().optional().nullable(),
          descricao: z.string().optional().nullable(),
          necessita_assinatura: z.boolean().default(true),
          metodo_preferencial: z.enum(["digital", "manual", "hibrido"]).default("hibrido"),
          ordem_tipo: z.enum(["simultanea", "sequencial"]).default("simultanea"),
          provedor_assinatura: z.string().default("interno"),
          validade_limite: z.string().optional().nullable(),
          documento_original_url: z.string().optional().nullable(),
          metadata: z.record(z.any()).optional().nullable(),
          signatarios_iniciais: z
            .array(
              z.object({
                nome: z.string().min(2),
                cpf_cnpj: z.string().optional().nullable(),
                email: z.string().email().optional().nullable().or(z.literal("")),
                telefone: z.string().optional().nullable(),
                cargo: z.string().optional().nullable(),
                empresa: z.string().optional().nullable(),
                tipo_participante: z.enum([
                  "cliente",
                  "parceiro",
                  "nexo",
                  "agencia",
                  "testemunha",
                  "outro",
                ]),
                metodo: z.enum(["digital", "manual"]),
                ordem: z.number().default(1),
              })
            )
            .optional(),
        })
        .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.id) {
      // Atualização
      const { data: updated, error } = await supabase
        .from("documentos_assinatura")
        .update({
          titulo: data.titulo,
          documento_tipo: data.documento_tipo,
          referencia_tipo: data.referencia_tipo,
          referencia_id: data.referencia_id,
          numero: data.numero,
          descricao: data.descricao,
          necessita_assinatura: data.necessita_assinatura,
          metodo_preferencial: data.metodo_preferencial,
          ordem_tipo: data.ordem_tipo,
          provedor_assinatura: data.provedor_assinatura,
          validade_limite: data.validade_limite,
          documento_original_url: data.documento_original_url,
          metadata: data.metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("assinatura_historico").insert({
        documento_id: data.id,
        acao: "documento_atualizado",
        descricao: `Documento "${data.titulo}" atualizado por usuário.`,
        user_id: userId,
      });

      return updated as DocumentoAssinatura;
    }

    // Criação de novo documento
    const ano = new Date().getFullYear();
    const numero =
      data.numero || `DOC-ASS-${ano}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: created, error } = await supabase
      .from("documentos_assinatura")
      .insert({
        titulo: data.titulo,
        documento_tipo: data.documento_tipo,
        referencia_tipo: data.referencia_tipo,
        referencia_id: data.referencia_id,
        numero,
        descricao: data.descricao,
        status: data.necessita_assinatura ? "aguardando_definicao" : "nao_necessita_assinatura",
        necessita_assinatura: data.necessita_assinatura,
        metodo_preferencial: data.metodo_preferencial,
        ordem_tipo: data.ordem_tipo,
        versao: 1,
        provedor_assinatura: data.provedor_assinatura,
        validade_limite: data.validade_limite,
        documento_original_url: data.documento_original_url,
        metadata: data.metadata || {},
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Registra histórico
    await supabase.from("assinatura_historico").insert({
      documento_id: created.id,
      acao: "documento_criado",
      descricao: `Documento de assinatura "${data.titulo}" (v1) criado no sistema.`,
      user_id: userId,
    });

    // Se forneceu signatários iniciais, insere-os
    if (data.signatarios_iniciais && data.signatarios_iniciais.length > 0) {
      for (const sig of data.signatarios_iniciais) {
        const token =
          crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
        await supabase.from("assinatura_signatarios").insert({
          documento_id: created.id,
          nome: sig.nome,
          cpf_cnpj: sig.cpf_cnpj || null,
          email: sig.email || null,
          telefone: sig.telefone || null,
          cargo: sig.cargo || null,
          empresa: sig.empresa || null,
          tipo_participante: sig.tipo_participante,
          ordem: sig.ordem,
          metodo: sig.metodo,
          status: "pendente",
          token,
        });
      }
    }

    // Se vinculado a Contrato ou PI, atualiza a referência na tabela de origem
    if (data.referencia_tipo === "contratos" && data.referencia_id) {
      await supabase
        .from("contratos")
        .update({
          necessita_assinatura: data.necessita_assinatura,
          documento_assinatura_id: created.id,
          status_assinatura: "aguardando_definicao",
        } as never)
        .eq("id", data.referencia_id);
    } else if (data.referencia_tipo === "pis" && data.referencia_id) {
      await supabase
        .from("pis")
        .update({
          necessita_assinatura: data.necessita_assinatura,
          documento_assinatura_id: created.id,
          status_assinatura: "aguardando_definicao",
        } as never)
        .eq("id", data.referencia_id);
    }

    return created as DocumentoAssinatura;
  });

/**
 * 4. ADICIONAR SIGNATÁRIO AO DOCUMENTO
 */
export const adicionarSignatario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          documento_id: z.string().uuid(),
          nome: z.string().min(2),
          cpf_cnpj: z.string().optional().nullable(),
          email: z.string().email().optional().nullable().or(z.literal("")),
          telefone: z.string().optional().nullable(),
          cargo: z.string().optional().nullable(),
          empresa: z.string().optional().nullable(),
          tipo_participante: z.enum([
            "cliente",
            "parceiro",
            "nexo",
            "agencia",
            "testemunha",
            "outro",
          ]),
          metodo: z.enum(["digital", "manual"]),
          ordem: z.number().default(1),
        })
        .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const token =
      crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);

    const { data: sig, error } = await supabase
      .from("assinatura_signatarios")
      .insert({
        documento_id: data.documento_id,
        nome: data.nome,
        cpf_cnpj: data.cpf_cnpj || null,
        email: data.email || null,
        telefone: data.telefone || null,
        cargo: data.cargo || null,
        empresa: data.empresa || null,
        tipo_participante: data.tipo_participante,
        ordem: data.ordem,
        metodo: data.metodo,
        status: "pendente",
        token,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase.from("assinatura_historico").insert({
      documento_id: data.documento_id,
      signatario_id: sig.id,
      acao: "signatario_adicionado",
      descricao: `Signatário "${data.nome}" (${data.tipo_participante}, método ${data.metodo}) adicionado.`,
      user_id: userId,
    });

    return sig as Signatario;
  });

/**
 * 5. REMOVER SIGNATÁRIO
 */
export const removerSignatario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sig } = await supabase
      .from("assinatura_signatarios")
      .select("id, documento_id, nome, status")
      .eq("id", data.id)
      .single();

    if (!sig) throw new Error("Signatário não encontrado");
    if (sig.status === "assinado") {
      throw new Error("Não é possível remover um signatário que já assinou o documento.");
    }

    const { error } = await supabase.from("assinatura_signatarios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("assinatura_historico").insert({
      documento_id: sig.documento_id,
      acao: "signatario_removido",
      descricao: `Signatário "${sig.nome}" foi removido do fluxo.`,
      user_id: userId,
    });

    return { ok: true };
  });

/**
 * 6. SOLICITAR ASSINATURA DIGITAL / ENVIAR PARA ASSINATURA
 */
export const solicitarAssinaturaDigital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ documento_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Busca documento e signatários
    const { data: doc } = await supabase
      .from("documentos_assinatura")
      .select("*, signatarios:assinatura_signatarios(*)")
      .eq("id", data.documento_id)
      .single();

    if (!doc) throw new Error("Documento não encontrado");

    const signatarios = (doc.signatarios || []) as Signatario[];
    if (signatarios.length === 0) {
      throw new Error("Adicione pelo menos um signatário antes de solicitar assinatura.");
    }

    // Provedor de assinatura
    const provider = getSignatureProvider(doc.provedor_assinatura);

    // Busca configurações do tenant para validar provedor externo se aplicável
    const { data: cfg } = await supabase
      .from("assinatura_configuracoes_tenant")
      .select("*")
      .maybeSingle();

    if (!provider.isConfigured(cfg?.provedor_configs)) {
      throw new Error(provider.getSetupInstructions());
    }

    const envelopeRes = await provider.createEnvelope(doc as any, signatarios, cfg?.provedor_configs);

    // Atualiza status do documento para enviado_para_assinatura
    const { error: updErr } = await supabase
      .from("documentos_assinatura")
      .update({
        status: "enviado_para_assinatura",
        provedor_envelope_id: envelopeRes.envelopeId,
        provedor_metadata: envelopeRes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.documento_id);

    if (updErr) throw new Error(updErr.message);

    // Atualiza signatários digitais para 'enviado'
    await supabase
      .from("assinatura_signatarios")
      .update({ status: "enviado" })
      .eq("documento_id", data.documento_id)
      .eq("status", "pendente");

    // Histórico de auditoria
    await supabase.from("assinatura_historico").insert({
      documento_id: data.documento_id,
      acao: "enviado_para_assinatura",
      descricao: `Documento enviado para assinatura via provedor "${provider.name}". Total de signatários: ${signatarios.length}.`,
      detalhes: { envelopeId: envelopeRes.envelopeId },
      user_id: userId,
    });

    // Notificações no sistema
    await supabase.from("notificacoes").insert({
      user_id: userId,
      tipo: "assinatura_solicitada" as never,
      titulo: `Documento enviado para assinatura`,
      mensagem: `"${doc.titulo}" foi disparado para ${signatarios.length} signatário(s).`,
      link: `/assinaturas?id=${doc.id}`,
    } as never);

    return { ok: true, envelopeId: envelopeRes.envelopeId };
  });

/**
 * 7. GERAR / SOLICITAR ASSINATURA MANUAL (COLETA FÍSICA)
 */
export const solicitarAssinaturaManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ documento_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: doc } = await supabase
      .from("documentos_assinatura")
      .select("*, signatarios:assinatura_signatarios(*)")
      .eq("id", data.documento_id)
      .single();

    if (!doc) throw new Error("Documento não encontrado");

    await supabase
      .from("documentos_assinatura")
      .update({
        status: "aguardando_assinatura",
        metodo_preferencial: "manual",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.documento_id);

    await supabase.from("assinatura_historico").insert({
      documento_id: data.documento_id,
      acao: "fluxo_manual_iniciado",
      descricao: "Documento preparado para impressão e coleta manual de assinaturas físicas.",
      user_id: userId,
    });

    return { ok: true };
  });

/**
 * 8. UPLOAD DO DOCUMENTO ASSINADO MANUALMENTE (PDF, JPG, PNG)
 */
export const uploadDocumentoManualAssinado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          documento_id: z.string().uuid(),
          nomeArquivo: z.string(),
          dataUrl: z.string().regex(/^data:(image\/(png|jpeg|jpg)|application\/pdf);base64,/),
        })
        .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureBucket();

    const m = data.dataUrl.match(/^data:(image\/(?:png|jpeg|jpg)|application\/pdf);base64,(.+)$/);
    if (!m) throw new Error("Arquivo inválido");
    const mime = m[1];
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > 15 * 1024 * 1024) throw new Error("Arquivo muito grande (máximo 15MB)");

    const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
    const path = `manuais/${data.documento_id}/documento_assinado_${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });
    if (upErr) throw new Error(upErr.message);

    // Obtém documento e signatários para análise da IA
    const { data: doc } = await supabase
      .from("documentos_assinatura")
      .select("*, signatarios:assinatura_signatarios(*)")
      .eq("id", data.documento_id)
      .single();

    // Roda Mídia OS IA assistiva
    const iaResult = doc
      ? analisarDocumentoManualComIA(doc as any, (doc.signatarios || []) as any, {
          nome: data.nomeArquivo,
          mimeType: mime,
          tamanhoBytes: bytes.length,
        })
      : null;

    // Atualiza status para 'aguardando_conferencia'
    await supabase
      .from("documentos_assinatura")
      .update({
        documento_manual_upload_url: path,
        status: "aguardando_conferencia",
        conferencia_status: "pendente",
        ia_analise: iaResult,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.documento_id);

    await supabase.from("assinatura_historico").insert({
      documento_id: data.documento_id,
      acao: "upload_documento_manual",
      descricao: `Upload do documento assinado fisicamente (${data.nomeArquivo}). Encaminhado para conferência visual.`,
      detalhes: { path, iaResumo: iaResult?.resumo_analise },
      user_id: userId,
    });

    return { ok: true, path, iaResult };
  });

/**
 * 9. CONFERÊNCIA DO DOCUMENTO MANUAL (APROVAÇÃO OU REJEIÇÃO HUMANA)
 */
export const conferirDocumentoManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          documento_id: z.string().uuid(),
          decisao: z.enum(["aprovar", "rejeitar", "solicitar_novo"]),
          observacoes: z.string().optional().nullable(),
        })
        .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: doc } = await supabase
      .from("documentos_assinatura")
      .select("*, signatarios:assinatura_signatarios(*)")
      .eq("id", data.documento_id)
      .single();

    if (!doc) throw new Error("Documento não encontrado");

    if (data.decisao === "aprovar") {
      // Documento formalmente aprovado
      await supabase
        .from("documentos_assinatura")
        .update({
          status: "assinado_manualmente",
          conferencia_status: "aprovado",
          conferencia_observacoes: data.observacoes || "Aprovado na conferência manual.",
          conferencia_por: userId,
          conferencia_em: new Date().toISOString(),
          documento_assinado_url: doc.documento_manual_upload_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.documento_id);

      // Atualiza signatários manuais como assinados
      await supabase
        .from("assinatura_signatarios")
        .update({
          status: "assinado",
          assinado_em: new Date().toISOString(),
        })
        .eq("documento_id", data.documento_id);

      await supabase.from("assinatura_historico").insert({
        documento_id: data.documento_id,
        acao: "documento_validado_conferencia",
        descricao: `Documento manual APROVADO e validado formalmente pelo conferente. Observações: ${data.observacoes || "Nenhuma"}`,
        user_id: userId,
      });

      // Se vinculado a Contrato ou PI, sincroniza status
      if (doc.referencia_tipo === "contratos" && doc.referencia_id) {
        await supabase
          .from("contratos")
          .update({
            status: "assinado",
            status_assinatura: "assinado_manualmente",
          } as never)
          .eq("id", doc.referencia_id);
      } else if (doc.referencia_tipo === "pis" && doc.referencia_id) {
        await supabase
          .from("pis")
          .update({
            status: "enviar_opec",
            status_assinatura: "assinado_manualmente",
          } as never)
          .eq("id", doc.referencia_id);
      }

      return { ok: true, status: "assinado_manualmente" };
    }

    // Rejeição ou solicitação de nova via
    const novoStatus: AssinaturaStatus = "aguardando_assinatura";
    await supabase
      .from("documentos_assinatura")
      .update({
        status: novoStatus,
        conferencia_status: data.decisao === "rejeitar" ? "rejeitado" : "solicitado_novo",
        conferencia_observacoes: data.observacoes || "Documento rejeitado na conferência.",
        conferencia_por: userId,
        conferencia_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.documento_id);

    await supabase.from("assinatura_historico").insert({
      documento_id: data.documento_id,
      acao: data.decisao === "rejeitar" ? "documento_rejeitado" : "novo_documento_solicitado",
      descricao: `Documento manual ${data.decisao === "rejeitar" ? "REJEITADO" : "solicitado nova digitalização"}. Motivo: ${data.observacoes || "Sem motivo informado"}`,
      user_id: userId,
    });

    return { ok: true, status: novoStatus };
  });

/**
 * 10. CRIAR NOVA VERSÃO DE DOCUMENTO (CONTROLE DE VERSÕES E INVALIDAÇÃO DE FLUXO ANTERIOR)
 */
export const criarNovaVersaoDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          documento_id: z.string().uuid(),
          motivo_alteracao: z.string().min(3),
        })
        .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: anterior } = await supabase
      .from("documentos_assinatura")
      .select("*, signatarios:assinatura_signatarios(*)")
      .eq("id", data.documento_id)
      .single();

    if (!anterior) throw new Error("Documento não encontrado");

    // Invalida a versão anterior
    await supabase
      .from("documentos_assinatura")
      .update({
        status: "cancelado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.documento_id);

    await supabase.from("assinatura_historico").insert({
      documento_id: data.documento_id,
      acao: "versao_invalidada",
      descricao: `Versão v${anterior.versao} invalidada para geração da versão v${anterior.versao + 1}. Motivo: ${data.motivo_alteracao}`,
      user_id: userId,
    });

    // Cria a nova versão v+1
    const novaVersaoNumero = (anterior.versao || 1) + 1;
    const { data: nova, error } = await supabase
      .from("documentos_assinatura")
      .insert({
        tenant_id: anterior.tenant_id,
        documento_tipo: anterior.documento_tipo,
        referencia_tipo: anterior.referencia_tipo,
        referencia_id: anterior.referencia_id,
        titulo: `${anterior.titulo} (v${novaVersaoNumero})`,
        numero: anterior.numero,
        descricao: anterior.descricao,
        status: "aguardando_definicao",
        necessita_assinatura: true,
        metodo_preferencial: anterior.metodo_preferencial,
        ordem_tipo: anterior.ordem_tipo,
        versao: novaVersaoNumero,
        versao_anterior_id: anterior.id,
        provedor_assinatura: anterior.provedor_assinatura,
        validade_limite: anterior.validade_limite,
        metadata: {
          ...(anterior.metadata || {}),
          motivo_nova_versao: data.motivo_alteracao,
        },
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Clona os signatários para a nova versão com novos tokens
    const signatariosAntigos = (anterior.signatarios || []) as Signatario[];
    for (const sig of signatariosAntigos) {
      const novoToken =
        crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
      await supabase.from("assinatura_signatarios").insert({
        documento_id: nova.id,
        nome: sig.nome,
        cpf_cnpj: sig.cpf_cnpj,
        email: sig.email,
        telefone: sig.telefone,
        cargo: sig.cargo,
        empresa: sig.empresa,
        tipo_participante: sig.tipo_participante,
        ordem: sig.ordem,
        metodo: sig.metodo,
        status: "pendente",
        token: novoToken,
      });
    }

    await supabase.from("assinatura_historico").insert({
      documento_id: nova.id,
      acao: "versao_gerada",
      descricao: `Nova versão v${novaVersaoNumero} gerada com base na versão v${anterior.versao}.`,
      user_id: userId,
    });

    return nova as DocumentoAssinatura;
  });

/**
 * 11. ENVIAR LEMBRETE DE ASSINATURA (E-MAIL / WHATSAPP / NOTIFICAÇÃO)
 */
export const enviarLembreteAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          documento_id: z.string().uuid(),
          signatario_id: z.string().uuid().optional(),
          canal: z.enum(["sistema", "whatsapp", "email"]).default("sistema"),
        })
        .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: doc } = await supabase
      .from("documentos_assinatura")
      .select("*, signatarios:assinatura_signatarios(*)")
      .eq("id", data.documento_id)
      .single();

    if (!doc) throw new Error("Documento não encontrado");

    let signatariosParaLembrar = (doc.signatarios || []) as Signatario[];
    if (data.signatario_id) {
      signatariosParaLembrar = signatariosParaLembrar.filter((s) => s.id === data.signatario_id);
    } else {
      signatariosParaLembrar = signatariosParaLembrar.filter((s) => s.status !== "assinado");
    }

    for (const sig of signatariosParaLembrar) {
      await supabase
        .from("assinatura_signatarios")
        .update({
          lembretes_count: (sig.lembretes_count || 0) + 1,
          ultimo_lembrete_em: new Date().toISOString(),
        })
        .eq("id", sig.id);

      await supabase.from("assinatura_historico").insert({
        documento_id: data.documento_id,
        signatario_id: sig.id,
        acao: "lembrete_enviado",
        descricao: `Lembrete de assinatura enviado para "${sig.nome}" via canal ${data.canal.toUpperCase()}.`,
        user_id: userId,
      });
    }

    await supabase
      .from("documentos_assinatura")
      .update({
        lembretes_enviados: (doc.lembretes_enviados || 0) + 1,
        ultimo_lembrete_em: new Date().toISOString(),
      })
      .eq("id", data.documento_id);

    return { ok: true, lembradosCount: signatariosParaLembrar.length };
  });

/**
 * 12. CONFIGURAÇÕES DE ASSINATURA POR TENANT (GET / UPSERT)
 */
export const getConfigAssinaturaTenant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: cfg, error } = await supabase
      .from("assinatura_configuracoes_tenant")
      .select("*")
      .maybeSingle();

    if (error) {
      console.warn("Aviso ao buscar configuração de assinatura do tenant:", error.message);
    }

    if (!cfg) {
      return {
        metodos_permitidos: ["digital", "manual", "hibrido"],
        provedor_padrao: "interno",
        provedor_configs: {},
        bloqueios: {
          bloquear_campanha_sem_contrato: false,
          bloquear_opec_sem_pi: true,
          bloquear_faturamento_sem_assinatura: false,
        },
        prazo_padrao_dias: 5,
        lembretes_automaticos: true,
        lembretes_frequencia_dias: 2,
        lembretes_max: 3,
        canais_notificacao: ["email", "sistema", "whatsapp"],
        signatarios_padrao: [],
      } as AssinaturaConfigTenant;
    }

    return cfg as AssinaturaConfigTenant;
  });

export const updateConfigAssinaturaTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          metodos_permitidos: z.array(z.enum(["digital", "manual", "hibrido"])),
          provedor_padrao: z.enum(["interno", "docusign", "clicksign", "zapsign"]),
          provedor_configs: z.record(z.any()),
          bloqueios: z.object({
            bloquear_campanha_sem_contrato: z.boolean().optional(),
            bloquear_opec_sem_pi: z.boolean().optional(),
            bloquear_faturamento_sem_assinatura: z.boolean().optional(),
          }),
          prazo_padrao_dias: z.number().min(1).max(90),
          lembretes_automaticos: z.boolean(),
          lembretes_frequencia_dias: z.number().min(1).max(30),
          lembretes_max: z.number().min(1).max(10),
          canais_notificacao: z.array(z.string()),
          signatarios_padrao: z.array(z.any()).default([]),
        })
        .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: existing } = await supabase
      .from("assinatura_configuracoes_tenant")
      .select("id")
      .maybeSingle();

    if (existing?.id) {
      const { data: upd, error } = await supabase
        .from("assinatura_configuracoes_tenant")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return upd as AssinaturaConfigTenant;
    }

    const { data: ins, error } = await supabase
      .from("assinatura_configuracoes_tenant")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return ins as AssinaturaConfigTenant;
  });

/**
 * 13. CONSULTA PÚBLICA DE DOCUMENTO POR TOKEN DE SIGNATÁRIO
 */
export const getDocumentoPublicoPorToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { data: sig } = await supabaseAdmin
      .from("assinatura_signatarios")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();

    if (!sig) throw new Error("Link de assinatura inválido ou expirado.");

    const { data: doc } = await supabaseAdmin
      .from("documentos_assinatura")
      .select(`
        *,
        signatarios:assinatura_signatarios(id, nome, cargo, empresa, tipo_participante, ordem, metodo, status, assinado_em)
      `)
      .eq("id", sig.documento_id)
      .single();

    if (!doc) throw new Error("Documento não localizado.");

    // Se o signatário ainda estava como 'enviado' ou 'pendente', marca como 'visualizado'
    if (sig.status === "enviado" || sig.status === "pendente") {
      await supabaseAdmin
        .from("assinatura_signatarios")
        .update({ status: "visualizado" })
        .eq("id", sig.id);

      await supabaseAdmin.from("assinatura_historico").insert({
        documento_id: sig.documento_id,
        signatario_id: sig.id,
        acao: "link_visualizado",
        descricao: `Signatário "${sig.nome}" visualizou o documento via link público.`,
      });
    }

    return {
      signatario: sig as Signatario,
      documento: doc as DocumentoAssinatura,
    };
  });

/**
 * 14. REGISTRO PÚBLICO DE ASSINATURA DIGITAL (CANVAS / BIOMETRIA / IP)
 */
export const registrarAssinaturaDigitalPublica = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          token: z.string().min(10),
          nome: z.string().min(2),
          cpf_cnpj: z.string().optional().nullable(),
          email: z.string().email().optional().nullable().or(z.literal("")),
          assinatura_data_url: z
            .string()
            .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/)
            .max(2_500_000),
          user_agent: z.string().max(500).optional(),
          geolocalizacao: z.record(z.any()).optional(),
        })
        .parse(d)
  )
  .handler(async ({ data }) => {
    await ensureBucket();
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      null;

    const { data: sig } = await supabaseAdmin
      .from("assinatura_signatarios")
      .select("*, documento:documentos_assinatura(*)")
      .eq("token", data.token)
      .maybeSingle();

    if (!sig) throw new Error("Link inválido.");
    if (sig.status === "assinado") throw new Error("Esta assinatura já foi formalizada anteriormente.");

    // Salva imagem da rubrica
    const m = data.assinatura_data_url.match(/^data:image\/([a-z]+);base64,(.+)$/);
    if (!m) throw new Error("Formato de assinatura inválido.");
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length < 200) throw new Error("Por favor, desenhe sua rubrica no quadro.");

    const path = `rubricas/${sig.documento_id}/${sig.id}_${Date.now()}.png`;
    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) throw new Error(upErr.message);

    // Atualiza signatário
    const assinadoEm = new Date().toISOString();
    await supabaseAdmin
      .from("assinatura_signatarios")
      .update({
        status: "assinado",
        nome: data.nome,
        cpf_cnpj: data.cpf_cnpj || sig.cpf_cnpj,
        email: data.email || sig.email,
        assinado_em: assinadoEm,
        assinatura_imagem_url: path,
        ip,
        user_agent: data.user_agent || null,
        geolocalizacao: data.geolocalizacao || {},
      })
      .eq("id", sig.id);

    // Histórico
    await supabaseAdmin.from("assinatura_historico").insert({
      documento_id: sig.documento_id,
      signatario_id: sig.id,
      acao: "assinatura_digital_concluida",
      descricao: `Signatário "${data.nome}" (${sig.tipo_participante}) concluiu a assinatura digital. IP: ${ip || "N/D"}.`,
      detalhes: { ip, assinadoEm },
    });

    // Verifica se todos os signatários assinaram
    const { data: todos } = await supabaseAdmin
      .from("assinatura_signatarios")
      .select("status")
      .eq("documento_id", sig.documento_id);

    const pendentes = (todos || []).filter((s) => s.status !== "assinado");
    const novoStatusDoc: AssinaturaStatus =
      pendentes.length === 0 ? "assinado" : "assinado_parcialmente";

    await supabaseAdmin
      .from("documentos_assinatura")
      .update({
        status: novoStatusDoc,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sig.documento_id);

    // Se todos assinaram e estava vinculado a contrato ou PI, atualiza o status de negócio
    if (novoStatusDoc === "assinado") {
      const doc = sig.documento;
      if (doc?.referencia_tipo === "contratos" && doc?.referencia_id) {
        await supabaseAdmin
          .from("contratos")
          .update({ status: "assinado", status_assinatura: "assinado" } as never)
          .eq("id", doc.referencia_id);
      } else if (doc?.referencia_tipo === "pis" && doc?.referencia_id) {
        await supabaseAdmin
          .from("pis")
          .update({ status: "enviar_opec", status_assinatura: "assinado" } as never)
          .eq("id", doc.referencia_id);
      }
    }

    return { ok: true, statusDoc: novoStatusDoc };
  });

/**
 * 15. RECUSA FORMAL DE ASSINATURA PELO SIGNATÁRIO
 */
export const recusarAssinaturaPublica = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          token: z.string().min(10),
          motivo: z.string().min(3),
        })
        .parse(d)
  )
  .handler(async ({ data }) => {
    const { data: sig } = await supabaseAdmin
      .from("assinatura_signatarios")
      .select("*, documento:documentos_assinatura(*)")
      .eq("token", data.token)
      .maybeSingle();

    if (!sig) throw new Error("Link inválido.");

    await supabaseAdmin
      .from("assinatura_signatarios")
      .update({
        status: "recusado",
        recusado_motivo: data.motivo,
        recusado_em: new Date().toISOString(),
      })
      .eq("id", sig.id);

    await supabaseAdmin
      .from("documentos_assinatura")
      .update({
        status: "recusado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sig.documento_id);

    await supabaseAdmin.from("assinatura_historico").insert({
      documento_id: sig.documento_id,
      signatario_id: sig.id,
      acao: "assinatura_recusada",
      descricao: `Signatário "${sig.nome}" recusou formalmente assinar o documento. Motivo: "${data.motivo}".`,
    });

    return { ok: true };
  });
