import * as xlsxModule from "xlsx";
const xlsx = xlsxModule.default || xlsxModule;
import { supabase } from "./db.mjs";

async function mapSpreadsheetToProducts() {
  const wb = xlsx.readFile("data/Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx");
  
  // 1. Sheet Mídia OOH Consolidada (Todas)
  const oohSheet = wb.Sheets["Mídia OOH Consolidada (Todas)"];
  const oohRows = xlsx.utils.sheet_to_json(oohSheet, { header: 1 });
  console.log("Total OOH rows in sheet:", oohRows.length);

  // Headers are in row 3
  const headers = oohRows[3];
  console.log("Headers:", headers);

  // 2. DOOH Condomínios
  const condSheet = wb.Sheets["DOOH Condomínios"];
  const condRows = xlsx.utils.sheet_to_json(condSheet, { header: 1 });
  console.log("Total DOOH Condomínios rows:", condRows.length);

  // 3. DOOH Gastronomia
  const gastroSheet = wb.Sheets["DOOH Gastronomia"];
  const gastroRows = xlsx.utils.sheet_to_json(gastroSheet, { header: 1 });
  console.log("Total DOOH Gastronomia rows:", gastroRows.length);
}

mapSpreadsheetToProducts().catch(console.error);
