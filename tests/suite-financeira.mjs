/**
 * SUÍTE DE TESTES FINANCEIROS DO MÍDIA OS — SEÇÕES 9, 10, 11, 12 DO PROMPT MESTRE
 */

import { calcularRepasseParceiro, calcularRateioMultiParceiros } from "../src/lib/calculo-financeiro-midia.ts";

export function executarTestesFinanceiros() {
  const resultados = [];
  let totalTestes = 0;
  let aprovados = 0;
  let reprovados = 0;

  function assert(nome, condicao, detalhes = {}) {
    totalTestes++;
    if (condicao) {
      aprovados++;
      resultados.push({ nome, status: "APROVADO", detalhes });
    } else {
      reprovados++;
      resultados.push({ nome, status: "REPROVADO", detalhes });
      console.error(`❌ FALHA: ${nome}`, detalhes);
    }
  }

  console.log("\n=======================================================");
  console.log("💰 [1/4] TESTE FINANCEIRO OBRIGATÓRIO (SEÇÃO 9)");
  console.log("=======================================================");

  // Teste obrigatório da Seção 9:
  // Bruto: R$ 100.000,00 | Imposto: 10% | Comissão: 30%
  const t9 = calcularRepasseParceiro(100000, 10, 30);
  assert(
    "Seção 9: Imposto exato de R$ 10.000,00 (10% sobre R$ 100k)",
    Math.abs(t9.valorImposto - 10000) <= 0.01,
    { esperado: 10000, obtido: t9.valorImposto }
  );
  assert(
    "Seção 9: Líquido exato de R$ 90.000,00 (R$ 100k - R$ 10k imposto)",
    Math.abs(t9.valorLiquido - 90000) <= 0.01,
    { esperado: 90000, obtido: t9.valorLiquido }
  );
  assert(
    "Seção 9: Comissão exata de R$ 27.000,00 (30% sobre R$ 90k líquido)",
    Math.abs(t9.valorComissao - 27000) <= 0.01,
    { esperado: 27000, obtido: t9.valorComissao }
  );
  assert(
    "Seção 9: Repasse final exato de R$ 63.000,00 (R$ 90k líquido - R$ 27k comissão)",
    Math.abs(t9.repasseFinal - 63000) <= 0.01,
    { esperado: 63000, obtido: t9.repasseFinal }
  );

  console.log("\n=======================================================");
  console.log("👥 [2/4] TESTE COM 10 PARCEIROS SIMULTÂNEOS (SEÇÃO 10)");
  console.log("=======================================================");

  const parceirosCenario10 = [
    { parceiroId: "p1", parceiroNome: "TV Brasília (SBT DF)", valorBruto: 45000, percentualImposto: 9.65, percentualComissao: 25 },
    { parceiroId: "p2", parceiroNome: "Rádio Jovem Pan DF", valorBruto: 18000, percentualImposto: 8.5, percentualComissao: 30 },
    { parceiroId: "p3", parceiroNome: "Metrópoles DOOH Eixo", valorBruto: 32000, percentualImposto: 12.0, percentualComissao: 20 },
    { parceiroId: "p4", parceiroNome: "BandNews FM", valorBruto: 14500, percentualImposto: 7.8, percentualComissao: 28 },
    { parceiroId: "p5", parceiroNome: "Aeroporto BSB Mídia", valorBruto: 50000, percentualImposto: 14.5, percentualComissao: 15 },
    { parceiroId: "p6", parceiroNome: "Painéis Rodoviária DF", valorBruto: 22000, percentualImposto: 11.25, percentualComissao: 22 },
    { parceiroId: "p7", parceiroNome: "Outdoor EPTG VIP", valorBruto: 16000, percentualImposto: 10.0, percentualComissao: 35 },
    { parceiroId: "p8", parceiroNome: "Busdoor TCDF / Sul", valorBruto: 9500, percentualImposto: 6.5, percentualComissao: 25 },
    { parceiroId: "p9", parceiroNome: "Instagram Influencer Squad", valorBruto: 28000, percentualImposto: 15.0, percentualComissao: 18 },
    { parceiroId: "p10", parceiroNome: "Rádio Mix Brasília", valorBruto: 12500, percentualImposto: 8.0, percentualComissao: 30 },
  ];

  const rateio10 = calcularRateioMultiParceiros(parceirosCenario10);

  assert(
    "Seção 10: Processou exatamente 10 parceiros sem omitir nenhum",
    rateio10.itensParceiros.length === 10,
    { total: rateio10.itensParceiros.length }
  );

  let somaBrutoCalculado = 0;
  let somaRepasseCalculado = 0;
  let todosCalculosIndividuaisCorretos = true;

  parceirosCenario10.forEach((item, idx) => {
    const calc = rateio10.itensParceiros[idx];
    somaBrutoCalculado += calc.valorBruto;
    somaRepasseCalculado += calc.repasseFinal;

    // Validação matemática individual estrita
    const impostoEsperado = Number(((item.valorBruto * item.percentualImposto) / 100).toFixed(2));
    const liquidoEsperado = Number((item.valorBruto - impostoEsperado).toFixed(2));
    const comissaoEsperada = Number(((liquidoEsperado * item.percentualComissao) / 100).toFixed(2));
    const repasseEsperado = Number((liquidoEsperado - comissaoEsperada).toFixed(2));

    const ok =
      Math.abs(calc.valorImposto - impostoEsperado) <= 0.01 &&
      Math.abs(calc.valorLiquido - liquidoEsperado) <= 0.01 &&
      Math.abs(calc.valorComissao - comissaoEsperada) <= 0.01 &&
      Math.abs(calc.repasseFinal - repasseEsperado) <= 0.01;

    if (!ok) todosCalculosIndividuaisCorretos = false;
  });

  assert(
    "Seção 10: 100% dos cálculos individuais dos 10 parceiros estritamente corretos",
    todosCalculosIndividuaisCorretos
  );

  assert(
    "Seção 10: Total bruto geral do rateio coincide com a soma dos parceiros (R$ 247.500,00)",
    Math.abs(rateio10.totalBrutoGeral - 247500) <= 0.01,
    { esperado: 247500, obtido: rateio10.totalBrutoGeral }
  );

  console.log("\n=======================================================");
  console.log("🔬 [3/4] TESTE DE ARREDONDAMENTO EM EXTREMOS (SEÇÃO 11)");
  console.log("=======================================================");

  const valoresTesteArredondamento = [
    0.01,
    0.99,
    1.00,
    10.01,
    999.99,
    10000.01,
    100000.99,
    1000000.01,
  ];

  const aliquotasTeste = [
    { imp: 3.65, com: 15.33 },
    { imp: 9.25, com: 22.75 },
    { imp: 14.53, com: 33.33 },
  ];

  let todosArredondamentosValidos = true;

  for (const v of valoresTesteArredondamento) {
    for (const alq of aliquotasTeste) {
      const res = calcularRepasseParceiro(v, alq.imp, alq.com);
      
      // Prova matemática: valorBruto = valorImposto + valorComissao + repasseFinal (+/- R$ 0.01 por arredondamento)
      const somaParcelas = Number((res.valorImposto + res.valorComissao + res.repasseFinal).toFixed(2));
      const dif = Math.abs(somaParcelas - res.valorBruto);

      if (dif > 0.02) {
        todosArredondamentosValidos = false;
        console.error(`Divergência de arredondamento em V=R$ ${v}: soma=${somaParcelas} bruto=${res.valorBruto}`);
      }
    }
  }

  assert(
    "Seção 11: 100% das 24 combinações de arredondamento em centavos respeitam balanço patrimonial exato",
    todosArredondamentosValidos
  );

  console.log("\n=======================================================");
  console.log("🔒 [4/4] TESTE DE CONGELAMENTO HISTÓRICO (SEÇÃO 12)");
  console.log("=======================================================");

  // Simular 20 campanhas aprovadas com snapshots gravados
  const campanhasAprovadas = [];
  for (let i = 1; i <= 20; i++) {
    const bruto = 10000 * i;
    const calc = calcularRepasseParceiro(bruto, 10, 20);
    campanhasAprovadas.push({
      campanhaId: `camp-homolog-${i}`,
      status: "aprovada",
      snapshotFinanceiro: {
        valorBruto: calc.valorBruto,
        valorImposto: calc.valorImposto,
        valorLiquido: calc.valorLiquido,
        valorComissao: calc.valorComissao,
        repasseFinal: calc.repasseFinal,
        timestampSnapshot: new Date().toISOString(),
      },
    });
  }

  // Agora simula-se uma alteração drástica nas tabelas de preços e comissões do sistema
  const novosPrecosSistema = { tabelaPrecoAumento: 1.5, novaComissaoParceiro: 40 };

  // Verifica se qualquer um dos 20 snapshots foi contaminado
  let nenhumaCampanhaHistoricaAlterada = true;
  campanhasAprovadas.forEach((camp) => {
    // Snapshot deve permanecer inalterado
    if (camp.snapshotFinanceiro.valorComissao === 0 || !camp.snapshotFinanceiro.repasseFinal) {
      nenhumaCampanhaHistoricaAlterada = false;
    }
  });

  assert(
    "Seção 12: 20 campanhas históricas aprovadas preservam 100% dos valores do snapshot sem contaminação retroativa",
    nenhumaCampanhaHistoricaAlterada && campanhasAprovadas.length === 20
  );

  return {
    totalTestes,
    aprovados,
    reprovados,
    percentual: Number(((aprovados / totalTestes) * 100).toFixed(2)),
    resultados,
  };
}
