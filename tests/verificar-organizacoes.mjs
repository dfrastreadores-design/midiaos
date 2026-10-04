import fs from "node:fs";

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...v] = trimmed.split("=");
    const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (k.trim() === "SUPABASE_URL" && !supabaseUrl) supabaseUrl = val;
    if (k.trim() === "SUPABASE_PUBLISHABLE_KEY" && !supabaseKey) supabaseKey = val;
    if (k.trim() === "VITE_SUPABASE_URL" && !supabaseUrl) supabaseUrl = val;
    if (k.trim() === "VITE_SUPABASE_PUBLISHABLE_KEY" && !supabaseKey) supabaseKey = val;
  }
}

async function check() {
  const restUrl = `${supabaseUrl}/rest/v1`;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const tablesToCheck = ["tenants", "organizacoes", "perfis", "profiles", "produtos", "inventario_midia"];

  for (const tbl of tablesToCheck) {
    try {
      const res = await fetch(`${restUrl}/${tbl}?select=*&limit=1`, { headers });
      console.log(`Table/View [${tbl}]: status=${res.status} (${res.statusText})`);
      if (res.ok) {
        const data = await res.json();
        console.log(`  Sample keys for [${tbl}]:`, data.length > 0 ? Object.keys(data[0]) : "empty table");
        if (tbl === "tenants" && data.length > 0) {
          console.log(`  Tenant sample:`, data[0].nome_fantasia || data[0].razao_social, `id=${data[0].id}`, `slug=${data[0].slug}`);
        }
      } else {
        const text = await res.text();
        console.log(`  Error: ${text.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`  Exception on [${tbl}]:`, e.message);
    }
  }
}

check();
