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
const clientAnon = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY);

async function testIsolation() {
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

  // 1. Procura registros de outros tenants no banco via admin
  const { data: otherPropostas } = await clientAdmin
    .from("propostas")
    .select("id, campanha, tenant_id")
    .neq("tenant_id", "02a5892c-1e6f-4452-89b0-3c4e8f3d3132")
    .limit(1);

  if (otherPropostas && otherPropostas.length > 0) {
    const target = otherPropostas[0];
    console.log(`Tentando ler proposta de outro tenant (${target.tenant_id}) com token da NEXO...`);
    const { data: leak, error: eLeak } = await nexoClient
      .from("propostas")
      .select("id, campanha")
      .eq("id", target.id)
      .maybeSingle();

    if (leak) {
      console.error("❌ FALHA CRÍTICA DE ISOLAMENTO: Registro de outro tenant foi lido!", leak);
    } else {
      console.log("✅ ISOLAMENTO COMPROVADO: Registro de outro tenant retornou null (bloqueado por RLS)!");
    }
  } else {
    console.log("ℹ️ Todos os registros existentes pertencem ao tenant da NEXO ou não há outro tenant populado.");
  }
}
testIsolation();
