import * as xlsxModule from 'xlsx';
const xlsx = xlsxModule.default || xlsxModule;

const file = 'data/Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx';
const wb = xlsx.readFile(file);

wb.SheetNames.forEach(sheetName => {
  console.log(`\n================ ABA: ${sheetName} ================`);
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`Total linhas: ${rows.length}`);
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    console.log(`Linha ${i}:`, rows[i]);
  }
});
