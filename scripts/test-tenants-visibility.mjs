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

const clientAnon = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY);

async function testNexoTenants() {
  const { data: auth } = await clientAnon.auth.signInWithPassword({
    email: "rafaelnexomidia@gmail.com",
    password: "21242628",
  });

  const nexoClient = createClient(
    env.SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } },
    }
  );

  const { data: t, error } = await nexoClient.from("tenants").select("id, razao_social, cnpj");
  console.log("TENANTS VISIBLE TO NEXO USER:", t?.length, "ERRO:", error?.message || "Nenhum");
  for (const item of t || []) {
    console.log(` -> Visible tenant: ${item.razao_social} (${item.id})`);
  }
}
testNexoTenants();
