import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.trim();
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: produtos } = await supabase.from("produtos").select("id, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj");
  const counts = {};
  for (const p of produtos || []) {
    const k = `${p.parceiro_id || p.partner_id || "SEM_ID"} | ${p.parceiro_nome || "SEM_NOME"}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  console.log("=== TALLY OF PRODUTOS ===");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`${v} produtos: ${k}`);
  }
}

check().catch(console.error);
