import fs from "node:fs";

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...v] = trimmed.split("=");
    const key = k.trim();
    const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (key === "VITE_SUPABASE_URL" || key === "SUPABASE_URL") supabaseUrl = val;
    if (key === "VITE_SUPABASE_PUBLISHABLE_KEY" || key === "SUPABASE_PUBLISHABLE_KEY") supabaseKey = val;
  }
}

async function run() {
  const restUrl = `${supabaseUrl}/rest/v1`;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const res = await fetch(`${restUrl}/tenants?select=*&limit=1`, { headers });
  if (res.ok) {
    const rows = await res.json();
    console.log("Colunas de tenants:", rows.length ? Object.keys(rows[0]) : "vazio");
  } else {
    console.log("Erro tenants:", await res.text());
  }
}

run();
