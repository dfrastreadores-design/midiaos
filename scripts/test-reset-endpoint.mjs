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
const supabase = createClient(url, key);

async function testEndpoint() {
  console.log('Efetuando login como admin (rafaelnexomidia@gmail.com)...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'rafaelnexomidia@gmail.com',
    password: '21242628'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  const token = auth.session.access_token;
  console.log('Login de admin OK! Token obtido.');

  // Altera a senha de gabrielnexomidia@gmail.com via endpoint HTTP online
  const targetUserId = '414e9538-a5da-4f0b-a5f0-c411d713570c';
  console.log('Enviando requisição POST para https://midiaos.online/api/admin/reset-password...');

  const res = await fetch('https://midiaos.online/api/admin/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      userId: targetUserId,
      email: 'gabrielnexomidia@gmail.com',
      newPassword: 'MinhaNovaSenha123#'
    })
  });

  console.log('Status HTTP retornado:', res.status);
  const json = await res.json().catch(() => ({}));
  console.log('Resposta JSON do endpoint:', json);
}

testEndpoint();
