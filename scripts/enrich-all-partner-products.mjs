import * as xlsxModule from "xlsx";
const xlsx = xlsxModule.default || xlsxModule;
import { supabase } from "./db.mjs";

async function enrichProducts() {
  console.log("=== ENRICHING PARTNER PRODUCTS WITH AUTHENTIC DATA AND PHOTOS ===");

  const wb = xlsx.readFile("data/Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx");
  
  // 1. Parse OOH Consolidada sheet
  const oohSheet = wb.Sheets["Mídia OOH Consolidada (Todas)"];
  const oohRows = xlsx.utils.sheet_to_json(oohSheet, { header: 1 });
  // row 3 has headers
  const oohItems = [];
  for (let i = 4; i < oohRows.length; i++) {
    const row = oohRows[i];
    if (!row || !row[1]) continue;
    oohItems.push({
      itemCodigo: String(row[0] || ""),
      empresa: String(row[1] || "").trim(),
      categoria: String(row[2] || "").trim(),
      cidadeRegiao: String(row[3] || "").trim(),
      localizacaoRodovia: String(row[4] || "").trim(),
      detalhesSentido: String(row[5] || "").trim(),
      pontoRef: String(row[6] || "").trim(),
      latitude: row[7] !== "-" ? parseFloat(row[7]) : null,
      longitude: row[8] !== "-" ? parseFloat(row[8]) : null,
      dimensoes: String(row[9] || "").trim(),
      material: String(row[10] || "").trim(),
      disponibilidade: String(row[11] || "Disponível").trim(),
      fluxo: String(row[13] || "").trim(),
      precoTabela: parseFloat(row[17]) || 0
    });
  }
  console.log(`Parsed ${oohItems.length} OOH items from spreadsheet.`);

  // 2. Parse DOOH Condomínios
  const condSheet = wb.Sheets["DOOH Condomínios"];
  const condRows = xlsx.utils.sheet_to_json(condSheet, { header: 1 });
  const condItems = [];
  for (let i = 4; i < condRows.length; i++) {
    const row = condRows[i];
    if (!row || !row[2]) continue;
    condItems.push({
      item: String(row[0] || ""),
      local: String(row[2] || "").trim(),
      bairro: String(row[3] || "").trim(),
      telas: parseInt(row[4]) || 1,
      insercoesDia: parseInt(row[5]) || 120,
      impactosDia: parseInt(row[7]) || 750,
      valorTabela: parseFloat(row[9]) || 1500,
      valorNegociado: parseFloat(row[12]) || 1050
    });
  }
  console.log(`Parsed ${condItems.length} Condomínios items from spreadsheet.`);

  // 3. Parse DOOH Gastronomia
  const gastroSheet = wb.Sheets["DOOH Gastronomia"];
  const gastroRows = xlsx.utils.sheet_to_json(gastroSheet, { header: 1 });
  const gastroItems = [];
  for (let i = 4; i < gastroRows.length; i++) {
    const row = gastroRows[i];
    if (!row || !row[2]) continue;
    gastroItems.push({
      item: String(row[0] || ""),
      local: String(row[2] || "").trim(),
      bairro: String(row[3] || "").trim(),
      telas: parseInt(row[4]) || 1,
      insercoesDia: parseInt(row[5]) || 120,
      impactosDia: parseInt(row[7]) || 1600,
      valorTabela: parseFloat(row[9]) || 2500,
      valorNegociado: parseFloat(row[12]) || 1750
    });
  }
  console.log(`Parsed ${gastroItems.length} Gastronomia items from spreadsheet.`);

  // 4. Fetch all produtos from DB
  const { data: produtos } = await supabase.from("produtos").select("*");
  console.log(`Total produtos in DB: ${produtos?.length}`);

  let updatedCount = 0;

  for (const prod of produtos || []) {
    const pNome = (prod.parceiro_nome || "").toLowerCase();
    const nome = (prod.nome || "");
    const updates = {};

    // Determine default UF (mostly DF, Luziânia is GO)
    let cidade = prod.cidade;
    let uf = prod.uf || "DF";

    // Detect city from product name if cidade is null
    if (!cidade) {
      if (nome.includes("Águas Claras") || nome.includes("AGUAS CLARAS")) cidade = "Águas Claras";
      else if (nome.includes("Samambaia") || nome.includes("SAMAMBAIA")) cidade = "Samambaia";
      else if (nome.includes("Taguatinga") || nome.includes("TAGUATINGA")) cidade = "Taguatinga";
      else if (nome.includes("Ceilândia") || nome.includes("CEILANDIA")) cidade = "Ceilândia";
      else if (nome.includes("Sobradinho") || nome.includes("SOBRADINHO")) cidade = "Sobradinho";
      else if (nome.includes("Gama") || nome.includes("GAMA")) cidade = "Gama";
      else if (nome.includes("Guará") || nome.includes("GUARA")) cidade = "Guará";
      else if (nome.includes("Park Sul") || nome.includes("PARK SUL")) cidade = "Park Sul";
      else if (nome.includes("Asa Norte") || nome.includes("ASA NORTE")) cidade = "Asa Norte";
      else if (nome.includes("Asa Sul") || nome.includes("ASA SUL")) cidade = "Asa Sul";
      else if (nome.includes("Sudoeste") || nome.includes("SUDOESTE")) cidade = "Sudoeste";
      else if (nome.includes("Lago Sul") || nome.includes("LAGO SUL")) cidade = "Lago Sul";
      else if (nome.includes("Lago Norte") || nome.includes("LAGO NORTE")) cidade = "Lago Norte";
      else if (nome.includes("Luziânia") || nome.includes("LUZIANIA")) { cidade = "Luziânia"; uf = "GO"; }
      else if (nome.includes("Estrutural")) cidade = "Estrutural";
      else if (nome.includes("Vicente Pires")) cidade = "Vicente Pires";
      else if (nome.includes("SIA")) cidade = "SIA";
      else if (nome.includes("Setor de Clubes")) cidade = "Setor de Clubes";
      else if (nome.includes("Riacho Fundo")) cidade = "Riacho Fundo";
      else if (nome.includes("Recanto das Emas")) cidade = "Recanto das Emas";
      else if (pNome.includes("tvcars") || pNome.includes("tv cars") || pNome.includes("autooh")) cidade = "Brasília";
      else if (pNome.includes("mix fm") || pNome.includes("jovem pan") || pNome.includes("jk fm")) cidade = "Brasília";
      else if (pNome.includes("techzone") || pNome.includes("rede mobi") || pNome.includes("ab comunicacao")) cidade = "Brasília";
    }

    if (cidade && (!prod.cidade || prod.cidade !== cidade)) {
      updates.cidade = cidade;
      updates.uf = uf;
    }

    // Fotos: SOMENTE fotos autênticas e comprovadas dos mídia kits originais
    let fotos = Array.isArray(prod.fotos) && prod.fotos.length > 0 ? [...prod.fotos] : [];

    if (pNome.includes("tv cars") || pNome.includes("tvcars")) {
      // TV Cars possui fotos originais extraídas do Mídia Kit Oficial
      fotos = [
        "/images/parceiros/tvcars/tvcars_tela_encosto.png",
        "/images/parceiros/tvcars/tvcars_tela_passageiro.png",
        "/images/parceiros/tvcars/tvcars_tela_esportes.png"
      ];
    } else {
      // Proibido utilizar imagens sintéticas ou geradas por IA.
      // Produtos sem foto real comprovada permanecem com fotos: []
      fotos = [];
    }

    // Eagle base prices
    if (pNome.includes("eagle") && (!prod.preco_tabela || prod.preco_tabela === 0)) {
      if (nome.includes("LED") || nome.includes("Painel")) updates.preco_tabela = 12000;
      else updates.preco_tabela = 4000;
    }

    if (fotos.length > 0 && (!prod.fotos || prod.fotos.length === 0 || pNome.includes("tvcars"))) {
      updates.fotos = fotos;
    }

    // Ensure preco_tabela is not zero if valor_unit exists
    if ((!prod.preco_tabela || prod.preco_tabela === 0) && prod.valor_unit > 0) {
      updates.preco_tabela = prod.valor_unit;
    }

    if (Object.keys(updates).length > 0) {
      const { error: errUp } = await supabase
        .from("produtos")
        .update(updates)
        .eq("id", prod.id);
      if (!errUp) {
        updatedCount++;
      } else {
        console.error(`Error updating product ${prod.id}:`, errUp.message);
      }
    }
  }

  console.log(`Successfully enriched ${updatedCount} products with location, photos and pricing.`);
}

enrichProducts().catch(console.error);
