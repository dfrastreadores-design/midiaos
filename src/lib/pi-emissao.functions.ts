// File: src/lib/pi-emissao.functions.ts
// Esteira Operacional e Financeira de Pedidos de Inserção (PI) — Duplo Fluxo (Cliente vs. Parceiro)

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isMasterEmail } from "@/lib/master-user";

export interface ItemResumoEmissao {
  id?: string;
  produto_id?: string | null;
  ativo_codigo?: string;
  nome_ponto: string;
  tipo_midia: string;
  formato: string;
  endereco: string;
  cidade?: string;
  uf?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  valor_tabela: number;
  valor_negociado: number;
  comissao_agencia_pct: number;
  margem_inquilino_pct: number;
  valor_abatimentos: number;
  valor_liquido: number;
  parceiro_id?: string | null;
  parceiro_nome?: string;
  parceiro_cnpj?: string;
}

export interface ParceiroPiPreview {
  parceiro_id: string;
  parceiro_nome: string;
  parceiro_cnpj?: string;
  chave_pix?: string;
  quantidade_faces: number;
  valor_bruto: number;
  comissao_agencia_pct: number;
  margem_inquilino_pct: number;
  valor_comissao_agencia: number;
  valor_margem_inquilino: number;
  valor_abatimentos: number;
  valor_liquido_repasse: number;
  itens: ItemResumoEmissao[];
}

export interface PreviewEmissaoResponse {
  proposta_id: string;
  proposta_numero: string;
  campanha: string;
  status_proposta: string;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  mes_veiculacao: number;
  ano_veiculacao: number;

  // 1x PI do Cliente (Faturamento / Pagador)
  pi_cliente: {
    pagador_tipo: "cliente" | "agencia";
    pagador_nome: string;
    pagador_documento: string;
    valor_tabela: number;
    valor_negociado: number;
    comissao_agencia_pct: number;
    valor_comissao_agencia: number;
    valor_liquido_faturamento: number;
    total_faces: number;
    total_insercoes: number;
  };

  // Nx PIs de Parceiros (Veiculação & Repasse Desmembrado)
  pis_parceiros: ParceiroPiPreview[];
  
  // Itens próprios / sem parceiro
  itens_proprios_count: number;
  valor_proprio_bruto: number;
}

/**
 * 1. PREVIEW DA EMISSÃO DE PIS (DUPLO FLUXO: CLIENTE + PARCEIROS)
 */
export const previewEmissaoPisDaProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { proposta_id: string }) => z.object({ proposta_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<PreviewEmissaoResponse> => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // 1. Busca os dados completos da proposta com cliente, agência e itens
    const { data: prop, error: pErr } = await (client.from("propostas") as any)
      .select(`
        *,
        cliente:clientes(id, razao_social, nome_fantasia, cnpj),
        agencia:agencias(id, razao_social, nome_fantasia, cnpj),
        itens:proposta_itens(*)
      `)
      .eq("id", data.proposta_id)
      .single();

    if (pErr || !prop) throw new Error("Proposta não encontrada");

    const itensRaw = (prop.itens || []) as any[];

    // 2. Busca produtos e parceiros para enriquecer os dados
    const [prodsRes, parceirosRes] = await Promise.all([
      client.from("produtos").select("id, nome, formato, tipo, endereco_ponto, cep, cidade, uf, parceiro_id, parceiro_nome, parceiro_cnpj, comissao_inquilino_pct"),
      client.from("parceiros").select("id, razao_social, nome_fantasia, cnpj, chave_pix, comissao_padrao_pct"),
    ]);

    const prodsMap = new Map<string, any>();
    (prodsRes.data || []).forEach((p: any) => prodsMap.set(p.id, p));

    const parceirosMap = new Map<string, any>();
    (parceirosRes.data || []).forEach((p: any) => parceirosMap.set(p.id, p));

    // Determina datas e meses
    const anoVeic = prop.itens?.[0]?.ano || new Date().getFullYear();
    const mesVeic = prop.itens?.[0]?.mes || new Date().getMonth() + 1;

    const todosDias = new Set<number>();
    itensRaw.forEach((it) => {
      const dias = (it.dias_mes as number[]) || [];
      dias.forEach((d) => todosDias.add(d));
    });
    const diasOrd = Array.from(todosDias).sort((a, b) => a - b);
    const fmtDia = (d: number) =>
      `${anoVeic}-${String(mesVeic).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const periodoInicio = diasOrd.length > 0 ? fmtDia(diasOrd[0]) : null;
    const periodoFim = diasOrd.length > 0 ? fmtDia(diasOrd[diasOrd.length - 1]) : null;

    // Condições do Cliente/Pagador
    const temAgencia = !!prop.agencia_id;
    const pagadorTipo = temAgencia ? "agencia" : "cliente";
    const pagadorNome = temAgencia
      ? prop.agencia?.nome_fantasia || prop.agencia?.razao_social || "Agência"
      : prop.cliente?.nome_fantasia || prop.cliente?.razao_social || prop.cliente_avulso || "Cliente";
    const pagadorDoc = temAgencia ? prop.agencia?.cnpj || "" : prop.cliente?.cnpj || "";

    const comissaoAgenciaPct = temAgencia ? Number(prop.comissao_pct) || 20 : 0;
    const valorBrutoTotal = Number(prop.valor_negociado) || Number(prop.valor_tabela) || 0;
    const valorComissaoAgencia = temAgencia
      ? Math.round(valorBrutoTotal * (comissaoAgenciaPct / 100) * 100) / 100
      : 0;
    const valorLiquidoCliente = valorBrutoTotal - valorComissaoAgencia;

    // Agrupamento de itens por parceiro
    const parceirosGrupos = new Map<string, ItemResumoEmissao[]>();
    const itensProprios: ItemResumoEmissao[] = [];

    for (const it of itensRaw) {
      const prod = it.produto_id ? prodsMap.get(it.produto_id) : null;
      const parceiroId = it.parceiro_id || prod?.parceiro_id || null;
      const parc = parceiroId ? parceirosMap.get(parceiroId) : null;

      const valorNeg = Number(it.valor_negociado) || Number(it.valor_unit) || 0;
      const margemInquilino = Number(it.comissao_inquilino_pct ?? prod?.comissao_inquilino_pct ?? parc?.comissao_padrao_pct ?? 10);

      // Abatimentos do parceiro = Comissão Agência (se aplicável) + Margem Inquilino
      const abatAgencia = temAgencia ? Math.round(valorNeg * (comissaoAgenciaPct / 100) * 100) / 100 : 0;
      const abatInquilino = Math.round(valorNeg * (margemInquilino / 100) * 100) / 100;
      const abatTotal = abatAgencia + abatInquilino;
      const valorLiq = Math.max(0, Math.round((valorNeg - abatTotal) * 100) / 100);

      const itemResumo: ItemResumoEmissao = {
        id: it.id,
        produto_id: it.produto_id,
        ativo_codigo: prod?.id ? prod.id.slice(0, 8).toUpperCase() : it.id?.slice(0, 8).toUpperCase(),
        nome_ponto: it.programa || prod?.nome || "Face OOH",
        tipo_midia: it.tipo || prod?.tipo || "OOH",
        formato: it.formato || prod?.formato || "Padrão",
        endereco: it.endereco_ponto || prod?.endereco_ponto || "Praça Principal",
        cidade: prod?.cidade,
        uf: prod?.uf,
        periodo_inicio: periodoInicio || undefined,
        periodo_fim: periodoFim || undefined,
        valor_tabela: Number(it.valor_tabela) || valorNeg,
        valor_negociado: valorNeg,
        comissao_agencia_pct: comissaoAgenciaPct,
        margem_inquilino_pct: margemInquilino,
        valor_abatimentos: abatTotal,
        valor_liquido: valorLiq,
        parceiro_id: parceiroId,
        parceiro_nome: parc?.nome_fantasia || parc?.razao_social || it.parceiro_nome || prod?.parceiro_nome || "Parceiro de Mídia",
        parceiro_cnpj: parc?.cnpj || it.parceiro_cnpj || prod?.parceiro_cnpj || "",
      };

      if (parceiroId) {
        if (!parceirosGrupos.has(parceiroId)) {
          parceirosGrupos.set(parceiroId, []);
        }
        parceirosGrupos.get(parceiroId)!.push(itemResumo);
      } else {
        itensProprios.push(itemResumo);
      }
    }

    // Formata PIs dos Parceiros
    const pisParceiros: ParceiroPiPreview[] = [];
    for (const [parcId, itensParc] of parceirosGrupos.entries()) {
      const parc = parceirosMap.get(parcId);
      const totBruto = itensParc.reduce((acc, curr) => acc + curr.valor_negociado, 0);
      const totAbat = itensParc.reduce((acc, curr) => acc + curr.valor_abatimentos, 0);
      const totLiq = itensParc.reduce((acc, curr) => acc + curr.valor_liquido, 0);
      const margemMedia = itensParc.length > 0 ? itensParc[0].margem_inquilino_pct : 10;

      pisParceiros.push({
        parceiro_id: parcId,
        parceiro_nome: parc?.nome_fantasia || parc?.razao_social || itensParc[0]?.parceiro_nome || "Parceiro OOH",
        parceiro_cnpj: parc?.cnpj || itensParc[0]?.parceiro_cnpj || "",
        chave_pix: parc?.chave_pix || "",
        quantidade_faces: itensParc.length,
        valor_bruto: Math.round(totBruto * 100) / 100,
        comissao_agencia_pct: comissaoAgenciaPct,
        margem_inquilino_pct: margemMedia,
        valor_comissao_agencia: temAgencia ? Math.round(totBruto * (comissaoAgenciaPct / 100) * 100) / 100 : 0,
        valor_margem_inquilino: Math.round(totBruto * (margemMedia / 100) * 100) / 100,
        valor_abatimentos: Math.round(totAbat * 100) / 100,
        valor_liquido_repasse: Math.round(totLiq * 100) / 100,
        itens: itensParc,
      });
    }

    return {
      proposta_id: prop.id,
      proposta_numero: prop.numero,
      campanha: prop.campanha,
      status_proposta: prop.status,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      mes_veiculacao: mesVeic,
      ano_veiculacao: anoVeic,
      pi_cliente: {
        pagador_tipo: pagadorTipo,
        pagador_nome: pagadorNome,
        pagador_documento: pagadorDoc,
        valor_tabela: Number(prop.valor_tabela) || valorBrutoTotal,
        valor_negociado: valorBrutoTotal,
        comissao_agencia_pct: comissaoAgenciaPct,
        valor_comissao_agencia: valorComissaoAgencia,
        valor_liquido_faturamento: valorLiquidoCliente,
        total_faces: itensRaw.length,
        total_insercoes: Number(prop.total_insercoes) || itensRaw.length,
      },
      pis_parceiros: pisParceiros,
      itens_proprios_count: itensProprios.length,
      valor_proprio_bruto: itensProprios.reduce((acc, curr) => acc + curr.valor_negociado, 0),
    };
  });

/**
 * 2. EMISSÃO OFICIAL DOS PIS DA PROPOSTA (GERAÇÃO DUPLA + GATILHO DE VEICULAÇÃO)
 */
export const emitirPisDaProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      proposta_id: string;
      confirmar_emissao?: boolean;
    }) => z.object({ proposta_id: z.string().uuid(), confirmar_emissao: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    // 1. Obter preview estruturado
    const preview = await (previewEmissaoPisDaProposta as any)({
      data: { proposta_id: data.proposta_id },
      context,
    });

    const { data: profile } = await client
      .from("profiles")
      .select("tenant_id, nome, email")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id || null;

    // 2. Determinar numeração base
    const anoAtual = new Date().getFullYear();
    const { count } = await client
      .from("pis")
      .select("id", { count: "exact", head: true });

    const seq = (count || 0) + 1;
    const baseNumero = `PI-${anoAtual}-${String(seq).padStart(5, "0")}`;
    const piClienteNumero = `${baseNumero}-CLI`;

    // 3. Criar o PI DO CLIENTE (Faturamento / Pagador)
    const { data: piCliente, error: piClienteErr } = await (client.from("pis") as any)
      .insert({
        tenant_id: tenantId,
        numero: piClienteNumero,
        numero_pi: piClienteNumero,
        proposta_id: preview.proposta_id,
        tipo_pi: "CLIENTE",
        emissor_id: tenantId,
        destinatario_id: preview.pi_cliente.pagador_tipo === "agencia"
          ? (await client.from("propostas").select("agencia_id").eq("id", preview.proposta_id).single()).data?.agencia_id
          : (await client.from("propostas").select("cliente_id").eq("id", preview.proposta_id).single()).data?.cliente_id,
        cliente_id: (await client.from("propostas").select("cliente_id").eq("id", preview.proposta_id).single()).data?.cliente_id,
        agencia_id: (await client.from("propostas").select("agencia_id").eq("id", preview.proposta_id).single()).data?.agencia_id,
        campanha: preview.campanha,
        mes_veiculacao: preview.mes_veiculacao,
        ano_veiculacao: preview.ano_veiculacao,
        periodo_inicio: preview.periodo_inicio,
        periodo_fim: preview.periodo_fim,
        valor_bruto: preview.pi_cliente.valor_tabela,
        valor_tabela: preview.pi_cliente.valor_tabela,
        valor_negociado: preview.pi_cliente.valor_negociado,
        valor_desconto: preview.pi_cliente.valor_tabela - preview.pi_cliente.valor_negociado,
        percentual_comissao_agencia: preview.pi_cliente.comissao_agencia_pct,
        valor_abatimentos: preview.pi_cliente.valor_comissao_agencia,
        valor_liquido: preview.pi_cliente.valor_liquido_faturamento,
        total_insercoes: preview.pi_cliente.total_insercoes,
        faturamento_contra: preview.pi_cliente.pagador_tipo,
        faturamento_tipo: preview.pi_cliente.pagador_tipo === "agencia" ? "liquido" : "bruto",
        status: "aprovado",
        status_veiculacao: "veiculacao_autorizada",
        data_emissao: new Date().toISOString(),
        observacao: `PI de Faturamento Emitido a partir da Proposta ${preview.proposta_numero}. Pagador: ${preview.pi_cliente.pagador_nome}.`,
        created_by: userId,
      })
      .select("id, numero")
      .single();

    if (piClienteErr || !piCliente) {
      throw new Error(`Falha ao emitir PI do Cliente: ${piClienteErr?.message}`);
    }

    // Inserir todos os itens no PI do Cliente
    const { data: propItens } = await client
      .from("proposta_itens")
      .select("*")
      .eq("proposta_id", preview.proposta_id);

    if (propItens && propItens.length > 0) {
      const itensClientePayload = propItens.map((it: any) => ({
        pi_id: piCliente.id,
        ativo_id: it.produto_id || null,
        produto_id: it.produto_id || null,
        parceiro_id: it.parceiro_id || null,
        tipo: it.tipo || "OOH",
        programa: it.programa,
        formato: it.formato,
        insercoes_dia: it.insercoes_dia || 1,
        dias_semana: it.dias_semana || [],
        dias_mes: it.dias_mes || [],
        mes: it.mes,
        ano: it.ano,
        desconto: it.desconto || 0,
        valor_unit: it.valor_unit || 0,
        valor_tabela: it.valor_tabela || 0,
        valor_negociado: it.valor_negociado || 0,
        valor_unitario_tabela: it.valor_tabela || 0,
        valor_unitario_negociado: it.valor_negociado || 0,
        valor_liquido_item: it.valor_negociado || 0,
        total_insercoes: it.total_insercoes || 1,
        periodo_veiculacao: { inicio: preview.periodo_inicio, fim: preview.periodo_fim },
      }));

      await client.from("pi_itens").insert(itensClientePayload);
    }

    // 4. Criar os PIS DE VEICULAÇÃO DOS PARCEIROS (DESMEMBRAMENTO EXCLUSIVO)
    const pisParceirosCriados: Array<{ id: string; numero: string; parceiro_nome: string; valor_liquido: number }> = [];

    for (let i = 0; i < preview.pis_parceiros.length; i++) {
      const parcPreview = preview.pis_parceiros[i];
      const piParceiroNumero = `${baseNumero}-PARC-${String(i + 1).padStart(2, "0")}`;

      const { data: piParc, error: parcErr } = await (client.from("pis") as any)
        .insert({
          tenant_id: tenantId,
          numero: piParceiroNumero,
          numero_pi: piParceiroNumero,
          proposta_id: preview.proposta_id,
          pi_pai_id: piCliente.id,
          tipo_pi: "PARCEIRO",
          parceiro_id: parcPreview.parceiro_id,
          destinatario_id: parcPreview.parceiro_id,
          emissor_id: tenantId,
          campanha: `${preview.campanha} [${parcPreview.parceiro_nome}]`,
          mes_veiculacao: preview.mes_veiculacao,
          ano_veiculacao: preview.ano_veiculacao,
          periodo_inicio: preview.periodo_inicio,
          periodo_fim: preview.periodo_fim,
          valor_bruto: parcPreview.valor_bruto,
          valor_tabela: parcPreview.valor_bruto,
          valor_negociado: parcPreview.valor_bruto,
          percentual_comissao_agencia: parcPreview.comissao_agencia_pct,
          percentual_desconto_inquilino: parcPreview.margem_inquilino_pct,
          valor_abatimentos: parcPreview.valor_abatimentos,
          valor_liquido: parcPreview.valor_liquido_repasse,
          total_comissao: parcPreview.valor_abatimentos,
          total_repasse: parcPreview.valor_liquido_repasse,
          total_insercoes: parcPreview.itens.reduce((acc, curr) => acc + (Number((curr as any).total_insercoes) || 1), 0),
          status: "aprovado",
          status_veiculacao: "veiculacao_autorizada",
          data_emissao: new Date().toISOString(),
          observacao: `PI de Veiculação emitido exclusivamente para ${parcPreview.parceiro_nome} (CNPJ: ${parcPreview.parceiro_cnpj || "—"}). Margem inquilino retida: ${parcPreview.margem_inquilino_pct}%. Repasse líquido: R$ ${parcPreview.valor_liquido_repasse}.`,
          created_by: userId,
        })
        .select("id, numero")
        .single();

      if (parcErr || !piParc) {
        console.error("[emitirPisDaProposta] Erro ao emitir PI de parceiro:", parcErr);
        continue;
      }

      // Inserir estritamente os itens deste parceiro
      const itensParceiroPayload = parcPreview.itens.map((it) => ({
        pi_id: piParc.id,
        ativo_id: it.produto_id || null,
        produto_id: it.produto_id || null,
        parceiro_id: parcPreview.parceiro_id,
        tipo: it.tipo_midia || "OOH",
        programa: it.nome_ponto,
        formato: it.formato,
        insercoes_dia: 1,
        dias_semana: [],
        dias_mes: [],
        desconto: 0,
        valor_unit: it.valor_negociado,
        valor_tabela: it.valor_tabela,
        valor_negociado: it.valor_negociado,
        valor_unitario_tabela: it.valor_tabela,
        valor_unitario_negociado: it.valor_negociado,
        valor_liquido_item: it.valor_liquido,
        abatimentos_item: it.valor_abatimentos,
        total_insercoes: 1,
        periodo_veiculacao: { inicio: preview.periodo_inicio, fim: preview.periodo_fim },
      }));

      await client.from("pi_itens").insert(itensParceiroPayload);

      pisParceirosCriados.push({
        id: piParc.id,
        numero: piParc.numero,
        parceiro_nome: parcPreview.parceiro_nome,
        valor_liquido: parcPreview.valor_liquido_repasse,
      });
    }

    // 5. GATILHO DE ATUALIZAÇÃO DOS ATIVOS (PRODUTOS / FACES) PARA EM_VEICULACAO
    const produtoIds = propItens
      ? propItens.map((it: any) => it.produto_id).filter(Boolean)
      : [];

    if (produtoIds.length > 0) {
      await client
        .from("produtos")
        .update({
          status_operacional: "em_veiculacao",
          pi_ativo_id: piCliente.id,
          proposta_ativa_id: preview.proposta_id,
          updated_at: new Date().toISOString(),
        })
        .in("id", produtoIds);
    }

    // 6. Atualizar a Proposta para 'convertida'
    await client
      .from("propostas")
      .update({
        status: "convertida",
        pi_id: piCliente.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", preview.proposta_id);

    // 7. Registrar histórico e auditoria
    await client.from("pi_historico").insert({
      pi_id: piCliente.id,
      cliente_id: (await client.from("propostas").select("cliente_id").eq("id", preview.proposta_id).single()).data?.cliente_id,
      acao: "Emissão Oficial de PIs (Duplo Fluxo)",
      user_id: userId,
      detalhes: {
        proposta_numero: preview.proposta_numero,
        pi_cliente_numero: piCliente.numero,
        parceiros_emitidos: pisParceirosCriados,
      },
    });

    return {
      success: true,
      pi_cliente: { id: piCliente.id, numero: piCliente.numero },
      pis_parceiros: pisParceirosCriados,
      total_parceiros: pisParceirosCriados.length,
      mensagem: `PI do Cliente (${piCliente.numero}) e ${pisParceirosCriados.length} PIs de Parceiros emitidos com sucesso! Veiculação liberada nos ativos.`,
    };
  });

/**
 * 3. OBTER ESPELHO DO PI PARA VISUALIZAÇÃO PROFISSIONAL & IMPRESSÃO
 */
export const getEspelhoPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { pi_id: string }) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const client = supabaseAdmin || supabase;

    const { data: pi, error } = await (client.from("pis") as any)
      .select(`
        *,
        cliente:clientes(*),
        agencia:agencias(*),
        parceiro:parceiros(*),
        emissor:tenants(*),
        itens:pi_itens(*, produto:produtos(*), parceiro:parceiros(*))
      `)
      .eq("id", data.pi_id)
      .single();

    if (error || !pi) throw new Error("Pedido de Inserção não encontrado");

    // Formatar cabeçalhos do espelho
    const isParceiro = pi.tipo_pi === "PARCEIRO";

    return {
      id: pi.id,
      numero: pi.numero_pi || pi.numero,
      tipo_pi: pi.tipo_pi || (isParceiro ? "PARCEIRO" : "CLIENTE"),
      titulo_documento: isParceiro
        ? "PEDIDO DE INSERÇÃO (COMPRA / VEICULAÇÃO DE PARCEIRO)"
        : "PEDIDO DE INSERÇÃO (VENDA / FATURAMENTO DO CLIENTE)",
      status: pi.status,
      status_veiculacao: pi.status_veiculacao || "veiculacao_autorizada",
      campanha: pi.campanha,
      periodo_inicio: pi.periodo_inicio,
      periodo_fim: pi.periodo_fim,
      data_emissao: pi.data_emissao || pi.created_at,
      observacao: pi.observacao,

      // Emissor
      emissor: {
        nome: pi.emissor?.nome || "Mídia.OS Publicidade & Mídia Inteligente",
        cnpj: pi.emissor?.cnpj || "—",
        endereco: pi.emissor?.endereco || "—",
        cidade: pi.emissor?.cidade || "—",
        uf: pi.emissor?.uf || "—",
        email: pi.emissor?.email_contato || "contato@midiaos.online",
      },

      // Destinatário
      destinatario: isParceiro
        ? {
            tipo: "PARCEIRO",
            nome: pi.parceiro?.nome_fantasia || pi.parceiro?.razao_social || "Veículo Parceiro",
            razao_social: pi.parceiro?.razao_social || "",
            cnpj: pi.parceiro?.cnpj || "—",
            chave_pix: pi.parceiro?.chave_pix || "—",
            cidade: pi.parceiro?.cidade || "",
            uf: pi.parceiro?.uf || "",
          }
        : {
            tipo: pi.faturamento_contra === "agencia" ? "AGÊNCIA" : "CLIENTE",
            nome: pi.faturamento_contra === "agencia"
              ? pi.agencia?.nome_fantasia || pi.agencia?.razao_social || "Agência de Publicidade"
              : pi.cliente?.nome_fantasia || pi.cliente?.razao_social || "Cliente Anunciante",
            razao_social: pi.faturamento_contra === "agencia" ? pi.agencia?.razao_social : pi.cliente?.razao_social,
            cnpj: pi.faturamento_contra === "agencia" ? pi.agencia?.cnpj : pi.cliente?.cnpj,
            endereco: pi.faturamento_contra === "agencia" ? pi.agencia?.endereco : pi.cliente?.endereco,
            cidade: pi.faturamento_contra === "agencia" ? pi.agencia?.cidade : pi.cliente?.cidade,
            uf: pi.faturamento_contra === "agencia" ? pi.agencia?.uf : pi.cliente?.uf,
          },

      // Totais Financeiros
      financeiro: {
        valor_bruto: Number(pi.valor_bruto) || Number(pi.valor_tabela) || Number(pi.valor_negociado) || 0,
        percentual_comissao_agencia: Number(pi.percentual_comissao_agencia) || 0,
        percentual_desconto_inquilino: Number(pi.percentual_desconto_inquilino) || 0,
        valor_abatimentos: Number(pi.valor_abatimentos) || Number(pi.valor_desconto) || 0,
        valor_liquido: Number(pi.valor_liquido) || Number(pi.valor_negociado) || 0,
        faturamento_tipo: pi.faturamento_tipo || "bruto",
      },

      // Tabela de Pontos / Faces
      itens: (pi.itens || []).map((it: any, idx: number) => ({
        index: idx + 1,
        id: it.id,
        ativo_codigo: it.produto?.id ? it.produto.id.slice(0, 8).toUpperCase() : `F-${idx + 1}`,
        nome_ponto: it.programa || it.produto?.nome || "Face OOH",
        tipo_midia: it.tipo || it.produto?.tipo || "OOH",
        formato: it.formato || it.produto?.formato || "Padrão",
        endereco: it.produto?.endereco_ponto || "Praça Principal",
        cidade: it.produto?.cidade,
        uf: it.produto?.uf,
        periodo: it.periodo_veiculacao?.inicio
          ? `${it.periodo_veiculacao.inicio} a ${it.periodo_veiculacao.fim}`
          : `${pi.periodo_inicio || "—"} a ${pi.periodo_fim || "—"}`,
        total_insercoes: it.total_insercoes || 1,
        valor_unitario_tabela: Number(it.valor_unitario_tabela) || Number(it.valor_tabela) || 0,
        valor_unitario_negociado: Number(it.valor_unitario_negociado) || Number(it.valor_negociado) || 0,
        valor_abatimentos: Number(it.abatimentos_item) || 0,
        valor_liquido: Number(it.valor_liquido_item) || Number(it.valor_negociado) || 0,
        parceiro_nome: it.parceiro?.nome_fantasia || it.parceiro?.razao_social || "",
      })),
    };
  });
