import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { calculateSplitFinancials, generateContractContent } from "./representacao-contratos";
import {
  ContratoRepresentacao,
  ContratoRepresentacaoSchema,
  PedidoFaturamentoIntermediado,
  PedidoFaturamentoIntermediadoSchema,
} from "@/types/representacao-contratos.types";

const TARGET_CNPJ = "68.279.031/0001-67";

/**
 * 1. LISTAR CONTRATOS DE REPRESENTAÇÃO
 */
export const listContratosRepresentacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { parceiro_id?: string; status?: string } | undefined) => d || {})
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // Busca o tenant do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id;

    let query = (client.from("contratos_representacao") as any)
      .select("*, parceiro:parceiros(id, razao_social, nome_fantasia, cnpj, chave_pix, contato_nome, contato_email, contato_telefone)")
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.or(`tenant_cnpj.eq.${TARGET_CNPJ},tenant_id.eq.${tenantId}`);
    } else {
      query = query.eq("tenant_cnpj", TARGET_CNPJ);
    }

    if (data.parceiro_id) {
      query = query.eq("parceiro_id", data.parceiro_id);
    }

    if (data.status && data.status !== "todos") {
      query = query.eq("status", data.status);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("[listContratosRepresentacao] Erro na consulta:", error.message);
      // Se tabela ainda não foi criada no schema cache, retorna array vazio defensivo
      return [];
    }

    return (rows || []).map((r: any) => ({
      ...r,
      aliquota_imposto_nexo_percentual: Number(r.aliquota_imposto_nexo_percentual) || 6.0,
      prazo_repasse_dias: Number(r.prazo_repasse_dias) || 3,
      comissao_fixa_percentual: r.comissao_fixa_percentual ? Number(r.comissao_fixa_percentual) : null,
      regras_gatilho: Array.isArray(r.regras_gatilho) ? r.regras_gatilho : [],
      produtos_representados: Array.isArray(r.produtos_representados) ? r.produtos_representados : [],
    })) as ContratoRepresentacao[];
  });

/**
 * 2. BUSCAR CONTRATO POR ID
 */
export const getContratoRepresentacaoById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const { data: row, error } = await (client.from("contratos_representacao") as any)
      .select("*, parceiro:parceiros(id, razao_social, nome_fantasia, cnpj, chave_pix, contato_nome, contato_email, contato_telefone, endereco)")
      .eq("id", data.id)
      .single();

    if (error || !row) throw new Error(error?.message || "Contrato não encontrado");

    return {
      ...row,
      aliquota_imposto_nexo_percentual: Number(row.aliquota_imposto_nexo_percentual) || 6.0,
      prazo_repasse_dias: Number(row.prazo_repasse_dias) || 3,
      comissao_fixa_percentual: row.comissao_fixa_percentual ? Number(row.comissao_fixa_percentual) : null,
      regras_gatilho: Array.isArray(row.regras_gatilho) ? row.regras_gatilho : [],
      produtos_representados: Array.isArray(row.produtos_representados) ? row.produtos_representados : [],
    } as ContratoRepresentacao;
  });

/**
 * 3. SALVAR OU ATUALIZAR CONTRATO DE REPRESENTAÇÃO
 */
export const upsertContratoRepresentacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof ContratoRepresentacaoSchema>) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // Busca dados do parceiro para compor o markdown do contrato caso esteja vazio
    let parceiroData: any = null;
    if (data.parceiro_id) {
      const { data: p } = await (client.from("parceiros") as any)
        .select("razao_social, nome_fantasia, cnpj, endereco, chave_pix")
        .eq("id", data.parceiro_id)
        .maybeSingle();
      parceiroData = p;
    }

    // Se o markdown do contrato não foi customizado manualmente, gera automaticamente
    const markdownGerado =
      data.conteudo_contrato_markdown && data.conteudo_contrato_markdown.trim().length > 50
        ? data.conteudo_contrato_markdown
        : generateContractContent({
            numero_contrato: data.numero_contrato,
            parceiro_nome: parceiroData?.nome_fantasia || parceiroData?.razao_social || "Parceiro de Mídia",
            parceiro_razao_social: parceiroData?.razao_social,
            parceiro_cnpj: parceiroData?.cnpj,
            parceiro_endereco: parceiroData?.endereco,
            parceiro_pix: parceiroData?.chave_pix,
            territorio: data.territorio,
            produtos_representados: data.produtos_representados,
            permite_faturamento_centralizado_nexo: data.permite_faturamento_centralizado_nexo,
            aliquota_imposto_nexo_percentual: data.aliquota_imposto_nexo_percentual,
            permite_faturamento_direto_parceiro: data.permite_faturamento_direto_parceiro,
            prazo_repasse_dias: data.prazo_repasse_dias,
            tipo_comissao: data.tipo_comissao,
            comissao_fixa_percentual: data.comissao_fixa_percentual,
            regras_gatilho: data.regras_gatilho,
            garantia_comissao_pos_rescisao: data.garantia_comissao_pos_rescisao,
            comissao_sobre_renovacoes: data.comissao_sobre_renovacoes,
            vigencia_meses: data.vigencia_meses,
            data_inicio: data.data_inicio,
            data_fim: data.data_fim,
          });

    const payload = {
      tenant_cnpj: data.tenant_cnpj || TARGET_CNPJ,
      parceiro_id: data.parceiro_id,
      numero_contrato: data.numero_contrato,
      status: data.status,
      produtos_representados: data.produtos_representados,
      territorio: data.territorio,
      permite_faturamento_centralizado_nexo: data.permite_faturamento_centralizado_nexo,
      aliquota_imposto_nexo_percentual: data.aliquota_imposto_nexo_percentual,
      permite_faturamento_direto_parceiro: data.permite_faturamento_direto_parceiro,
      prazo_repasse_dias: data.prazo_repasse_dias,
      tipo_comissao: data.tipo_comissao,
      comissao_fixa_percentual: data.comissao_fixa_percentual ?? null,
      regras_gatilho: data.regras_gatilho,
      garantia_comissao_pos_rescisao: data.garantia_comissao_pos_rescisao,
      comissao_sobre_renovacoes: data.comissao_sobre_renovacoes,
      vigencia_meses: data.vigencia_meses,
      data_inicio: data.data_inicio || null,
      data_fim: data.data_fim || null,
      conteudo_contrato_markdown: markdownGerado,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await (client.from("contratos_representacao") as any)
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated as ContratoRepresentacao;
    } else {
      const { data: inserted, error } = await (client.from("contratos_representacao") as any)
        .insert({
          ...payload,
          created_by: userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return inserted as ContratoRepresentacao;
    }
  });

/**
 * 3.1 EXCLUIR CONTRATO DE REPRESENTAÇÃO (Protegido por snapshot/lixeira)
 */
export const deleteContratoRepresentacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const { error } = await (client.from("contratos_representacao") as any)
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * 4. LISTAR PEDIDOS DE FATURAMENTO INTERMEDIADOS (SPLITS)
 */
export const listPedidosFaturamentoIntermediados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { contrato_id?: string; status_repasse?: string } | undefined) => d || {})
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    let query = (client.from("pedidos_faturamento_intermediados") as any)
      .select("*, contrato:contratos_representacao(*, parceiro:parceiros(id, razao_social, nome_fantasia, chave_pix, cnpj))")
      .order("created_at", { ascending: false });

    if (data.contrato_id) {
      query = query.eq("contrato_representacao_id", data.contrato_id);
    }

    if (data.status_repasse && data.status_repasse !== "todos") {
      query = query.eq("status_repasse", data.status_repasse);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("[listPedidosFaturamentoIntermediados] Erro:", error.message);
      return [];
    }

    return (rows || []).map((r: any) => ({
      ...r,
      valor_bruto: Number(r.valor_bruto) || 0,
      aliquota_imposto_aplicada: Number(r.aliquota_imposto_aplicada) || 0,
      valor_imposto_retido: Number(r.valor_imposto_retido) || 0,
      percentual_comissao_aplicado: Number(r.percentual_comissao_aplicado) || 0,
      valor_comissao_nexo: Number(r.valor_comissao_nexo) || 0,
      valor_liquido_repasse_parceiro: Number(r.valor_liquido_repasse_parceiro) || 0,
    })) as PedidoFaturamentoIntermediado[];
  });

/**
 * 5. SALVAR PEDIDO DE FATURAMENTO COM CÁLCULO AUTOMÁTICO DE SPLIT
 */
export const upsertPedidoFaturamentoIntermediado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof PedidoFaturamentoIntermediadoSchema>) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // Calcula os splits com a lógica padrão oficial
    const split = calculateSplitFinancials(
      data.valor_bruto,
      data.percentual_comissao_aplicado,
      data.aliquota_imposto_aplicada,
      data.modelo_faturamento,
    );

    const payload = {
      contrato_representacao_id: data.contrato_representacao_id,
      tenant_cnpj: data.tenant_cnpj || TARGET_CNPJ,
      pi_id: data.pi_id || null,
      cliente_nome: data.cliente_nome,
      cliente_cnpj: data.cliente_cnpj || null,
      modelo_faturamento: data.modelo_faturamento,
      valor_bruto: split.valorBruto,
      aliquota_imposto_aplicada: split.aliquotaImposto,
      valor_imposto_retido: split.valorImpostoRetido,
      percentual_comissao_aplicado: split.percentualComissao,
      valor_comissao_nexo: split.valorComissaoNexo,
      valor_liquido_repasse_parceiro: split.valorLiquidoRepasseParceiro,
      status_pagamento_cliente: data.status_pagamento_cliente,
      status_repasse: data.status_repasse,
      data_recebimento_cliente: data.data_recebimento_cliente || null,
      data_repasse_efetuado: data.data_repasse_efetuado || null,
      chave_pix_comprovante: data.chave_pix_comprovante || null,
      observacoes: data.observacoes || null,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await (client.from("pedidos_faturamento_intermediados") as any)
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated as PedidoFaturamentoIntermediado;
    } else {
      const { data: inserted, error } = await (client.from("pedidos_faturamento_intermediados") as any)
        .insert({
          ...payload,
          created_by: userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return inserted as PedidoFaturamentoIntermediado;
    }
  });

/**
 * 6. LIQUIDAR REPASSE AO PARCEIRO
 */
export const liquidarRepassePedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; chave_pix_comprovante?: string; data_repasse?: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const dataRepasse = data.data_repasse || new Date().toISOString().split("T")[0];

    const { data: updated, error } = await (client.from("pedidos_faturamento_intermediados") as any)
      .update({
        status_repasse: "liquidado",
        data_repasse_efetuado: dataRepasse,
        chave_pix_comprovante: data.chave_pix_comprovante || "Comprovante PIX arquivado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as PedidoFaturamentoIntermediado;
  });
