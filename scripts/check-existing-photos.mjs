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

async function checkPhotos() {
  const { data: prods } = await supabase
    .from('produtos')
    .select('id, nome, parceiro_nome, fotos, fotos_locais')
    .not('fotos', 'is', null);

  console.log('Produtos com fotos:');
  for (const p of prods || []) {
    console.log(`- ${p.nome} (${p.parceiro_nome}):`, typeof p.fotos, Array.isArray(p.fotos) ? p.fotos.length : p.fotos?.slice(0, 50));
  }
}
checkPhotos();
