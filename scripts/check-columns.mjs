import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const idx = t.indexOf("=");
  env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

const clientAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function schemaCheck() {
  const { data: cp, error: cpErr } = await clientAdmin.from("campanhas_planejamento").select("*").limit(1);
  console.log("CAMPANHA_PLANEJAMENTO:", cp, "ERR:", cpErr?.message);

  const { data: cpm, error: cpmErr } = await clientAdmin.from("campanha_pontos_midia").select("*").limit(1);
  console.log("CAMPANHA_PONTOS_MIDIA:", cpm, "ERR:", cpmErr?.message);

  const { data: prop, error: propErr } = await clientAdmin.from("propostas").select("*").limit(1);
  console.log("PROPOSTA:", prop ? Object.keys(prop[0] || {}) : null, "ERR:", propErr?.message);

  const { data: propItens, error: piErr } = await clientAdmin.from("proposta_itens").select("*").limit(1);
  console.log("PROPOSTA_ITENS:", propItens ? Object.keys(propItens[0] || {}) : null, "ERR:", piErr?.message);
}
schemaCheck();
