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
  const { data: parceiros } = await supabase.from('parceiros').select('id, razao_social, nome_fantasia, cnpj, tenant_id');
  const { data: produtos } = await supabase.from('produtos').select('id, nome, parceiro_id, parceiro_nome, parceiro_cnpj, fotos, valor_unit, preco_tabela, tenant_id');

  console.log(`Total parceiros: ${parceiros.length}`);
  console.log(`Total produtos: ${produtos.length}`);

  // Checa quantos produtos têm fotos
  const comFotos = produtos.filter(p => p.fotos && (Array.isArray(p.fotos) ? p.fotos.length > 0 : String(p.fotos).trim().length > 0));
  console.log(`Produtos com fotos: ${comFotos.length} de ${produtos.length}`);

  // Checa quantos produtos têm parceiro_id
  const comParceiroId = produtos.filter(p => p.parceiro_id);
  console.log(`Produtos com parceiro_id: ${comParceiroId.length} de ${produtos.length}`);

  // Checa quantos produtos têm parceiro_nome
  const comParceiroNome = produtos.filter(p => p.parceiro_nome);
  console.log(`Produtos com parceiro_nome: ${comParceiroNome.length} de ${produtos.length}`);
}
check();
