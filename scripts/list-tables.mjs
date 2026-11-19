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
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  });
  if (error) {
    // If exec_sql RPC doesn't exist, try querying some tables directly
    console.log('RPC exec_sql não existe:', error.message);
  } else {
    console.log('Tabelas:', data);
  }
}
check();
