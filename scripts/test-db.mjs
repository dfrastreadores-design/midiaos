import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Variáveis de ambiente do Supabase não encontradas.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log("🔌 Conectando ao Supabase para teste Autenticado...");

  const email = await question("Digite o email do seu usuário: ");
  const password = await question("Digite a senha: ");
  rl.close();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error("❌ Erro ao fazer login:", authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`✅ Login efetuado com sucesso! (Usuário: ${userId})`);

  console.log("\n🔄 Tentando inserir um registro na tabela 'propostas'...");
  const { data: insertData, error: insertError } = await supabase
    .from("propostas")
    .insert({
      campanha: "[TESTE DE DEBUG] Nova Proposta",
      status: "rascunho",
      valor_tabela: 100,
      valor_desconto: 0,
      valor_negociado: 100,
      total_insercoes: 1,
      executivo_id: userId,
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    console.error("❌ Erro exato retornado pelo Supabase ao tentar salvar uma proposta:");
    console.error(JSON.stringify(insertError, null, 2));
    console.log(
      "\nPossíveis causas: Triggers de auditoria/lixeira (RLS), falta de tenant_id, ou validação do banco.",
    );
  } else {
    console.log("✅ Proposta salva com sucesso no banco de dados!", insertData.id);

    console.log("\n🔄 Tentando deletar a proposta para limpar o teste...");
    const { error: delError } = await supabase.from("propostas").delete().eq("id", insertData.id);
    if (delError) {
      console.error("❌ Erro ao deletar:", delError.message);
    } else {
      console.log("✅ Limpeza concluída.");
    }
  }
}

run().catch(console.error);
