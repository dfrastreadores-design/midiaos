import fs from "node:fs";

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...v] = trimmed.split("=");
    const key = k.trim();
    const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (key === "SUPABASE_SERVICE_ROLE_KEY") supabaseKey = val;
    else if (!supabaseKey && (key === "VITE_SUPABASE_PUBLISHABLE_KEY" || key === "SUPABASE_PUBLISHABLE_KEY")) supabaseKey = val;
    if (key === "VITE_SUPABASE_URL" || key === "SUPABASE_URL") supabaseUrl = val;
  }
}

async function run() {
  const restUrl = `${supabaseUrl}/rest/v1`;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  console.log("Testando inserção de 'Front' em midia_config via REST com key...");
  const res = await fetch(`${restUrl}/midia_config`, {
    method: "POST",
    headers,
    body: JSON.stringify({ midia: "Front" }),
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  const text = await res.text();
  console.log("Resposta:", text);
}

run();
