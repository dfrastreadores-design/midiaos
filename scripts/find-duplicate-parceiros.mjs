import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')];
    })
);

const supabase = createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function findDuplicates() {
  const { data: parceiros } = await supabase
    .from('parceiros')
    .select('id, razao_social, nome_fantasia, cnpj, tenant_id');

  const { data: prods } = await supabase
    .from('produtos')
    .select('id, parceiro_id, parceiro_nome');

  const prodCountById = {};
  for (const p of prods || []) {
    if (p.parceiro_id) {
      prodCountById[p.parceiro_id] = (prodCountById[p.parceiro_id] || 0) + 1;
    }
  }

  const byName = {};
  for (const p of parceiros || []) {
    const nome = (p.nome_fantasia || p.razao_social || '').trim();
    if (!byName[nome]) byName[nome] = [];
    byName[nome].push({
      id: p.id,
      razao: p.razao_social,
      cnpj: p.cnpj,
      tenant_id: p.tenant_id,
      produtos: prodCountById[p.id] || 0
    });
  }

  console.log('=== ANÁLISE DE DUPLICIDADES EM PARCEIROS ===');
  for (const [nome, list] of Object.entries(byName)) {
    if (list.length > 1) {
      console.log(`\nDUPLICADO: "${nome}" (${list.length} registros):`);
      list.forEach(item => {
        console.log(`  - ID: ${item.id} | CNPJ: ${item.cnpj} | Tenant: ${item.tenant_id} | Produtos vinculados: ${item.produtos}`);
      });
    }
  }
}
findDuplicates();
