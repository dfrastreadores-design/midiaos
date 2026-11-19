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

async function fixProfile() {
  const nexoTenantId = '02a5892c-1e6f-4452-89b0-3c4e8f3d3132';
  
  // Atualiza o perfil do Rafael Rodrigo para o tenant real da Nexo
  const { data, error } = await supabase
    .from('profiles')
    .update({ tenant_id: nexoTenantId })
    .eq('email', 'rafaelrodrigo.as@gmail.com')
    .select('id, email, tenant_id, nome');

  if (error) {
    console.error('Erro ao atualizar profile:', error);
  } else {
    console.log('Profile de rafaelrodrigo.as@gmail.com atualizado com sucesso:', data);
  }

  // Também atualiza os parceiros órfãos do tenant fantasma a711a129 para o tenant real da Nexo
  // caso algum produto venha a ser associado a eles
  const { data: parcUp, error: errParc } = await supabase
    .from('parceiros')
    .update({ tenant_id: nexoTenantId })
    .eq('tenant_id', 'a711a129-330c-46bf-943a-531cedd4f2ff')
    .select('id, nome_fantasia, tenant_id');

  if (errParc) {
    console.error('Erro ao atualizar parceiros órfãos:', errParc);
  } else {
    console.log(`Parceiros órfãos consolidados para Nexo: ${parcUp?.length || 0}`);
  }
}
fixProfile();
