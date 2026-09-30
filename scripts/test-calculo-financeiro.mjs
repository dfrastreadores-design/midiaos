// Teste Financeiro Obrigatório (Seção 83 do Prompt Mestre)
function calcularRepasseParceiro(valorBruto, percentualImposto, percentualComissao) {
  const bruto = Math.max(0, Number(valorBruto) || 0);
  const pctImposto = Math.max(0, Number(percentualImposto) || 0);
  const pctComissao = Math.max(0, Number(percentualComissao) || 0);

  // 1. PRIMEIRO ABATER O IMPOSTO
  const valorImposto = Number(((bruto * pctImposto) / 100).toFixed(2));
  const valorLiquido = Number((bruto - valorImposto).toFixed(2));

  // 2. SOMENTE DEPOIS CALCULAR A COMISSÃO SOBRE O LÍQUIDO
  const valorComissao = Number(((valorLiquido * pctComissao) / 100).toFixed(2));

  // 3. REPASSE FINAL É O LÍQUIDO MENOS A COMISSÃO
  const repasseFinal = Number((valorLiquido - valorComissao).toFixed(2));

  return { bruto, pctImposto, valorImposto, valorLiquido, pctComissao, valorComissao, repasseFinal };
}

console.log("=== EXECUTANDO TESTE FINANCEIRO OBRIGATÓRIO (SEÇÃO 83) ===");

// CASO 1:
// Bruto: R$ 100.000, Imposto: 10%, Comissão: 30%
// Esperado: Imposto = R$ 10.000, Líquido = R$ 90.000, Comissão = R$ 27.000, Repasse = R$ 63.000
const c1 = calcularRepasseParceiro(100000, 10, 30);
console.log("CASO 1:", c1);

const caso1Ok =
  c1.valorImposto === 10000 &&
  c1.valorLiquido === 90000 &&
  c1.valorComissao === 27000 &&
  c1.repasseFinal === 63000;

console.log("Resultado Caso 1:", caso1Ok ? "SUCESSO (100% EXATO)" : "FALHA");

// CASO 2:
// Parceiro A (100k, 10% imposto, 30% comissão) -> Repasse 63k
// Parceiro B (50k, 5% imposto, 25% comissão)
// Para B: Imposto = 2.500, Líquido = 47.500, Comissão = 11.875, Repasse = 35.625
const c2B = calcularRepasseParceiro(50000, 5, 25);
console.log("CASO 2 (Parceiro B):", c2B);

const caso2Ok =
  c2B.valorImposto === 2500 &&
  c2B.valorLiquido === 47500 &&
  c2B.valorComissao === 11875 &&
  c2B.repasseFinal === 35625;

console.log("Resultado Caso 2:", caso2Ok ? "SUCESSO (100% EXATO)" : "FALHA");

if (caso1Ok && caso2Ok) {
  console.log(">>> TODOS OS TESTES FINANCEIROS FORAM CONCLUÍDOS COM ÊXITO TOTAL! <<<");
  process.exit(0);
} else {
  process.exit(1);
}
