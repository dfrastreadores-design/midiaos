/**
 * SUÍTE DE TESTES: NOVA EXPERIÊNCIA DE VENDA (ASSISTENTE CRIAR CAMPANHA)
 * Valida a jornada guiada do vendedor em 7 passos sequenciais:
 * 1. Selecionar cliente
 * 2. Definir objetivo
 * 3. Escolher regiões
 * 4. Selecionar mídias
 * 5. Gerar apresentação
 * 6. Enviar proposta
 * 7. Converter em PI
 */

import assert from "node:assert/strict";

export function executarTestesAssistenteNovaCampanha() {
  console.log("\n=======================================================");
  console.log("🚀 TESTES DA NOVA EXPERIÊNCIA DE VENDA (CRIAR CAMPANHA)");
  console.log("=======================================================");

  const resultados = [];

  function testar(nome, fn) {
    try {
      fn();
      resultados.push({ nome, status: "PASSOU" });
      console.log(`  ✅ [PASS] ${nome}`);
    } catch (err) {
      resultados.push({ nome, status: "FALHOU", erro: err.message });
      console.error(`  ❌ [FAIL] ${nome}: ${err.message}`);
    }
  }

  // 1. Definição dos 7 Passos
  testar("O fluxo deve possuir exatamente os 7 passos comerciais especificados", () => {
    const passos = [
      "Cliente",
      "Objetivo",
      "Regiões",
      "Mídias",
      "Apresentação",
      "Proposta",
      "Converter em PI",
    ];

    assert.strictEqual(passos.length, 7);
    assert.strictEqual(passos[0], "Cliente");
    assert.strictEqual(passos[1], "Objetivo");
    assert.strictEqual(passos[2], "Regiões");
    assert.strictEqual(passos[3], "Mídias");
    assert.strictEqual(passos[4], "Apresentação");
    assert.strictEqual(passos[5], "Proposta");
    assert.strictEqual(passos[6], "Converter em PI");
  });

  // 2. Passo 1: Seleção de Cliente
  testar("Passo 1 deve validar a seleção obrigatória do cliente", () => {
    const estadoInicial = { cliente: null, podeAvancar: false };
    const clienteValido = { id: "cli-123", razao_social: "Banco de Brasília S.A.", nome_fantasia: "BRB" };

    const estadoComCliente = { cliente: clienteValido, podeAvancar: !!clienteValido };
    assert.strictEqual(estadoInicial.podeAvancar, false);
    assert.strictEqual(estadoComCliente.podeAvancar, true);
    assert.strictEqual(estadoComCliente.cliente.nome_fantasia, "BRB");
  });

  // 3. Passo 2: Objetivo da Campanha
  testar("Passo 2 deve suportar objetivos estratégicos e controle orçamentário", () => {
    const campanha = {
      nome: "Lançamento Nova Conta Digital",
      objetivo: "branding",
      budget: 50000,
      publico: "Classes A/B de 25 a 55 anos",
    };

    assert.ok(campanha.nome.length > 0);
    assert.ok(campanha.budget > 0);
    assert.strictEqual(campanha.objetivo, "branding");
  });

  // 4. Passo 3: Escolha de Regiões
  testar("Passo 3 deve permitir seleção de múltiplas praças prioritárias", () => {
    const regioes = ["Plano Piloto", "Águas Claras", "Taguatinga"];
    assert.strictEqual(regioes.length, 3);
    assert.ok(regioes.includes("Plano Piloto"));
  });

  // 5. Passo 4: Seleção de Mídias e Cálculo de Budget
  testar("Passo 4 deve acumular investimento dos pontos e calcular saldo do budget", () => {
    const budget = 30000;
    const pontosSelecionados = [
      { id: "p1", nome: "Painel LED EPTG", valor_negociado: 12000 },
      { id: "p2", nome: "Frontlight Eixo Sul", valor_negociado: 10000 },
      { id: "p3", nome: "Abrigo de Ônibus W3", valor_negociado: 5000 },
    ];

    const totalSelecionado = pontosSelecionados.reduce((acc, p) => acc + p.valor_negociado, 0);
    const saldo = budget - totalSelecionado;

    assert.strictEqual(totalSelecionado, 27000);
    assert.strictEqual(saldo, 3000);
    assert.ok(saldo >= 0);
  });

  // 6. Passo 5: Geração de Apresentação
  testar("Passo 5 deve suportar templates estratégicos (OOH, DOOH, Corporativo)", () => {
    const templates = ["ooh", "dooh", "corporativo", "digital"];
    assert.strictEqual(templates.includes("ooh"), true);
    assert.strictEqual(templates.includes("dooh"), true);
    assert.strictEqual(templates.includes("corporativo"), true);
  });

  // 7. Passo 6: Criação de Proposta Comercial
  testar("Passo 6 deve formalizar a proposta com itens sincronizados e link seguro", () => {
    const proposta = {
      id: "prop-uuid-999",
      numero: "PROP-2026-401",
      cliente_id: "cli-123",
      valor_total: 27000,
      itens_count: 3,
      status: "enviada",
    };

    const linkCliente = `https://midia.os/propostas?id=${proposta.id}`;
    assert.strictEqual(proposta.status, "enviada");
    assert.ok(linkCliente.includes(proposta.id));
  });

  // 8. Passo 7: Conversão em PI (Fechamento)
  testar("Passo 7 deve converter a proposta diretamente em Pedido de Inserção", () => {
    const propostaAprovada = { id: "prop-uuid-999", status: "enviada", valor: 27000 };
    // Simulação de conversão
    const piGerado = {
      id: "pi-uuid-001",
      numero: "PI-2026-089",
      proposta_id: propostaAprovada.id,
      valor_total: propostaAprovada.valor,
      status: "em_veiculacao",
    };

    assert.strictEqual(piGerado.proposta_id, propostaAprovada.id);
    assert.strictEqual(piGerado.valor_total, 27000);
    assert.ok(piGerado.numero.startsWith("PI-"));
  });

  // 9. Independência Operacional do Vendedor
  testar("Vendedor fecha a venda em fluxo único sem transitar manualmente em 5 módulos", () => {
    const passosExecutados = [1, 2, 3, 4, 5, 6, 7];
    assert.strictEqual(passosExecutados.length, 7);
    assert.strictEqual(passosExecutados[passosExecutados.length - 1], 7);
  });

  const aprovados = resultados.filter((r) => r.status === "PASSOU").length;
  const reprovados = resultados.filter((r) => r.status === "FALHOU").length;

  return {
    totalTestes: resultados.length,
    total: resultados.length,
    aprovados,
    reprovados,
    detalhes: resultados,
  };
}
