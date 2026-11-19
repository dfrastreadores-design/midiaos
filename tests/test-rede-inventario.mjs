import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Carregar variáveis de ambiente
const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
}

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function testRedeInventarioLogic() {
  console.log("=== TESTE DE VALIDAÇÃO: REDE DE INVENTÁRIO ===");

  // 1. Obter tenant da NEXO
  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("id, nome_fantasia, razao_social")
    .ilike("nome_fantasia", "%Nexo%")
    .limit(1)
    .single();

  if (tErr || !tenant) {
    console.error("Tenant Nexo não encontrado:", tErr?.message);
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`[OK] Tenant Identificado: ${tenant.nome_fantasia} (${tenantId})`);

  // 2. Testar busca de parceiros
  const { data: parceiros, error: pErr } = await supabase
    .from("parceiros")
    .select("id, razao_social, nome_fantasia, cnpj, comissao_padrao_pct, ativo, contato_nome, contato_telefone, contato_email")
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

  if (pErr) {
    console.error("Erro ao listar parceiros:", pErr.message);
    process.exit(1);
  }
  console.log(`[OK] Parceiros cadastrados: ${parceiros?.length || 0}`);

  // 3. Testar busca de produtos
  const { data: produtos, error: prErr } = await supabase
    .from("produtos")
    .select("id, nome, midia, tipo, valor_unit, preco_tabela, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj, ativo, status")
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

  if (prErr) {
    console.error("Erro ao listar produtos:", prErr.message);
    process.exit(1);
  }
  console.log(`[OK] Produtos encontrados: ${produtos?.length || 0}`);

  // 4. Mapear contagens e consolidação
  const countPorParceiro = {};
  let produtosProprios = 0;
  for (const p of produtos || []) {
    const pId = p.parceiro_id || p.partner_id;
    if (pId) {
      countPorParceiro[pId] = (countPorParceiro[pId] || 0) + 1;
    } else {
      produtosProprios++;
    }
  }

  const origens = (parceiros || []).map((p) => ({
    id: p.id,
    nome_comercial: p.nome_fantasia || p.razao_social,
    tipo: "REPRESENTADO",
    comissao: Number(p.comissao_padrao_pct || 20),
    total_produtos: countPorParceiro[p.id] || 0,
    status: p.ativo ? "ativo" : "inativo",
  }));

  origens.push({
    id: "origem-propria-default",
    nome_comercial: "Inventário Próprio (Mídia Direta)",
    tipo: "PROPRIO",
    comissao: 0,
    total_produtos: produtosProprios,
    status: "ativo",
  });

  const totalOrigens = origens.length;
  const totalRepresentado = origens.filter((o) => o.tipo === "REPRESENTADO").length;
  const totalProprio = origens.filter((o) => o.tipo === "PROPRIO").length;
  const totalProdutos = origens.reduce((acc, curr) => acc + curr.total_produtos, 0);
  const mediaComissao = (
    origens.reduce((acc, curr) => acc + curr.comissao, 0) / (totalOrigens || 1)
  ).toFixed(1);

  console.log("\n=== MÉTRICAS DA REDE DE INVENTÁRIO (PÓS-CORREÇÃO) ===");
  console.log(`- Total Origens: ${totalOrigens}`);
  console.log(`- Veículos Representados: ${totalRepresentado}`);
  console.log(`- Inventário Próprio: ${totalProprio}`);
  console.log(`- Total Produtos Conectados: ${totalProdutos}`);
  console.log(`- Comissão Média: ${mediaComissao}%`);

  if (totalOrigens > 0 && totalRepresentado > 0 && totalProdutos > 0) {
    console.log("\n[SUCESSO] Validação de dados da rede de inventário concluída com êxito!");
  } else {
    console.error("\n[FALHA] Métricas continuam em zero.");
    process.exit(1);
  }
}

testRedeInventarioLogic().catch((err) => {
  console.error("Erro fatal no teste:", err);
  process.exit(1);
});
