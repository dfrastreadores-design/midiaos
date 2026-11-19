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

async function run() {
  console.log('=== CONSULTANDO PARCEIROS ===');
  const { data: parceiros, error: pErr } = await supabase
    .from('parceiros')
    .select('id, razao_social, nome_fantasia, cnpj, tenant_id');
  if (pErr) console.error('Erro parceiros:', pErr);
  else console.table(parceiros);

  console.log('=== CONSULTANDO REDE_INVENTARIO ===');
  const { data: rede, error: rErr } = await supabase
    .from('rede_inventario')
    .select('id, nome_interno, nome_comercial, cnpj, tenant_id');
  if (rErr) console.log('Erro/aviso rede_inventario:', rErr.message);
  else console.table(rede);

  console.log('=== AMOSTRA DE PRODUTOS ===');
  const { data: produtos, error: prErr } = await supabase
    .from('produtos')
    .select('id, nome, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj, cidade, uf, tenant_id')
    .limit(20);
  if (prErr) console.error('Erro produtos:', prErr);
  else console.table(produtos);

  console.log('=== CONTAGEM TOTAL PRODUTOS ===');
  const { count } = await supabase.from('produtos').select('*', { count: 'exact', head: true });
  console.log('Total produtos:', count);

  console.log('=== DISTRIBUIÇÃO PARCEIRO_ID EM PRODUTOS ===');
  const { data: allProds } = await supabase.from('produtos').select('parceiro_id, partner_id, parceiro_nome');
  const dist = {};
  for (const p of allProds || []) {
    const k = `${p.parceiro_id || 'null'} | ${p.partner_id || 'null'} | ${p.parceiro_nome || 'null'}`;
    dist[k] = (dist[k] || 0) + 1;
  }
  console.log(dist);
}
run();
