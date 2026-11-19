import fs from "fs";
import path from "path";
import { supabase } from "./db.mjs";

async function purge() {
  console.log("=== REMOVENDO FOTOS ARTIFICIAIS DO BANCO DE DADOS ===");

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, parceiro_nome, fotos");

  let removedCount = 0;

  for (const p of produtos || []) {
    const isTvCars = (p.parceiro_nome || "").toLowerCase().includes("tv cars");
    // Only TV Cars has authentic photos extracted from its official media kit
    if (!isTvCars && Array.isArray(p.fotos) && p.fotos.length > 0) {
      const { error } = await supabase
        .from("produtos")
        .update({ fotos: [] })
        .eq("id", p.id);
      if (!error) {
        removedCount++;
      } else {
        console.error(`Erro ao limpar fotos do produto ${p.id}:`, error.message);
      }
    }
  }

  console.log(`✅ Removidas associações de fotos artificiais de ${removedCount} produtos.`);

  console.log("\n=== EXCLUINDO ARQUIVOS ARTIFICIAIS DO DISCO ===");
  const filesToDelete = [
    "public/images/parceiros/cerradus/cerradus_elevador_dooh.jpg",
    "public/images/parceiros/cerradus/cerradus_gastrobar_dooh.jpg",
    "public/images/parceiros/eagle/eagle_painel_led_eptg.jpg",
    "public/images/parceiros/megavi/megavi_frontlight_ooh.jpg",
    "public/images/parceiros/wmidia/wmidia_frontlight_clubes.jpg",
  ];

  for (const file of filesToDelete) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Excluído arquivo sintético: ${file}`);
    }
    const dir = path.dirname(file);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
      console.log(`Removido diretório vazio: ${dir}`);
    }
  }

  // Verificar estado final
  const { data: remaining } = await supabase
    .from("produtos")
    .select("id, nome, parceiro_nome, fotos");

  let comFotos = 0;
  let semFotos = 0;
  for (const p of remaining || []) {
    if (Array.isArray(p.fotos) && p.fotos.length > 0) {
      comFotos++;
    } else {
      semFotos++;
    }
  }

  console.log(`\nEstado final do catálogo:`);
  console.log(`- Produtos com fotos reais comprovadas: ${comFotos}`);
  console.log(`- Produtos com 'Foto real não cadastrada' (pendentes de foto real): ${semFotos}`);
}

purge().catch(console.error);
