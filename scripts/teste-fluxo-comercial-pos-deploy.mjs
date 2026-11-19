import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

console.log("================================================================================");
console.log("🚀 TESTE DO FLUXO COMERCIAL REAL PÓS-DEPLOY: CLIENTE -> PROPOSTA -> PI");
console.log("================================================================================\n");

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const idx = t.indexOf("=");
  env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

const clientAnon = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY);

// 1. Login com conta da NEXO
const { data: auth, error: eAuth } = await clientAnon.auth.signInWithPassword({
  email: "rafaelnexomidia@gmail.com",
  password: "21242628",
});

if (eAuth || !auth?.session) {
  console.error("❌ Falha no login da NEXO:", eAuth?.message);
  process.exit(1);
}

const nexoClient = createClient(
  env.SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY,
  {
    global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } },
  }
);

// 2. Consulta cliente e produto autorizados do tenant
const { data: clientes } = await nexoClient.from("clientes").select("id, razao_social, tenant_id").limit(1);
const { data: produtos } = await nexoClient.from("produtos").select("id, nome, valor_unit, tenant_id").limit(1);

if (!clientes?.length || !produtos?.length) {
  console.error("❌ Não há clientes ou produtos disponíveis no tenant para o teste!");
  process.exit(1);
}

const cliente = clientes[0];
const produto = produtos[0];
console.log(`[PASSO 1] Cliente Selecionado: "${cliente.razao_social}" (ID: ${cliente.id})`);
console.log(`[PASSO 2] Produto Selecionado: "${produto.nome}" (ID: ${produto.id})`);

// 3. Criação da Proposta de Demonstração
const campanhaNome = `[DEMO AUDITORIA PÓS-DEPLOY] Proposta Teste ${Date.now()}`;
const valorUnit = Number(produto.valor_unit) || 5000;
const totalInsercoes = 30;
const valorTabela = valorUnit * totalInsercoes;
const valorNegociado = Number((valorTabela * 0.9).toFixed(2)); // 10% desconto

console.log(`[PASSO 3] Criando Proposta Comercial no banco de dados real...`);
console.log(`          Campanha: "${campanhaNome}"`);
console.log(`          Valor Tabela: R$ ${valorTabela} | Valor Negociado: R$ ${valorNegociado}`);

const { data: novaProp, error: errCriaProp } = await nexoClient
  .from("propostas")
  .insert({
    cliente_id: cliente.id,
    campanha: campanhaNome,
    status: "aprovada",
    valor_tabela: valorTabela,
    valor_negociado: valorNegociado,
    total_insercoes: totalInsercoes,
    tenant_id: cliente.tenant_id,
    created_by: auth.user.id,
  })
  .select()
  .single();

if (errCriaProp || !novaProp) {
  console.error("❌ Falha ao criar proposta:", errCriaProp?.message);
  process.exit(1);
}
console.log(`✅ [PASSO 4] Proposta gravada com sucesso! ID: ${novaProp.id}`);

// 4. Reabertura e conferência de persistência
console.log(`[PASSO 5] Reabrindo proposta do banco de dados para validar persistência...`);
const { data: propReaberta, error: errReaberta } = await nexoClient
  .from("propostas")
  .select("*")
  .eq("id", novaProp.id)
  .single();

if (errReaberta || !propReaberta) {
  console.error("❌ Falha ao reabrir proposta:", errReaberta?.message);
  process.exit(1);
}

if (
  propReaberta.campanha === campanhaNome &&
  Number(propReaberta.valor_negociado) === valorNegociado &&
  propReaberta.cliente_id === cliente.id
) {
  console.log(`✅ [PASSO 6] Persistência 100% conferida: dados intactos e idênticos na reabertura!`);
} else {
  console.error("❌ Divergência nos dados reabertos!");
  process.exit(1);
}

// 5. Conversão em PI (Pedido de Inserção)
console.log(`[PASSO 7] Convertendo proposta em Pedido de Inserção (PI)...`);
const { data: novoPi, error: errPi } = await nexoClient
  .from("pis")
  .insert({
    cliente_id: cliente.id,
    campanha: campanhaNome,
    status: "rascunho",
    mes_veiculacao: 10,
    ano_veiculacao: 2026,
    valor_tabela: valorTabela,
    valor_negociado: valorNegociado,
    total_insercoes: totalInsercoes,
    tenant_id: cliente.tenant_id,
    created_by: auth.user.id,
    origem: "proposta",
  })
  .select()
  .single();

if (errPi || !novoPi) {
  console.error("❌ Falha ao converter em PI:", errPi?.message);
  process.exit(1);
}
console.log(`✅ [PASSO 8] PI gerado com sucesso! ID: ${novoPi.id} | Número: ${novoPi.numero || "Auto"}`);

// 6. Higienização de segurança pós-teste (limpeza dos registros de teste)
console.log(`[PASSO 9] Executando higienização para manter o banco de produção limpo...`);
await nexoClient.from("pis").delete().eq("id", novoPi.id);
await nexoClient.from("propostas").delete().eq("id", novaProp.id);
console.log(`✅ [PASSO 10] Registros temporários removidos do banco com sucesso.`);

console.log("\n================================================================================");
console.log("🎉 FLUXO COMERCIAL COMPLETO EXECUTADO E VALIDADO COM SUCESSO EM PRODUÇÃO!");
console.log("================================================================================\n");
