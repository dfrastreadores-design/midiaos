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

async function checkTenants() {
  const { data: t } = await clientAdmin.from("tenants").select("*");
  console.log("TENANTS COUNT:", t?.length);
  for (const item of t || []) {
    console.log(`Tenant: id=${item.id}, razao_social=${item.razao_social || item.nome_fantasia || item.nome || item.name}, cnpj=${item.cnpj}`);
  }
}
checkTenants();
