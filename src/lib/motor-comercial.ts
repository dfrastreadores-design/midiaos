/**
 * MÍDIA OS — MOTOR COMERCIAL E DE NEGOCIAÇÃO DE PROPOSTAS
 * 
 * Regras mandatórias:
 * 1. O preço de tabela (bruto) é SEMPRE preservado e nunca sobrescrito por descontos.
 * 2. Três modalidades de desconto exclusivas (não cumulativas acidentalmente):
 *    - Modalidade A: Desconto individual por item
 *    - Modalidade B: Desconto geral em todos os itens
 *    - Modalidade C: Valor final negociado (distribuição determinística proporcional com ajuste de centavos)
 * 3. Precisão decimal estrita em moeda brasileira (arredondamento bancário/comercial a 2 casas).
 * 4. Preservação de comissões, BV e repasses ao veículo/fornecedor.
 */

export type ModalidadeDesconto = "nenhum" | "item" | "geral" | "total";

export interface ItemNegociacaoInput {
  id?: string;
  produto_id: string;
  nome?: string;
  midia?: string | null;
  formato?: string | null;
  regiao?: string | null;
  quantidade: number;
  valor_unit_tabela: number; // Preço unitário bruto de tabela
  desconto_pct?: number;     // % desconto se modalidade A
  comissao_pct?: number;     // % comissão do inquilino/agência (padrão 20%)
  elegivel_desconto?: boolean;
  observacoes?: string | null;
  pilar_estrategico?: string;
  impactos_estimados?: number;
  [key: string]: any;
}

export interface ItemNegociacaoCalculado extends ItemNegociacaoInput {
  quantidade: number;
  valor_unit_tabela: number;
  valor_tabela: number;       // Bruto total = valor_unit_tabela * quantidade
  desconto_pct: number;       // % de desconto efetivo nesta linha
  desconto_valor: number;     // R$ total de desconto nesta linha
  valor_negociado: number;    // Líquido negociado = valor_tabela - desconto_valor
  valor_total_negociado?: number; // Alias para valor_negociado
  valor_unit_negociado: number; // Líquido unitário
  comissao_pct: number;       // % de comissão/BV
  comissao_valor: number;     // R$ comissão
  repasse_parceiro_valor: number; // R$ repasse ao veículo
  repasse_valor?: number;     // Alias para repasse_parceiro_valor
}

export interface ResultadoNegociacao {
  modalidade: ModalidadeDesconto;
  itens: ItemNegociacaoCalculado[];
  valor_tabela_total: number;       // Bruto total geral
  valor_desconto_total: number;     // Total de desconto concedido
  desconto_geral_pct: number;       // % médio ponderado ou geral
  desconto_medio_pct?: number;      // Alias para desconto_geral_pct
  valor_negociado_total: number;    // Valor líquido final negociado
  total_insercoes: number;          // Total de faces/inserções
  comissao_total: number;           // Total comissão/BV
  repasse_parceiros_total: number;  // Total de repasse a parceiros/veículos
  repasse_total?: number;           // Alias para repasse_parceiros_total
  margem_liquida: number;           // Margem retida pela agência/representação
  exige_aprovacao: boolean;         // Indicador de governança comercial
  motivo_aprovacao?: string | null;
}

export interface ParametrosNegociacao {
  modalidade: ModalidadeDesconto;
  desconto_geral_pct?: number;     // Usado na modalidade B
  valor_final_alvo?: number;       // Usado na modalidade C
  limite_desconto_sem_aprovacao?: number; // Padrão 25%
}

/**
 * Arredonda valor para 2 casas decimais (moeda BRL) evitando anomalias de floating point
 */
export function arredondarMoeda(valor: number): number {
  if (isNaN(valor) || !isFinite(valor)) return 0;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula a negociação comercial completa respeitando preços de tabela e modalidade escolhida
 */
export function calcularNegociacaoComercial(
  itensOrParams: ItemNegociacaoInput[] | {
    itens: ItemNegociacaoInput[];
    modalidade?: ModalidadeDesconto;
    descontoGeralPct?: number;
    desconto_geral_pct?: number;
    valorFinalAlvo?: number;
    valor_final_alvo?: number;
    limite_desconto_sem_aprovacao?: number;
  },
  paramsMaybe?: ParametrosNegociacao
): ResultadoNegociacao {
  let itensInput: ItemNegociacaoInput[];
  let params: ParametrosNegociacao;

  if (Array.isArray(itensOrParams)) {
    itensInput = itensOrParams;
    params = paramsMaybe || { modalidade: "nenhum" };
  } else {
    itensInput = itensOrParams.itens || [];
    params = {
      modalidade: itensOrParams.modalidade || "nenhum",
      desconto_geral_pct: itensOrParams.descontoGeralPct ?? itensOrParams.desconto_geral_pct,
      valor_final_alvo: itensOrParams.valorFinalAlvo ?? itensOrParams.valor_final_alvo,
      limite_desconto_sem_aprovacao: itensOrParams.limite_desconto_sem_aprovacao,
    };
  }

  const modalidade = params.modalidade || "nenhum";
  const limiteAprovacao = params.limite_desconto_sem_aprovacao ?? 25;

  if (!itensInput || itensInput.length === 0) {
    return {
      modalidade,
      itens: [],
      valor_tabela_total: 0,
      valor_desconto_total: 0,
      desconto_geral_pct: 0,
      desconto_medio_pct: 0,
      valor_negociado_total: 0,
      total_insercoes: 0,
      comissao_total: 0,
      repasse_parceiros_total: 0,
      repasse_total: 0,
      margem_liquida: 0,
      exige_aprovacao: false,
      motivo_aprovacao: null,
    };
  }

  // 1. Preparar valores brutos inalteráveis de tabela
  const baseItens = itensInput.map((it) => {
    const qtd = Math.max(1, Math.round(Number(it.quantidade) || 1));
    const vUnitBruto = arredondarMoeda(Number(it.valor_unit_tabela) || 0);
    const vTabelaItem = arredondarMoeda(vUnitBruto * qtd);
    const elegivel = it.elegivel_desconto !== false;
    const comissaoPct = Number(it.comissao_pct ?? 20);

    return {
      ...it,
      quantidade: qtd,
      valor_unit_tabela: vUnitBruto,
      valor_tabela: vTabelaItem,
      elegivel_desconto: elegivel,
      comissao_pct: Math.min(100, Math.max(0, comissaoPct)),
    };
  });

  const valorTabelaTotal = arredondarMoeda(
    baseItens.reduce((acc, it) => acc + it.valor_tabela, 0)
  );
  const totalInsercoes = baseItens.reduce((acc, it) => acc + it.quantidade, 0);

  const valorTabelaElegivel = arredondarMoeda(
    baseItens
      .filter((it) => it.elegivel_desconto)
      .reduce((acc, it) => acc + it.valor_tabela, 0)
  );

  let itensCalculados: ItemNegociacaoCalculado[] = [];
  let valorDescontoTotal = 0;
  let valorNegociadoTotal = 0;

  // 2. Aplicar regra da modalidade selecionada
  if (modalidade === "nenhum" || valorTabelaTotal === 0) {
    // Sem descontos: líquido = bruto
    itensCalculados = baseItens.map((it) => {
      const vNegociado = it.valor_tabela;
      const vComissao = arredondarMoeda(vNegociado * (it.comissao_pct / 100));
      const vRepasse = arredondarMoeda(vNegociado - vComissao);

      return {
        ...it,
        desconto_pct: 0,
        desconto_valor: 0,
        valor_negociado: vNegociado,
        valor_unit_negociado: it.valor_unit_tabela,
        comissao_valor: vComissao,
        repasse_parceiro_valor: vRepasse,
      };
    });

    valorDescontoTotal = 0;
    valorNegociadoTotal = valorTabelaTotal;
  } else if (modalidade === "item") {
    // MODALIDADE A: Desconto individual por item
    itensCalculados = baseItens.map((it) => {
      let descPct = it.elegivel_desconto ? Math.min(100, Math.max(0, Number(it.desconto_pct) || 0)) : 0;
      descPct = arredondarMoeda(descPct);

      const descValor = arredondarMoeda(it.valor_tabela * (descPct / 100));
      const vNegociado = arredondarMoeda(it.valor_tabela - descValor);
      const vUnitNeg = arredondarMoeda(vNegociado / it.quantidade);
      const vComissao = arredondarMoeda(vNegociado * (it.comissao_pct / 100));
      const vRepasse = arredondarMoeda(vNegociado - vComissao);

      return {
        ...it,
        desconto_pct: descPct,
        desconto_valor: descValor,
        valor_negociado: vNegociado,
        valor_unit_negociado: vUnitNeg,
        comissao_valor: vComissao,
        repasse_parceiro_valor: vRepasse,
      };
    });

    valorDescontoTotal = arredondarMoeda(
      itensCalculados.reduce((acc, it) => acc + it.desconto_valor, 0)
    );
    valorNegociadoTotal = arredondarMoeda(
      itensCalculados.reduce((acc, it) => acc + it.valor_negociado, 0)
    );
  } else if (modalidade === "geral") {
    // MODALIDADE B: Desconto geral percentual em todos os itens elegíveis
    const descGeralPct = Math.min(100, Math.max(0, Number(params.desconto_geral_pct) || 0));
    const descontoAlvoGeral = arredondarMoeda(valorTabelaElegivel * (descGeralPct / 100));

    let somaDescontosItens = 0;
    const elegiveis = baseItens.filter((it) => it.elegivel_desconto);
    const ultimoElegivelIdx = elegiveis.length > 0 ? baseItens.indexOf(elegiveis[elegiveis.length - 1]) : -1;

    itensCalculados = baseItens.map((it, idx) => {
      if (!it.elegivel_desconto) {
        const vComissao = arredondarMoeda(it.valor_tabela * (it.comissao_pct / 100));
        return {
          ...it,
          desconto_pct: 0,
          desconto_valor: 0,
          valor_negociado: it.valor_tabela,
          valor_unit_negociado: it.valor_unit_tabela,
          comissao_valor: vComissao,
          repasse_parceiro_valor: arredondarMoeda(it.valor_tabela - vComissao),
        };
      }

      let descValor: number;
      if (idx === ultimoElegivelIdx) {
        // Ajuste de centavos no último item elegível
        descValor = arredondarMoeda(descontoAlvoGeral - somaDescontosItens);
      } else {
        descValor = arredondarMoeda(it.valor_tabela * (descGeralPct / 100));
        somaDescontosItens = arredondarMoeda(somaDescontosItens + descValor);
      }

      const vNegociado = arredondarMoeda(it.valor_tabela - descValor);
      const vUnitNeg = arredondarMoeda(vNegociado / it.quantidade);
      const vComissao = arredondarMoeda(vNegociado * (it.comissao_pct / 100));
      const vRepasse = arredondarMoeda(vNegociado - vComissao);
      const efetivoPct = it.valor_tabela > 0 ? arredondarMoeda((descValor / it.valor_tabela) * 100) : 0;

      return {
        ...it,
        desconto_pct: efetivoPct,
        desconto_valor: descValor,
        valor_negociado: vNegociado,
        valor_unit_negociado: vUnitNeg,
        comissao_valor: vComissao,
        repasse_parceiro_valor: vRepasse,
      };
    });

    valorDescontoTotal = descontoAlvoGeral;
    valorNegociadoTotal = arredondarMoeda(valorTabelaTotal - valorDescontoTotal);
  } else if (modalidade === "total") {
    // MODALIDADE C: Valor final negociado informado pelo usuário
    const alvoInformado = Math.max(0, arredondarMoeda(Number(params.valor_final_alvo) || 0));
    
    // Se o alvo for maior ou igual ao bruto, não há desconto
    if (alvoInformado >= valorTabelaTotal) {
      itensCalculados = baseItens.map((it) => {
        const vComissao = arredondarMoeda(it.valor_tabela * (it.comissao_pct / 100));
        return {
          ...it,
          desconto_pct: 0,
          desconto_valor: 0,
          valor_negociado: it.valor_tabela,
          valor_unit_negociado: it.valor_unit_tabela,
          comissao_valor: vComissao,
          repasse_parceiro_valor: arredondarMoeda(it.valor_tabela - vComissao),
        };
      });
      valorDescontoTotal = 0;
      valorNegociadoTotal = valorTabelaTotal;
    } else {
      const descontoNecessario = arredondarMoeda(valorTabelaTotal - alvoInformado);
      const elegiveis = baseItens.filter((it) => it.elegivel_desconto);
      const ultimoElegivelIdx = elegiveis.length > 0 ? baseItens.indexOf(elegiveis[elegiveis.length - 1]) : -1;

      let somaDescontosItens = 0;

      itensCalculados = baseItens.map((it, idx) => {
        if (!it.elegivel_desconto || valorTabelaElegivel === 0) {
          const vComissao = arredondarMoeda(it.valor_tabela * (it.comissao_pct / 100));
          return {
            ...it,
            desconto_pct: 0,
            desconto_valor: 0,
            valor_negociado: it.valor_tabela,
            valor_unit_negociado: it.valor_unit_tabela,
            comissao_valor: vComissao,
            repasse_parceiro_valor: arredondarMoeda(it.valor_tabela - vComissao),
          };
        }

        let descValor: number;
        if (idx === ultimoElegivelIdx) {
          // Ajuste exato de centavos para garantir fechamento idêntico ao alvo
          descValor = arredondarMoeda(descontoNecessario - somaDescontosItens);
        } else {
          // Proporção de cada item em relação ao bruto elegível total
          const proporcao = it.valor_tabela / valorTabelaElegivel;
          descValor = arredondarMoeda(descontoNecessario * proporcao);
          somaDescontosItens = arredondarMoeda(somaDescontosItens + descValor);
        }

        const vNegociado = arredondarMoeda(it.valor_tabela - descValor);
        const vUnitNeg = arredondarMoeda(vNegociado / it.quantidade);
        const vComissao = arredondarMoeda(vNegociado * (it.comissao_pct / 100));
        const vRepasse = arredondarMoeda(vNegociado - vComissao);
        const efetivoPct = it.valor_tabela > 0 ? arredondarMoeda((descValor / it.valor_tabela) * 100) : 0;

        return {
          ...it,
          desconto_pct: efetivoPct,
          desconto_valor: descValor,
          valor_negociado: vNegociado,
          valor_unit_negociado: vUnitNeg,
          comissao_valor: vComissao,
          repasse_parceiro_valor: vRepasse,
        };
      });

      valorDescontoTotal = descontoNecessario;
      valorNegociadoTotal = alvoInformado;
    }
  }

  // 3. Totais e consolidação de comissão e repasses
  const comissaoTotal = arredondarMoeda(
    itensCalculados.reduce((acc, it) => acc + it.comissao_valor, 0)
  );
  const repasseParceirosTotal = arredondarMoeda(
    itensCalculados.reduce((acc, it) => acc + it.repasse_parceiro_valor, 0)
  );
  const margemLiquida = arredondarMoeda(valorNegociadoTotal - repasseParceirosTotal);

  const descontoGeralPct =
    valorTabelaTotal > 0
      ? arredondarMoeda((valorDescontoTotal / valorTabelaTotal) * 100)
      : 0;

  // 4. Verificação de limite de alçada comercial
  const exigeAprovacao = descontoGeralPct > limiteAprovacao;
  const motivoAprovacao = exigeAprovacao
    ? `Desconto comercial de ${descontoGeralPct.toFixed(2)}% supera o limite de alçada automática de ${limiteAprovacao}%. Exige aprovação da Diretoria Comercial.`
    : null;

  return {
    modalidade,
    itens: itensCalculados.map((it) => ({
      ...it,
      valor_total_negociado: it.valor_negociado,
      repasse_valor: it.repasse_parceiro_valor,
    })),
    valor_tabela_total: valorTabelaTotal,
    valor_desconto_total: valorDescontoTotal,
    desconto_geral_pct: descontoGeralPct,
    desconto_medio_pct: descontoGeralPct,
    valor_negociado_total: valorNegociadoTotal,
    total_insercoes: totalInsercoes,
    comissao_total: comissaoTotal,
    repasse_parceiros_total: repasseParceirosTotal,
    repasse_total: repasseParceirosTotal,
    margem_liquida: margemLiquida,
    exige_aprovacao: exigeAprovacao,
    motivo_aprovacao: motivoAprovacao,
  };
}
