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

async function checkRpc() {
  const rpcs = ['exec_sql', 'execute_sql', 'run_sql', 'exec', 'execute', 'query', 'run_query'];
  for (const r of rpcs) {
    const { data, error } = await supabase.rpc(r, { query: 'SELECT 1;' });
    console.log('RPC', r, error?.code, error?.message || 'OK');
  }
}
checkRpc();
