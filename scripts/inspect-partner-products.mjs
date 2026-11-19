import { supabase } from "./db.mjs";

async function inspectPartnerProducts() {
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, parceiro_nome, midia, tipo, formato, cidade, uf, localizacao, preco_tabela, valor_unit, quantidade_telas, tempo_exibicao_segundos, fotos")
    .not("parceiro_nome", "is", null);

  const byParc = {};
  for (const p of produtos || []) {
    if (!byParc[p.parceiro_nome]) byParc[p.parceiro_nome] = [];
    byParc[p.parceiro_nome].push(p);
  }

  for (const [parc, prods] of Object.entries(byParc)) {
    console.log(`\n=== ${parc} (${prods.length} produtos) ===`);
    prods.slice(0, 3).forEach(p => {
      console.log(`- [${p.id}] ${p.nome} | ${p.midia} / ${p.formato} | ${p.cidade}-${p.uf} | R$ ${p.preco_tabela || p.valor_unit} | Fotos: ${p.fotos?.length || 0}`);
    });
  }
}

inspectPartnerProducts().catch(console.error);
