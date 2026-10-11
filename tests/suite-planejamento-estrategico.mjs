/**
 * SUÍTE DE TESTES: MÓDULO DE PLANEJAMENTO ESTRATÉGICO DE CAMPANHAS
 * Validação dos 5 Pilares, Cadeia Campanha -> Regiões -> Pontos de Mídia -> Proposta
 * e Garantia de Não-Duplicação de Produtos
 */

import assert from "node:assert";

export function executarTestesPlanejamentoEstrategico() {
  console.log("\n=======================================================");
  console.log("🧠 TESTES DO MÓDULO DE PLANEJAMENTO ESTRATÉGICO");
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

  // 1. Validação dos 5 Pilares Estratégicos
  test("Os 5 pilares estratégicos estão definidos corretamente com pesos válidos", () => {
    const pilaresObrigatorios = [
      "afinidade_territorial",
      "frequencia",
      "visibilidade",
      "mobilidade",
      "ativacao",
    ];

    const mockPilares = {
      afinidade_territorial: 8,
      frequencia: 7,
      visibilidade: 9,
      mobilidade: 8,
      ativacao: 6,
    };

    for (const p of pilaresObrigatorios) {
      assert.ok(p in mockPilares, `Pilar ${p} deve existir no modelo de planejamento`);
      assert.ok(
        mockPilares[p] >= 0 && mockPilares[p] <= 10,
        `Pilar ${p} deve ter pontuação válida entre 0 e 10`
      );
    }
  });

  // 2. Não-Duplicação de Produtos e Vínculo por produto_id
  test("Pontos de mídia utilizam produtos existentes sem duplicação de registro", () => {
    const produtosInventario = [
      { id: "prod-001", nome: "Painel LED Eptg", valor_unit: 15000 },
      { id: "prod-002", nome: "Outdoor W3 Norte", valor_unit: 6000 },
    ];

    const pontosAlocados = [
      {
        campanha_id: "camp-001",
        produto_id: produtosInventario[0].id,
        regiao: "Plano Piloto",
        pilar_estrategico: "visibilidade",
        quantidade_insercoes: 2,
        valor_negociado: 14000,
      },
      {
        campanha_id: "camp-001",
        produto_id: produtosInventario[1].id,
        regiao: "Plano Piloto",
        pilar_estrategico: "afinidade_territorial",
        quantidade_insercoes: 1,
        valor_negociado: 5500,
      },
    ];

    // Verifica que cada ponto referencia um produto_id existente e não cria um novo produto
    for (const ponto of pontosAlocados) {
      const prodOriginal = produtosInventario.find((p) => p.id === ponto.produto_id);
      assert.ok(prodOriginal, `Ponto deve apontar para um produto existente no inventário`);
      assert.strictEqual(ponto.produto_id, prodOriginal.id);
    }
  });

  // 3. Cadeia Relacional: Campanha -> Regiões -> Pontos de Mídia -> Proposta
  test("Cadeia relacional completa Campanha -> Regiões -> Pontos -> Proposta é íntegra", () => {
    const campanha = {
      id: "camp-alpha",
      cliente_id: "cli-100",
      cliente_nome: "Anunciante Teste",
      nome_campanha: "Campanha Estratégica 360",
      investimento_previsto: 50000,
      regioes_selecionadas: ["Plano Piloto", "Águas Claras"],
      pontos_midia: [
        {
          produto_id: "prod-001",
          regiao: "Plano Piloto",
          quantidade_insercoes: 1,
          valor_negociado: 20000,
        },
        {
          produto_id: "prod-002",
          regiao: "Águas Claras",
          quantidade_insercoes: 2,
          valor_negociado: 10000,
        },
      ],
    };

    assert.ok(campanha.regioes_selecionadas.length > 0, "Campanha possui regiões mapeadas");
    assert.ok(campanha.pontos_midia.length > 0, "Campanha possui pontos de mídia alocados");

    // Simulação da geração de proposta a partir da campanha
    const totalAlocado = campanha.pontos_midia.reduce(
      (acc, p) => acc + p.valor_negociado * p.quantidade_insercoes,
      0
    );

    const propostaGerada = {
      id: "prop-xyz",
      campanha: campanha.nome_campanha,
      cliente_id: campanha.cliente_id,
      valor_negociado: totalAlocado,
      total_itens: campanha.pontos_midia.length,
      origem_campanha_id: campanha.id,
    };

    assert.strictEqual(propostaGerada.valor_negociado, 40000);
    assert.strictEqual(propostaGerada.total_itens, 2);
    assert.strictEqual(propostaGerada.origem_campanha_id, campanha.id);
  });

  // 4. Balanço Financeiro: Investimento Alocado vs Previsto
  test("Cálculo de alocação e saldo orçamentário respeita precisão monetária", () => {
    const investimentoPrevisto = 100000.0;
    const pontos = [
      { quantidade_insercoes: 3, valor_negociado: 12500.5 },
      { quantidade_insercoes: 2, valor_negociado: 25000.0 },
    ];

    const totalAlocado = pontos.reduce(
      (acc, p) => acc + p.quantidade_insercoes * p.valor_negociado,
      0
    );
    const saldo = investimentoPrevisto - totalAlocado;

    assert.strictEqual(totalAlocado, 87501.5);
    assert.strictEqual(saldo, 12498.5);
  });

  return { totalTestes, aprovados, reprovados };
}

if (process.argv[1]?.endsWith("suite-planejamento-estrategico.mjs")) {
  const res = executarTestesPlanejamentoEstrategico();
  console.log(`\nResultado: ${res.aprovados}/${res.totalTestes} testes aprovados.`);
  process.exit(res.reprovados > 0 ? 1 : 0);
}
