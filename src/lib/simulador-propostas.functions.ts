import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  Proposal,
  ProposalItem,
  ProposalSimulationItemInput,
  calculateItemFinancials,
  calculateProposalTotals,
} from "@/types/simulador-proposta.types";

/**
 * 1. LISTAR PROPOSTAS SIMULADAS DO TENANT
 */
export const listProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { search?: string; status?: string } | undefined) => d || {})
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Identifica tenant do perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", userId)
      .maybeSingle();

    const isMaster = profile?.role === "master";
    const client = supabaseAdmin || supabase;

    let query = (client.from("proposals") as any)
      .select("*, items:proposal_items(id)")
      .order("created_at", { ascending: false });

    if (!isMaster && profile?.tenant_id) {
      query = query.eq("tenant_id", profile.tenant_id);
    }

    if (data?.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    if (data?.search && data.search.trim()) {
      const q = data.search.trim();
      query = query.or(`client_name.ilike.%${q}%,campaign_title.ilike.%${q}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows || []).map((r: any) => ({
      ...r,
      total_gross: Number(r.total_gross) || 0,
      total_discount: Number(r.total_discount) || 0,
      total_net_agency: Number(r.total_net_agency) || 0,
      total_payout_partners: Number(r.total_payout_partners) || 0,
      profit_margin_percent: Number(r.profit_margin_percent) || 0,
      items_count: r.items?.length || 0,
    })) as Array<Proposal & { items_count: number }>;
  });

/**
 * 2. BUSCAR PROPOSTA POR ID COM ITENS DETALHADOS
 */
export const getProposalById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const { data: proposal, error: propErr } = await (client.from("proposals") as any)
      .select("*")
      .eq("id", data.id)
      .single();

    if (propErr || !proposal) throw new Error("Proposta não encontrada");

    const { data: items, error: itemsErr } = await (client.from("proposal_items") as any)
      .select("*, partner:partners(*), media_service:media_services_catalog(*)")
      .eq("proposal_id", data.id)
      .order("created_at", { ascending: true });

    if (itemsErr) throw new Error(itemsErr.message);

    return {
      ...proposal,
      total_gross: Number(proposal.total_gross) || 0,
      total_discount: Number(proposal.total_discount) || 0,
      total_net_agency: Number(proposal.total_net_agency) || 0,
      total_payout_partners: Number(proposal.total_payout_partners) || 0,
      profit_margin_percent: Number(proposal.profit_margin_percent) || 0,
      items: (items || []).map((it: any) => ({
        ...it,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        gross_price: Number(it.gross_price) || 0,
        discount: Number(it.discount) || 0,
        discount_percent: Number(it.discount_percent) || 0,
        net_client_val: Number(it.net_client_val) || 0,
        agency_commission_percent: Number(it.agency_commission_percent) || 0,
        agency_commission_val: Number(it.agency_commission_val) || 0,
        partner_payout_val: Number(it.partner_payout_val) || 0,
      })),
    } as Proposal;
  });

/**
 * 3. SALVAR OU ATUALIZAR PROPOSTA COM RATEIO DE COMISSOES
 */
export const saveProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      id?: string;
      client_name: string;
      client_id?: string | null;
      client_logo_url?: string | null;
      campaign_title?: string | null;
      status?: string;
      notes?: string | null;
      items: ProposalSimulationItemInput[];
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("Tenant não localizado para o usuário");

    const client = supabaseAdmin || supabase;

    // Calcula individualmente cada item
    const computedItems = data.items.map((it) => {
      const fin = calculateItemFinancials({
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_type: it.discount_type,
        discount_value: it.discount_value,
        is_own_product: it.is_own_product,
        agency_commission_percent: it.agency_commission_percent,
        min_negotiated_unit_price: it.min_negotiated_unit_price,
      });

      return {
        tenant_id: tenantId,
        media_service_id: it.media_service_id || null,
        partner_id: it.is_own_product ? null : it.partner_id || null,
        product_name: it.product_name,
        is_own_product: Boolean(it.is_own_product),
        quantity: fin.quantity,
        billing_type: it.billing_type,
        unit_price: fin.unitPrice,
        gross_price: fin.grossPrice,
        discount: fin.discountVal,
        discount_percent: fin.discountPercent,
        net_client_val: fin.netClientVal,
        agency_commission_percent: fin.agencyCommissionPercent,
        agency_commission_val: fin.agencyCommissionVal,
        partner_payout_val: fin.partnerPayoutVal,
        min_negotiated_unit_price: it.min_negotiated_unit_price || null,
        notes: it.notes || null,
      };
    });

    // Consolida totais da proposta
    const totals = calculateProposalTotals(computedItems);

    let proposalId = data.id;

    if (proposalId) {
      // Update
      const { error: updErr } = await (client.from("proposals") as any)
        .update({
          client_name: data.client_name,
          client_id: data.client_id || null,
          client_logo_url: data.client_logo_url || null,
          campaign_title: data.campaign_title || null,
          total_gross: totals.totalGross,
          total_discount: totals.totalDiscount,
          total_net_agency: totals.totalNetAgency,
          total_payout_partners: totals.totalPayoutPartners,
          profit_margin_percent: totals.profitMarginPercent,
          status: data.status || "draft",
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId);

      if (updErr) throw new Error(updErr.message);

      // Deleta itens antigos para recriar sincronizados
      await (client.from("proposal_items") as any).delete().eq("proposal_id", proposalId);
    } else {
      // Insert
      const { data: newProp, error: insErr } = await (client.from("proposals") as any)
        .insert({
          tenant_id: tenantId,
          client_name: data.client_name,
          client_id: data.client_id || null,
          client_logo_url: data.client_logo_url || null,
          campaign_title: data.campaign_title || null,
          total_gross: totals.totalGross,
          total_discount: totals.totalDiscount,
          total_net_agency: totals.totalNetAgency,
          total_payout_partners: totals.totalPayoutPartners,
          profit_margin_percent: totals.profitMarginPercent,
          status: data.status || "draft",
          notes: data.notes || null,
          created_by: userId,
        })
        .select("id")
        .single();

      if (insErr || !newProp) throw new Error(insErr?.message || "Erro ao criar proposta");
      proposalId = newProp.id;
    }

    // Insere os itens vinculados
    if (computedItems.length > 0) {
      const itemsToInsert = computedItems.map((ci) => ({
        ...ci,
        proposal_id: proposalId,
      }));

      const { error: itemsErr } = await (client.from("proposal_items") as any).insert(itemsToInsert);
      if (itemsErr) throw new Error(itemsErr.message);
    }

    return { id: proposalId, totals };
  });

/**
 * 4. EXCLUIR PROPOSTA SIMULADA
 */
export const deleteProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const { error } = await (client.from("proposals") as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    return { success: true };
  });

/**
 * 5. CONVERTER PROPOSTA EM PI FORMAL
 */
export const convertProposalToPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { proposal_id: string; target_pi_numero?: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("Tenant não localizado");

    const client = supabaseAdmin || supabase;

    // Busca proposta
    const { data: proposal, error: propErr } = await (client.from("proposals") as any)
      .select("*, items:proposal_items(*)")
      .eq("id", data.proposal_id)
      .single();

    if (propErr || !proposal) throw new Error("Proposta não encontrada");

    const totalLiquido = Number(proposal.total_gross) - Number(proposal.total_discount);
    const piNumero =
      data.target_pi_numero || `PI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Cria em public.pis
    const { data: newPi, error: piErr } = await (client.from("pis") as any)
      .insert({
        tenant_id: tenantId,
        numero: piNumero,
        campanha: proposal.campaign_title || `Campanha Multiveículos — ${proposal.client_name}`,
        cliente_id: proposal.client_id || null,
        cliente_nome: proposal.client_name,
        valor_bruto: Number(proposal.total_gross) || 0,
        valor_liquido: totalLiquido > 0 ? totalLiquido : Number(proposal.total_gross) || 0,
        desconto_total: Number(proposal.total_discount) || 0,
        status: "aprovado",
        observacoes: `Gerado a partir do Simulador de Propostas. Comissao Representacao: R$ ${proposal.total_net_agency}. Repasse Veiculos: R$ ${proposal.total_payout_partners}`,
        created_by: userId,
      })
      .select("id, numero")
      .single();

    if (piErr || !newPi) throw new Error(piErr?.message || "Erro ao gerar PI no sistema");

    // Atualiza status da proposta para 'converted_to_pi'
    await (client.from("proposals") as any)
      .update({ status: "converted_to_pi" })
      .eq("id", data.proposal_id);

    return {
      success: true,
      pi_id: newPi.id,
      pi_numero: newPi.numero,
    };
  });
