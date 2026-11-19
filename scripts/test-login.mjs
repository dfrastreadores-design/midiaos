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

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'rafaelnexomidia@gmail.com',
    password: '21242628'
  });
  if (error) {
    console.log('Login error:', error.message);
  } else {
    console.log('Login OK! User ID:', data.user.id, 'Email:', data.user.email);
  }
}
testLogin();
