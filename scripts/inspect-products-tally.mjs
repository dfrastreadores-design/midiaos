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
  const { data: parceiros } = await supabase.from("parceiros").select("id, tenant_id, razao_social, nome_fantasia, cnpj, ativo");
  const { data: produtos } = await supabase.from("produtos").select("id, tenant_id, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj, nome, preco_tabela, valor_unit, fotos, cidade, uf");

  console.log(`Parceiros count: ${parceiros?.length}`);
  console.log(`Produtos count: ${produtos?.length}`);

  // Tally products by parceiro_id / partner_id / parceiro_nome
  const tally = {};
  const noParceiro = [];

  for (const p of produtos || []) {
    const pid = p.parceiro_id || p.partner_id || "(none)";
    const pnome = p.parceiro_nome || "(none)";
    const key = `${pid} | ${pnome}`;
    tally[key] = (tally[key] || 0) + 1;
    if (pid === "(none)" && pnome === "(none)") {
      noParceiro.push(p.nome);
    }
  }

  console.log("=== TALLY OF PRODUTOS BY PARCEIRO ===");
  console.log(JSON.stringify(tally, null, 2));

  console.log("=== PARCEIROS IN DB ===");
  for (const parc of parceiros || []) {
    console.log(`ID: ${parc.id} | Fantasia: ${parc.nome_fantasia} | Razao: ${parc.razao_social} | CNPJ: ${parc.cnpj} | Tenant: ${parc.tenant_id}`);
  }
}

main().catch(console.error);
