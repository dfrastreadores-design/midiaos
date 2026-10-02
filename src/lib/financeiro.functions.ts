import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TipoTransacao = "entrada" | "saida";
export type StatusTransacao = "pendente" | "pago" | "cancelado" | "agendado";

export const CATEGORIAS_ENTRADA = [
  "Receitas de PIs / Mídia",
  "Projetos Especiais",
  "Produção Comercial",
  "Permutas e Barter",
  "Rendimento de Aplicações",
  "Aportes e Empréstimos",
  "Outras Receitas",
] as const;

export const CATEGORIAS_SAIDA = [
  "Comissões de Executivos",
  "Repasses a Parceiros de Mídia",
  "Folha de Pagamento / Pró-labore",
  "Benefícios e Alimentação",
  "Impostos e Tributos (DAS/ISS)",
  "Operação e Veiculação",
  "Aluguel e Condomínio",
  "Energia e Conectividade",
  "Sistemas e Licenças de Software",
  "Marketing e Vendas",
  "Manutenção e Infraestrutura",
  "Veículos e Logística",
  "Material de Escritório / Administrativo",
  "Serviços Prestados por Terceiros",
  "Tarifas Bancárias e Juros",
  "Outras Despesas Operacionais",
] as const;

export const FORMAS_PAGAMENTO = [
  "PIX",
  "Boleto Bancário",
  "Transferência (TED/DOC)",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Cheque",
  "Dinheiro",
] as const;

export type TransacaoFinanceira = {
  id: string;
  tenant_id?: string | null;
  tipo: TipoTransacao;
  descricao: string;
  categoria: string;
  valor: number;
  data_competencia: string;
  data_vencimento: string;
  data_pagamento?: string | null;
  status: StatusTransacao;
  forma_pagamento?: string | null;
  cliente_id?: string | null;
  parceiro_id?: string | null;
  pi_id?: string | null;
  comprovante_url?: string | null;
  recorrente?: boolean;
  observacoes?: string | null;
  created_at?: string;
  cliente?: { razao_social?: string; nome_fantasia?: string } | null;
  parceiro?: { razao_social?: string; nome_fantasia?: string } | null;
  pi?: { numero?: string; campanha?: string } | null;
};

const TransacaoSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(["entrada", "saida"]),
  descricao: z.string().min(1, "Informe a descrição do lançamento").max(200),
  categoria: z.string().min(1, "Selecione a categoria").max(100),
  valor: z.number().min(0.01, "O valor deve ser maior que zero"),
  data_competencia: z.string().min(8).max(10),
  data_vencimento: z.string().min(8).max(10),
  data_pagamento: z.string().max(10).optional().nullable(),
  status: z.enum(["pendente", "pago", "cancelado", "agendado"]).default("pendente"),
  forma_pagamento: z.string().max(50).optional().nullable().default("PIX"),
  cliente_id: z.string().uuid().optional().nullable(),
  parceiro_id: z.string().uuid().optional().nullable(),
  pi_id: z.string().uuid().optional().nullable(),
  comprovante_url: z.string().max(500).optional().nullable(),
  recorrente: z.boolean().default(false),
  observacoes: z.string().max(1000).optional().nullable(),
});

export const listTransacoesFinanceiras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    try {
      let query = context.supabase
        .from("financeiro_transacoes")
        .select(
          `
          *,
          cliente:cliente_id (razao_social, nome_fantasia),
          parceiro:parceiro_id (razao_social, nome_fantasia),
          pi:pi_id (numero, campanha)
        `,
        )
        .order("data_vencimento", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback caso a tabela ainda não exista no schema local
        console.warn("Tabela financeiro_transacoes:", error.message);
        return [];
      }
      return (data ?? []) as TransacaoFinanceira[];
    } catch {
      return [];
    }
  });

export const upsertTransacaoFinanceira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TransacaoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    const payload = {
      ...data,
      created_by: context.userId,
      updated_at: new Date().toISOString(),
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };

    let q = data.id
      ? context.supabase
          .from("financeiro_transacoes")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single()
      : context.supabase.from("financeiro_transacoes").insert(payload).select().single();

    const { data: row, error } = await q;
    if (error) throw new Error(error.message);

    // Quando uma receita do cliente for paga, calcula e gera a comissão do indicador caso exista
    if (row && row.tipo === "entrada" && row.status === "pago" && row.cliente_id && tenantId) {
      try {
        const { data: cli } = await context.supabase
          .from("clientes")
          .select("id, indicador_id, comissao_indicacao_pct, indicador:indicador_id(id, percentual_comissao_padrao)")
          .eq("id", row.cliente_id)
          .single();

        if (cli?.indicador_id) {
          const pct = Number(cli.comissao_indicacao_pct || cli.indicador?.percentual_comissao_padrao || 5);
          const valorBase = Number(row.valor || 0);
          const valorComissao = (valorBase * pct) / 100;

          // Verifica se já não foi gerada comissão para esta transação
          const { data: existente } = await context.supabase
            .from("comissoes_indicacao")
            .select("id")
            .eq("transacao_id", row.id)
            .maybeSingle();

          if (!existente && valorComissao > 0) {
            await context.supabase.from("comissoes_indicacao").insert({
              tenant_id: tenantId,
              indicador_id: cli.indicador_id,
              cliente_id: row.cliente_id,
              pi_id: row.pi_id || null,
              transacao_id: row.id,
              valor_base: valorBase,
              percentual: pct,
              valor_comissao: valorComissao,
              status: "pendente",
              observacoes: `Comissão gerada automaticamente pelo pagamento de: ${row.descricao}`,
            });
          }
        }
      } catch (err) {
        console.warn("Aviso ao registrar comissão de indicação:", err);
      }
    }

    return row;
  });

export const deleteTransacaoFinanceira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financeiro_transacoes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type DicaFinanceira = {
  id: string;
  tipo: "alerta" | "estrategia" | "positivo" | "otimizacao";
  titulo: string;
  descricao: string;
  impacto: string;
  acaoRecomendada: string;
};

export const getDicasFinanceiras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    // Busca transações e PIs para embasar as dicas reais
    let qTrans = context.supabase.from("financeiro_transacoes").select("*");
    if (tenantId) qTrans = qTrans.eq("tenant_id", tenantId);
    const { data: transacoes = [] } = await qTrans;

    let qPis = context.supabase
      .from("pi_financeiro")
      .select("*, pi:pi_id(numero, valor_negociado)");
    const { data: piFin = [] } = await qPis;

    const items = transacoes || [];
    const hoje = new Date().toISOString().split("T")[0];

    const entradas = items.filter((t: any) => t.tipo === "entrada");
    const saidas = items.filter((t: any) => t.tipo === "saida");

    const totalEntradasPagas = entradas
      .filter((t: any) => t.status === "pago")
      .reduce((acc: number, t: any) => acc + Number(t.valor || 0), 0);

    const totalSaidasPagas = saidas
      .filter((t: any) => t.status === "pago")
      .reduce((acc: number, t: any) => acc + Number(t.valor || 0), 0);

    const saidasVencendo7Dias = saidas.filter((t: any) => {
      if (t.status === "pago" || t.status === "cancelado") return false;
      const d = t.data_vencimento;
      return d >= hoje && d <= new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    });

    const valorSaidas7Dias = saidasVencendo7Dias.reduce(
      (acc: number, t: any) => acc + Number(t.valor || 0),
      0,
    );

    const pisVencidos = (piFin || []).filter(
      (f: any) =>
        f.status_pagamento !== "pago" && f.vencimento_boleto && f.vencimento_boleto < hoje,
    );

    const totalPisVencidos = pisVencidos.reduce(
      (acc: number, f: any) => acc + Number(f.valor || f.pi?.valor_negociado || 0),
      0,
    );

    const saldoAtual = totalEntradasPagas - totalSaidasPagas;

    const dicas: DicaFinanceira[] = [];

    // Dica 1: Gestão de Caixa e Próximos Vencimentos
    if (valorSaidas7Dias > 0) {
      if (saldoAtual < valorSaidas7Dias) {
        dicas.push({
          id: "cobertura-caixa",
          tipo: "alerta",
          titulo: "Atenção ao Saldo de Cobertura nos Próximos 7 Dias",
          descricao: `Existem R$ ${valorSaidas7Dias.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em contas a pagar nos próximos 7 dias. Seu saldo atual em caixa requer antecipação ou cobrança ativa para garantir a liquidez sem recorrer a cheque especial.`,
          impacto: "Prevenção de juros e encargos bancários",
          acaoRecomendada:
            "Priorize cobrança de clientes com vencimento imediato e antecipe recebíveis com menor taxa.",
        });
      } else {
        dicas.push({
          id: "cobertura-ok",
          tipo: "positivo",
          titulo: "Caixa Seguro para os Próximos 7 Dias",
          descricao: `As saídas previstas para a próxima semana somam R$ ${valorSaidas7Dias.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, e seu saldo atual cobre com folga essas obrigações.`,
          impacto: "Saúde financeira estável no curto prazo",
          acaoRecomendada:
            "Considere aplicar o excedente de caixa em fundos de liquidez diária (CDI 100%).",
        });
      }
    }

    // Dica 2: Inadimplência e Contas a Receber
    if (totalPisVencidos > 0) {
      dicas.push({
        id: "inadimplencia-pis",
        tipo: "alerta",
        titulo: `R$ ${totalPisVencidos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em Boletos Vencidos`,
        descricao: `Foram identificados ${pisVencidos.length} PIs com boletos vencidos sem confirmação de liquidação. A média do mercado aponta que cobranças realizadas até o 5º dia de atraso recuperam 92% do valor sem litígio.`,
        impacto: "Aumento imediato do fluxo de caixa disponível",
        acaoRecomendada:
          "Dispare notificações amigáveis de 2ª via de boleto via WhatsApp ou e-mail com link PIX.",
      });
    }

    // Dica 3: Ponto de Equilíbrio Operacional (Break-Even)
    const custosFixos = saidas.filter((t: any) =>
      [
        "Aluguel e Condomínio",
        "Energia e Conectividade",
        "Folha de Pagamento / Pró-labore",
        "Sistemas e Licenças de Software",
      ].includes(t.categoria),
    );
    const totalCustosFixos = custosFixos.reduce(
      (acc: number, t: any) => acc + Number(t.valor || 0),
      0,
    );

    dicas.push({
      id: "ponto-equilibrio",
      tipo: "estrategia",
      titulo: "Ponto de Equilíbrio Operacional (Break-Even)",
      descricao: `Seus custos fixos essenciais somam aproximadamente R$ ${(totalCustosFixos || 15000).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês. Para cobrir esses custos com margem líquida média de 40%, o faturamento mensal mínimo recomendado é de R$ ${((totalCustosFixos || 15000) / 0.4).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      impacto: "Segurança operacional e meta mínima de vendas",
      acaoRecomendada:
        "Alinhe as metas da equipe comercial para bater 100% dos custos fixos até a 2ª semana de cada mês.",
    });

    // Dica 4: Rentabilidade de Mídia e Comissões
    dicas.push({
      id: "rentabilidade-midia",
      tipo: "otimizacao",
      titulo: "Maximização de Margem em Mídias Digitais e DOOH",
      descricao:
        "Produtos de DOOH e Painéis Digitais possuem custo marginal de veiculação próximo de zero uma vez instalados. Priorizar a venda de pacotes combinados (TV/Rádio + DOOH) eleva o ticket médio da proposta em até 35% sem elevar custos fixos.",
      impacto: "Elevação da margem de lucro líquido por contrato",
      acaoRecomendada:
        "Ofereça bônus de telas DOOH como contrapartida estratégica para fechar PIs de maior valor.",
    });

    // Dica 5: Reserva de Contingência
    dicas.push({
      id: "reserva-contingencia",
      tipo: "estrategia",
      titulo: "Construção da Reserva de Emergência Empresarial",
      descricao:
        "Empresas do setor de comunicação e publicidade devem manter entre 2 a 3 meses de despesas fixas em reserva de emergência para enfrentar sazonalidades pós-eleitorais ou recessão no varejo.",
      impacto: "Tranquilidade e poder de negociação com fornecedores",
      acaoRecomendada:
        "Destine automaticamente 5% de cada PI recebido para uma conta poupança/CDI de reserva.",
    });

    return dicas;
  });
