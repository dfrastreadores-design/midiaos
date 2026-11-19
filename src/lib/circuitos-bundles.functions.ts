import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  CircuitBundle,
  CircuitBundleInput,
  CircuitBundlePricingResult,
  calculateCircuitBundlePricing,
} from "@/types/circuitos-bundles.types";

/**
 * 1. LISTAR CIRCUITOS / BUNDLES
 * Suporta filtro por parceiro, catálogo e inquilino.
 * Se partner_id for passado e o parceiro não for elegível para circuitos,
 * retorna lista vazia para garantir controle de acesso no backend.
 */
export const listCircuitBundles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: { partner_id?: string; only_active?: boolean; media_type?: string } | undefined) =>
      d || {}
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // Obtém tenant do usuário logado
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id;
    const isMaster = profile?.role === "master";

    // Se filtrou por parceiro específico, verificar se o parceiro permite circuitos
    if (data.partner_id) {
      let partnerAllows = false;
      const { data: parceiro } = await client
        .from("parceiros")
        .select("id, allows_circuit_bundles")
        .eq("id", data.partner_id)
        .maybeSingle();

      if (parceiro?.allows_circuit_bundles) {
        partnerAllows = true;
      } else {
        // Checa se há permissão explícita na tabela circuit_bundle_partner_permissions
        const { data: explicitPerms } = await client
          .from("circuit_bundle_partner_permissions")
          .select("id")
          .eq("partner_id", data.partner_id)
          .limit(1);

        if (explicitPerms && explicitPerms.length > 0) {
          partnerAllows = true;
        }
      }

      // Se o parceiro não for elegível, não expõe circuitos com desconto no catálogo
      if (!partnerAllows) {
        return [] as CircuitBundle[];
      }
    }

    let query = client
      .from("circuit_bundles")
      .select(`
        *,
        partner:parceiros(id, razao_social, nome_fantasia, logo_url, allows_circuit_bundles),
        items:circuit_bundle_items(*),
        allowed_partners:circuit_bundle_partner_permissions(partner_id)
      `)
      .order("created_at", { ascending: false });

    if (!isMaster && tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    if (data.only_active !== false) {
      query = query.eq("is_active", true);
    }

    if (data.partner_id) {
      query = query.or(`partner_id.eq.${data.partner_id},partner_id.is.null`);
    }

    if (data.media_type) {
      query = query.eq("media_type", data.media_type);
    }

    const { data: rows, error } = await query;
    if (error) {
      // Se tabela ainda não foi criada no banco (fallback resiliente)
      console.warn("[listCircuitBundles] Query warning:", error.message);
      return [] as CircuitBundle[];
    }

    return (rows || []).map((r: any) => {
      const allowedPartnerIds = (r.allowed_partners || []).map((ap: any) => ap.partner_id);
      return {
        ...r,
        discount_value: Number(r.discount_value) || 0,
        fixed_price: r.fixed_price != null ? Number(r.fixed_price) : null,
        allowed_partner_ids: allowedPartnerIds,
        items: (r.items || [])
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((item: any) => ({
            ...item,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            is_mandatory: item.is_mandatory !== false,
          })),
      };
    }) as CircuitBundle[];
  });

/**
 * 2. OBTER CIRCUITO POR ID
 */
export const getCircuitBundleById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const { data: row, error } = await client
      .from("circuit_bundles")
      .select(`
        *,
        partner:parceiros(id, razao_social, nome_fantasia, logo_url, allows_circuit_bundles),
        items:circuit_bundle_items(*),
        allowed_partners:circuit_bundle_partner_permissions(partner_id)
      `)
      .eq("id", data.id)
      .single();

    if (error || !row) {
      throw new Error("Circuito não encontrado: " + (error?.message || ""));
    }

    const allowedPartnerIds = (row.allowed_partners || []).map((ap: any) => ap.partner_id);

    return {
      ...row,
      discount_value: Number(row.discount_value) || 0,
      fixed_price: row.fixed_price != null ? Number(row.fixed_price) : null,
      allowed_partner_ids: allowedPartnerIds,
      items: (row.items || [])
        .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((item: any) => ({
          ...item,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          is_mandatory: item.is_mandatory !== false,
        })),
    } as CircuitBundle;
  });

/**
 * 3. CRIAR / EDITAR CIRCUITO (UPSERT)
 */
export const upsertCircuitBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: CircuitBundleInput) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id || data.tenant_id;

    const bundlePayload: any = {
      tenant_id: tenantId || null,
      partner_id: data.partner_id || null,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description?.trim() || null,
      media_type: data.media_type || "DOOH",
      pricing_type: data.pricing_type,
      discount_value: Number(data.discount_value) || 0,
      fixed_price: data.fixed_price != null ? Number(data.fixed_price) : null,
      is_active: data.is_active !== false,
      updated_at: new Date().toISOString(),
    };

    let bundleId = data.id;

    if (bundleId) {
      const { error: updErr } = await client
        .from("circuit_bundles")
        .update(bundlePayload)
        .eq("id", bundleId);

      if (updErr) throw new Error("Erro ao atualizar circuito: " + updErr.message);

      // Limpar itens e permissões anteriores para reinserir
      await client.from("circuit_bundle_items").delete().eq("bundle_id", bundleId);
      await client.from("circuit_bundle_partner_permissions").delete().eq("bundle_id", bundleId);
    } else {
      const { data: newBundle, error: insErr } = await client
        .from("circuit_bundles")
        .insert(bundlePayload)
        .select()
        .single();

      if (insErr || !newBundle) {
        throw new Error("Erro ao cadastrar circuito: " + (insErr?.message || ""));
      }

      bundleId = newBundle.id;
    }

    // Inserir itens que compõem o circuito
    if (data.items && data.items.length > 0) {
      const itemsPayload = data.items.map((it, idx) => ({
        bundle_id: bundleId,
        produto_id: it.produto_id || null,
        media_service_id: it.media_service_id || null,
        product_name: it.product_name,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        is_mandatory: it.is_mandatory !== false,
        order_index: it.order_index ?? idx,
      }));

      const { error: itemsErr } = await client
        .from("circuit_bundle_items")
        .insert(itemsPayload);

      if (itemsErr) {
        throw new Error("Erro ao salvar itens do circuito: " + itemsErr.message);
      }
    }

    // Inserir permissões específicas por parceiro se informadas
    if (data.allowed_partner_ids && data.allowed_partner_ids.length > 0) {
      const permsPayload = data.allowed_partner_ids.map((pId) => ({
        bundle_id: bundleId,
        partner_id: pId,
      }));

      await client.from("circuit_bundle_partner_permissions").insert(permsPayload);
    }

    return { id: bundleId, success: true };
  });

/**
 * 4. DELETAR CIRCUITO
 */
export const deleteCircuitBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    const { error } = await client.from("circuit_bundles").delete().eq("id", data.id);
    if (error) throw new Error("Erro ao excluir circuito: " + error.message);

    return { success: true };
  });

/**
 * 5. VALIDAR E APLICAR CIRCUITO NO CHECKOUT / SIMULADOR
 * Endpoint seguro do backend que valida:
 * - Se o parceiro é elegível para desconto de circuito
 * - Se todos os itens obrigatórios estão presentes no carrinho/proposta
 * - Se a precificação e rateio do desconto estão matematicamente consistentes
 */
export const validateAndApplyCircuitBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      bundle_id: string;
      partner_id?: string | null;
      current_items: Array<{
        media_service_id?: string | null;
        product_name: string;
        quantity: number;
        unit_price: number;
      }>;
    }) => d
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const client = supabaseAdmin || supabase;

    // Busca o circuito no banco
    const { data: bundle, error: bErr } = await client
      .from("circuit_bundles")
      .select(`
        *,
        items:circuit_bundle_items(*),
        allowed_partners:circuit_bundle_partner_permissions(partner_id)
      `)
      .eq("id", data.bundle_id)
      .single();

    if (bErr || !bundle) {
      throw new Error("Circuito não encontrado no sistema.");
    }

    if (!bundle.is_active) {
      throw new Error("Este circuito encontra-se inativo.");
    }

    const allowedPartnerIds = (bundle.allowed_partners || []).map((ap: any) => ap.partner_id);

    // Checa elegibilidade do parceiro
    let partnerAllowsBundles = false;
    const effectivePartnerId = data.partner_id || bundle.partner_id;

    if (effectivePartnerId) {
      const { data: parceiro } = await client
        .from("parceiros")
        .select("id, allows_circuit_bundles")
        .eq("id", effectivePartnerId)
        .maybeSingle();

      if (parceiro?.allows_circuit_bundles) {
        partnerAllowsBundles = true;
      }
    }

    const calculation: CircuitBundlePricingResult = calculateCircuitBundlePricing({
      bundle: {
        id: bundle.id,
        name: bundle.name,
        pricing_type: bundle.pricing_type,
        discount_value: Number(bundle.discount_value) || 0,
        fixed_price: bundle.fixed_price != null ? Number(bundle.fixed_price) : null,
        items: (bundle.items || []).map((i: any) => ({
          ...i,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
          is_mandatory: i.is_mandatory !== false,
        })),
        partner_id: bundle.partner_id,
        allowed_partner_ids: allowedPartnerIds,
      },
      currentItems: data.current_items,
      partnerAllowsBundles,
      partnerId: effectivePartnerId,
    });

    return calculation;
  });
