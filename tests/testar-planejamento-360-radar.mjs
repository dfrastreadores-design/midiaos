// Teste Automatizado do Módulo de Planejamento 360° e Radar de Expansão Regional
import assert from "node:assert";
import {
  getInteligenciaRegiaoDF,
  TODAS_RAS_DF,
  PILARES_360,
  HISTORICO_SUCESSO_OPCOES,
} from "../src/lib/df-regioes-inteligencia.ts";

console.log("================================================================================");
console.log("🧭 TESTE DO MÓDULO DE PLANEJAMENTO 360° & RADAR DE EXPANSÃO");
console.log("================================================================================");

// 1. Validar Mapeamento das 35 RAs do DF
console.log(`\n--- 1. Validando Cobertura de Regiões Administrativas do DF (${TODAS_RAS_DF.length} RAs) ---`);
assert(TODAS_RAS_DF.length >= 30, "Deve conter as RAs do DF");
assert(TODAS_RAS_DF.includes("Ceilândia"), "Ceilândia deve estar presente");
assert(TODAS_RAS_DF.includes("Samambaia"), "Samambaia deve estar presente");
assert(TODAS_RAS_DF.includes("Taguatinga"), "Taguatinga deve estar presente");
assert(TODAS_RAS_DF.includes("Águas Claras"), "Águas Claras deve estar presente");
console.log("✅ [1/5] RAs do DF mapeadas com sucesso.");

// 2. Testar Inteligência de Geografia e Transbordamento para Ceilândia e Samambaia
console.log("\n--- 2. Validando Radar de Expansão para Regiões com Vias Troncais (Ceilândia / Samambaia) ---");
const intelCeilandia = getInteligenciaRegiaoDF("Ceilândia");
assert(intelCeilandia.nome === "Ceilândia", "Nome incorreto");
assert(intelCeilandia.formatosRecomendados.length >= 2, "Formatos recomendados ausentes");
assert(intelCeilandia.viasTransbordamento.some((v) => v.via.includes("Estrutural") || v.via.includes("EPTG")), "Vias de transbordamento ausentes");
assert(intelCeilandia.pitchConsultor.includes("360° sob demanda"), "Pitch do consultor deve estar presente");
console.log("✅ [2/5] Ceilândia: vias de transbordamento (Estrutural/EPTG), formatos e pitch validados.");

const intelSamambaia = getInteligenciaRegiaoDF("Samambaia");
assert(intelSamambaia.viasTransbordamento.some((v) => v.via.includes("Pistão") || v.via.includes("EPNB")), "Vias de ligação de Samambaia ausentes");
assert(intelSamambaia.prospectsLocaisSugeridos.length >= 1, "Entidades de prospecção local ausentes");
console.log("✅ [3/5] Samambaia: rotas pelo Pistão Sul/EPNB e prospectos locais mapeados.");

// 3. Validar os 5 Pilares 360°
console.log("\n--- 3. Validando os 5 Pilares Estratégicos 360° ---");
assert(PILARES_360.length === 5, "Devem existir exatamente 5 pilares estratégicos");
const nomesPilares = PILARES_360.map((p) => p.nome);
assert(nomesPilares.some((n) => n.includes("Deslocamento")), "Pilar 1 ausente");
assert(nomesPilares.some((n) => n.includes("Moradia")), "Pilar 2 ausente");
assert(nomesPilares.some((n) => n.includes("Lazer")), "Pilar 3 ausente");
assert(nomesPilares.some((n) => n.includes("Ativação")), "Pilar 4 ausente");
assert(nomesPilares.some((n) => n.includes("Digital")), "Pilar 5 ausente");
console.log("✅ [4/5] Todos os 5 Pilares 360° conformes com a metodologia Mídia.OS.");

// 4. Testar Simulação de Montagem de Plano sem Ponto Direto (Nunca Tela Vazia)
console.log("\n--- 4. Simulando Região sem Inventário Direto (Ativação Automática do Radar) ---");
const regiaoSemPontoDireto = "Fercal";
const intelFercal = getInteligenciaRegiaoDF(regiaoSemPontoDireto);
assert(intelFercal.formatosRecomendados.length > 0, "Formatos para Fercal devem ser gerados dinamicamente");
assert(intelFercal.viasTransbordamento.length > 0, "Transbordamento para Fercal deve ser gerado");
assert(intelFercal.pitchConsultor.length > 20, "Pitch para Fercal gerado");
console.log("✅ [5/5] Radar de Expansão gera contingência sem erro e sem tela vazia para qualquer RA.");

console.log("\n================================================================================");
console.log("🎉 RESULTADO: TODOS OS TESTES DO PLANEJAMENTO 360° & RADAR PASSARAM!");
console.log("================================================================================\n");
