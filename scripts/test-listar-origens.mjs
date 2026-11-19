import { supabase, NEXO_TENANT_ID } from "./db.mjs";

async function testListar() {
  console.log("=== SIMULATING LISTAR ORIGENS INVENTARIO ===");

  const { data: parceirosDb } = await supabase
    .from("parceiros")
    .select("*")
    .or(`tenant_id.eq.${NEXO_TENANT_ID},tenant_id.is.null`)
    .order("razao_social", { ascending: true });

  const { data: todosProdutos } = await supabase
    .from("produtos")
    .select("id, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj, valor_unit, preco_tabela, ativo, status")
    .or(`tenant_id.eq.${NEXO_TENANT_ID},tenant_id.is.null`);

  const cleanDigits = (v) => String(v || "").replace(/\D/g, "");
  const normText = (v) => String(v || "").toLowerCase().trim();

  let totalProprios = 0;
  for (const p of todosProdutos || []) {
    const isParceiro = Boolean(p.parceiro_id || p.partner_id || p.parceiro_cnpj || p.parceiro_nome);
    if (!isParceiro) totalProprios++;
  }

  const calcularProdutosDoParceiro = (parcId, cnpj, nomeFantasia, razaoSocial) => {
    const idAlvo = parcId;
    const cnpjAlvo = cleanDigits(cnpj);
    const nomeFantasiaAlvo = normText(nomeFantasia);
    const razaoSocialAlvo = normText(razaoSocial);

    return (todosProdutos || []).filter((p) => {
      if (p.parceiro_id === idAlvo || p.partner_id === idAlvo) return true;
      if (cnpjAlvo && p.parceiro_cnpj && cleanDigits(p.parceiro_cnpj) === cnpjAlvo) return true;
      if (p.parceiro_nome) {
        const prodNome = normText(p.parceiro_nome);
        if (nomeFantasiaAlvo && prodNome === nomeFantasiaAlvo) return true;
        if (razaoSocialAlvo && prodNome === razaoSocialAlvo) return true;
        if (nomeFantasiaAlvo && (prodNome.includes(nomeFantasiaAlvo) || nomeFantasiaAlvo.includes(prodNome))) return true;
      }
      return false;
    }).length;
  };

  console.log(`Total parceiros found: ${parceirosDb?.length}`);
  console.log(`Total produtos found: ${todosProdutos?.length}`);
  console.log(`Total produtos próprios: ${totalProprios}`);

  let zeroCountPartners = 0;
  for (const p of parceirosDb || []) {
    const count = calcularProdutosDoParceiro(p.id, p.cnpj, p.nome_fantasia, p.razao_social);
    const mark = count === 0 ? "⚠️ ZERO" : "✅ OK";
    console.log(`- ${p.nome_fantasia || p.razao_social}: ${count} produtos ${mark}`);
    if (count === 0) zeroCountPartners++;
  }

  if (zeroCountPartners === 0) {
    console.log("\nSUCCESS: ALL PARTNERS HAVE PRODUCTS > 0! NO ZEROED COUNTERS!");
  } else {
    console.warn(`\nWARNING: ${zeroCountPartners} partners have 0 products.`);
  }
}

testListar().catch(console.error);
