import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let output = '# LISTA CANÔNICA DAS 211 MIGRATIONS DO MIDIA OS\n\n';
output += '| Nº | Arquivo de Migration | Timestamp / Data | Fase / Bloco |\n';
output += '| :--- | :--- | :--- | :--- |\n';

files.forEach((f, idx) => {
  const num = idx + 1;
  let timestamp = f.slice(0, 14);
  let dataStr = '';
  if (/^\d{14}/.test(timestamp)) {
    const y = timestamp.slice(0, 4);
    const m = timestamp.slice(4, 6);
    const d = timestamp.slice(6, 8);
    dataStr = `${d}/${m}/${y}`;
  } else {
    dataStr = 'Hotfix / Sem Timestamp';
  }

  let bloco = '';
  if (num <= 152) {
    bloco = 'Bloco 1: Fundação Core & Multi-Tenant (1 a 152)';
  } else if (num <= 208) {
    bloco = 'Bloco 2: Módulos Verticais SaaS v2.6.0 (153 a 208)';
  } else if (f.includes('prospect')) {
    bloco = 'Bloco 3: Módulo Prospect Fase 1 (209 a 210)';
  } else {
    bloco = 'Hotfix / RLS';
  }

  output += `| ${num} | \`${f}\` | ${dataStr} | ${bloco} |\n`;
});

fs.writeFileSync('supabase/LISTA_211_MIGRATIONS.md', output, 'utf8');
console.log('Gerado supabase/LISTA_211_MIGRATIONS.md com sucesso.');

