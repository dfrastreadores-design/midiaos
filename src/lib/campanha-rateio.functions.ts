import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StatusRepasse = "pendente" | "aprovado" | "pago" | "cancelado";

export interface CampanhaRateioItem {
  id?: string;
  pi_id: string;
  parceiro_id: string;
  parceiro_nome?: string;
  parceiro_cnpj?: string;
  parceiro_chave_pix?: string;
  valor_comercializado: number;
  comissao_pct: number;
  comissao_valor: number;
  repasse_valor: number;
  status_repasse: StatusRepasse;
  data_previsao_repasse?: string | null;
  data_pagamento_repasse?: string | null;
  comprovante_pagamento_url?: string | null;
  observacoes?: string | null;
}

export interface CampanhaRateioResumo {
  pi_id: string;
  campanha_nome: string;
  valor_total_campanha: number;
  total_comercializado_parceiros: number;
  total_comissao: number;
  total_repasse: number;
  comissao_media_pct: number;
  fechamento_matematico: boolean;
  diferenca_fechamento: number;
  rateios: CampanhaRateioItem[];
}

/**
 * Calcula e formata os rateios por parceiro com validação matemática estrita:
 * COMISSÃO = VALOR COMERCIALIZADO × PERCENTUAL
 * REPASSE = VALOR COMERCIALIZADO − COMISSÃO
 */
export function calcularRateio(
  valorComercializado: number,
  comissaoPct: number,
): { comissaoValor: number; repasseValor: number } {
  const v = Number(valorComercializado) || 0;
  const pct = Number(comissaoPct) || 0;
  const comissaoValor = Math.round(v * (pct / 100) * 100) / 100;
  const repasseValor = Math.round((v - comissaoValor) * 100) / 100;
  return { comissaoValor, repasseValor };
}

/**
 * Obtém ou calcula automaticamente o rateio de parceiros para um PI / Campanha
 */
export const getCampanhaRateio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { piId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Busca os dados do PI
    const { data: pi, error: piErr } = await supabase
      .from("pis")
      .select("id, numero, campanha, valor_negociado, total_comissao, total_repasse")
      .eq("id", data.piId)
      .single();

    if (piErr || !pi) throw new Error("Campanha / PI não encontrado");

    // 2. Busca rateios já persistidos
    const { data: rateiosExistentes } = await supabase
      .from("campanha_rateios")
      .select("*, parceiros(nome_fantasia, razao_social, cnpj, chave_pix, comissao_padrao_pct)")
      .eq("pi_id", data.piId);

    // Se já existem rateios registrados, retorna estruturado
    if (rateiosExistentes && rateiosExistentes.length > 0) {
      let totComercializado = 0;
      let totComissao = 0;
      let totRepasse = 0;

      const rateiosFormatados: CampanhaRateioItem[] = rateiosExistentes.map((r: any) => {
        totComercializado += Number(r.valor_comercializado) || 0;
        totComissao += Number(r.comissao_valor) || 0;
        totRepasse += Number(r.repasse_valor) || 0;

        return {
          id: r.id,
          pi_id: r.pi_id,
          parceiro_id: r.parceiro_id,
          parceiro_nome: r.parceiros?.nome_fantasia || r.parceiros?.razao_social || "Parceiro",
          parceiro_cnpj: r.parceiros?.cnpj || "",
          parceiro_chave_pix: r.parceiros?.chave_pix || "",
          valor_comercializado: Number(r.valor_comercializado) || 0,
          comissao_pct: Number(r.comissao_pct) || 0,
          comissao_valor: Number(r.comissao_valor) || 0,
          repasse_valor: Number(r.repasse_valor) || 0,
          status_repasse: r.status_repasse || "pendente",
          data_previsao_repasse: r.data_previsao_repasse,
          data_pagamento_repasse: r.data_pagamento_repasse,
          comprovante_pagamento_url: r.comprovante_pagamento_url,
          observacoes: r.observacoes,
        };
      });

      const valorTotal = Number(pi.valor_negociado) || 0;
      const diferenca = Math.abs(valorTotal - totComercializado);

      return {
        pi_id: pi.id,
        campanha_nome: pi.campanha,
        valor_total_campanha: valorTotal,
        total_comercializado_parceiros: totComercializado,
        total_comissao: totComissao,
        total_repasse: totRepasse,
        comissao_media_pct:
          totComercializado > 0 ? (totComissao / totComercializado) * 100 : 0,
        fechamento_matematico: diferenca < 0.05,
        diferenca_fechamento: diferenca,
        rateios: rateiosFormatados,
      } as CampanhaRateioResumo;
    }

    // 3. Se não há rateios prévios salvos, computa com base nos pi_itens e seus parceiros
    const { data: itens } = await supabase
      .from("pi_itens")
      .select("*, parceiros(id, nome_fantasia, razao_social, cnpj, chave_pix, comissao_padrao_pct)")
      .eq("pi_id", data.piId);

    const parceirosMap = new Map<string, CampanhaRateioItem>();

    (itens || []).forEach((it: any) => {
      if (!it.parceiro_id) return;
      const pid = it.parceiro_id;
      const vItem = Number(it.valor_negociado) || 0;
      const pctItem = Number(it.comissao_pct) || Number(it.parceiros?.comissao_padrao_pct) || 20;

      if (!parceirosMap.has(pid)) {
        parceirosMap.set(pid, {
          pi_id: data.piId,
          parceiro_id: pid,
          parceiro_nome: it.parceiros?.nome_fantasia || it.parceiros?.razao_social || "Parceiro",
          parceiro_cnpj: it.parceiros?.cnpj || "",
          parceiro_chave_pix: it.parceiros?.chave_pix || "",
          valor_comercializado: 0,
          comissao_pct: pctItem,
          comissao_valor: 0,
          repasse_valor: 0,
          status_repasse: "pendente",
        });
      }

      const r = parceirosMap.get(pid)!;
      r.valor_comercializado += vItem;
      const { comissaoValor, repasseValor } = calcularRateio(r.valor_comercializado, r.comissao_pct);
      r.comissao_valor = comissaoValor;
      r.repasse_valor = repasseValor;
    });

    const rateiosList = Array.from(parceirosMap.values());
    const totComercializado = rateiosList.reduce((acc, r) => acc + r.valor_comercializado, 0);
    const totComissao = rateiosList.reduce((acc, r) => acc + r.comissao_valor, 0);
    const totRepasse = rateiosList.reduce((acc, r) => acc + r.repasse_valor, 0);
    const valorTotal = Number(pi.valor_negociado) || 0;
    const diferenca = Math.abs(valorTotal - totComercializado);

    return {
      pi_id: pi.id,
      campanha_nome: pi.campanha,
      valor_total_campanha: valorTotal,
      total_comercializado_parceiros: totComercializado,
      total_comissao: totComissao,
      total_repasse: totRepasse,
      comissao_media_pct:
        totComercializado > 0 ? (totComissao / totComercializado) * 100 : 0,
      fechamento_matematico: diferenca < 0.05,
      diferenca_fechamento: diferenca,
      rateios: rateiosList,
    } as CampanhaRateioResumo;
  });

/**
 * Salva ou atualiza a distribuição/rateio da campanha entre os parceiros de mídia
 */
export const salvarCampanhaRateio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      piId: string;
      rateios: Array<{
        id?: string;
        parceiro_id: string;
        valor_comercializado: number;
        comissao_pct: number;
        status_repasse?: StatusRepasse;
        data_previsao_repasse?: string | null;
        observacoes?: string | null;
      }>;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Obtém dados da campanha
    const { data: pi, error: piErr } = await supabase
      .from("pis")
      .select("id, valor_negociado, tenant_id")
      .eq("id", data.piId)
      .single();

    if (piErr || !pi) throw new Error("Campanha / PI não encontrado");

    // 2. Valida fechamento matemático
    const totRateio = data.rateios.reduce(
      (acc, r) => acc + (Number(r.valor_comercializado) || 0),
      0,
    );
    const valorCampanha = Number(pi.valor_negociado) || 0;
    if (Math.abs(totRateio - valorCampanha) > 0.1 && data.rateios.length > 0) {
      throw new Error(
        `A soma dos rateios dos parceiros (R$ ${totRateio.toFixed(2)}) não fecha com o total da campanha (R$ ${valorCampanha.toFixed(2)}). Corrija os valores antes de salvar.`,
      );
    }

    let sumComissao = 0;
    let sumRepasse = 0;

    // 3. Persiste cada rateio
    for (const r of data.rateios) {
      const { comissaoValor, repasseValor } = calcularRateio(
        r.valor_comercializado,
        r.comissao_pct,
      );
      sumComissao += comissaoValor;
      sumRepasse += repasseValor;

      if (r.id) {
        await supabase
          .from("campanha_rateios")
          .update({
            valor_comercializado: r.valor_comercializado,
            comissao_pct: r.comissao_pct,
            comissao_valor: comissaoValor,
            repasse_valor: repasseValor,
            status_repasse: r.status_repasse || "pendente",
            data_previsao_repasse: r.data_previsao_repasse || null,
            observacoes: r.observacoes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", r.id);
      } else {
        await supabase.from("campanha_rateios").insert({
          tenant_id: pi.tenant_id,
          pi_id: data.piId,
          parceiro_id: r.parceiro_id,
          valor_comercializado: r.valor_comercializado,
          comissao_pct: r.comissao_pct,
          comissao_valor: comissaoValor,
          repasse_valor: repasseValor,
          status_repasse: r.status_repasse || "pendente",
          data_previsao_repasse: r.data_previsao_repasse || null,
          observacoes: r.observacoes || null,
        });
      }
    }

    // 4. Atualiza os totais consolidados no PI principal
    await supabase
      .from("pis")
      .update({
        total_comissao: sumComissao,
        total_repasse: sumRepasse,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.piId);

    return {
      success: true,
      totalComercializado: totRateio,
      totalComissao: sumComissao,
      totalRepasse: sumRepasse,
    };
  });

/**
 * Atualiza o status financeiro de repasse de um parceiro (comprovante Pix / TED)
 */
export const atualizarStatusRepasse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      rateioId: string;
      statusRepasse: StatusRepasse;
      dataPagamento?: string | null;
      comprovanteUrl?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { error } = await supabase
      .from("campanha_rateios")
      .update({
        status_repasse: data.statusRepasse,
        data_pagamento_repasse: data.dataPagamento || (data.statusRepasse === "pago" ? new Date().toISOString().split("T")[0] : null),
        comprovante_pagamento_url: data.comprovanteUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.rateioId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * Gera automaticamente PIs filhas individuais para cada parceiro participante da campanha
 */
export const gerarPisIndividuaisParceiros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { piMaeId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Busca o PI mãe e seus itens
    const { data: piMae, error: piErr } = await supabase
      .from("pis")
      .select("*, pi_itens(*)")
      .eq("id", data.piMaeId)
      .single();

    if (piErr || !piMae) throw new Error("PI / Campanha principal não encontrada");

    // 2. Busca os rateios da campanha
    const { data: rateios } = await supabase
      .from("campanha_rateios")
      .select("*, parceiros(*)")
      .eq("pi_id", data.piMaeId);

    if (!rateios || rateios.length === 0) {
      throw new Error("Nenhum rateio registrado para esta campanha. Salve o rateio antes de gerar PIs dos parceiros.");
    }

    const pisGeradas: string[] = [];

    for (const r of rateios) {
      const parceiro = r.parceiros;
      const prefixo = parceiro?.nome_fantasia
        ? parceiro.nome_fantasia.slice(0, 3).toUpperCase()
        : "PAR";
      const numeroPiParceiro = `${piMae.numero}-${prefixo}`;

      // Verifica se já existe PI filha para este parceiro
      const { data: existing } = await supabase
        .from("pis")
        .select("id")
        .eq("pi_pai_id", data.piMaeId)
        .eq("parceiro_id", r.parceiro_id)
        .maybeSingle();

      let piId = existing?.id;

      if (!piId) {
        const { data: newPi, error: createErr } = await supabase
          .from("pis")
          .insert({
            tenant_id: piMae.tenant_id,
            pi_pai_id: data.piMaeId,
            parceiro_id: r.parceiro_id,
            tipo_pi: "parceiro",
            numero: numeroPiParceiro,
            cliente_id: piMae.cliente_id,
            agencia_id: piMae.agencia_id,
            campanha: `${piMae.campanha} [${parceiro?.nome_fantasia || "Parceiro"}]`,
            mes_veiculacao: piMae.mes_veiculacao,
            ano_veiculacao: piMae.ano_veiculacao,
            periodo_inicio: piMae.periodo_inicio,
            periodo_fim: piMae.periodo_fim,
            status: "aprovado",
            valor_tabela: r.valor_comercializado,
            valor_desconto: 0,
            valor_negociado: r.valor_comercializado,
            total_comissao: r.comissao_valor,
            total_repasse: r.repasse_valor,
            observacao: `PI de Veiculação emitido para o parceiro ${parceiro?.razao_social || ""}. Comissão retida: ${r.comissao_pct}%. Repasse líquido: R$ ${r.repasse_valor}.`,
            created_by: userId,
          })
          .select("id")
          .single();

        if (createErr) throw new Error(`Falha ao criar PI para parceiro: ${createErr.message}`);
        piId = newPi.id;
      }

      pisGeradas.push(piId);
    }

    return {
      success: true,
      quantidade: pisGeradas.length,
      pisIds: pisGeradas,
    };
  });
