import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

console.log(`Found ${files.length} migration files in supabase/migrations.\n`);

let totalLines = 0;
let totalSize = 0;

const groups = {
  core_foundations_may_jun_2026: [],   // migrations from 2026-05 to 2026-06
  growth_features_jul_aug_2026: [],    // migrations from 2026-07 to 2026-08
  multi_tenant_late_sep_2026: [],      // 2026-09
  saas_and_modules_oct_2026: [],       // 2026-10
  prospect_fase1_nov_2026: []          // 2026-11
};

files.forEach((f, idx) => {
  const filePath = path.join(migrationsDir, f);
  const stat = fs.statSync(filePath);
  totalSize += stat.size;
  const content = fs.readFileSync(filePath, 'utf8');
  totalLines += content.split('\n').length;

  if (f.startsWith('202605') || f.startsWith('202606')) {
    groups.core_foundations_may_jun_2026.push(f);
  } else if (f.startsWith('202607') || f.startsWith('202608')) {
    groups.growth_features_jul_aug_2026.push(f);
  } else if (f.startsWith('202609')) {
    groups.multi_tenant_late_sep_2026.push(f);
  } else if (f.startsWith('202610')) {
    groups.saas_and_modules_oct_2026.push(f);
  } else if (f.startsWith('202611')) {
    groups.prospect_fase1_nov_2026.push(f);
  } else {
    // e.g. fix_produto_tipos_rls.sql
    groups.saas_and_modules_oct_2026.push(f);
  }
});

console.log('Total Size:', Math.round(totalSize / 1024), 'KB');
console.log('Total Lines:', totalLines);
console.log('\nBreakdown by Timeline Groups:');
console.log(`1. Maio - Junho 2026 (Fundação Core): ${groups.core_foundations_may_jun_2026.length} migrations`);
console.log(`2. Julho - Agosto 2026 (Expansão e Features): ${groups.growth_features_jul_aug_2026.length} migrations`);
console.log(`3. Setembro 2026 (Isolamento Multi-Tenant): ${groups.multi_tenant_late_sep_2026.length} migrations`);
console.log(`4. Outubro 2026 (Módulos Verticais e SaaS v2.6.0): ${groups.saas_and_modules_oct_2026.length} migrations`);
console.log(`5. Novembro 2026 (Módulo Prospect Fase 1): ${groups.prospect_fase1_nov_2026.length} migrations`);

