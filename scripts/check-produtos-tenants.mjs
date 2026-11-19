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
  const { data: prods } = await supabase.from('produtos').select('tenant_id');
  const tDist = {};
  for (const p of prods || []) {
    tDist[p.tenant_id || 'null'] = (tDist[p.tenant_id || 'null'] || 0) + 1;
  }
  console.log('Distribuição de tenant_id em PRODUTOS:');
  console.log(tDist);
}
check();
