import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const idx = t.indexOf('=');
  if (idx > 0) {
    let val = t.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, idx).trim()] = val;
  }
}
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function test() {
  console.log('Testing select * on profiles...');
  const { data: pAll, error: pAllErr } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles * result:', { count: pAll?.length, error: pAllErr?.message });
  if (pAll && pAll[0]) {
    console.log('Available columns in profiles row:', Object.keys(pAll[0]));
  }

  console.log('\nTesting individual columns on profiles:');
  const cols = ['id', 'email', 'nome', 'role', 'cnpj', 'cnpj_vinculado', 'tenant_id', 'is_superadmin', 'logo_url'];
  for (const c of cols) {
    const { data, error } = await supabase.from('profiles').select(c).limit(1);
    if (error) {
      console.log('❌ FAIL column:', c, '->', error.message, error.code, error.details);
    } else {
      console.log('✅ OK column:', c);
    }
  }

  console.log('\nTesting combined select on profiles:');
  const { data: pComb, error: pCombErr } = await supabase.from('profiles').select('id, email, nome, role, cnpj, cnpj_vinculado, tenant_id, is_superadmin, logo_url').limit(1);
  console.log('combined select result:', { pComb, pCombErr });

  console.log('\nTesting storage client-logos:');
  const { data: sData, error: sErr } = await supabase.storage.from('client-logos').createSignedUrl('test.png', 60);
  console.log('storage result for "test.png":', { sData, sErr });

  const { data: sDataEmpty, error: sErrEmpty } = await supabase.storage.from('client-logos').createSignedUrl('', 60);
  console.log('storage result for empty path "":', { sDataEmpty, sErrEmpty });

  const { data: sDataUndef, error: sErrUndef } = await supabase.storage.from('client-logos').createSignedUrl('undefined', 60);
  console.log('storage result for "undefined":', { sDataUndef, sErrUndef });
}

test();
