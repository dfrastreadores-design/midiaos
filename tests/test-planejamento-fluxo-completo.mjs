import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import assert from "node:assert";

// Carregar variáveis de ambiente
const envContent = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const idx = t.indexOf("=");
  env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Importar motor comercial
const {
  calcularNegociacaoComercial,
  arredondarMoeda,
} = await import("../src/lib/motor-comercial.ts");

console.log("================================================================================");
console.log("TESTE DE HOMOLOGAÇÃO INTEGRADA: PLANEJAMENTO, PROPOSTAS E MOTOR COMERCIAL");
console.log("================================================================================\n");

async function main() {
  const tenantId = "02a5892c-1e6f-4452-89b0-3c4e8f3d3132"; // NEXO
  const userId = "e6d8c416-b50c-4c07-84be-079318ed343d";   // Rafael Admin NEXO

  // 1. Identificar os 3 produtos reais do catálogo
  const p1Id = "be2caad2-0b24-4553-a03e-79f47f89c85e"; // R$ 18.000
  const p2Id = "72316028-2bb7-4238-8aff-919c95e9acd5"; // R$ 12.000
  const p3Id = "93d36c5e-d5a8-4b32-ae08-3a44a493eef3"; // R$ 8.500

  const { data: produtosDb } = await supabaseAdmin
    .from("produtos")
    .select("id, nome, valor_unit")
    .in("id", [p1Id, p2Id, p3Id]);

  console.log("1. Validação dos Produtos Reais do Catálogo:");
  assert.strictEqual(produtosDb.length, 3, "Os 3 produtos do catálogo devem existir no banco");
  produtosDb.forEach((p) => console.log(`   - [OK] ${p.nome} (ID: ${p.id}) -> R$ ${p.valor_unit}`));

  // 2. Validação Matemática das 3 Modalidades de Desconto com Motor Comercial
  console.log("\n2. Validação do Motor Comercial (3 Modalidades):");
  const itensBase = [
    { id: p1Id, nome: "Ponto 1", quantidade: 1, valor_unit_tabela: 18000, comissao_pct: 20 },
    { id: p2Id, nome: "Ponto 2", quantidade: 1, valor_unit_tabela: 12000, comissao_pct: 20 },
    { id: p3Id, nome: "Ponto 3", quantidade: 1, valor_unit_tabela: 8500, comissao_pct: 20 },
  ];

  // Modalidade A: Desconto individual (10%, 5%, 0%)
  const resModA = calcularNegociacaoComercial({
    itens: [
      { ...itensBase[0], desconto_pct: 10 },
      { ...itensBase[1], desconto_pct: 5 },
      { ...itensBase[2], desconto_pct: 0 },
    ],
    modalidade: "item",
  });
  assert.strictEqual(resModA.valor_tabela_total, 38500, "Bruto Modalidade A");
  assert.strictEqual(resModA.valor_desconto_total, 2400, "Desconto Modalidade A");
  assert.strictEqual(resModA.valor_negociado_total, 36100, "Líquido Modalidade A");
  console.log("   - [OK] Modalidade A (Individual): Bruto R$ 38.500,00 -> Desconto R$ 2.400,00 -> Líquido R$ 36.100,00");

  // Modalidade B: Desconto geral (10%)
  const resModB = calcularNegociacaoComercial({
    itens: itensBase,
    modalidade: "geral",
    descontoGeralPct: 10,
  });
  assert.strictEqual(resModB.valor_tabela_total, 38500, "Bruto Modalidade B");
  assert.strictEqual(resModB.valor_desconto_total, 3850, "Desconto Modalidade B");
  assert.strictEqual(resModB.valor_negociado_total, 34650, "Líquido Modalidade B");
  console.log("   - [OK] Modalidade B (Geral 10%): Bruto R$ 38.500,00 -> Desconto R$ 3.850,00 -> Líquido R$ 34.650,00");

  // Modalidade C: Valor final negociado R$ 32.000,00
  const resModC = calcularNegociacaoComercial({
    itens: itensBase,
    modalidade: "total",
    valorFinalAlvo: 32000,
  });
  assert.strictEqual(resModC.valor_tabela_total, 38500, "Bruto Modalidade C");
  assert.strictEqual(resModC.valor_desconto_total, 6500, "Desconto Modalidade C");
  assert.strictEqual(resModC.valor_negociado_total, 32000, "Líquido Modalidade C");
  const somaItensC = resModC.itens.reduce((acc, it) => acc + it.valor_total_negociado, 0);
  assert.strictEqual(arredondarMoeda(somaItensC), 32000, "Soma dos itens negociados deve bater 100% com o alvo");
  console.log("   - [OK] Modalidade C (Alvo R$ 32.000): Bruto R$ 38.500,00 -> Desconto R$ 6.500,00 (-16,88%) -> Líquido R$ 32.000,00 exato");

  // 3. Persistência e Reabertura do Planejamento
  console.log("\n3. Persistência no Banco e Reabertura do Planejamento:");
  const testCampanhaId = "00000000-0000-4000-b000-000000000099";

  const pontosCalculados = resModC.itens.map((it, idx) => ({
    produto_id: it.id,
    pilar_estrategico: "visibilidade",
    quantidade_insercoes: it.quantidade,
    valor_tabela_unit: it.valor_unit_tabela,
    valor_tabela: it.valor_tabela,
    desconto_pct: it.desconto_pct,
    desconto_valor: it.desconto_valor,
    valor_negociado: it.valor_unit_negociado,
    comissao_pct: it.comissao_pct,
    comissao_valor: it.comissao_valor,
    repasse_parceiro_valor: it.repasse_valor,
    impactos_estimados: 150000,
  }));

  const metaCampanha = {
    _planejamento_estrategico: true,
    cliente_nome: "Cliente Homologação P0",
    nome_campanha: "Campanha Estratégica 360 Nexo",
    objetivo: "Cobertura Metropolitana de Alto Impacto",
    publico_alvo: "Consumidores A/B",
    regiao: "Brasília / DF",
    periodo_inicio: "2026-11-01",
    periodo_fim: "2026-11-30",
    investimento_previsto: 40000,
    estrategia: "Combinação de Frontlights e Painéis Rodoviários",
    modalidade_desconto: "total",
    valor_final_alvo: 32000,
    valor_tabela_total: resModC.valor_tabela_total,
    valor_desconto_total: resModC.valor_desconto_total,
    valor_negociado_total: resModC.valor_negociado_total,
    comissao_total: resModC.comissao_total,
    repasse_total: resModC.repasse_total,
    pontos_midia: pontosCalculados,
  };

  // Salvar no banco
  const { data: savedBriefing, error: saveErr } = await supabaseAdmin
    .from("briefings")
    .upsert({
      id: testCampanhaId,
      tenant_id: tenantId,
      created_by: userId,
      tipo_entidade: "cliente",
      razao_social: metaCampanha.cliente_nome,
      nome_fantasia: metaCampanha.cliente_nome,
      campanha: metaCampanha.nome_campanha,
      objetivo: metaCampanha.objetivo,
      periodo_estimado: "2026-11-01 a 2026-11-30",
      verba_estimada: 32000,
      status: "planejamento",
      produtos: pontosCalculados.map((p) => p.produto_id),
      detalhes_adicionais: JSON.stringify(metaCampanha),
      updated_at: new Date().toISOString(),
    })
    .select();

  assert(!saveErr, `Erro ao persistir campanha: ${saveErr?.message}`);
  console.log("   - [OK] Campanha de planejamento salva com sucesso (ID:", testCampanhaId, ")");

  // Reabrir do banco
  const { data: reopened, error: reopenErr } = await supabaseAdmin
    .from("briefings")
    .select("*")
    .eq("id", testCampanhaId)
    .single();

  assert(!reopenErr && reopened, "Campanha deve ser reaberta do banco com sucesso");
  const parsedMeta = JSON.parse(reopened.detalhes_adicionais);
  assert.strictEqual(parsedMeta.pontos_midia.length, 3, "Os 3 pontos devem ser recuperados");
  assert.strictEqual(parsedMeta.valor_tabela_total, 38500, "Valor bruto de tabela deve ser preservado");
  assert.strictEqual(parsedMeta.valor_negociado_total, 32000, "Valor líquido negociado deve ser preservado");
  console.log("   - [OK] Planejamento reaberto com integridade: 3 pontos, Bruto R$ 38.500,00 e Líquido R$ 32.000,00");

  // 4. Geração da Proposta Comercial Oficial a partir do Planejamento
  console.log("\n4. Geração de Proposta Comercial Oficial a partir do Planejamento:");

  const clientAnon = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY);
  const { data: auth, error: eAuth } = await clientAnon.auth.signInWithPassword({
    email: "rafaelnexomidia@gmail.com",
    password: "21242628",
  });
  assert(!eAuth && auth?.session, "Login com rafaelnexomidia@gmail.com deve funcionar");

  const nexoClient = createClient(
    env.SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } },
    }
  );

  const itensPropostaInsert = pontosCalculados.map((p, idx) => ({
    tipo: "OOH",
    programa: `Ponto ${idx + 1}`,
    formato: "Painel Frontlight",
    mes: 11,
    ano: 2026,
    insercoes_dia: p.quantidade_insercoes,
    dias_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
    dias_mes: [1, 2, 3, 4, 5],
    desconto: p.desconto_pct,
    valor_unit: p.valor_tabela_unit,
    valor_tabela: p.valor_tabela,
    valor_negociado: p.valor_negociado,
    total_insercoes: p.quantidade_insercoes,
    dias_veiculacao: 30,
    produto_id: p.produto_id,
    comissao_pct: p.comissao_pct,
    comissao_valor: p.comissao_valor,
    repasse_valor: p.repasse_parceiro_valor,
  }));

  const { data: propCreated, error: propErr } = await nexoClient
    .from("propostas")
    .insert({
      campanha: metaCampanha.nome_campanha,
      cliente_avulso: metaCampanha.cliente_nome,
      status: "rascunho",
      valor_tabela: resModC.valor_tabela_total,
      valor_desconto: resModC.valor_desconto_total,
      valor_negociado: resModC.valor_negociado_total,
      total_insercoes: 3,
      comissao_pct: 20,
      tenant_id: tenantId,
      created_by: userId,
      executivo_id: userId,
      validade: "2026-11-15",
    })
    .select("id, numero")
    .single();

  assert(!propErr && propCreated, `Erro ao criar proposta: ${propErr?.message}`);
  const propostaId = propCreated.id;
  console.log(`   - [OK] Proposta criada com sucesso! ID: ${propostaId}, Número: ${propCreated.numero}`);

  const itensComId = itensPropostaInsert.map((it) => ({
    ...it,
    proposta_id: propostaId,
  }));

  const { error: itErr } = await supabaseAdmin
    .from("proposta_itens")
    .insert(itensComId);

  assert(!itErr, `Erro ao inserir itens da proposta: ${itErr?.message}`);
  console.log("   - [OK] Itens da proposta inseridos com valores brutos, descontos, comissões e repasses consistentes.");

  // Conferir integridade da proposta gerada no banco
  const { data: propSalva } = await supabaseAdmin
    .from("propostas")
    .select("*")
    .eq("id", propostaId)
    .single();

  assert.strictEqual(Number(propSalva.valor_tabela), 38500, "Proposta valor_tabela deve ser 38500");
  assert.strictEqual(Number(propSalva.valor_desconto), 6500, "Proposta valor_desconto deve ser 6500");
  assert.strictEqual(Number(propSalva.valor_negociado), 32000, "Proposta valor_negociado deve ser 32000");

  const { data: itensSalvos } = await supabaseAdmin
    .from("proposta_itens")
    .select("*")
    .eq("proposta_id", propostaId);

  assert.strictEqual(itensSalvos.length, 3, "Devem existir 3 itens na proposta");
  const somaItensSalvos = itensSalvos.reduce((acc, it) => acc + Number(it.valor_negociado), 0);
  assert.strictEqual(arredondarMoeda(somaItensSalvos), 32000, "Soma dos itens na proposta deve ser exatamente R$ 32.000,00");
  console.log("   - [OK] Integridade confirmada no banco: soma(proposta_itens.valor_negociado) === R$ 32.000,00");

  // 5. Cleanup dos registros de teste
  await supabaseAdmin.from("proposta_itens").delete().eq("proposta_id", propostaId);
  await supabaseAdmin.from("propostas").delete().eq("id", propostaId);
  await supabaseAdmin.from("briefings").delete().eq("id", testCampanhaId);
  console.log("\n5. Limpeza de registros de teste concluída com sucesso.");

  console.log("\n================================================================================");
  console.log(">>> TODOS OS TESTES FORAM APROVADOS COM SUCESSO (100% PASS)! <<<");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
