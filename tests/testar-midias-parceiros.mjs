import assert from "node:assert";
import {
  MIDIAS_PARCEIROS_CATALOGO,
  SEGMENTOS_MIDIA,
  SUGESTOES_TIPOS_POR_MIDIA,
  FORMATOS_SUGERIDOS_POR_MIDIA,
  PROGRAMAS_SUGERIDOS_POR_MIDIA,
  getMacroCanalParaMidia,
} from "../src/lib/catalogo-midias.ts";

console.log("================================================================================");
console.log("🎯 TESTE AUTOMATIZADO: CATÁLOGO DE MÍDIAS DOS PARCEIROS NO CADASTRO DE PRODUTO");
console.log("================================================================================\n");

// Teste 1: Cobertura de todos os segmentos dos parceiros no catálogo comercial
console.log("➡️ Teste 1: Validação de cobertura dos segmentos de parceiros...");
for (const seg of SEGMENTOS_MIDIA) {
  assert(
    MIDIAS_PARCEIROS_CATALOGO.includes(seg),
    `Segmento "${seg}" deve estar presente no catálogo de mídias de parceiros!`
  );
}
console.log(`✅ Teste 1 passou: Todos os ${SEGMENTOS_MIDIA.length} segmentos dos parceiros estão presentes no catálogo.`);

// Teste 2: Mapeamento de Macro Canais (OFF / ON / HÍBRIDO)
console.log("\n➡️ Teste 2: Validação de classificação de Macro Canal (OFF vs ON vs Híbrido)...");
assert.strictEqual(getMacroCanalParaMidia("DOOH"), "OFF");
assert.strictEqual(getMacroCanalParaMidia("Front Lights"), "OFF");
assert.strictEqual(getMacroCanalParaMidia("Telas em Elevadores Residenciais"), "OFF");
assert.strictEqual(getMacroCanalParaMidia("TV"), "OFF");
assert.strictEqual(getMacroCanalParaMidia("Radio"), "OFF");
assert.strictEqual(getMacroCanalParaMidia("Digital / Redes Sociais"), "ON");
assert.strictEqual(getMacroCanalParaMidia("Projetos Especiais"), "HIBRIDO");
console.log("✅ Teste 2 passou: Classificação macro inteligente funcionando perfeitamente.");

// Teste 3: Sugestões de Tipos e Formatos por Mídia de Parceiro
console.log("\n➡️ Teste 3: Validação de sugestões de tipos comerciais e formatos por mídia...");
const midiasCriticas = [
  "DOOH",
  "Painéis Digitais de Rua",
  "Front Lights",
  "Telas em Elevadores Residenciais",
  "Telas em Elevadores Corporativos",
  "Espaços Comerciais em Shoppings e Hotéis",
  "Painéis em Rodovias / Outdoor",
  "TV",
  "Radio",
  "Digital / Redes Sociais",
];

for (const m of midiasCriticas) {
  const tipos = SUGESTOES_TIPOS_POR_MIDIA[m];
  const formatos = FORMATOS_SUGERIDOS_POR_MIDIA[m];
  const programas = PROGRAMAS_SUGERIDOS_POR_MIDIA[m];

  assert(tipos && tipos.length > 0, `Mídia "${m}" deve ter sugestões de tipos!`);
  assert(formatos && formatos.length > 0, `Mídia "${m}" deve ter sugestões de formatos!`);
  assert(programas && programas.length > 0, `Mídia "${m}" deve ter sugestões de programas/circuitos!`);
}
console.log(`✅ Teste 3 passou: Todas as ${midiasCriticas.length} mídias críticas possuem tipos, formatos e circuitos associados.`);

// Teste 4: Simulação de Parceiro Homologado (Cerradus / PO Mídia) e Filtro de Segmentos
console.log("\n➡️ Teste 4: Simulação de seleção de parceiro e oferta de mídias...");
const parceiroSimulado = {
  id: "parc-1",
  nome_fantasia: "PO MIDIA DIGITAL",
  segmentos: [
    "DOOH",
    "Painéis Digitais de Rua",
    "Telas em Elevadores Corporativos",
    "Espaços Comerciais em Shoppings e Hotéis",
  ],
};

const midiasOferecidas = parceiroSimulado.segmentos.filter((seg) =>
  MIDIAS_PARCEIROS_CATALOGO.includes(seg)
);
assert.strictEqual(midiasOferecidas.length, 4);
console.log(`✅ Teste 4 passou: Parceiro "${parceiroSimulado.nome_fantasia}" oferece 4 formatos totalmente integrados.`);

console.log("\n================================================================================");
console.log("🎉 TODOS OS TESTES DO CATÁLOGO DE MÍDIAS DOS PARCEIROS PASSARAM (4/4)!");
console.log("================================================================================\n");
