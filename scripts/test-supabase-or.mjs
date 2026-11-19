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

async function testQuery() {
  const cerradusId = 'b30ad94e-00e4-486a-95b6-d66edb9c1bba';
  const tenantId = '02a5892c-1e6f-4452-89b0-3c4e8f3d3132';

  console.log('--- TESTE 1: Apenas parceiro_id.eq ---');
  const q1 = await supabase.from('produtos').select('id, nome').eq('parceiro_id', cerradusId);
  console.log('q1 result count:', q1.data?.length, 'error:', q1.error?.message);

  console.log('--- TESTE 2: Duplo .or() como no código original ---');
  let q2 = supabase
    .from('produtos')
    .select('id, nome')
    .or(`parceiro_id.eq.${cerradusId},partner_id.eq.${cerradusId}`);
  q2 = q2.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  const r2 = await q2;
  console.log('r2 result count:', r2.data?.length, 'error:', r2.error?.message);

  console.log('--- TESTE 3: .eq("parceiro_id") + tenant_id ---');
  let q3 = supabase
    .from('produtos')
    .select('id, nome')
    .eq('parceiro_id', cerradusId);
  if (tenantId) {
    q3 = q3.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  }
  const r3 = await q3;
  console.log('r3 result count:', r3.data?.length, 'error:', r3.error?.message);
}
testQuery();
