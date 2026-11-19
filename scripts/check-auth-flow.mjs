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

async function check() {
  const { data: authData, error: aErr } = await client.auth.signInWithPassword({
    email: 'rafaelnexomidia@gmail.com',
    password: process.env.USER_PWD || '21242628'
  });

  if (aErr) {
    console.error('❌ Login error:', aErr);
    return;
  }

  const user = authData.user;
  console.log('✅ Logged in user ID:', user.id, 'Email:', user.email);

  // Check tenants table
  const { data: tenant, error: tErr } = await client
    .from('tenants')
    .select('*')
    .eq('id', '02a5892c-1e6f-4452-89b0-3c4e8f3d3132');
  console.log('\n--- Tenants table ---', { data: tenant, error: tErr });

  // Check tenant_members table
  const { data: tm, error: tmErr } = await client
    .from('tenant_members')
    .select('*')
    .eq('user_id', user.id);
  console.log('\n--- Tenant members table ---', { data: tm, error: tmErr });

  // Check use-current-org.ts queries!
  // Let's see what use-current-org.ts does:
  const { data: orgProfiles, error: opErr } = await client
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();
  console.log('\n--- use-current-org: profiles(tenant_id) ---', { data: orgProfiles, error: opErr });

  // Check use-tenant-branding.ts queries!
  const { data: branding, error: bErr } = await client
    .from('tenants')
    .select('nome,slug,logo_url,icone_url,cor_primaria,cor_secundaria,cor_destaque,dominio_customizado')
    .eq('id', '02a5892c-1e6f-4452-89b0-3c4e8f3d3132')
    .maybeSingle();
  console.log('\n--- use-tenant-branding ---', { data: branding, error: bErr });

  // Check use-tenant-modulos.ts queries!
  const { data: modulos, error: mErr } = await client
    .from('tenant_modulos')
    .select('modulo,ativo')
    .eq('tenant_id', '02a5892c-1e6f-4452-89b0-3c4e8f3d3132');
  console.log('\n--- use-tenant-modulos ---', { data: modulos, error: mErr });
}

check();
