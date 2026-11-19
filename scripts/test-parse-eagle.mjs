import * as xlsxModule from "xlsx";
const xlsx = xlsxModule.default || xlsxModule;

async function parseEagle() {
  const fileId = "1nrtZ0jK5iK3ZoZChw9MOOXenLPe1V-cU"; // TABELA DE PREÇOS FRONTS 2026.xlsx
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const wb = xlsx.read(Buffer.from(buf), { type: "buffer" });
  console.log("Eagle sheets:", wb.SheetNames);
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Sheet "${name}" has ${rows.length} rows`);
    rows.slice(0, 5).forEach((r, i) => console.log(`  Row ${i}:`, r));
  }
}

parseEagle().catch(console.error);
