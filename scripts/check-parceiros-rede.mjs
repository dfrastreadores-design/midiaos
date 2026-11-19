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

async function check() {
  const { data: parceiros } = await supabase.from('parceiros').select('id, razao_social, nome_fantasia, tenant_id');
  console.log('=== PARCEIROS (', parceiros?.length, ') ===');
  for (const p of parceiros || []) {
    console.log(`ID: ${p.id} | Fantasia: "${p.nome_fantasia}" | Razao: "${p.razao_social}" | Tenant: ${p.tenant_id}`);
  }

  const { data: rede } = await supabase.from('rede_inventario').select('id, nome_interno, nome_comercial, tenant_id');
  console.log('\n=== REDE_INVENTARIO (', rede?.length, ') ===');
  for (const r of rede || []) {
    console.log(`ID: ${r.id} | Comercial: "${r.nome_comercial}" | Interno: "${r.nome_interno}" | Tenant: ${r.tenant_id}`);
  }
}
check();
