import { supabase } from "./db.mjs";

async function auditFotos() {
  const { data: produtos } = await supabase.from("produtos").select("id, nome, parceiro_nome, fotos");
  
  const artificialPaths = [
    "cerradus_elevador_dooh.jpg",
    "cerradus_gastrobar_dooh.jpg",
    "eagle_painel_led_eptg.jpg",
    "megavi_frontlight_ooh.jpg",
    "wmidia_frontlight_clubes.jpg"
  ];

  let totalComFotos = 0;
  let totalComFotosArtificiais = 0;
  let totalComFotosReais = 0;
  const listaArtificiais = [];
  const listaReais = [];

  for (const p of produtos || []) {
    if (Array.isArray(p.fotos) && p.fotos.length > 0) {
      totalComFotos++;
      const hasArtificial = p.fotos.some(f => artificialPaths.some(art => f.includes(art)));
      if (hasArtificial) {
        totalComFotosArtificiais++;
        listaArtificiais.push({ id: p.id, nome: p.nome, parceiro: p.parceiro_nome, fotos: p.fotos });
      } else {
        totalComFotosReais++;
        listaReais.push({ id: p.id, nome: p.nome, parceiro: p.parceiro_nome, fotos: p.fotos });
      }
    }
  }

  console.log(`Total produtos analisados: ${produtos?.length}`);
  console.log(`Total com fotos: ${totalComFotos}`);
  console.log(`Total com fotos artificiais (a remover): ${totalComFotosArtificiais}`);
  console.log(`Total com fotos reais comprovadas: ${totalComFotosReais}`);
  console.log("\nExemplos reais comprovados:");
  listaReais.forEach(r => console.log(`- [${r.parceiro}] ${r.nome}: ${r.fotos.join(", ")}`));
}

auditFotos().catch(console.error);
