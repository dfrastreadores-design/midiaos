import { supabase } from "./db.mjs";

async function checkFotos() {
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, parceiro_nome, midia, tipo, preco_tabela, fotos, cidade, uf, formato");

  const byParceiro = {};
  for (const p of produtos || []) {
    const parc = p.parceiro_nome || "Inventário Próprio";
    if (!byParceiro[parc]) byParceiro[parc] = { total: 0, comFotos: 0, semFotos: 0, sampleFoto: null };
    byParceiro[parc].total++;
    const hasFotos = Array.isArray(p.fotos) && p.fotos.length > 0;
    if (hasFotos) {
      byParceiro[parc].comFotos++;
      if (!byParceiro[parc].sampleFoto) byParceiro[parc].sampleFoto = p.fotos[0];
    } else {
      byParceiro[parc].semFotos++;
    }
  }

  console.log("=== FOTOS POR PARCEIRO ===");
  for (const [parc, stat] of Object.entries(byParceiro)) {
    console.log(`${parc}: ${stat.comFotos}/${stat.total} com fotos (Exemplo: ${stat.sampleFoto || "nenhuma"})`);
  }
}

checkFotos().catch(console.error);
