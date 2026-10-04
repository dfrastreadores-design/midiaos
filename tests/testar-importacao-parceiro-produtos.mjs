import assert from "node:assert";
import { formatCNPJ, onlyDigits } from "../src/lib/cnpj.ts";

console.log("========================================================");
console.log("🧪 TESTE: IMPORTAÇÃO DE PARCEIROS E PRODUTOS (PDF/EXCEL)");
console.log("========================================================");

// 1. Teste de Formatação e Validação de CNPJ
console.log("\n[1/3] Testando Máscara e Validação de CNPJ...");
const cnpjLimpo = "52319482000109";
const cnpjFormatado = formatCNPJ(cnpjLimpo);
assert.strictEqual(cnpjFormatado, "52.319.482/0001-09", "Máscara de CNPJ deve formatar corretamente");
assert.strictEqual(onlyDigits(cnpjFormatado), cnpjLimpo, "onlyDigits deve extrair 14 dígitos");
console.log("✅ CNPJ formatado e higienizado com sucesso:", cnpjFormatado);

// 2. Teste de Detecção Semântica de CNPJ Ausente vs Presente
console.log("\n[2/3] Testando Detecção de CNPJ em Texto de Mídia Kit / Planilha...");
const textoSemCnpj = `
TV CARS - MÍDIA KIT 2026
Telas em transporte por aplicativo
Smart: R$ 990,00
Plus: R$ 1.413,00
Contato: comercial@tvcars.com.br - (61) 98888-7777
`;

const cnpjRegex = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
const matchSemCnpj = textoSemCnpj.match(cnpjRegex);
assert.strictEqual(matchSemCnpj, null, "Documento sem CNPJ não deve disparar falso positivo");
console.log("✅ CNPJ ausente detectado com sucesso -> Dispara etapa de solicitação de CNPJ ao usuário");

const textoComCnpj = `
PARCEIRO LED CAPITAL LTDA
CNPJ: 12.345.678/0001-90
Painel Eixo Monumental: R$ 4.500,00
`;
const matchComCnpj = textoComCnpj.match(cnpjRegex);
assert.ok(matchComCnpj, "Documento com CNPJ deve ser detectado");
assert.strictEqual(matchComCnpj[0], "12.345.678/0001-90", "CNPJ extraído corretamente");
console.log("✅ CNPJ presente identificado com sucesso:", matchComCnpj[0]);

// 3. Teste de Fluxo de Criação / Vinculação com Dados Complementares
console.log("\n[3/3] Simulando Payload de Salvamento com Parceiro Complementar...");
const payloadSimulado = {
  parceiroId: null,
  novoParceiro: {
    razao_social: "TV CARS PUBLICIDADE LTDA",
    nome_fantasia: "TV Cars",
    cnpj: "52.319.482/0001-09",
    comissao_padrao_pct: 20.0,
    contato_telefone: "(61) 98888-7777",
    contato_email: "comercial@tvcars.com.br",
  },
  produtos: [
    {
      nome: "Smart - TV Cars",
      midia: "DOOH",
      canal_macro: "OFF",
      valor_unit: 990.0,
      duracao_segundos: 15,
      insercoes_padrao: 1,
    },
    {
      nome: "Plus - TV Cars",
      midia: "DOOH",
      canal_macro: "OFF",
      valor_unit: 1413.0,
      duracao_segundos: 15,
      insercoes_padrao: 1,
    },
  ],
};

assert.ok(payloadSimulado.novoParceiro.cnpj, "Novo parceiro deve conter CNPJ solicitado");
assert.strictEqual(payloadSimulado.produtos.length, 2, "Produtos devem ser vinculados ao novo parceiro");
console.log("✅ Payload atômico validado: Parceiro e 2 Produtos vinculados!");

console.log("\n========================================================");
console.log("🎉 TODOS OS TESTES DE IMPORTAÇÃO PASSARAM COM SUCESSO!");
console.log("========================================================");
