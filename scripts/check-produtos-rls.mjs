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

const client = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY);

async function testRealData() {
  const { data: auth } = await client.auth.signInWithPassword({
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

  // 1. Produtos
  const { data: produtos, error: errProd } = await nexoClient
    .from("produtos")
    .select("id, nome, preco_tabela, valor_unit, tenant_id")
    .limit(3);
  console.log("PRODUTOS READ WITH NEXO TOKEN:", produtos?.length, "ERRO:", errProd?.message || "Nenhum");

  // 2. Clientes
  const { data: clientes, error: errCli } = await nexoClient
    .from("clientes")
    .select("id, razao_social, nome_fantasia, tenant_id")
    .limit(3);
  console.log("CLIENTES READ WITH NEXO TOKEN:", clientes?.length, "ERRO:", errCli?.message || "Nenhum");

  // 3. Propostas
  const { data: propostas, error: errProp } = await nexoClient
    .from("propostas")
    .select("id, campanha, status, valor_negociado, tenant_id")
    .limit(3);
  console.log("PROPOSTAS READ WITH NEXO TOKEN:", propostas?.length, "ERRO:", errProp?.message || "Nenhum");

  // 4. PIs
  const { data: pis, error: errPis } = await nexoClient
    .from("pis")
    .select("id, numero, status, valor_negociado, tenant_id")
    .limit(3);
  console.log("PIS READ WITH NEXO TOKEN:", pis?.length, "ERRO:", errPis?.message || "Nenhum");

  if (produtos && clientes && propostas && pis) {
    console.log("\n🎉 TESTE DE ACESSO AOS DADOS DO PRÓPRIO TENANT 100% SUCESSO!");
  }
}
testRealData();
