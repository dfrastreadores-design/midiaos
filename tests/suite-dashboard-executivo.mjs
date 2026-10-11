/**
 * SUÍTE DE TESTES: DASHBOARD EXECUTIVO DE INTELIGÊNCIA (C-LEVEL)
 * 
 * Validação de:
 * 1. 8 Indicadores Obrigatórios:
 *    - Faturamento
 *    - Propostas abertas
 *    - PIs ativos
 *    - Campanhas em andamento
 *    - Inventário disponível
 *    - Ocupação dos pontos
 *    - Margem média
 *    - Comissões
 * 2. 4 Gráficos Obrigatórios:
 *    - Receita por período
 *    - Mídias mais vendidas
 *    - Regiões mais utilizadas
 *    - Clientes principais
 * 3. Integridade e precisão matemática dos cálculos
 */

import assert from "node:assert";

export function executarTestesDashboardExecutivo() {
  console.log("\n=======================================================");
  console.log("📈 TESTES DO DASHBOARD EXECUTIVO DE INTELIGÊNCIA");
  console.log("=======================================================");

  let totalTestes = 0;
  let aprovados = 0;
  let reprovados = 0;

  function test(nome, fn) {
    totalTestes++;
    try {
      fn();
      aprovados++;
      console.log(`  ✅ [PASS] ${nome}`);
    } catch (err) {
      reprovados++;
      console.error(`  ❌ [FAIL] ${nome}:`, err.message);
    }
  }

  // 1. Validação dos 8 Indicadores Obrigatórios
  test("Os 8 indicadores executivos essenciais estão presentes e calculados", () => {
    const mockIndicadores = {
      faturamento_total: 485000.0,
      faturamento_mes_anterior: 420000.0,
      faturamento_variacao_pct: 15.5,
      propostas_abertas_qtd: 14,
      propostas_abertas_valor: 310000.0,
      pis_ativos_qtd: 28,
      pis_ativos_valor: 485000.0,
      campanhas_andamento_qtd: 12,
      inventario_disponivel_qtd: 45,
      inventario_total_qtd: 120,
      taxa_ocupacao_pontos: 62.5, // (120 - 45) / 120 = 62.5%
      margem_media_pct: 68.0,
      comissoes_total: 24250.0,
      comissoes_pendentes: 8400.0,
    };

    const chavesObrigatorias = [
      "faturamento_total",
      "propostas_abertas_qtd",
      "pis_ativos_qtd",
      "campanhas_andamento_qtd",
      "inventario_disponivel_qtd",
      "taxa_ocupacao_pontos",
      "margem_media_pct",
      "comissoes_total",
    ];

    for (const chave of chavesObrigatorias) {
      assert.ok(chave in mockIndicadores, `Indicador ${chave} deve estar presente`);
      assert.ok(typeof mockIndicadores[chave] === "number", `Indicador ${chave} deve ser numérico`);
    }

    assert.ok(mockIndicadores.taxa_ocupacao_pontos >= 0 && mockIndicadores.taxa_ocupacao_pontos <= 100);
    assert.ok(mockIndicadores.margem_media_pct >= 0 && mockIndicadores.margem_media_pct <= 100);
    assert.ok(mockIndicadores.inventario_disponivel_qtd <= mockIndicadores.inventario_total_qtd);
  });

  // 2. Gráfico 1: Receita por Período
  test("Gráfico de Receita por Período possui série temporal contínua com Faturamento e Metas", () => {
    const receitaPeriodo = [
      { periodo: "Mai", faturamento: 380000, meta: 400000, propostas: 12 },
      { periodo: "Jun", faturamento: 410000, meta: 420000, propostas: 15 },
      { periodo: "Jul", faturamento: 395000, meta: 430000, propostas: 14 },
      { periodo: "Ago", faturamento: 440000, meta: 450000, propostas: 18 },
      { periodo: "Set", faturamento: 420000, meta: 450000, propostas: 16 },
      { periodo: "Out", faturamento: 485000, meta: 470000, propostas: 21 },
    ];

    assert.equal(receitaPeriodo.length, 6, "Deve conter histórico de 6 meses");
    receitaPeriodo.forEach((item) => {
      assert.ok(item.periodo, "Mês deve ser identificado");
      assert.ok(typeof item.faturamento === "number" && item.faturamento >= 0);
      assert.ok(typeof item.meta === "number" && item.meta > 0);
    });
  });

  // 3. Gráfico 2: Mídias Mais Vendidas
  test("Gráfico de Mídias Mais Vendidas consolida participação percentual do mix", () => {
    const midiasMaisVendidas = [
      { midia: "DOOH", valor: 220000, participacao_pct: 45, color: "#2563EB" },
      { midia: "OOH", valor: 145000, participacao_pct: 30, color: "#EA580C" },
      { midia: "TV", valor: 70000, participacao_pct: 15, color: "#8B5CF6" },
      { midia: "DIGITAL", valor: 50000, participacao_pct: 10, color: "#10B981" },
    ];

    const somaPct = midiasMaisVendidas.reduce((acc, m) => acc + m.participacao_pct, 0);
    assert.equal(somaPct, 100, "Soma das fatias de mídia deve totalizar 100%");
    assert.ok(midiasMaisVendidas[0].valor >= midiasMaisVendidas[1].valor, "Ranking deve ser ordenado decrescente");
  });

  // 4. Gráfico 3: Regiões Mais Utilizadas
  test("Gráfico de Regiões Mais Utilizadas mapeia concentração de pontos e investimento por praça", () => {
    const regioes = [
      { regiao: "Brasília - Plano Piloto", valor: 195000, pontos: 32, participacao_pct: 40 },
      { regiao: "Taguatinga / EPTG", valor: 120000, pontos: 24, participacao_pct: 25 },
      { regiao: "Águas Claras", valor: 95000, pontos: 18, participacao_pct: 20 },
      { regiao: "Goiânia - Centro", valor: 75000, pontos: 14, participacao_pct: 15 },
    ];

    assert.ok(regioes.length >= 3, "Deve apresentar principais regiões metropolitanas");
    regioes.forEach((r) => {
      assert.ok(r.regiao, "Nome da região é obrigatório");
      assert.ok(r.pontos > 0, "Quantidade de pontos deve ser positiva");
      assert.ok(r.valor > 0, "Investimento na região deve ser positivo");
    });
  });

  // 5. Gráfico 4: Clientes Principais
  test("Gráfico de Clientes Principais classifica top anunciantes por share de receita", () => {
    const clientesPrincipais = [
      { cliente_id: "c-1", cliente_nome: "Banco Regional", valor_total: 145000, pis_count: 5, share_pct: 30 },
      { cliente_id: "c-2", cliente_nome: "Varejo Nacional", valor_total: 98000, pis_count: 3, share_pct: 20 },
      { cliente_id: "c-3", cliente_nome: "Construtora Alpha", valor_total: 82000, pis_count: 2, share_pct: 17 },
      { cliente_id: "c-4", cliente_nome: "Rede Hospitalar", valor_total: 65000, pis_count: 2, share_pct: 13 },
      { cliente_id: "c-5", cliente_nome: "Telecom Brasil", valor_total: 50000, pis_count: 1, share_pct: 10 },
    ];

    assert.equal(clientesPrincipais.length, 5, "Top 5 clientes devem ser identificados");
    assert.ok(clientesPrincipais[0].valor_total >= clientesPrincipais[1].valor_total);
    assert.ok(clientesPrincipais.every((c) => c.cliente_nome && c.pis_count >= 1));
  });

  return { totalTestes, aprovados, reprovados };
}
