import { createClient } from "@supabase/supabase-js";
import fs from "fs";

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://tvniawyweymutjiybxyo.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || """";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Checking tables...");
  
  const { data: tenants, error: errTenants } = await supabase.from("tenants").select("*");
  console.log("Tenants:", tenants, "Error:", errTenants);

  const { data: profiles, error: errProfiles } = await supabase.from("profiles").select("id, email, tenant_id, nome");
  console.log("Profiles:", profiles, "Error:", errProfiles);

  const { data: parceiros, error: errParceiros } = await supabase.from("parceiros").select("id, tenant_id, razao_social, nome_fantasia, cnpj, ativo");
  console.log("Parceiros count:", parceiros?.length, "Error:", errParceiros);
  if (parceiros) {
    console.log("Sample parceiros:", parceiros.slice(0, 10));
  }

  const { data: produtos, error: errProdutos } = await supabase.from("produtos").select("id, tenant_id, parceiro_id, partner_id, parceiro_nome, nome, preco_tabela, fotos").limit(10);
  console.log("Produtos sample:", produtos, "Error:", errProdutos);

  const { count: totalProdutos, error: errTotalProd } = await supabase.from("produtos").select("*", { count: "exact", head: true });
  console.log("Total produtos:", totalProdutos, "Error:", errTotalProd);
}

main().catch(console.error);
