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

const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: prof, error: errProf } = await client.from("profiles").select("*").eq("id", "e6d8c416-b50c-4c07-84be-079318ed343d").single();
  console.log("PROFILES ROW:", prof || errProf);
  const { data: roles, error: errRoles } = await client.from("user_roles").select("*").eq("user_id", "e6d8c416-b50c-4c07-84be-079318ed343d");
  console.log("USER_ROLES ROWS:", roles || errRoles);
  const { data: tenants, error: errTenants } = await client.from("tenants").select("id, nome, cnpj, slug").limit(5);
  console.log("TENANTS ROWS:", tenants || errTenants);
}
check();
