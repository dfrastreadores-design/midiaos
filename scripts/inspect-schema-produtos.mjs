import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const idx = t.indexOf("=");
  env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: prods } = await supabase
    .from("produtos")
    .select("id, nome, midia, tipo, cidade, uf, localizacao, endereco_ponto, latitude, longitude, parceiro_nome, valor_unit, fotos")
    .eq("ativo", true);
  console.log("Total produtos ativos:", prods?.length);

  const pracasMap = new Map();
  for (const p of prods || []) {
    // Normalização da praça
    let praca = p.cidade ? `${p.cidade}${p.uf ? " - " + p.uf : ""}` : null;
    if (!praca && (p.localizacao || p.endereco_ponto)) {
      const loc = p.localizacao || p.endereco_ponto;
      if (/bras[ií]lia|df/i.test(loc)) praca = "Brasília - DF";
      else if (/s[aã]o paulo|sp/i.test(loc)) praca = "São Paulo - SP";
      else if (/rio de janeiro|rj/i.test(loc)) praca = "Rio de Janeiro - RJ";
      else praca = loc.split(/[,;\-]/)[0]?.trim() || "Outras Praças";
    }
    if (!praca) praca = "Nacional / Geral";

    if (!pracasMap.has(praca)) {
      pracasMap.set(praca, { total: 0, midias: new Set(), exemplos: [] });
    }
    const item = pracasMap.get(praca);
    item.total++;
    if (p.midia) item.midias.add(p.midia);
    if (item.exemplos.length < 2) item.exemplos.push(p.nome);
  }

  console.log("PRAÇAS ENCONTRADAS:");
  for (const [nome, info] of pracasMap.entries()) {
    console.log(`- ${nome}: ${info.total} produtos | Mídias: ${Array.from(info.midias).join(", ")}`);
  }
}
run();
