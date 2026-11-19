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

async function main() {
  console.log("🔍 Verificando usuário Master e políticas de acesso...");

  // Autenticar com o usuário Master
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "rafaelrodrigo.as@gmail.com",
    password: "21242628",
  });

  if (authError) {
    console.error("❌ Erro ao logar com rafaelrodrigo.as@gmail.com:", authError.message);
  } else {
    console.log("✅ Login efetuado com sucesso como:", authData.user.email, "(ID:", authData.user.id, ")");
    
    // Consultar profile do usuário
    const { data: profile, error: profError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profError) {
      console.error("❌ Erro ao buscar profile:", profError.message);
    } else {
      console.log("📋 Perfil do Usuário:");
      console.log("   - Nome:", profile.nome);
      console.log("   - Role:", profile.role);
      console.log("   - is_master:", profile.is_master);
      console.log("   - is_super_admin:", profile.is_super_admin);
      console.log("   - tenant_id:", profile.tenant_id);
      console.log("   - cnpj:", profile.cnpj);

      // Se não estiver como MASTER ou is_master=true, atualizar
      if (profile.role !== "MASTER" || !profile.is_master) {
        console.log("⚠️ Ajustando permissões para MASTER...");
        const { error: updError } = await supabase
          .from("profiles")
          .update({
            role: "MASTER",
            is_master: true,
            is_super_admin: true,
          })
          .eq("id", authData.user.id);
        if (updError) console.error("Erro ao atualizar profile:", updError.message);
        else console.log("✅ Perfil atualizado para MASTER com sucesso!");
      } else {
        console.log("✅ Usuário já está configurado como MASTER com acesso global!");
      }
    }

    // Testar acesso global (consultar PIs e Produtos de múltiplos tenants)
    const { count: totalPis } = await supabase
      .from("pis")
      .select("*", { count: "exact", head: true });
    console.log(`📊 Acesso Global Master - Total de PIs visíveis: ${totalPis}`);

    const { count: totalProdutos } = await supabase
      .from("produtos")
      .select("*", { count: "exact", head: true });
    console.log(`📦 Acesso Global Master - Total de Produtos visíveis: ${totalProdutos}`);

    const { count: totalParceiros } = await supabase
      .from("parceiros")
      .select("*", { count: "exact", head: true });
    console.log(`🤝 Acesso Global Master - Total de Parceiros visíveis: ${totalParceiros}`);
  }

  // Agora testar com um usuário regular (ex: rafaelnexomidia@gmail.com vinculado ao tenant da Nexo)
  console.log("\n🔒 Verificando isolamento RLS para inquilino regular...");
  const { data: tenantAuth, error: tenantAuthError } = await supabase.auth.signInWithPassword({
    email: "rafaelnexomidia@gmail.com",
    password: "21242628",
  });

  if (tenantAuthError) {
    console.log("ℹ️ Usuário inquilino não pôde ser testado com senha padrão:", tenantAuthError.message);
  } else {
    console.log("✅ Login de inquilino efetuado como:", tenantAuth.user.email);
    const { data: tenantProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", tenantAuth.user.id)
      .single();
    console.log(`   - Inquilino Tenant ID: ${tenantProfile?.tenant_id}, CNPJ: ${tenantProfile?.cnpj}`);

    const { count: tenantPis } = await supabase
      .from("pis")
      .select("*", { count: "exact", head: true });
    console.log(`   - PIs visíveis para este inquilino: ${tenantPis}`);

    const { count: tenantProds } = await supabase
      .from("produtos")
      .select("*", { count: "exact", head: true });
    console.log(`   - Produtos visíveis para este inquilino: ${tenantProds}`);
  }
}

main().catch(console.error);
