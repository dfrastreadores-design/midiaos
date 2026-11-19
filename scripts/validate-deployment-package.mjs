import fs from 'node:fs';
import path from 'node:path';

console.log('Validating deployment packages...\n');

const f1 = fs.readFileSync('supabase/01_midiaos_v260_core_schema.sql', 'utf8');
const f2 = fs.readFileSync('supabase/02_midiaos_v260_post_migrations.sql', 'utf8');
const f3 = fs.readFileSync('supabase/migrations/20261101230000_modulo_prospect_fase1_seis_tabelas.sql', 'utf8');

console.log('Package 1 (Core Schema):', Math.round(f1.length / 1024), 'KB, lines:', f1.split('\n').length);
console.log('Package 2 (Post-Migrations):', Math.round(f2.length / 1024), 'KB, lines:', f2.split('\n').length);
console.log('Package 3 (Prospect Fase 1):', Math.round(f3.length / 1024), 'KB, lines:', f3.split('\n').length);

// Checks for Package 1
const coreTables = ['tenants', 'profiles', 'user_roles', 'clientes', 'auditoria_alteracoes', 'agencias', 'pis', 'propostas'];
coreTables.forEach(t => {
  if (!f1.includes(`CREATE TABLE IF NOT EXISTS public.${t}`) && !f1.includes(`CREATE TABLE public.${t}`)) {
    console.error(`❌ Table ${t} not found in Package 1`);
  } else {
    console.log(`✅ Table ${t} present in Package 1`);
  }
});

// Check anon security
if (f1.includes('GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon') || f2.includes('GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon')) {
  console.error('❌ Blanket SELECT granted to anon!');
} else {
  console.log('✅ No blanket SELECT granted to anon');
}

if (f1.includes('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon') || f2.includes('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon')) {
  console.error('❌ Blanket EXECUTE granted to anon!');
} else {
  console.log('✅ No blanket EXECUTE granted to anon');
}

// Check auth.users direct DML
const authMatches = (f1 + f2).match(/INSERT\s+INTO\s+auth\.users/gi) || [];
if (authMatches.length > 0) {
  console.error(`❌ Direct INSERT into auth.users found: ${authMatches.length}`);
} else {
  console.log('✅ Zero direct INSERT into auth.users');
}

// Check tenant default seed
if (f1.includes("'a711a129-330c-46bf-943a-531cedd4f2ff'")) {
  console.log('✅ Canonical Tenant Default UUID present in Package 1');
} else {
  console.error('❌ Canonical Tenant Default UUID missing in Package 1');
}

