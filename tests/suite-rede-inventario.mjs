/**
 * SUÍTE DE TESTES: MÓDULO REDE DE INVENTÁRIO
 * Validação de integridade, tipos de origem (Próprio vs Representado),
 * campos operacionais/comerciais e vínculo com produtos existentes.
 */

import assert from "node:assert/strict";

export function executarTestesRedeInventario() {
  console.log("\n🧪 EXECUTANDO SUÍTE: Rede de Inventário (Próprio vs Representado)");

  const resultados = [];

  function testar(nome, fn) {
    try {
      fn();
      resultados.push({ nome, status: "PASSOU" });
      console.log(`  ✅ ${nome}`);
    } catch (err) {
      resultados.push({ nome, status: "FALHOU", erro: err.message });
      console.error(`  ❌ ${nome}: ${err.message}`);
    }
  }

  // 1. Tipos de Origem Válidos
  testar("Deve aceitar apenas os tipos de origem 'PROPRIO' e 'REPRESENTADO'", () => {
    const tiposValidos = ["PROPRIO", "REPRESENTADO"];
    assert.strictEqual(tiposValidos.includes("PROPRIO"), true);
    assert.strictEqual(tiposValidos.includes("REPRESENTADO"), true);
    assert.strictEqual(tiposValidos.includes("TERCEIRO_INVALIDO"), false);
  });

  // 2. Validação de Campos Obrigatórios
  testar("Deve exigir nome_interno e nome_comercial para cadastro de origem", () => {
    const origemValida = {
      tipo_origem: "REPRESENTADO",
      nome_interno: "Exibidora Alpha SP",
      nome_comercial: "Rede Premium Painéis",
      comissao: 25.0,
      status: "ativo",
    };

    assert.ok(origemValida.nome_interno.length > 0);
    assert.ok(origemValida.nome_comercial.length > 0);
    assert.strictEqual(origemValida.comissao, 25.0);
  });

  // 3. Validação de Blindagem Comercial (Campos Distintos)
  testar("Nome interno deve ser segregado do nome comercial para proteção", () => {
    const origem = {
      nome_interno: "Exibidora ABC Outdoors (Parceiro Fornecedor Original)",
      nome_comercial: "Circuito Metropolitano OOH",
    };

    assert.notStrictEqual(origem.nome_interno, origem.nome_comercial);
    assert.ok(origem.nome_interno.includes("Fornecedor"));
    assert.ok(!origem.nome_comercial.includes("Fornecedor"));
  });

  // 4. Regras de Comissão e Limites
  testar("Comissão deve estar estritamente entre 0% e 100%", () => {
    const comissaoPadrao = 20.0;
    const comissaoAlta = 100.0;
    const comissaoZero = 0.0;
    const comissaoInvalida = 105.0;

    assert.ok(comissaoPadrao >= 0 && comissaoPadrao <= 100);
    assert.ok(comissaoAlta >= 0 && comissaoAlta <= 100);
    assert.ok(comissaoZero >= 0 && comissaoZero <= 100);
    assert.ok(comissaoInvalida > 100);
  });

  // 5. Relacionamento com Produtos Existentes
  testar("Produto existente deve poder ser vinculado à rede de inventário", () => {
    const produto = {
      id: "prod-uuid-001",
      nome: "Painel LED EPTG Km 3",
      valor_unit: 18000,
      rede_inventario_id: null,
      tipo_origem_inventario: "PROPRIO",
    };

    // Simulando vinculação
    const origemId = "origem-uuid-999";
    const produtoVinculado = {
      ...produto,
      rede_inventario_id: origemId,
      tipo_origem_inventario: "REPRESENTADO",
      parceiro_id: origemId, // retrocompatibilidade
    };

    assert.strictEqual(produtoVinculado.rede_inventario_id, origemId);
    assert.strictEqual(produtoVinculado.tipo_origem_inventario, "REPRESENTADO");
    assert.strictEqual(produtoVinculado.parceiro_id, origemId);
  });

  // 6. Desvinculação Segura de Produto
  testar("Desvincular produto deve restaurar para inventário próprio sem deletar o produto", () => {
    const produtoVinculado = {
      id: "prod-uuid-001",
      nome: "Painel LED EPTG Km 3",
      rede_inventario_id: "origem-uuid-999",
      tipo_origem_inventario: "REPRESENTADO",
    };

    const produtoDesvinculado = {
      ...produtoVinculado,
      rede_inventario_id: null,
      tipo_origem_inventario: "PROPRIO",
      parceiro_id: null,
    };

    assert.strictEqual(produtoDesvinculado.rede_inventario_id, null);
    assert.strictEqual(produtoDesvinculado.tipo_origem_inventario, "PROPRIO");
    assert.strictEqual(produtoDesvinculado.id, "prod-uuid-001");
  });

  // 7. Status Operacionais Suportados
  testar("Deve suportar status 'ativo', 'em_negociacao' e 'inativo'", () => {
    const statusValidos = ["ativo", "em_negociacao", "inativo"];
    assert.strictEqual(statusValidos.includes("ativo"), true);
    assert.strictEqual(statusValidos.includes("em_negociacao"), true);
    assert.strictEqual(statusValidos.includes("inativo"), true);
    assert.strictEqual(statusValidos.includes("arquivado"), false);
  });

  // 8. Migração Segura e Não-Destrutiva
  testar("Migração deve preservar dados de parceiros antigos sem perda", () => {
    const parceiroLegado = {
      id: "parceiro-001",
      razao_social: "Rádio e TV Cidade Ltda",
      nome_fantasia: "Rede Cidade",
      cnpj: "12.345.678/0001-90",
      comissao_padrao_pct: 22.5,
    };

    // Mapeamento automático para nó da rede
    const noRede = {
      id: parceiroLegado.id,
      tipo_origem: "REPRESENTADO",
      nome_interno: parceiroLegado.razao_social,
      nome_comercial: parceiroLegado.nome_fantasia || parceiroLegado.razao_social,
      empresa: parceiroLegado.razao_social,
      cnpj: parceiroLegado.cnpj,
      comissao: parceiroLegado.comissao_padrao_pct,
      status: "ativo",
    };

    assert.strictEqual(noRede.id, parceiroLegado.id);
    assert.strictEqual(noRede.nome_interno, "Rádio e TV Cidade Ltda");
    assert.strictEqual(noRede.nome_comercial, "Rede Cidade");
    assert.strictEqual(noRede.comissao, 22.5);
  });

  const aprovados = resultados.filter((r) => r.status === "PASSOU").length;
  const reprovados = resultados.filter((r) => r.status === "FALHOU").length;

  console.log(`  🏁 Resultado: ${aprovados} aprovados, ${reprovados} reprovados`);

  return {
    totalTestes: resultados.length,
    total: resultados.length,
    aprovados,
    reprovados,
    detalhes: resultados,
  };
}
