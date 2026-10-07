// Server Functions: insertion-orders.functions.ts
// Gerenciamento completo de Pedidos de Inserção (PI), Trava de Checking e Liquidação Financeira Bimodal

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isMasterEmail } from "@/lib/master-user";
import {
  InsertionOrder,
  PiItem,
  PiChecking,
  PiSettlement,
  BillingType,
  PIStatus,
  CheckingStatus,
  CheckingItemStatus,
  calculatePiSplits,
  PiDossierData,
} from "@/types/insertion-orders.types";

/**
 * 1. LISTAR PEDIDOS DE INSERÇÃO (COM FILTROS E RELAÇÕES)
 */
export const listInsertionOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      search?: string;
      status?: string;
      billingType?: string;
      checkingStatus?: string;
      clientId?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const [{ data: userAuth }, { data: profile }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("profiles")
        .select("tenant_id, role, cnpj_vinculado, cnpj, is_superadmin")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const isMaster =
      isMasterEmail(userAuth?.user?.email) ||
      profile?.is_superadmin ||
      String(profile?.role).toUpperCase() === "MASTER" ||
      userAuth?.user?.user_metadata?.role === "MASTER" ||
      userAuth?.user?.user_metadata?.is_superadmin === true;

    let query = (client.from("insertion_orders") as any)
      .select(`
        *,
        client:clientes(id, razao_social, nome_fantasia, cnpj, email, telefone),
        agency:agencias(id, razao_social, nome_fantasia, cnpj),
        items:pi_items(*, vehicle:partners(id, nome_fantasia, razao_social, tipo_veiculo)),
        checkings:pi_checkings(*, vehicle:partners(id, nome_fantasia)),
        settlements:pi_settlements(*, vehicle:partners(id, nome_fantasia, chave_pix, dados_bancarios))
      `)
      .order("created_at", { ascending: false });

    if (!isMaster) {
      const userCnpj = (profile?.cnpj_vinculado || profile?.cnpj)?.trim();
      if (userCnpj) {
        query = query.or(`cnpj_cliente.eq.${userCnpj},cnpj_veiculo.eq.${userCnpj}`);
      } else if (profile?.tenant_id) {
        query = query.eq("tenant_id", profile.tenant_id);
      }
    }

    if (data.clientId) {
      query = query.eq("client_id", data.clientId);
    }

    if (data.status && data.status !== "todos") {
      query = query.eq("status", data.status);
    }

    if (data.billingType && data.billingType !== "todos") {
      query = query.eq("billing_type", data.billingType);
    }

    if (data.checkingStatus && data.checkingStatus !== "todos") {
      query = query.eq("checking_status", data.checkingStatus);
    }

    if (data.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      query = query.or(`pi_number.ilike.${q},campaign_title.ilike.${q}`);
    }

    const { data: orders, error } = await query;
    if (error) {
      console.error("[listInsertionOrders] Erro ao listar PIs:", error);
      throw new Error(`Falha ao buscar Pedidos de Inserção: ${error.message}`);
    }

    return (orders as InsertionOrder[]) || [];
  });

/**
 * 2. OBTER DETALHES DE UM PEDIDO DE INSERÇÃO POR ID
 */
export const getInsertionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const { data: order, error } = await (client.from("insertion_orders") as any)
      .select(`
        *,
        client:clientes(id, razao_social, nome_fantasia, cnpj, email, telefone),
        agency:agencias(id, razao_social, nome_fantasia, cnpj),
        items:pi_items(
          *,
          vehicle:partners(id, nome_fantasia, razao_social, tipo_veiculo)
        ),
        checkings:pi_checkings(
          *,
          vehicle:partners(id, nome_fantasia),
          reviewer:profiles(id, nome, email)
        ),
        settlements:pi_settlements(
          *,
          vehicle:partners(id, nome_fantasia, chave_pix, dados_bancarios)
        )
      `)
      .eq("id", data.id)
      .single();

    if (error || !order) {
      console.error("[getInsertionOrder] Erro:", error);
      throw new Error("Pedido de Inserção não encontrado.");
    }

    const [{ data: userAuth }, { data: profile }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("profiles")
        .select("tenant_id, role, cnpj_vinculado, cnpj, is_superadmin")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const isMaster =
      isMasterEmail(userAuth?.user?.email) ||
      profile?.is_superadmin ||
      String(profile?.role).toUpperCase() === "MASTER" ||
      userAuth?.user?.user_metadata?.role === "MASTER" ||
      userAuth?.user?.user_metadata?.is_superadmin === true;

    if (!isMaster) {
      const userCnpj = (profile?.cnpj_vinculado || profile?.cnpj)?.trim();
      if (userCnpj) {
        const matchesClient =
          order.cnpj_cliente === userCnpj || order.client?.cnpj === userCnpj;
        const matchesVehicle =
          order.cnpj_veiculo === userCnpj ||
          order.items?.some(
            (it: any) =>
              it.vehicle?.cnpj === userCnpj || it.cnpj_veiculo === userCnpj,
          );
        if (!matchesClient && !matchesVehicle) {
          throw new Error(
            "Acesso negado: este Pedido de Inserção pertence a outra organização.",
          );
        }
      } else if (
        profile?.tenant_id &&
        order.tenant_id &&
        order.tenant_id !== profile.tenant_id
      ) {
        throw new Error("Acesso negado: registro pertencente a outro tenant.");
      }
    }

    return order as InsertionOrder;
  });

/**
 * 3. SALVAR OU EDITAR PEDIDO DE INSERÇÃO (COM REGRAS DE SPLIT E CRIAÇÃO DE TÍTULOS)
 */
export const saveInsertionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      id?: string;
      client_id: string;
      agency_id?: string | null;
      billing_type: BillingType;
      campaign_title: string;
      period_start?: string | null;
      period_end?: string | null;
      representative_commission_rate: number;
      notes?: string | null;
      proposal_id?: string | null;
      items: Array<{
        id?: string;
        vehicle_id?: string | null;
        format_description: string;
        insertions_count: number;
        unit_price: number;
        total_price?: number;
        period_start?: string | null;
        period_end?: string | null;
        item_type?: "MEDIA" | "PRODUCTION";
        display_mode?: "ITEMIZED" | "EMBEDDED";
        parent_media_item_id?: string | null;
        is_commissionable?: boolean;
      }>;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id || null;
    const rate = Math.round((Number(data.representative_commission_rate) || 0) * 100) / 100;

    // Atribuir IDs únicos e mapear itens de produção
    const rawItems = (data.items || []).map((it) => {
      const unit = Math.round((Number(it.unit_price) || 0) * 100) / 100;
      const count = Math.max(1, Math.round(Number(it.insertions_count) || 1));
      const tot =
        it.total_price !== undefined
          ? Math.round(Number(it.total_price) * 100) / 100
          : Math.round(unit * count * 100) / 100;

      const itemType = it.item_type || "MEDIA";
      const displayMode = it.display_mode || "ITEMIZED";
      const isComm = it.is_commissionable !== false;

      // Cálculo de comissão: se is_commissionable == false, comissão é zero e 100% repassado ao executor
      const commAmount = isComm ? Math.round(tot * (rate / 100) * 100) / 100 : 0;
      const netAmount = Math.max(0, Math.round((tot - commAmount) * 100) / 100);

      return {
        id: it.id || crypto.randomUUID(),
        vehicle_id: it.vehicle_id || null,
        format_description: it.format_description || (itemType === "PRODUCTION" ? "Produção de Material" : "Inserção de Mídia"),
        insertions_count: count,
        unit_price: unit,
        total_price: tot,
        vehicle_commission_rate: isComm ? rate : 0,
        vehicle_commission_amount: commAmount,
        vehicle_net_amount: netAmount,
        period_start: it.period_start || data.period_start || null,
        period_end: it.period_end || data.period_end || null,
        item_type: itemType,
        display_mode: displayMode,
        parent_media_item_id: it.parent_media_item_id || null,
        is_commissionable: isComm,
      };
    });

    // Calcular custos embutidos nos itens de mídia pais
    const parsedItems = rawItems.map((it) => {
      if (it.item_type === "MEDIA") {
        const embeddedProds = rawItems.filter(
          (p) =>
            p.item_type === "PRODUCTION" &&
            p.display_mode === "EMBEDDED" &&
            p.parent_media_item_id === it.id,
        );
        const embeddedTotal = embeddedProds.reduce((acc, p) => acc + p.total_price, 0);

        return {
          ...it,
          media_raw_cost: it.total_price,
          embedded_production_cost: embeddedTotal,
          client_facing_total: Math.round((it.total_price + embeddedTotal) * 100) / 100,
        };
      } else {
        return {
          ...it,
          media_raw_cost: 0,
          embedded_production_cost: 0,
          client_facing_total: it.display_mode === "EMBEDDED" ? 0 : it.total_price,
        };
      }
    });

    const grossAmount = parsedItems.reduce((acc, it) => acc + it.total_price, 0);
    const totalCommission = parsedItems.reduce((acc, it) => acc + it.vehicle_commission_amount, 0);
    const totalNetVehicle = parsedItems.reduce((acc, it) => acc + it.vehicle_net_amount, 0);

    const split = {
      grossAmount: Math.round(grossAmount * 100) / 100,
      commissionRate: rate,
      commissionAmount: Math.round(totalCommission * 100) / 100,
      netVehicleAmount: Math.round(totalNetVehicle * 100) / 100,
    };

    let piId = data.id;
    let piNumber = "";

    // Resolver CNPJ do cliente e veículo para governança estrita RBAC
    let cnpjCliente: string | null = null;
    if (data.client_id) {
      const { data: cli } = await (client.from("clientes") as any)
        .select("cnpj")
        .eq("id", data.client_id)
        .maybeSingle();
      cnpjCliente = cli?.cnpj || null;
    }

    let cnpjVeiculo: string | null = null;
    const firstVehicleId = parsedItems.find((it) => it.vehicle_id)?.vehicle_id;
    if (firstVehicleId) {
      const { data: vRow } = await (client.from("partners") as any)
        .select("cnpj")
        .eq("id", firstVehicleId)
        .maybeSingle();
      cnpjVeiculo = vRow?.cnpj || null;
    }

    if (!piId) {
      // Gerar número sequencial formal para o PI
      const year = new Date().getFullYear();
      const randSeq = Math.floor(1000 + Math.random() * 9000);
      piNumber = `PI-${year}-${randSeq}`;

      const { data: newPi, error: piError } = await (client.from("insertion_orders") as any)
        .insert({
          tenant_id: tenantId,
          pi_number: piNumber,
          client_id: data.client_id,
          agency_id: data.agency_id || null,
          representative_id: userId,
          proposal_id: data.proposal_id || null,
          billing_type: data.billing_type,
          cnpj_cliente: cnpjCliente,
          cnpj_veiculo: cnpjVeiculo,
          gross_amount: split.grossAmount,
          representative_commission_rate: split.commissionRate,
          representative_commission_amount: split.commissionAmount,
          net_vehicle_amount: split.netVehicleAmount,
          checking_status: "pending_upload",
          status: "in_broadcast", // Inicia em veiculação
          campaign_name: data.campaign_title,
          campaign_title: data.campaign_title,
          campaign_start_date: data.period_start || new Date().toISOString().split("T")[0],
          campaign_end_date: data.period_end || new Date().toISOString().split("T")[0],
          period_start: data.period_start || null,
          period_end: data.period_end || null,
          notes: data.notes || null,
          created_by: userId,
        })
        .select()
        .single();

      if (piError || !newPi) {
        console.error("[saveInsertionOrder] Erro ao criar PI:", piError);
        throw new Error(`Falha ao criar Pedido de Inserção: ${piError?.message}`);
      }
      piId = newPi.id;
      piNumber = newPi.pi_number;
    } else {
      // Atualizar PI existente
      const { data: updatedPi, error: updateError } = await (client.from("insertion_orders") as any)
        .update({
          client_id: data.client_id,
          agency_id: data.agency_id || null,
          billing_type: data.billing_type,
          cnpj_cliente: cnpjCliente,
          cnpj_veiculo: cnpjVeiculo,
          gross_amount: split.grossAmount,
          representative_commission_rate: split.commissionRate,
          representative_commission_amount: split.commissionAmount,
          net_vehicle_amount: split.netVehicleAmount,
          campaign_name: data.campaign_title,
          campaign_title: data.campaign_title,
          campaign_start_date: data.period_start || new Date().toISOString().split("T")[0],
          campaign_end_date: data.period_end || new Date().toISOString().split("T")[0],
          period_start: data.period_start || null,
          period_end: data.period_end || null,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", piId)
        .select()
        .single();

      if (updateError) {
        console.error("[saveInsertionOrder] Erro ao atualizar PI:", updateError);
        throw new Error(`Falha ao atualizar Pedido de Inserção: ${updateError.message}`);
      }
      piNumber = updatedPi.pi_number;

      // Limpar itens anteriores para regravar
      await (client.from("pi_items") as any).delete().eq("pi_id", piId);
    }

    // Gravar itens do PI
    if (parsedItems.length > 0) {
      const itemsPayload = parsedItems.map((it) => ({
        id: it.id,
        tenant_id: tenantId,
        pi_id: piId,
        vehicle_id: it.vehicle_id,
        format_description: it.format_description,
        insertions_count: it.insertions_count,
        unit_price: it.unit_price,
        total_price: it.total_price,
        vehicle_commission_rate: it.vehicle_commission_rate,
        vehicle_commission_amount: it.vehicle_commission_amount,
        vehicle_net_amount: it.vehicle_net_amount,
        period_start: it.period_start || new Date().toISOString().split("T")[0],
        period_end: it.period_end || new Date().toISOString().split("T")[0],
        item_type: it.item_type,
        display_mode: it.display_mode,
        parent_media_item_id: it.parent_media_item_id,
        is_commissionable: it.is_commissionable,
        media_raw_cost: it.media_raw_cost,
        embedded_production_cost: it.embedded_production_cost,
        client_facing_total: it.client_facing_total,
      }));

      const { error: itemsError } = await (client.from("pi_items") as any).insert(itemsPayload);
      if (itemsError) {
        console.error("[saveInsertionOrder] Erro ao salvar itens do PI:", itemsError);
      }
    }

    // Criar títulos de liquidação inicial (bloqueados até aprovação de checking)
    await syncInitialSettlements(client, piId!, tenantId, data.billing_type, split, parsedItems);

    return { id: piId, pi_number: piNumber, success: true };
  });

/**
 * Utilitário interno para semear títulos de liquidação conforme a modalidade
 */
async function syncInitialSettlements(
  client: any,
  piId: string,
  tenantId: string | null,
  billingType: BillingType,
  split: { grossAmount: number; commissionAmount: number; netVehicleAmount: number },
  items: Array<{
    vehicle_id: string | null;
    total_price: number;
    vehicle_net_amount: number;
    item_type?: string;
    format_description?: string;
  }>,
) {
  // Limpar títulos pendentes anteriores não pagos
  await client
    .from("pi_settlements")
    .delete()
    .eq("pi_id", piId)
    .eq("status", "pending_checking");

  const settlements: any[] = [];

  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  if (billingType === "REPRESENTATIVE_BILLING") {
    // Modalidade 1: Faturamento via Representante
    // 1. Recebível do Cliente pelo valor total bruto
    settlements.push({
      tenant_id: tenantId,
      pi_id: piId,
      type: "CLIENT_RECEIVABLE",
      payer_type: "client",
      receiver_type: "representative",
      amount: split.grossAmount,
      due_date: defaultDueDate,
      status: "pending_checking",
      notes: "Fatura integral contra o anunciante via Representante.",
    });

    // 2. Repasses para cada veículo (líquido)
    items.forEach((it) => {
      if (it.vehicle_id) {
        const isProd = it.item_type === "PRODUCTION";
        settlements.push({
          tenant_id: tenantId,
          pi_id: piId,
          type: "VEHICLE_PAYABLE",
          payer_type: "representative",
          receiver_type: "vehicle",
          vehicle_id: it.vehicle_id,
          amount: it.vehicle_net_amount,
          due_date: defaultDueDate,
          status: "pending_checking",
          notes: isProd
            ? `Repasse de Produção: ${it.format_description || "Material Publicitário"}`
            : `Repasse de Mídia: ${it.format_description || "Saldo Líquido"}`,
        });
      }
    });
  } else {
    // Modalidade 2: Faturamento Direto pelo Veículo
    // 1. Cobrança direta de cada Veículo contra o Cliente
    items.forEach((it) => {
      if (it.vehicle_id) {
        settlements.push({
          tenant_id: tenantId,
          pi_id: piId,
          type: "CLIENT_RECEIVABLE",
          payer_type: "client",
          receiver_type: "vehicle",
          vehicle_id: it.vehicle_id,
          amount: it.total_price,
          due_date: defaultDueDate,
          status: "pending_checking",
          notes: "Faturamento direto do veículo contra o anunciante.",
        });
      }
    });

    // 2. Comissão devida do Veículo para o Representante
    settlements.push({
      tenant_id: tenantId,
      pi_id: piId,
      type: "COMMISSION_RECEIVABLE",
      payer_type: "vehicle",
      receiver_type: "representative",
      amount: split.commissionAmount,
      due_date: defaultDueDate,
      status: "pending_checking",
      notes: "Comissão de representação devida após liquidação do Cliente.",
    });
  }

  if (settlements.length > 0) {
    await client.from("pi_settlements").insert(settlements);
  }
}

/**
 * 4. UPLOAD / ENVIO DE COMPROVANTE DE CHECKING
 */
export const uploadPiChecking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      pi_id: string;
      pi_item_id?: string | null;
      vehicle_id?: string | null;
      file_url: string;
      file_name?: string | null;
      file_type: "foto" | "video" | "irradiacao" | "relatorio" | "clipping" | "link";
      external_link?: string | null;
      broadcast_date?: string | null;
      broadcast_time?: string | null;
      notes?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id || null;

    // Inserir registro de checking com status pending_review
    const { data: checking, error } = await (client.from("pi_checkings") as any)
      .insert({
        tenant_id: tenantId,
        pi_id: data.pi_id,
        pi_item_id: data.pi_item_id || null,
        vehicle_id: data.vehicle_id || null,
        file_url: data.file_url,
        file_name: data.file_name || "Comprovante de Veiculação",
        file_type: data.file_type || "foto",
        external_link: data.external_link || null,
        broadcast_date: data.broadcast_date || null,
        broadcast_time: data.broadcast_time || null,
        notes: data.notes || null,
        status: "pending_review",
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[uploadPiChecking] Erro:", error);
      throw new Error(`Falha ao registrar comprovante: ${error.message}`);
    }

    // Atualiza status do PI para 'under_review' e ciclo de vida para 'awaiting_checking'
    await (client.from("insertion_orders") as any)
      .update({
        checking_status: "under_review",
        status: "awaiting_checking",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.pi_id);

    return checking as PiChecking;
  });

/**
 * 5. AVALIAR COMPROVANTE DE CHECKING (APROVAR OU SOLICITAR CORREÇÃO)
 */
export const reviewPiCheckingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      checking_id: string;
      decision: "approved" | "rejected";
      rejection_reason?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // Atualizar o item de checking
    const { data: updatedChecking, error: updateError } = await (client.from("pi_checkings") as any)
      .update({
        status: data.decision,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: data.decision === "rejected" ? data.rejection_reason || "Rejeitado na auditoria" : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.checking_id)
      .select("*, pi:insertion_orders(*)")
      .single();

    if (updateError || !updatedChecking) {
      console.error("[reviewPiCheckingItem] Erro:", updateError);
      throw new Error(`Falha ao avaliar checking: ${updateError?.message}`);
    }

    const piId = updatedChecking.pi_id;

    // Buscar todos os itens e checkings do PI para auditar se 100% estão validados
    const { data: items } = await (client.from("pi_items") as any).select("id").eq("pi_id", piId);
    const { data: allCheckings } = await (client.from("pi_checkings") as any).select("*").eq("pi_id", piId);

    const hasRejections = (allCheckings || []).some((c: any) => c.status === "rejected");
    const allApproved =
      (allCheckings || []).length > 0 &&
      (allCheckings || []).every((c: any) => c.status === "approved");

    let newCheckingStatus: CheckingStatus = "under_review";
    if (hasRejections) {
      newCheckingStatus = "rejected";
    } else if (allApproved && (items || []).length > 0) {
      // Verifica se todos os itens de mídia possuem ao menos um checking aprovado
      const itemsWithApproved = new Set(
        (allCheckings || [])
          .filter((c: any) => c.status === "approved" && c.pi_item_id)
          .map((c: any) => c.pi_item_id),
      );

      const allItemsCovered = (items || []).every((it: any) => itemsWithApproved.has(it.id));
      if (allItemsCovered) {
        newCheckingStatus = "approved";
      }
    }

    await (client.from("insertion_orders") as any)
      .update({
        checking_status: newCheckingStatus,
        status: newCheckingStatus === "approved" ? "checking_approved" : "awaiting_checking",
        updated_at: new Date().toISOString(),
      })
      .eq("id", piId);

    return { success: true, checking_status: newCheckingStatus };
  });

/**
 * 6. GATEKEEPER MANDATÓRIO: APROVAR CHECKING & GERAR PACOTE DE FATURAMENTO / DOSSIÊ DIGITAL
 * Regra: Nenhuma cobrança é liberada sem 100% do checking auditado e aprovado.
 */
export const approveCheckingAndReleaseBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { pi_id: string }) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // 1. Obter dados completos do PI
    const { data: pi, error: piError } = await (client.from("insertion_orders") as any)
      .select(`
        *,
        client:clientes(*),
        items:pi_items(*, vehicle:partners(*)),
        checkings:pi_checkings(*, vehicle:partners(*), reviewer:profiles(nome, email))
      `)
      .eq("id", data.pi_id)
      .single();

    if (piError || !pi) {
      throw new Error("Pedido de Inserção não encontrado.");
    }

    // 2. VERIFICAÇÃO RÍGIDA DO GATEKEEPER:
    const items = pi.items || [];
    const checkings = pi.checkings || [];

    if (items.length === 0) {
      throw new Error("O Pedido de Inserção não possui itens de mídia cadastrados.");
    }

    if (checkings.length === 0) {
      throw new Error(
        "TRAVA UNIVERSAL ATIVA: Nenhum comprovante de checking foi enviado pelo(s) veículo(s). Faturamento bloqueado!",
      );
    }

    const unapprovedCheckings = checkings.filter((c: any) => c.status !== "approved");
    if (unapprovedCheckings.length > 0) {
      throw new Error(
        `TRAVA UNIVERSAL ATIVA: Existem ${unapprovedCheckings.length} comprovante(s) pendente(s) ou rejeitado(s). É obrigatório 100% de aprovação na auditoria para liberar o faturamento.`,
      );
    }

    // Verificar se todo item obrigatório tem ao menos um checking aprovado
    const approvedItemIds = new Set(checkings.map((c: any) => c.pi_item_id).filter(Boolean));
    const itemsWithoutChecking = items.filter((it: any) => !approvedItemIds.has(it.id));
    if (itemsWithoutChecking.length > 0) {
      throw new Error(
        `TRAVA UNIVERSAL ATIVA: O veículo/formato "${itemsWithoutChecking[0].format_description}" ainda não possui comprovante de checking aprovado.`,
      );
    }

    // 3. GERAR O DOSSIÊ DIGITAL UNIFICADO
    const dossier: PiDossierData = {
      generated_at: new Date().toISOString(),
      pi_number: pi.pi_number,
      client_name: pi.client?.nome_fantasia || pi.client?.razao_social || "Cliente",
      billing_type: pi.billing_type,
      gross_amount: pi.gross_amount,
      commission_amount: pi.representative_commission_amount,
      net_vehicles_amount: pi.net_vehicle_amount,
      items_summary: items.map((it: any) => ({
        vehicle_name: it.vehicle?.nome_fantasia || "Veículo Parceiro",
        format: it.format_description,
        insertions: it.insertions_count,
        period: `${it.period_start || ""} até ${it.period_end || ""}`,
        total: it.total_price,
      })),
      checkings_audit: checkings.map((c: any) => ({
        item_format: c.pi_item_id ? "Comprovante Vinculado" : "Geral",
        vehicle_name: c.vehicle?.nome_fantasia || "Veículo",
        file_type: c.file_type,
        file_url: c.file_url,
        approved_at: c.reviewed_at || new Date().toISOString(),
        reviewer_name: c.reviewer?.nome || "Auditor Representante",
      })),
    };

    // 4. ATUALIZAR ESTADO DO PI E LIBERAR TÍTULOS FINANCEIROS
    await (client.from("insertion_orders") as any)
      .update({
        checking_status: "approved",
        status: "checking_approved",
        dossier_data: dossier,
        dossier_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.pi_id);

    // 5. LIBERAR TÍTULOS FINANCEIROS CONFORME A MODALIDADE
    if (pi.billing_type === "REPRESENTATIVE_BILLING") {
      // Libera cobrança do Cliente pelo Representante
      await (client.from("pi_settlements") as any)
        .update({
          status: "awaiting_payment",
          updated_at: new Date().toISOString(),
        })
        .eq("pi_id", data.pi_id)
        .eq("type", "CLIENT_RECEIVABLE");
    } else {
      // Modalidade 2: Libera envio do dossiê para faturamento direto do veículo
      await (client.from("pi_settlements") as any)
        .update({
          status: "awaiting_payment",
          updated_at: new Date().toISOString(),
        })
        .eq("pi_id", data.pi_id)
        .eq("type", "CLIENT_RECEIVABLE");
    }

    return { success: true, message: "Checking 100% aprovado! Faturamento e Dossiê liberados com sucesso.", dossier };
  });

/**
 * 7. EMITIR FATURAMENTO / ANEXAR NOTA FISCAL AO DOSSIÊ
 */
export const emitirFaturamentoDossie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      pi_id: string;
      invoice_number?: string;
      invoice_url?: string;
      vehicle_invoice_number?: string;
      vehicle_invoice_url?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    // Verificar se o checking está aprovado
    const { data: pi } = await (client.from("insertion_orders") as any)
      .select("checking_status, billing_type")
      .eq("id", data.pi_id)
      .single();

    if (pi?.checking_status !== "approved") {
      throw new Error(
        "TRAVA UNIVERSAL: Não é permitido emitir faturamento sem checking previamente auditado e aprovado!",
      );
    }

    const { error } = await (client.from("insertion_orders") as any)
      .update({
        invoice_number: data.invoice_number || null,
        invoice_url: data.invoice_url || null,
        vehicle_invoice_number: data.vehicle_invoice_number || null,
        vehicle_invoice_url: data.vehicle_invoice_url || null,
        status: "billed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.pi_id);

    if (error) {
      throw new Error(`Falha ao registrar faturamento: ${error.message}`);
    }

    return { success: true };
  });

/**
 * 8. REGISTRAR PAGAMENTO DO CLIENTE (MÁQUINA DE ESTADOS FINANCIAIS)
 */
export const registrarPagamentoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      pi_id: string;
      receipt_url?: string;
      payment_method?: string;
      paid_date?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const { data: pi, error: piError } = await (client.from("insertion_orders") as any)
      .select("*, settlements:pi_settlements(*)")
      .eq("id", data.pi_id)
      .single();

    if (piError || !pi) {
      throw new Error("Pedido de Inserção não encontrado.");
    }

    const nowIso = data.paid_date ? new Date(data.paid_date).toISOString() : new Date().toISOString();

    if (pi.billing_type === "REPRESENTATIVE_BILLING") {
      // Modalidade 1: Cliente pagou ao Representante
      // 1. Marcar CLIENT_RECEIVABLE como pago
      await (client.from("pi_settlements") as any)
        .update({
          status: "paid",
          paid_at: nowIso,
          receipt_url: data.receipt_url || null,
          payment_method: data.payment_method || "Transferência Bancária / PIX",
          updated_at: new Date().toISOString(),
        })
        .eq("pi_id", data.pi_id)
        .eq("type", "CLIENT_RECEIVABLE");

      // 2. Liberar a fila de repasses aos veículos (VEHICLE_PAYABLE passa de pending_checking para awaiting_payment)
      await (client.from("pi_settlements") as any)
        .update({
          status: "awaiting_payment",
          updated_at: new Date().toISOString(),
        })
        .eq("pi_id", data.pi_id)
        .eq("type", "VEHICLE_PAYABLE");

      // 3. Atualizar status do PI para 'paid_by_client'
      await (client.from("insertion_orders") as any)
        .update({
          status: "paid_by_client",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.pi_id);
    } else {
      // Modalidade 2: Faturamento Direto pelo Veículo
      // Cliente pagou diretamente ao Veículo -> Registra quitação
      await (client.from("pi_settlements") as any)
        .update({
          status: "paid",
          paid_at: nowIso,
          receipt_url: data.receipt_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("pi_id", data.pi_id)
        .eq("type", "CLIENT_RECEIVABLE");

      // Ativa o recebimento de comissão devida pelo Veículo ao Representante
      await (client.from("pi_settlements") as any)
        .update({
          status: "awaiting_payment",
          updated_at: new Date().toISOString(),
        })
        .eq("pi_id", data.pi_id)
        .eq("type", "COMMISSION_RECEIVABLE");

      await (client.from("insertion_orders") as any)
        .update({
          status: "paid_by_client",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.pi_id);
    }

    return { success: true };
  });

/**
 * 9. CONFIRMAR REPASSE / LIQUIDAÇÃO FINAL
 */
export const confirmarLiquidacaoRepasse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      settlement_id: string;
      receipt_url?: string;
      payment_method?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    // 1. Atualizar o settlement como pago
    const { data: updatedSettlement, error: settError } = await (client.from("pi_settlements") as any)
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        receipt_url: data.receipt_url || null,
        payment_method: data.payment_method || "PIX / TED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.settlement_id)
      .select("*, pi:insertion_orders(*)")
      .single();

    if (settError || !updatedSettlement) {
      throw new Error(`Falha ao liquidar título: ${settError?.message}`);
    }

    const piId = updatedSettlement.pi_id;

    // 2. Verificar se todos os repasses/comissões foram concluídos
    const { data: allSettlements } = await (client.from("pi_settlements") as any)
      .select("*")
      .eq("pi_id", piId);

    const pendingSettlements = (allSettlements || []).filter((s: any) => s.status !== "paid");

    if (pendingSettlements.length === 0) {
      // Todos os títulos foram quitados: PI passa para 'settled'
      await (client.from("insertion_orders") as any)
        .update({
          status: "settled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", piId);
    }

    return { success: true, all_settled: pendingSettlements.length === 0 };
  });

/**
 * 10. OBTER ITENS DO PI NA VISÃO DO CLIENTE (ESPELHO COMERCIAL COM PRODUÇÕES EMBUTIDAS CONSOLIDADAS)
 */
export const getClientFacingPiItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { pi_id: string }) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const { data: items, error } = await (client.from("view_client_pi_items") as any)
      .select(`
        *,
        vehicle:partners(id, nome_fantasia, razao_social, tipo_veiculo)
      `)
      .eq("pi_id", data.pi_id);

    if (error) {
      console.warn("[getClientFacingPiItems] Fallback da view:", error);
      const { data: rawItems } = await (client.from("pi_items") as any)
        .select(`
          *,
          vehicle:partners(id, nome_fantasia, razao_social, tipo_veiculo)
        `)
        .eq("pi_id", data.pi_id)
        .eq("display_mode", "ITEMIZED");
      return rawItems || [];
    }

    return items || [];
  });
