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

async function testSyncFunction() {
  console.log("=== TESTANDO SINCRONIZAÇÃO DE PARCEIROS COM REDE ===");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, nome_fantasia")
    .ilike("nome_fantasia", "%Nexo%")
    .single();

  const tenantId = tenant.id;

  // 1. Obter parceiros
  const { data: parceiros, error: errP } = await supabase
    .from("parceiros")
    .select("*")
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

  if (errP) throw errP;

  // 2. Obter produtos
  const { data: produtos, error: errPr } = await supabase
    .from("produtos")
    .select("id, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj")
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`);

  if (errPr) throw errPr;

  const parceiroById = new Map();
  const parceiroByCnpj = new Map();
  const parceiroByNome = new Map();

  for (const p of parceiros || []) {
    if (p.id) parceiroById.set(p.id, p);
    if (p.cnpj) {
      const clean = p.cnpj.replace(/\D/g, "");
      if (clean) parceiroByCnpj.set(clean, p);
    }
    if (p.nome_fantasia) parceiroByNome.set(p.nome_fantasia.toLowerCase().trim(), p);
    if (p.razao_social) parceiroByNome.set(p.razao_social.toLowerCase().trim(), p);
  }

  let produtosVinculados = 0;
  for (const prod of produtos || []) {
    let match = null;
    if (prod.parceiro_id && parceiroById.has(prod.parceiro_id)) {
      match = parceiroById.get(prod.parceiro_id);
    } else if (prod.partner_id && parceiroById.has(prod.partner_id)) {
      match = parceiroById.get(prod.partner_id);
    } else if (prod.parceiro_cnpj) {
      const clean = prod.parceiro_cnpj.replace(/\D/g, "");
      if (clean && parceiroByCnpj.has(clean)) {
        match = parceiroByCnpj.get(clean);
      }
    } else if (prod.parceiro_nome) {
      const nomeNorm = prod.parceiro_nome.toLowerCase().trim();
      if (parceiroByNome.has(nomeNorm)) {
        match = parceiroByNome.get(nomeNorm);
      }
    }

    if (match) {
      produtosVinculados++;
    }
  }

  console.log(`[OK] Parceiros sincronizados: ${parceiros.length}`);
  console.log(`[OK] Produtos vinculados aos parceiros: ${produtosVinculados}`);
  console.log("Resultado da mutação simulada:", {
    success: true,
    parceirosSincronizados: parceiros.length,
    produtosVinculados,
  });
}

testSyncFunction().catch(console.error);
