import * as xlsxModule from 'xlsx';
const xlsx = xlsxModule.default || xlsxModule;

const file = 'd:\\Projetos\\Midia.os\\data\\Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx';
const wb = xlsx.readFile(file);
console.log('Abas no arquivo consolidado:');
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`- ${name}: ${rows.length} linhas`);
});
