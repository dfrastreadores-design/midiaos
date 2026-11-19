import * as xlsxModule from "xlsx";
const xlsx = xlsxModule.default || xlsxModule;

const workbook = xlsx.readFile("data/Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx");
console.log("Sheet names:", workbook.SheetNames);

for (const name of workbook.SheetNames) {
  const sheet = workbook.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`\n--- Sheet: ${name} (rows: ${rows.length}) ---`);
  if (rows.length > 0) {
    console.log("Sample keys:", Object.keys(rows[0]));
    console.log("First row:", rows[0]);
  }
}
