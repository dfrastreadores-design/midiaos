import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PrestacaoContasDados {
  pi_id: string;
  numero: string;
  campanha: string;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  status: string;
  valor_total: number;
  total_insercoes: number;
  total_comissao: number;
  total_repasse: number;
  observacao?: string | null;

  cliente: {
    razao_social: string;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    cidade?: string | null;
    uf?: string | null;
  } | null;

  agencia: {
    razao_social: string;
    nome_fantasia?: string | null;
    cnpj?: string | null;
  } | null;

  parceiros_rateio: Array<{
    parceiro_id: string;
    nome: string;
    cnpj: string;
    valor_comercializado: number;
    comissao_pct: number;
    comissao_valor: number;
    repasse_valor: number;
    status_repasse: string;
    data_pagamento_repasse?: string | null;
  }>;

  itens_veiculados: Array<{
    tipo: string;
    programa?: string | null;
    formato?: string | null;
    total_insercoes: number;
    valor_tabela: number;
    valor_negociado: number;
    parceiro_nome?: string | null;
  }>;

  comprovantes: Array<{
    id: string;
    tipo: string;
    titulo: string;
    data_veiculacao?: string | null;
    validado: boolean;
    arquivo_url?: string | null;
    link_externo?: string | null;
    parceiro_nome?: string | null;
  }>;

  financeiro: {
    faturado: number;
    recebido: number;
    pendente_recebimento: number;
    repassado: number;
    pendente_repasse: number;
    lucro_bruto_comissao: number;
  };
}

/**
 * Compila o dossiê completo de Prestação de Contas de uma Campanha
 */
export const getPrestacaoContas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { piId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1. Dados do PI principal
    const { data: pi, error: piErr } = await supabase
      .from("pis")
      .select(`
        *,
        cliente:clientes(razao_social, nome_fantasia, cnpj, cidade, uf),
        agencia:agencias(razao_social, nome_fantasia, cnpj)
      `)
      .eq("id", data.piId)
      .single();

    if (piErr || !pi) throw new Error("Campanha / PI não encontrada");

    // 2. Itens veiculados
    const { data: itens } = await supabase
      .from("pi_itens")
      .select("*, parceiros(nome_fantasia, razao_social)")
      .eq("pi_id", data.piId);

    // 3. Rateios dos parceiros
    const { data: rateios } = await supabase
      .from("campanha_rateios")
      .select("*, parceiros(nome_fantasia, razao_social, cnpj)")
      .eq("pi_id", data.piId);

    // 4. Comprovantes de execução
    const { data: comprovantes } = await supabase
      .from("comprovantes_execucao")
      .select("*, parceiros(nome_fantasia, razao_social)")
      .eq("pi_id", data.piId);

    // 5. Dados de faturamento e pagamentos
    const { data: finPi } = await supabase
      .from("pi_financeiro")
      .select("*")
      .eq("pi_id", data.piId);

    let totalFaturado = Number(pi.valor_negociado) || 0;
    let totalRecebido = 0;
    (finPi || []).forEach((f: any) => {
      if (f.status_pagamento === "pago") {
        totalRecebido += Number(f.valor) || 0;
      }
    });

    let totalRepasse = 0;
    let totalRepassadoPago = 0;
    let totalComissao = 0;

    const rateiosFormatados = (rateios || []).map((r: any) => {
      const v = Number(r.valor_comercializado) || 0;
      const c = Number(r.comissao_valor) || 0;
      const rep = Number(r.repasse_valor) || 0;

      totalComissao += c;
      totalRepasse += rep;
      if (r.status_repasse === "pago") {
        totalRepassadoPago += rep;
      }

      return {
        parceiro_id: r.parceiro_id,
        nome: r.parceiros?.nome_fantasia || r.parceiros?.razao_social || "Parceiro",
        cnpj: r.parceiros?.cnpj || "",
        valor_comercializado: v,
        comissao_pct: Number(r.comissao_pct) || 0,
        comissao_valor: c,
        repasse_valor: rep,
        status_repasse: r.status_repasse || "pendente",
        data_pagamento_repasse: r.data_pagamento_repasse,
      };
    });

    return {
      pi_id: pi.id,
      numero: pi.numero,
      campanha: pi.campanha,
      periodo_inicio: pi.periodo_inicio,
      periodo_fim: pi.periodo_fim,
      status: pi.status,
      valor_total: totalFaturado,
      total_insercoes: Number(pi.total_insercoes) || 0,
      total_comissao: totalComissao,
      total_repasse: totalRepasse,
      observacao: pi.observacao,

      cliente: pi.cliente || null,
      agencia: pi.agencia || null,

      parceiros_rateio: rateiosFormatados,

      itens_veiculados: (itens || []).map((it: any) => ({
        tipo: it.tipo,
        programa: it.programa,
        formato: it.formato,
        total_insercoes: Number(it.total_insercoes) || 0,
        valor_tabela: Number(it.valor_tabela) || 0,
        valor_negociado: Number(it.valor_negociado) || 0,
        parceiro_nome: it.parceiros?.nome_fantasia || it.parceiros?.razao_social || null,
      })),

      comprovantes: (comprovantes || []).map((c: any) => ({
        id: c.id,
        tipo: c.tipo,
        titulo: c.titulo,
        data_veiculacao: c.data_veiculacao,
        validado: c.validado ?? false,
        arquivo_url: c.arquivo_url,
        link_externo: c.link_externo,
        parceiro_nome: c.parceiros?.nome_fantasia || c.parceiros?.razao_social || null,
      })),

      financeiro: {
        faturado: totalFaturado,
        recebido: totalRecebido,
        pendente_recebimento: Math.max(0, totalFaturado - totalRecebido),
        repassado: totalRepassadoPago,
        pendente_repasse: Math.max(0, totalRepasse - totalRepassadoPago),
        lucro_bruto_comissao: totalComissao,
      },
    } as PrestacaoContasDados;
  });
