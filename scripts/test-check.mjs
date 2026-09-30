import { createClient } from "@supabase/supabase-js";

async function runTests() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Variáveis de ambiente do Supabase não encontradas.");
    process.exit(1);
  }

  const roleMatch = supabaseKey.includes("service_role");

  console.log(`\n🔌 Conectando ao Supabase (${supabaseUrl})...`);
  if (!roleMatch) {
    console.warn(
      "⚠️ AVISO: Usando a chave pública (anon). A leitura da lixeira e auditoria falhará devido ao RLS (Row Level Security).",
    );
    console.warn(
      "⚠️ Para testar completamente, adicione 'SUPABASE_SERVICE_ROLE_KEY' no seu .env.\n",
    );
  } else {
    console.log("✅ Chave Service Role detectada. O RLS será ignorado neste teste.\n");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const tableName = "links_uteis";

  console.log(`🔄 [1/5] Inserindo registro temporário na tabela '${tableName}'...`);
  const { data: inserted, error: insertError } = await supabase
    .from(tableName)
    .insert({
      titulo: "[TESTE DE GUARDA-CHUVA] Validação",
      url: "https://teste.com",
      categoria: "Comercial",
    })
    .select()
    .single();

  if (insertError) {
    console.error("❌ Erro ao inserir:", insertError.message);
    if (!roleMatch) console.warn("Isso pode ser porque o RLS não permite inserção anônima.");
    return;
  }

  const testId = inserted.id;
  console.log(`✅ Registro criado com sucesso (ID: ${testId})`);

  console.log("\n🔄 [2/5] Atualizando o registro para testar a auditoria...");
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ titulo: "[TESTE DE GUARDA-CHUVA] Validação (ATUALIZADO)" })
    .eq("id", testId);

  if (updateError) {
    console.error("❌ Erro ao atualizar:", updateError.message);
  } else {
    console.log("✅ Registro atualizado.");
  }

  console.log("\n🔄 [3/5] Excluindo o registro para testar a lixeira automática...");
  const { error: deleteError } = await supabase.from(tableName).delete().eq("id", testId);

  if (deleteError) {
    console.error("❌ Erro ao deletar:", deleteError.message);
  } else {
    console.log("✅ Registro excluído.");
  }

  console.log("\n🔄 [4/5] Validando funcionamento da Auditoria (tabela auditoria_alteracoes)...");
  const { data: auditLogs, error: auditError } = await supabase
    .from("auditoria_alteracoes")
    .select("*")
    .eq("registro_id", testId);

  if (auditError) {
    console.error("❌ Erro ao ler auditoria_alteracoes:", auditError.message);
  } else if (auditLogs && auditLogs.length > 0) {
    console.log(`✅ SUCESSO: Foram encontrados ${auditLogs.length} logs de auditoria.`);
    auditLogs.forEach((l) =>
      console.log(
        `   -> Ação: ${l.acao} | Tabela: ${l.tabela} | Em: ${new Date(l.data_acao).toLocaleString()}`,
      ),
    );
  } else {
    console.warn(
      "⚠️ FALHA: Nenhum log de auditoria foi encontrado. O gatilho 'trg_audit_...' pode não estar ativo.",
    );
  }

  console.log("\n🔄 [5/5] Validando Lixeira Automática (tabela trash_items)...");
  const { data: trashItems, error: trashError } = await supabase
    .from("trash_items")
    .select("*")
    .eq("registro_id", testId);

  if (trashError) {
    console.error("❌ Erro ao ler trash_items:", trashError.message);
  } else if (trashItems && trashItems.length > 0) {
    console.log("✅ SUCESSO: O registro foi interceptado e enviado para a lixeira corretamente.");
    const trash = trashItems[0];
    console.log(`   -> Tabela original: ${trash.tabela}`);
    console.log(`   -> Data de exclusão: ${new Date(trash.deleted_at).toLocaleString()}`);
    console.log(`   -> Data de expiração: ${new Date(trash.expires_at).toLocaleString()}`);
  } else {
    console.warn(
      "⚠️ FALHA: O registro não está na lixeira. O gatilho 'trash_before_delete' pode estar ausente.",
    );
  }

  console.log("\n🚀 Concluído. Testes de integridade finalizados.");
}

runTests().catch(console.error);
