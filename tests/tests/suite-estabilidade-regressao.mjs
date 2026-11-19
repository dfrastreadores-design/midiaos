/**
 * SUÍTE DE TESTES DE ESTABILIDADE, PERFORMANCE E 100 EXECUÇÕES CONSECUTIVAS — SEÇÕES 21, 22 E 23
 */

import { calcularRepasseParceiro, calcularRateioMultiParceiros } from "../src/lib/calculo-financeiro-midia.ts";
import { montarEstrategiaHeuristicaAvancada } from "../src/lib/estrategia-midia-ia.ts";

export function executarTestesEstabilidadePerformance() {
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
  console.log("⏱️ [1/2] TESTES DE METAS DE PERFORMANCE (SEÇÃO 21)");
  console.log("=======================================================");

  // 1. Desempenho do Motor de Cálculo Financeiro (Meta <= 1ms por operação)
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) {
    calcularRepasseParceiro(100000 + i, 10, 25);
  }
  const duracaoFinanceira = performance.now() - t0;
  const tempoMedioFinanceiroMs = duracaoFinanceira / 1000;

  assert(
    `Seção 21: Motor de cálculo financeiro executou 1.000 iterações em ${duracaoFinanceira.toFixed(2)}ms (média ${tempoMedioFinanceiroMs.toFixed(3)}ms <= 1ms)`,
    tempoMedioFinanceiroMs <= 1.0
  );

  // 2. Desempenho da IA de Estratégia de Mídia (Meta <= 50ms por plano completo)
  const tIa0 = performance.now();
  for (let i = 0; i < 50; i++) {
    montarEstrategiaHeuristicaAvancada({
      cliente_nome: "Cliente Teste Performance",
      cenario_atual: "Varejo",
      objetivo_principal: "Branding",
      budget_estimado: 50000,
      pracas: ["DF"],
    });
  }
  const duracaoIa = performance.now() - tIa0;
  const tempoMedioIaMs = duracaoIa / 50;

  assert(
    `Seção 21: Geração de estratégia completa da IA executou em média ${tempoMedioIaMs.toFixed(2)}ms (meta <= 50ms)`,
    tempoMedioIaMs <= 50.0
  );

  console.log("\n=======================================================");
  console.log("🔁 [2/2] 100 EXECUÇÕES CONSECUTIVAS SEM FALHA FLAKY (SEÇÃO 22)");
  console.log("=======================================================");

  let falhasIntermitentes = 0;

  for (let exec = 1; exec <= 100; exec++) {
    // Execução do pipeline crítico
    const calc = calcularRepasseParceiro(100000, 10, 30);
    const okCalc = calc.valorImposto === 10000 && calc.valorLiquido === 90000 && calc.valorComissao === 27000 && calc.repasseFinal === 63000;

    const estrat = montarEstrategiaHeuristicaAvancada({
      cliente_nome: `Cliente Consecutivo ${exec}`,
      cenario_atual: "Imobiliário",
      objetivo_principal: "Leads",
      budget_estimado: 100000,
      pracas: ["DF"],
    });
    const okIa = estrat.cronograma_fases.length === 3 && estrat.mix_recomendado.length >= 2;

    if (!okCalc || !okIa) {
      falhasIntermitentes++;
      console.error(`Falha intermitente detectada na iteração ${exec}`);
    }
  }

  assert(
    "Seção 22: 100 execuções consecutivas da suíte crítica concluídas com ZERO falhas intermitentes (0% flaky)",
    falhasIntermitentes === 0,
    { execucoes: 100, falhas: falhasIntermitentes }
  );

  return {
    totalTestes,
    aprovados,
    reprovados,
    percentual: Number(((aprovados / totalTestes) * 100).toFixed(2)),
    resultados,
  };
}
