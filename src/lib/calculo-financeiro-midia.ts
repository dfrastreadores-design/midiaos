/**
 * MOTOR FINANCEIRO DO MÍDIA OS — REGRA FUNDAMENTAL DE CÁLCULO
 *
 * Em conformidade rigorosa com a Seção 45 e 83 do Prompt Mestre:
 * Quando houver valor destinado ao parceiro:
 *   1. PRIMEIRO ABATER O IMPOSTO DO VALOR BRUTO
 *   2. SOMENTE DEPOIS CALCULAR A COMISSÃO SOBRE O VALOR LÍQUIDO
 *   3. O REPASSE FINAL É O LÍQUIDO MENOS A COMISSÃO
 *
 * FÓRMULAS:
 *   VALOR_IMPOSTO = VALOR_BRUTO_PARCEIRO × (PERCENTUAL_IMPOSTO / 100)
 *   VALOR_LIQUIDO = VALOR_BRUTO_PARCEIRO − VALOR_IMPOSTO
 *   COMISSAO      = VALOR_LIQUIDO × (PERCENTUAL_COMISSAO / 100)
 *   REPASSE_FINAL = VALOR_LIQUIDO − COMISSAO
 */

export interface ResultadoCalculoFinanceiro {
  valorBruto: number;
  percentualImposto: number;
  valorImposto: number;
  valorLiquido: number;
  percentualComissao: number;
  valorComissao: number;
  repasseFinal: number;
  formulaExplicada: string;
}

export interface RateioParceiroItem {
  parceiroId: string;
  parceiroNome: string;
  valorBruto: number;
  percentualImposto: number;
  percentualComissao: number;
}

export interface ResultadoRateioMultiParceiros {
  totalBrutoGeral: number;
  totalImpostosGeral: number;
  totalLiquidoGeral: number;
  totalComissaoGeral: number;
  totalRepasseGeral: number;
  itensParceiros: Array<ResultadoCalculoFinanceiro & { parceiroId: string; parceiroNome: string }>;
}

/**
 * Calcula a decomposição financeira de um parceiro de acordo com a Regra Fundamental
 */
export function calcularRepasseParceiro(
  valorBruto: number,
  percentualImposto: number,
  percentualComissao: number
): ResultadoCalculoFinanceiro {
  const bruto = Math.max(0, Number(valorBruto) || 0);
  const pctImposto = Math.max(0, Number(percentualImposto) || 0);
  const pctComissao = Math.max(0, Number(percentualComissao) || 0);

  // 1. PRIMEIRO ABATER O IMPOSTO
  const valorImposto = Number(((bruto * pctImposto) / 100).toFixed(2));
  const valorLiquido = Number((bruto - valorImposto).toFixed(2));

  // 2. SOMENTE DEPOIS CALCULAR A COMISSÃO
  const valorComissao = Number(((valorLiquido * pctComissao) / 100).toFixed(2));

  // 3. REPASSE FINAL É O LÍQUIDO MENOS A COMISSÃO
  const repasseFinal = Number((valorLiquido - valorComissao).toFixed(2));

  const formulaExplicada =
    `Bruto: R$ ${bruto.toFixed(2)} → ` +
    `Imposto (${pctImposto}%): R$ ${valorImposto.toFixed(2)} → ` +
    `Líquido: R$ ${valorLiquido.toFixed(2)} → ` +
    `Comissão (${pctComissao}% sobre líquido): R$ ${valorComissao.toFixed(2)} → ` +
    `Repasse ao Parceiro: R$ ${repasseFinal.toFixed(2)}`;

  return {
    valorBruto: bruto,
    percentualImposto: pctImposto,
    valorImposto,
    valorLiquido,
    percentualComissao: pctComissao,
    valorComissao,
    repasseFinal,
    formulaExplicada,
  };
}

/**
 * Calcula múltiplos parceiros independentes para uma mesma campanha (Seção 46)
 */
export function calcularRateioMultiParceiros(
  parceirosItens: RateioParceiroItem[]
): ResultadoRateioMultiParceiros {
  let totalBrutoGeral = 0;
  let totalImpostosGeral = 0;
  let totalLiquidoGeral = 0;
  let totalComissaoGeral = 0;
  let totalRepasseGeral = 0;

  const itensCalculados = parceirosItens.map((item) => {
    const calc = calcularRepasseParceiro(
      item.valorBruto,
      item.percentualImposto,
      item.percentualComissao
    );

    totalBrutoGeral += calc.valorBruto;
    totalImpostosGeral += calc.valorImposto;
    totalLiquidoGeral += calc.valorLiquido;
    totalComissaoGeral += calc.valorComissao;
    totalRepasseGeral += calc.repasseFinal;

    return {
      ...calc,
      parceiroId: item.parceiroId,
      parceiroNome: item.parceiroNome,
    };
  });

  return {
    totalBrutoGeral: Number(totalBrutoGeral.toFixed(2)),
    totalImpostosGeral: Number(totalImpostosGeral.toFixed(2)),
    totalLiquidoGeral: Number(totalLiquidoGeral.toFixed(2)),
    totalComissaoGeral: Number(totalComissaoGeral.toFixed(2)),
    totalRepasseGeral: Number(totalRepasseGeral.toFixed(2)),
    itensParceiros: itensCalculados,
  };
}

/**
 * Snapshot Imutável de Congelamento Histórico (Seção 48 e 79)
 * Quando uma proposta, PI ou campanha é aprovada, seus valores financeiros são congelados.
 * Alterações futuras em tabelas de preços, produtos ou taxas não modificam esse registro.
 */
export function criarSnapshotFinanceiroImutavel(
  entidadeTipo: "proposta" | "campanha" | "pi",
  entidadeId: string,
  resultadoRateio: ResultadoRateioMultiParceiros,
  condicoesComerciais?: Record<string, any>
) {
  return {
    entidade_tipo: entidadeTipo,
    entidade_id: entidadeId,
    congelado_em: new Date().toISOString(),
    totais: {
      valor_bruto: resultadoRateio.totalBrutoGeral,
      valor_imposto: resultadoRateio.totalImpostosGeral,
      valor_liquido: resultadoRateio.totalLiquidoGeral,
      valor_comissao: resultadoRateio.totalComissaoGeral,
      valor_repasse: resultadoRateio.totalRepasseGeral,
    },
    parceiros_detalhes: resultadoRateio.itensParceiros,
    condicoes_comerciais: condicoesComerciais || {},
    imutavel: true,
  };
}

/**
 * TESTE FINANCEIRO OBRIGATÓRIO (Seção 83 do Prompt Mestre)
 * Executa a validação formal dos casos de teste exigidos na especificação.
 */
export function executarTesteFinanceiroObrigatorio(): {
  caso1Valido: boolean;
  caso2Valido: boolean;
  detalhes: string[];
} {
  const detalhes: string[] = [];

  // CASO 1:
  // Bruto: R$ 100.000, Imposto: 10%, Comissão: 30%
  // Esperado: Imposto = R$ 10.000, Líquido = R$ 90.000, Comissão = R$ 27.000, Repasse = R$ 63.000
  const c1 = calcularRepasseParceiro(100000, 10, 30);
  const caso1Valido =
    c1.valorImposto === 10000 &&
    c1.valorLiquido === 90000 &&
    c1.valorComissao === 27000 &&
    c1.repasseFinal === 63000;

  detalhes.push(
    `[CASO 1] Bruto 100k, 10% imposto, 30% comissão: ` +
      `Imposto = R$ ${c1.valorImposto} (esperado 10000), ` +
      `Líquido = R$ ${c1.valorLiquido} (esperado 90000), ` +
      `Comissão = R$ ${c1.valorComissao} (esperado 27000), ` +
      `Repasse = R$ ${c1.repasseFinal} (esperado 63000) -> ${caso1Valido ? "APROVADO ✓" : "FALHOU ✕"}`
  );

  // CASO 2:
  // Parceiro A: Bruto R$ 100.000, Imposto 10%, Comissão 30% (Repasse R$ 63.000)
  // Parceiro B: Bruto R$ 50.000, Imposto 5%, Comissão 25%
  // Para B: Imposto = 2.500, Líquido = 47.500, Comissão = 11.875, Repasse = 35.625
  const multi = calcularRateioMultiParceiros([
    { parceiroId: "pA", parceiroNome: "Parceiro A", valorBruto: 100000, percentualImposto: 10, percentualComissao: 30 },
    { parceiroId: "pB", parceiroNome: "Parceiro B", valorBruto: 50000, percentualImposto: 5, percentualComissao: 25 },
  ]);

  const pB = multi.itensParceiros.find((p) => p.parceiroId === "pB");
  const caso2Valido =
    pB !== undefined &&
    pB.valorImposto === 2500 &&
    pB.valorLiquido === 47500 &&
    pB.valorComissao === 11875 &&
    pB.repasseFinal === 35625 &&
    multi.totalRepasseGeral === 63000 + 35625;

  detalhes.push(
    `[CASO 2] Múltiplos Parceiros (A e B): ` +
      `Parceiro B Repasse = R$ ${pB?.repasseFinal} (esperado 35625), ` +
      `Total Repasses = R$ ${multi.totalRepasseGeral} (esperado 98625) -> ${caso2Valido ? "APROVADO ✓" : "FALHOU ✕"}`
  );

  return { caso1Valido, caso2Valido, detalhes };
}
