import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  partnerSchema,
  sanitizeDigits,
  Partner,
  PartnerInput,
  PartnerStatus,
  PersonType,
} from "@/types/partners.types";

/**
 * 1. LISTAR INDICADORES E VENDEDORES EXTERNOS (PARTNERS PF E PJ)
 */
export const listPartners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (
      d:
        | {
            person_type?: PersonType | "all";
            status?: PartnerStatus | "all";
            search?: string;
          }
        | undefined
    ) => d || {}
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // Obtém tenant_id do usuário autenticado
    const { data: profile } = await (client.from("profiles") as any)
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile?.tenant_id) return [];

    let query = (client.from("partners") as any)
      .select(`
        *,
        clientes:clientes(count),
        comissoes:comissoes_indicacao(valor_comissao, status)
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (data.person_type && data.person_type !== "all") {
      query = query.eq("person_type", data.person_type);
    }

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("[listPartners] Aviso ao consultar partners, tentando indicadores:", error.message);
      // Fallback gracioso para a tabela indicadores caso a migration ainda esteja em transição
      const { data: indRows } = await (client.from("indicadores") as any)
        .select(`
          *,
          clientes:clientes(count),
          comissoes:comissoes_indicacao(valor_comissao, status)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      return (indRows || []).map((i: any) => {
        const isPJ = (i.cpf_cnpj && sanitizeDigits(i.cpf_cnpj).length > 11) || i.person_type === "PJ";
        return {
          id: i.id,
          tenant_id: i.tenant_id,
          person_type: (isPJ ? "PJ" : "PF") as PersonType,
          status: (i.ativo ? "active" : "inactive") as PartnerStatus,
          full_name: isPJ ? null : i.nome,
          corporate_name: isPJ ? i.nome : null,
          trade_name: i.trade_name || (isPJ ? i.nome : null),
          cpf: isPJ ? null : i.cpf_cnpj,
          cnpj: isPJ ? i.cpf_cnpj : null,
          email: i.email || "",
          phone: i.telefone || "",
          address: i.address || {},
          default_commission_rate: Number(i.percentual_comissao_padrao || 10),
          payment_condition: "post_client_payment",
          requires_invoice: isPJ,
          pix_key_type: i.tipo_chave_pix || (isPJ ? "cnpj" : "cpf"),
          pix_key: i.chave_pix || "",
          bank_name: i.banco_nome,
          notes: i.observacoes,
          created_at: i.created_at,
          updated_at: i.updated_at,
          clientes_count: i.clientes?.[0]?.count ?? 0,
          total_comissao_pendente: (i.comissoes || [])
            .filter((c: any) => c.status === "pendente")
            .reduce((s: number, c: any) => s + Number(c.valor_comissao || 0), 0),
          total_comissao_paga: (i.comissoes || [])
            .filter((c: any) => c.status === "pago")
            .reduce((s: number, c: any) => s + Number(c.valor_comissao || 0), 0),
        } as Partner;
      });
    }

    return (rows || []).map((p: any) => {
      const clientesCount = p.clientes?.[0]?.count ?? 0;
      const comissoes = p.comissoes || [];
      const totalPendente = comissoes
        .filter((c: any) => c.status === "pendente")
        .reduce((s: number, c: any) => s + Number(c.valor_comissao || 0), 0);
      const totalPago = comissoes
        .filter((c: any) => c.status === "pago")
        .reduce((s: number, c: any) => s + Number(c.valor_comissao || 0), 0);

      return {
        ...p,
        default_commission_rate: Number(p.default_commission_rate || 10),
        clientes_count: clientesCount,
        total_comissao_pendente: totalPendente,
        total_comissao_paga: totalPago,
      } as Partner;
    });
  });

/**
 * 2. SALVAR OU ATUALIZAR INDICADOR / PARCEIRO COM VALIDAÇÃO STRICT
 */
export const upsertPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: PartnerInput) => partnerSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const { data: profile } = await (client.from("profiles") as any)
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile?.tenant_id) throw new Error("Usuário autenticado sem inquilino associado.");

    // Sanitização de dados de identificação e contato
    const cleanCpf = data.person_type === "PF" && data.cpf ? sanitizeDigits(data.cpf) : null;
    const cleanCnpj = data.person_type === "PJ" && data.cnpj ? sanitizeDigits(data.cnpj) : null;
    const cleanPhone = sanitizeDigits(data.phone);
    const cleanRepCpf = data.legal_representative_cpf ? sanitizeDigits(data.legal_representative_cpf) : null;

    const payload = {
      tenant_id: profile.tenant_id,
      person_type: data.person_type,
      status: data.status || "active",
      full_name: data.person_type === "PF" ? data.full_name?.trim() : null,
      cpf: cleanCpf,
      rg: data.person_type === "PF" ? data.rg?.trim() || null : null,
      birth_date: data.person_type === "PF" ? data.birth_date || null : null,
      pis_pasep: data.person_type === "PF" ? data.pis_pasep?.trim() || null : null,
      corporate_name: data.person_type === "PJ" ? data.corporate_name?.trim() : null,
      trade_name: data.person_type === "PJ" ? data.trade_name?.trim() || null : null,
      cnpj: cleanCnpj,
      state_registration: data.person_type === "PJ" ? data.state_registration?.trim() || null : null,
      municipal_registration: data.person_type === "PJ" ? data.municipal_registration?.trim() || null : null,
      legal_representative_name: data.person_type === "PJ" ? data.legal_representative_name?.trim() || null : null,
      legal_representative_cpf: cleanRepCpf,
      email: data.email.trim().toLowerCase(),
      phone: cleanPhone,
      address: data.address || {},
      default_commission_rate: Number(data.default_commission_rate || 10),
      payment_condition: data.payment_condition || "post_client_payment",
      requires_invoice: data.person_type === "PJ" ? true : Boolean(data.requires_invoice),
      pix_key_type: data.pix_key_type,
      pix_key: data.pix_key.trim(),
      bank_name: data.bank_name?.trim() || null,
      bank_agency: data.bank_agency?.trim() || null,
      bank_account: data.bank_account?.trim() || null,
      bank_account_type: data.bank_account_type || null,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let resultPartner: Partner;

    if (data.id) {
      const { data: updated, error } = await (client.from("partners") as any)
        .update(payload)
        .eq("id", data.id)
        .eq("tenant_id", profile.tenant_id)
        .select()
        .single();

      if (error) throw new Error(`Falha ao atualizar indicador: ${error.message}`);
      resultPartner = updated;
    } else {
      const { data: inserted, error } = await (client.from("partners") as any)
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(`Falha ao cadastrar indicador: ${error.message}`);
      resultPartner = inserted;
    }

    // Sincronização defensiva para a tabela legada 'indicadores' garantindo compatibilidade imediata
    try {
      await (client.from("indicadores") as any).upsert({
        id: resultPartner.id,
        tenant_id: profile.tenant_id,
        nome: resultPartner.full_name || resultPartner.trade_name || resultPartner.corporate_name || "Parceiro",
        email: resultPartner.email,
        telefone: resultPartner.phone,
        cpf_cnpj: resultPartner.cpf || resultPartner.cnpj,
        chave_pix: resultPartner.pix_key,
        tipo_chave_pix: resultPartner.pix_key_type,
        banco_nome: resultPartner.bank_name,
        percentual_comissao_padrao: resultPartner.default_commission_rate,
        observacoes: resultPartner.notes,
        ativo: resultPartner.status === "active",
        person_type: resultPartner.person_type,
        status: resultPartner.status,
        corporate_name: resultPartner.corporate_name,
        trade_name: resultPartner.trade_name,
        requires_invoice: resultPartner.requires_invoice,
        address: resultPartner.address,
        updated_at: new Date().toISOString(),
      });
    } catch (syncErr) {
      console.warn("[upsertPartner] Erro na sincronização auxiliar com indicadores:", syncErr);
    }

    return resultPartner;
  });

/**
 * 3. ALTERAR STATUS DO PARCEIRO (ATIVO / INATIVO / BLOQUEADO)
 */
export const togglePartnerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; status: PartnerStatus }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const { data: profile } = await (client.from("profiles") as any)
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile?.tenant_id) throw new Error("Usuário sem inquilino associado");

    const { data: updated, error } = await (client.from("partners") as any)
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Atualiza campo 'ativo' no indicadores
    await (client.from("indicadores") as any)
      .update({
        ativo: data.status === "active",
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("tenant_id", profile.tenant_id);

    return updated;
  });

/**
 * 4. REMOVER PARCEIRO (COM VERIFICAÇÃO DE VÍNCULOS)
 */
export const deletePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const { data: profile } = await (client.from("profiles") as any)
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile?.tenant_id) throw new Error("Usuário sem inquilino associado");

    // Verifica se possui clientes vinculados
    const { count: clientesCount } = await (client.from("clientes") as any)
      .select("*", { count: "exact", head: true })
      .eq("indicador_id", data.id);

    // Verifica se possui comissões geradas
    const { count: comissoesCount } = await (client.from("comissoes_indicacao") as any)
      .select("*", { count: "exact", head: true })
      .eq("indicador_id", data.id);

    if ((clientesCount || 0) > 0 || (comissoesCount || 0) > 0) {
      // Se houver vínculos históricos, inativa com segurança para manter integridade
      await (client.from("partners") as any)
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("tenant_id", profile.tenant_id);

      await (client.from("indicadores") as any)
        .update({ ativo: false, status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("tenant_id", profile.tenant_id);

      return {
        success: true,
        inactivated: true,
        message: "O parceiro possui clientes ou comissões vinculadas e foi desativado para preservar o histórico financeiro.",
      };
    }

    // Exclusão segura
    await (client.from("partners") as any)
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", profile.tenant_id);

    await (client.from("indicadores") as any)
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", profile.tenant_id);

    return { success: true, inactivated: false };
  });
