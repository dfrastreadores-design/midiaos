import { createClient } from 'file:///D:/midiaos_build/node_modules/@supabase/supabase-js/dist/index.mjs';
import fs from 'fs';

// Read .env
const env = {};
for (const line of fs.readFileSync('D:/midiaos_build/.env', 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const [k, ...v] = trimmed.split('=');
  env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
}

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const anonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

const client = createClient(supabaseUrl, anonKey);

async function run() {
  const { data: authData, error: aErr } = await client.auth.signInWithPassword({
    email: 'rafaelnexomidia@gmail.com',
    password: process.env.USER_PWD || '21242628'
  });

  if (aErr) {
    console.error('❌ Erro no login:', aErr);
    return;
  }

  const userId = authData.user.id;
  console.log('✅ Usuário autenticado:', userId);

  // 1. Verificar roles atuais
  const { data: currentRoles } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  console.log('Roles atuais:', currentRoles);

  const hasAdmin = (currentRoles ?? []).some(r => r.role === 'admin');
  if (!hasAdmin) {
    console.log('Inserindo papel "admin" para o usuário...');
    const { data: insData, error: insErr } = await client
      .from('user_roles')
      .insert({ user_id: userId, role: 'admin' })
      .select();
    console.log('Resultado da inserção:', { data: insData, error: insErr });
  } else {
    console.log('Papel "admin" já existente.');
  }

  // 2. Verificar se profiles possui tenant_id preenchido
  const { data: prof, error: profErr } = await client
    .from('profiles')
    .select('id,email,tenant_id,ativo,trial_ends_at')
    .eq('id', userId)
    .single();
  console.log('Perfil atual:', { prof, profErr });
}

run();
