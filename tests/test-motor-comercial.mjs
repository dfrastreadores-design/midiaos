import assert from "node:assert";
import { calcularNegociacaoComercial, arredondarMoeda } from "../src/lib/motor-comercial.ts";

console.log("==================================================================");
console.log("🧪 TESTES DO MOTOR COMERCIAL DE NEGOCIAÇÃO E PREÇOS BRUTOS");
console.log("==================================================================\n");

const itensCenario = [
  {
    produto_id: "00000000-0000-0000-0000-000000000001",
    nome: "Ponto de Mídia 1 (LED Monumental)",
    quantidade: 1,
    valor_unit_tabela: 18000,
    desconto_pct: 10,
    comissao_pct: 20,
  },
  {
    produto_id: "00000000-0000-0000-0000-000000000002",
    nome: "Ponto de Mídia 2 (Circuito Elevadores)",
    quantidade: 1,
    valor_unit_tabela: 12000,
    desconto_pct: 5,
    comissao_pct: 20,
  },
  {
    produto_id: "00000000-0000-0000-0000-000000000003",
    nome: "Ponto de Mídia 3 (Outdoor Rodoviário)",
    quantidade: 1,
    valor_unit_tabela: 8500,
    desconto_pct: 0,
    comissao_pct: 20,
  },
];

// Teste 1: Modalidade A - Desconto por Item
console.log("--- Teste 1: Modalidade A (Desconto individual por item) ---");
const resA = calcularNegociacaoComercial(itensCenario, { modalidade: "item" });

assert.strictEqual(resA.valor_tabela_total, 38500, "Bruto total deve ser R$ 38.500,00");
assert.strictEqual(resA.valor_desconto_total, 2400, "Desconto total deve ser R$ 2.400,00 (1.800 + 600 + 0)");
assert.strictEqual(resA.valor_negociado_total, 36100, "Líquido total deve ser R$ 36.100,00 (16.200 + 11.400 + 8.500)");

assert.strictEqual(resA.itens[0].valor_tabela, 18000);
assert.strictEqual(resA.itens[0].desconto_valor, 1800);
assert.strictEqual(resA.itens[0].valor_negociado, 16200);

assert.strictEqual(resA.itens[1].valor_tabela, 12000);
assert.strictEqual(resA.itens[1].desconto_valor, 600);
assert.strictEqual(resA.itens[1].valor_negociado, 11400);

assert.strictEqual(resA.itens[2].valor_tabela, 8500);
assert.strictEqual(resA.itens[2].desconto_valor, 0);
assert.strictEqual(resA.itens[2].valor_negociado, 8500);
console.log("✅ Teste 1 APROVADO: Modalidade A bateu 100% com o exemplo do edital!");

// Teste 2: Modalidade B - Desconto Geral de 10%
console.log("\n--- Teste 2: Modalidade B (Desconto geral de 10%) ---");
const resB = calcularNegociacaoComercial(itensCenario, {
  modalidade: "geral",
  desconto_geral_pct: 10,
});

assert.strictEqual(resB.valor_tabela_total, 38500, "Bruto total deve ser R$ 38.500,00");
assert.strictEqual(resB.valor_desconto_total, 3850, "Desconto geral deve ser R$ 3.850,00");
assert.strictEqual(resB.valor_negociado_total, 34650, "Líquido total deve ser R$ 34.650,00");

assert.strictEqual(resB.itens[0].valor_negociado, 16200);
assert.strictEqual(resB.itens[1].valor_negociado, 10800);
assert.strictEqual(resB.itens[2].valor_negociado, 7650);
console.log("✅ Teste 2 APROVADO: Modalidade B bateu 100% com o exemplo do edital!");

// Teste 3: Modalidade C - Valor Final Negociado Alvo R$ 32.000,00
console.log("\n--- Teste 3: Modalidade C (Valor final negociado R$ 32.000,00) ---");
const resC = calcularNegociacaoComercial(itensCenario, {
  modalidade: "total",
  valor_final_alvo: 32000,
});

assert.strictEqual(resC.valor_tabela_total, 38500, "Bruto total deve ser R$ 38.500,00");
assert.strictEqual(resC.valor_desconto_total, 6500, "Desconto total deve ser R$ 6.500,00");
assert.strictEqual(resC.valor_negociado_total, 32000, "Líquido total deve ser R$ 32.000,00 exatamente");

// Soma exata dos itens com centavos
const somaItensLiquidos = arredondarMoeda(
  resC.itens.reduce((acc, it) => acc + it.valor_negociado, 0)
);
assert.strictEqual(somaItensLiquidos, 32000, "Soma dos itens deve ser exatamente R$ 32.000,00");

const somaItensDescontos = arredondarMoeda(
  resC.itens.reduce((acc, it) => acc + it.desconto_valor, 0)
);
assert.strictEqual(somaItensDescontos, 6500, "Soma dos descontos deve ser exatamente R$ 6.500,00");

console.log("Item 1:", resC.itens[0].valor_tabela, "-> desc:", resC.itens[0].desconto_valor, "liq:", resC.itens[0].valor_negociado);
console.log("Item 2:", resC.itens[1].valor_tabela, "-> desc:", resC.itens[1].desconto_valor, "liq:", resC.itens[1].valor_negociado);
console.log("Item 3:", resC.itens[2].valor_tabela, "-> desc:", resC.itens[2].desconto_valor, "liq:", resC.itens[2].valor_negociado);
console.log("✅ Teste 3 APROVADO: Modalidade C com distribuição proporcional e ajuste de centavos perfeito!");

// Teste 4: Alternância de Modalidades sem Acúmulo
console.log("\n--- Teste 4: Alternância de Modalidades sem Descontos Cumulativos ---");
const resD = calcularNegociacaoComercial(itensCenario, { modalidade: "nenhum" });
assert.strictEqual(resD.valor_negociado_total, 38500, "Retornar a nenhum deve restaurar o valor bruto de tabela");
assert.strictEqual(resD.itens[0].valor_unit_tabela, 18000, "Preço bruto de tabela preservado");
assert.strictEqual(resD.itens[1].valor_unit_tabela, 12000, "Preço bruto de tabela preservado");
assert.strictEqual(resD.itens[2].valor_unit_tabela, 8500, "Preço bruto de tabela preservado");
console.log("✅ Teste 4 APROVADO: Preços brutos de tabela 100% imutáveis e preservados!");

// Teste 5: Comissões e Repasses
console.log("\n--- Teste 5: Preservação de Comissões e Repasses ao Veículo ---");
// Em resA, líquido é R$ 36.100. Comissão 20% = R$ 7.220. Repasse = R$ 28.880.
assert.strictEqual(resA.comissao_total, 7220);
assert.strictEqual(resA.repasse_parceiros_total, 28880);
assert.strictEqual(resA.margem_liquida, 7220);
console.log("✅ Teste 5 APROVADO: Comissões e repasses calculados com consistência estrita!");

console.log("\n==================================================================");
console.log("🎉 TODOS OS TESTES DO MOTOR COMERCIAL FORAM APROVADOS COM SUCESSO!");
console.log("==================================================================");
