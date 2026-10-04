import fs from "node:fs";

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...v] = trimmed.split("=");
    const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (k.trim() === "SUPABASE_URL" && !supabaseUrl) supabaseUrl = val;
    if (k.trim() === "SUPABASE_PUBLISHABLE_KEY" && !supabaseKey) supabaseKey = val;
    if (k.trim() === "VITE_SUPABASE_URL" && !supabaseUrl) supabaseUrl = val;
    if (k.trim() === "VITE_SUPABASE_PUBLISHABLE_KEY" && !supabaseKey) supabaseKey = val;
  }
}

async function main() {
  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "rafaelnexomidia@gmail.com", password: "21242628" }),
  });
  const auth = await authRes.json();
  const token = auth.access_token;
  const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${auth.user.id}&select=tenant_id`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
  });
  const [{ tenant_id }] = await pRes.json();

  const prodsRes = await fetch(
    `${supabaseUrl}/rest/v1/produtos?tenant_id=eq.${tenant_id}&nome=ilike.*TV Cars*&select=id,nome,valor_unit,quantidade_telas,insercoes_padrao,fotos`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } },
  );
  const prods = await prodsRes.json();
  console.log(`\n🎉 PRODUTOS TV CARS ATIVOS NO SISTEMA (${prods.length}):`);
  prods.forEach((p) => {
    console.log(
      ` • ${p.nome}\n   -> ${p.quantidade_telas} telas | R$ ${p.valor_unit.toLocaleString("pt-BR")}/mês | ${p.insercoes_padrao.toLocaleString("pt-BR")} inserções/mês | Fotos: ${p.fotos?.length || 0}`,
    );
  });

  const parcRes = await fetch(
    `${supabaseUrl}/rest/v1/parceiros?tenant_id=eq.${tenant_id}&nome_fantasia=ilike.*TV CARS*&select=id,nome_fantasia,contato_nome,contato_telefone,contato_email,comissao_padrao_pct`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } },
  );
  const parcs = await parcRes.json();
  console.log(`\n🏢 PARCEIRO CADASTRADO:`);
  parcs.forEach((p) => {
    console.log(
      ` • ${p.nome_fantasia} (ID: ${p.id})\n   -> Contato: ${p.contato_nome} (${p.contato_telefone} | ${p.contato_email})\n   -> Comissão Padrão: ${p.comissao_padrao_pct}%`,
    );
  });
}

main().catch(console.error);
