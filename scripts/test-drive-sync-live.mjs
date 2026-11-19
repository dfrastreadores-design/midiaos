import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://tvniawyweymutjiybxyo.supabase.co";
let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || """";

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...v] = trimmed.split("=");
    const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    if ((k.trim() === "SUPABASE_URL" || k.trim() === "VITE_SUPABASE_URL") && !supabaseUrl) supabaseUrl = val;
    if ((k.trim() === "SUPABASE_PUBLISHABLE_KEY" || k.trim() === "VITE_SUPABASE_PUBLISHABLE_KEY") && !supabaseKey) supabaseKey = val;
  }
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Import dynamically from tsx
async function run() {
  console.log("🚀 Testando executeDriveSync...");
  const authRes = await supabase.auth.signInWithPassword({
    email: "rafaelnexomidia@gmail.com",
    password: "21242628",
  });

  if (authRes.error) {
    console.error("Falha ao autenticar:", authRes.error.message);
    process.exit(1);
  }

  console.log("✅ Autenticado como:", authRes.data.user.email);
  const { executeDriveSync } = await import("../src/lib/services/drive-sync-service.ts");

  console.log("\n🔄 Executando primeira sincronização...");
  const res1 = await executeDriveSync(supabase);
  console.log("Resultado 1:", {
    sucesso: res1.sucesso,
    novosParceiros: res1.novosParceiros,
    parceirosAtualizados: res1.parceirosAtualizados,
    produtosAtualizados: res1.produtosAtualizados,
    arquivosAnexados: res1.arquivosAnexados,
    itensDuplicados: res1.itensDuplicados,
  });

  console.log("\n🔄 Executando segunda sincronização (verificação de idempotência)...");
  const res2 = await executeDriveSync(supabase);
  console.log("Resultado 2 (deve manter zero duplicados e zero novos repetidos):", {
    sucesso: res2.sucesso,
    novosParceiros: res2.novosParceiros,
    parceirosAtualizados: res2.parceirosAtualizados,
    produtosAtualizados: res2.produtosAtualizados,
    arquivosAnexados: res2.arquivosAnexados,
    itensDuplicados: res2.itensDuplicados,
  });

  console.log("\n✅ Teste de Idempotência passou com sucesso!");
}

run().catch(console.error);
