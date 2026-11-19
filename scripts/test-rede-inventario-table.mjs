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

async function testRede() {
  const { data, count, error } = await clientAdmin.from("rede_inventario").select("*", { count: "exact" }).limit(5);
  console.log("REDE_INVENTARIO COUNT:", count, "ERRO:", error?.message || "Nenhum");
  console.log("REDE_INVENTARIO ITEMS:", data);
}
testRede();
