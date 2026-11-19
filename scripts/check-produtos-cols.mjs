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

async function check() {
  const { data, error } = await clientAdmin.from("produtos").select("*").limit(1);
  if (error) console.error(error);
  else {
    console.log("Colunas da tabela produtos:");
    console.log(Object.keys(data[0] || {}));
  }
}
check();
