import fs from "node:fs";
import path from "node:path";
import * as xlsxModule from "xlsx";
const xlsx: any = (xlsxModule as any).default || xlsxModule;

// ==============================================================================
// SCRIPT: import-midia-kit.ts
// OBJETIVO: Importação e sincronização idempotente de Parceiros/Exibidoras e
//           Inventário OOH/DOOH vinculado ao Tenant CNPJ: 68.279.031/0001-67.
// ==============================================================================

const TARGET_CNPJ = "68.279.031/0001-67";
const NORMALIZED_CNPJ = "68279031000167";

// Carregar variáveis de ambiente
let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://tvniawyweymutjiybxyo.supabase.co";
let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ";

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

// Utilitários de parsing
function cleanNumber(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "-") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val)
    .replace(/R\$\s*/gi, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/°/g, "")
    .trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

function parseCoordinate(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "-") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val).replace(/°/g, "").replace(/\s+/g, "").trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

function normalizeStr(str: any): string {
  if (!str) return "";
  return String(str).trim();
}

// 7 Parceiros a serem mapeados e criados/atualizados
interface PartnerDef {
  key: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string | null;
  site?: string | null;
  instagram?: string | null;
  contato_nome?: string | null;
  contato_telefone?: string | null;
  contato_email?: string | null;
  endereco?: string | null;
  segmentos: string[];
  comissao_padrao_pct: number;
}

const PARTNER_DEFS: PartnerDef[] = [
  {
    key: "megavi",
    razao_social: "Megavi Mídia e Eventos Ltda",
    nome_fantasia: "Megavi Mídia",
    cnpj: "58.174.097/0001-39",
    site: "www.megavimidia.com.br",
    segmentos: ["Mídia Exterior OOH", "Frontlight", "Painel de LED"],
    comissao_padrao_pct: 20.0,
  },
  {
    key: "art",
    razao_social: "ART Painel Ltda",
    nome_fantasia: "ART Mídia",
    cnpj: "47.532.076/0001-21",
    segmentos: ["Mídia Exterior OOH", "Frontlight", "Outdoor"],
    comissao_padrao_pct: 20.0,
  },
  {
    key: "wmidia",
    razao_social: "UP Comércio de Produtos Médico Hospitalar Ltda",
    nome_fantasia: "WMídias",
    cnpj: "18.775.756/0001-78",
    segmentos: ["Mídia Exterior OOH", "Frontlight"],
    comissao_padrao_pct: 20.0,
  },
  {
    key: "dled",
    razao_social: "DLED Digital Led Painéis Ltda",
    nome_fantasia: "DLED Digital Led",
    cnpj: null,
    contato_nome: "DLED Comercial",
    contato_telefone: "(61) 99565-4410",
    site: "www.dledpaineis.com.br",
    instagram: "@dledpaineis",
    segmentos: ["Painel de LED", "Mídia Exterior OOH", "DOOH"],
    comissao_padrao_pct: 20.0,
  },
  {
    key: "cerradomix",
    razao_social: "Cerrado Mix Comunicação Ltda",
    nome_fantasia: "Cerrado Mix",
    cnpj: null,
    contato_nome: "Robson Almeida",
    contato_telefone: "(61) 99802-8532",
    segmentos: ["Frontlight", "Totem", "Mídia Exterior OOH"],
    comissao_padrao_pct: 20.0,
  },
  {
    key: "eagle",
    razao_social: "Eagle Publicity Publicidade e Propaganda Ltda",
    nome_fantasia: "Eagle Publicity",
    cnpj: null,
    contato_nome: "Mariana Vilar",
    contato_telefone: "(61) 99800-4300",
    contato_email: "contato@eaglepublicity.com.br",
    segmentos: ["Mídia Exterior OOH", "Frontlight", "Painel de LED"],
    comissao_padrao_pct: 20.0,
  },
  {
    key: "cerradus",
    razao_social: "CERRADUS MIDIA E COMUNICACAO LTDA",
    nome_fantasia: "Cerradus DOOH",
    cnpj: "60.750.768/0001-04",
    endereco: "DF Plaza Shopping, Torre A Sala 710 / Brasília-DF",
    contato_telefone: "(61) 98186-3533",
    segmentos: ["DOOH Condomínios", "DOOH Gastronomia", "DOOH"],
    comissao_padrao_pct: 20.0,
  },
];

async function main() {
  console.log("================================================================================");
  console.log("🚀 MIGRAÇÃO & IMPORTAÇÃO DE MÍDIA KIT OOH / DOOH PARA O TENANT");
  console.log(`📌 CNPJ Alvo: ${TARGET_CNPJ}`);
  console.log(`📡 Supabase Endpoint: ${supabaseUrl}`);
  console.log("================================================================================\n");

  const restUrl = `${supabaseUrl}/rest/v1`;
  const authUrl = `${supabaseUrl}/auth/v1`;

  // 1. Autenticação Operacional (Master ou Admin do Inquilino)
  console.log("🔑 [1/5] Realizando autenticação de segurança...");
  let token = "";
  
  // Tentar primeiro rafaelnexomidia@gmail.com (inquilino direto)
  let authRes = await fetch(`${authUrl}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "rafaelnexomidia@gmail.com", password: "21242628" }),
  });
  let authData = await authRes.json();

  if (!authRes.ok || !authData.access_token) {
    console.log("   Autenticando via usuário Master de contingência...");
    authRes = await fetch(`${authUrl}/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rafaelrodrigo.as@gmail.com", password: "21242628" }),
    });
    authData = await authRes.json();
  }

  if (!authRes.ok || !authData.access_token) {
    throw new Error(`Falha crítica na autenticação com Supabase: ${JSON.stringify(authData)}`);
  }

  token = authData.access_token;
  console.log(`✅ Autenticado com sucesso como ${authData.user.email} (UID: ${authData.user.id})`);

  const authHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 2. Resolução do Tenant_id pelo CNPJ 68.279.031/0001-67
  console.log("\n🏢 [2/5] Localizando Tenant pelo CNPJ...");
  const tenantsRes = await fetch(`${restUrl}/tenants?select=*`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
  });
  const tenants = await tenantsRes.json();

  let targetTenant = Array.isArray(tenants)
    ? tenants.find(
        (t: any) =>
          t.cnpj === TARGET_CNPJ ||
          (t.cnpj && t.cnpj.replace(/\D/g, "") === NORMALIZED_CNPJ) ||
          t.razao_social?.toLowerCase().includes("nexo")
      )
    : null;

  if (!targetTenant) {
    console.log(`   Tenant com CNPJ ${TARGET_CNPJ} não encontrado. Criando novo tenant...`);
    const newTenantPayload = {
      razao_social: "Nexo Representação e Mídia LTDA",
      nome_fantasia: "Nexo Mídia",
      cnpj: TARGET_CNPJ,
      status: "ativo",
      comissao_padrao_pct: 20.0,
      limite_produtos: 2000,
      limite_parceiros: 200,
    };
    const createTenantRes = await fetch(`${restUrl}/tenants`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(newTenantPayload),
    });
    const createdTenantData = await createTenantRes.json();
    targetTenant = createdTenantData[0];
  }

  const tenantId = targetTenant.id;
  console.log(`✅ Tenant Vinculado:`);
  console.log(`   - ID: ${tenantId}`);
  console.log(`   - Razão Social: ${targetTenant.razao_social}`);
  console.log(`   - CNPJ: ${targetTenant.cnpj || TARGET_CNPJ}`);

  // 3. Cadastrar / Atualizar os 7 Parceiros / Exibidoras (Idempotente)
  console.log("\n🤝 [3/5] Cadastrando/Atualizando Veículos Parceiros...");

  // Buscar parceiros existentes no tenant
  const parceirosRes = await fetch(`${restUrl}/parceiros?tenant_id=eq.${tenantId}&select=*`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
  });
  const existingParceiros = await parceirosRes.json();
  const parceirosDbList: any[] = Array.isArray(existingParceiros) ? existingParceiros : [];

  const partnerMap = new Map<string, any>();
  let partnersCreated = 0;
  let partnersUpdated = 0;

  for (const def of PARTNER_DEFS) {
    // Localizar por CNPJ ou por Razao Social / Nome Fantasia
    const existing = parceirosDbList.find((p) => {
      if (def.cnpj && p.cnpj) {
        if (p.cnpj.replace(/\D/g, "") === def.cnpj.replace(/\D/g, "")) return true;
      }
      const matchName =
        p.nome_fantasia?.toLowerCase() === def.nome_fantasia.toLowerCase() ||
        p.razao_social?.toLowerCase().includes(def.nome_fantasia.toLowerCase()) ||
        def.razao_social.toLowerCase().includes(p.nome_fantasia?.toLowerCase() || "___");
      return matchName;
    });

    const partnerPayload = {
      tenant_id: tenantId,
      razao_social: existing?.razao_social || def.razao_social,
      nome_fantasia: def.nome_fantasia,
      cnpj: def.cnpj || existing?.cnpj || null,
      site: def.site || existing?.site || null,
      instagram: def.instagram || existing?.instagram || null,
      contato_nome: def.contato_nome || existing?.contato_nome || null,
      contato_telefone: def.contato_telefone || existing?.contato_telefone || null,
      contato_email: def.contato_email || existing?.contato_email || null,
      endereco: def.endereco || existing?.endereco || null,
      segmentos: def.segmentos,
      modelo_remuneracao: "comissao_percentual",
      comissao_padrao_pct: def.comissao_padrao_pct,
      ativo: true,
    };

    let savedPartner: any = null;

    if (existing) {
      const patchRes = await fetch(`${restUrl}/parceiros?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(partnerPayload),
      });
      const patchData = await patchRes.json();
      savedPartner = Array.isArray(patchData) && patchData[0] ? patchData[0] : { ...existing, ...partnerPayload };
      partnersUpdated++;
      console.log(`   🔄 [ATUALIZADO] ${def.nome_fantasia} (ID: ${existing.id})`);
    } else {
      const postRes = await fetch(`${restUrl}/parceiros`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(partnerPayload),
      });
      const postData = await postRes.json();
      savedPartner = Array.isArray(postData) && postData[0] ? postData[0] : null;
      partnersCreated++;
      console.log(`   ✨ [CADASTRADO] ${def.nome_fantasia} (ID: ${savedPartner?.id})`);
    }

    partnerMap.set(def.key, savedPartner);
  }

  // Mapeamentos rápidos de nomes para parceiros
  function getPartner(nameOrKey: string): any {
    const lower = nameOrKey.toLowerCase();
    if (lower.includes("megavi")) return partnerMap.get("megavi");
    if (lower.includes("art")) return partnerMap.get("art");
    if (lower.includes("wmidia") || lower.includes("wmídia")) return partnerMap.get("wmidia");
    if (lower.includes("dled")) return partnerMap.get("dled");
    if (lower.includes("cerrado mix")) return partnerMap.get("cerradomix");
    if (lower.includes("eagle")) return partnerMap.get("eagle");
    if (lower.includes("cerradus")) return partnerMap.get("cerradus");
    return null;
  }

  // 4. Leitura da Planilha Excel
  console.log("\n📊 [4/5] Lendo planilha Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx...");

  const candidatePaths = [
    path.resolve("data", "Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx"),
    path.resolve("Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx"),
    "E:\\Downloads\\nexo\\Midia Kits Aberto\\Midia_Kit_Consolidado_Geral_Todas_Empresas_DF.xlsx",
  ];

  let excelPath = "";
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }

  if (!excelPath) {
    throw new Error(`Arquivo Excel não encontrado nos caminhos verificados: ${candidatePaths.join(", ")}`);
  }

  console.log(`   Arquivo carregado: ${excelPath}`);
  const workbook = xlsx.readFile(excelPath);

  // 5. Mapeamento e Upsert dos Produtos
  console.log("\n📦 [5/5] Processando inventário OOH e DOOH...");

  // Buscar todos os produtos existentes do tenant para controle estrito de duplicidades
  const existingProdsRes = await fetch(
    `${restUrl}/produtos?tenant_id=eq.${tenantId}&select=id,nome,midia,tipo,detalhes_venda,parceiro_id`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } }
  );
  const existingProds = await existingProdsRes.json();
  const prodsList: any[] = Array.isArray(existingProds) ? existingProds : [];

  // Indexar produtos por chave composta: (parceiro_id + codigo) e (parceiro_id + nome)
  const prodIndexByKey = new Map<string, any>();

  for (const p of prodsList) {
    if (p.detalhes_venda && p.parceiro_id) {
      try {
        const details = typeof p.detalhes_venda === "string" ? JSON.parse(p.detalhes_venda) : p.detalhes_venda;
        if (details.codigo) {
          prodIndexByKey.set(`${p.parceiro_id}_${String(details.codigo).trim().toLowerCase()}`, p);
        }
      } catch {}
    }
    if (p.nome && p.parceiro_id) {
      prodIndexByKey.set(`${p.parceiro_id}_${p.nome.trim().toLowerCase()}`, p);
    }
  }

  let productsInserted = 0;
  let productsUpdated = 0;

  // --------------------------------------------------------------------------
  // A. ABAS OOH (Mídia Exterior)
  // --------------------------------------------------------------------------
  const oohSheets = [
    { name: "Megavi Mídia OOH", defaultPartnerKey: "megavi", codePrefix: "" },
    { name: "ART Mídia OOH", defaultPartnerKey: "art", codePrefix: "" },
    { name: "WMídia OOH", defaultPartnerKey: "wmidia", codePrefix: "" },
    { name: "DLED Digital Led OOH", defaultPartnerKey: "dled", codePrefix: "DLED-" },
    { name: "Cerrado Mix OOH", defaultPartnerKey: "cerradomix", codePrefix: "CM-" },
    { name: "Eagle Publicity OOH", defaultPartnerKey: "eagle", codePrefix: "EP-" },
  ];

  for (const sheetInfo of oohSheets) {
    const ws = workbook.Sheets[sheetInfo.name];
    if (!ws) {
      console.warn(`   ⚠️ Aba ${sheetInfo.name} não encontrada.`);
      continue;
    }

    const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(`\n   📄 Processando aba OOH: "${sheetInfo.name}" (${rows.length} linhas)...`);

    let sheetCount = 0;

    for (let rIdx = 4; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      if (!row || row.length === 0) continue;

      const rawCodigo = row[0];
      const rawEmpresa = row[1];
      const rawCategoria = row[2];

      // Ignorar linhas de total ou cabeçalhos repetidos
      if (!rawEmpresa || String(rawCodigo).toUpperCase().includes("TOTAL") || String(rawCategoria).toUpperCase().includes("TOTAL")) {
        continue;
      }

      const partner = getPartner(String(rawEmpresa)) || partnerMap.get(sheetInfo.defaultPartnerKey);
      if (!partner) {
        console.warn(`      ⚠️ Parceiro não identificado para linha ${rIdx} (${rawEmpresa}). Pulando...`);
        continue;
      }

      // Normalizar Código do Item de forma única e sem colisões entre empresas
      let rawCodigoStr = normalizeStr(rawCodigo);
      let codigo = rawCodigoStr;

      if (sheetInfo.defaultPartnerKey === "cerradomix") {
        const num = rawCodigoStr.replace(/\D/g, "");
        codigo = `CM-${num.padStart(2, "0")}`;
      } else if (sheetInfo.defaultPartnerKey === "dled") {
        const num = rawCodigoStr.replace(/\D/g, "");
        codigo = num ? `DLED-${num.padStart(2, "0")}` : `DLED-${rIdx - 3}`;
      } else if (sheetInfo.defaultPartnerKey === "eagle") {
        if (rawCodigoStr.toUpperCase().includes("LED")) {
          codigo = "EP-LED";
        } else {
          const num = rawCodigoStr.replace(/\D/g, "");
          codigo = num ? `EP-${num.padStart(2, "0")}` : `EP-${rIdx - 3}`;
        }
      } else if (!codigo || codigo === "-") {
        codigo = `${partner.nome_fantasia.slice(0, 3).toUpperCase()}-${rIdx - 3}`;
      }

      const categoria = normalizeStr(row[2]) || "Frontlight";
      const cidade = normalizeStr(row[3]);
      const localizacao = normalizeStr(row[4]);
      const detalhesSentido = normalizeStr(row[5]);
      const pontoReferencia = normalizeStr(row[6]);
      const latitude = parseCoordinate(row[7]);
      const longitude = parseCoordinate(row[8]);
      const dimensoes = normalizeStr(row[9]);
      const material = normalizeStr(row[10]);
      const disponibilidade = normalizeStr(row[11]) || "Disponível";
      const sentidoFluxo = normalizeStr(row[12]);
      const fluxoDiario = cleanNumber(row[13]);
      const exibicoesDia = cleanNumber(row[14]);
      const publicoAlvo = normalizeStr(row[15]);
      const observacoes = normalizeStr(row[16]);
      const precoTabelaBase = cleanNumber(row[17]) || 0;

      // Nome padronizado e limpo
      const nomeProduto = `[${codigo}] ${categoria} - ${cidade ? cidade + " - " : ""}${localizacao || "Ponto OOH"}`;

      // Montar endereço completo legível
      const enderecoPonto = [
        localizacao,
        detalhesSentido && detalhesSentido !== localizacao ? detalhesSentido : null,
        pontoReferencia && pontoReferencia !== localizacao ? `(Ref: ${pontoReferencia})` : null,
        cidade ? cidade : null,
      ]
        .filter(Boolean)
        .join(" - ");

      const isLed =
        categoria.toLowerCase().includes("led") ||
        material.toLowerCase().includes("led") ||
        dimensoes.toLowerCase().includes("digital");

      const faces =
        sentidoFluxo.toLowerCase().includes("contra fluxo") && sentidoFluxo.toLowerCase().includes("fluxo") ? 2 : 1;

      const payload: any = {
        tenant_id: tenantId,
        nome: nomeProduto,
        midia: isLed ? "DOOH" : "OOH",
        tipo: categoria,
        formato: dimensoes || categoria,
        formato_ooh: categoria,
        endereco_ponto: enderecoPonto,
        latitude: latitude,
        longitude: longitude,
        quantidade_faces: faces,
        resolucao: isLed ? (material.includes("P") ? material : "LED Digital") : null,
        duracao_segundos: isLed ? 15 : 30,
        insercoes_padrao: exibicoesDia || 1,
        valor_unit: precoTabelaBase,
        ativo: !disponibilidade.toLowerCase().includes("indisponível"),
        observacao: `[${disponibilidade}] Sentido: ${sentidoFluxo || "N/I"} | Mat: ${material || "N/I"}${
          observacoes && observacoes !== "-" ? " | " + observacoes : ""
        }`,
        parceiro_id: partner.id,
        parceiro_nome: partner.nome_fantasia || partner.razao_social,
        parceiro_cnpj: partner.cnpj,
        comissao_inquilino_pct: partner.comissao_padrao_pct || 20.0,
        detalhes_venda: JSON.stringify({
          codigo,
          codigo_original: rawCodigoStr,
          categoria,
          cidade,
          localizacao,
          detalhes_sentido: detalhesSentido,
          ponto_referencia: pontoReferencia,
          dimensoes,
          material,
          disponibilidade,
          sentido_fluxo: sentidoFluxo,
          fluxo_diario: fluxoDiario,
          exibicoes_dia: exibicoesDia,
          publico_alvo: publicoAlvo,
          preco_tabela_original: row[17],
          _canal_macro: "OFF",
          _origem_produto: "PARCEIRO",
          _parceiro_nome: partner.nome_fantasia,
        }),
      };

      // Verificar existência por chave composta de parceiro + código ou nome
      const lookupKeyCode = `${partner.id}_${codigo.toLowerCase()}`;
      const lookupKeyName = `${partner.id}_${nomeProduto.toLowerCase()}`;
      const existing = prodIndexByKey.get(lookupKeyCode) || prodIndexByKey.get(lookupKeyName);

      if (existing) {
        await fetch(`${restUrl}/produtos?id=eq.${existing.id}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        productsUpdated++;
      } else {
        const insertRes = await fetch(`${restUrl}/produtos`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        const insertedData = await insertRes.json();
        if (Array.isArray(insertedData) && insertedData[0]) {
          prodIndexByKey.set(lookupKeyCode, insertedData[0]);
          prodIndexByKey.set(lookupKeyName, insertedData[0]);
        }
        productsInserted++;
      }

      sheetCount++;
    }

    console.log(`      ✅ Concluído: ${sheetCount} pontos processados na aba.`);
  }

  // --------------------------------------------------------------------------
  // B. ABAS DOOH INDOOR (Condomínios & Gastronomia)
  // --------------------------------------------------------------------------
  const cerradusPartner = partnerMap.get("cerradus");
  const doohSheets = [
    { name: "DOOH Condomínios", prefix: "COND", categoria: "DOOH Condomínios" },
    { name: "DOOH Gastronomia", prefix: "GASTRO", categoria: "DOOH Gastronomia" },
  ];

  for (const sheetInfo of doohSheets) {
    const ws = workbook.Sheets[sheetInfo.name];
    if (!ws) {
      console.warn(`   ⚠️ Aba ${sheetInfo.name} não encontrada.`);
      continue;
    }

    const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(`\n   🏢 Processando aba DOOH Indoor: "${sheetInfo.name}" (${rows.length} linhas)...`);

    let sheetCount = 0;

    for (let rIdx = 4; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      if (!row || row.length === 0) continue;

      const rawItem = row[0];
      const rawEstab = row[2];

      // Ignorar linha de total sub-individual
      if (!rawEstab || String(rawEstab).toUpperCase().includes("TOTAL SUB-INDIVIDUAL")) {
        continue;
      }

      // 1. Caso Item Individual (1, 2, 3...)
      if (rawItem && typeof rawItem === "number") {
        const itemNum = rawItem;
        const codigo = `${sheetInfo.prefix}-${String(itemNum).padStart(2, "0")}`;
        const localEstabelecimento = normalizeStr(row[2]);
        const regiaoBairro = normalizeStr(row[3]);
        const telas = cleanNumber(row[4]) || 1;
        const insercoesTelaDia = cleanNumber(row[5]) || 120;
        const periodoDias = cleanNumber(row[6]) || 30;
        const impactosDia = cleanNumber(row[7]) || 0;
        const insercoesTotais = cleanNumber(row[8]) || insercoesTelaDia * periodoDias * telas;
        const valorTabela30d = cleanNumber(row[9]) || 0;
        const valorNegociadoMensal = cleanNumber(row[12]) || 0;

        const nomeProduto = `[${codigo}] ${localEstabelecimento} - ${regiaoBairro} (${telas} Telas)`;

        const payload: any = {
          tenant_id: tenantId,
          nome: nomeProduto,
          midia: "DOOH",
          tipo: sheetInfo.categoria,
          formato: "Telas Digitais em Elevadores e Recepções",
          formato_ooh: "DOOH Indoor",
          endereco_ponto: `${localEstabelecimento} - ${regiaoBairro} / Brasília-DF`,
          quantidade_telas: telas,
          tempo_exibicao_segundos: 15,
          duracao_segundos: 15,
          insercoes_padrao: insercoesTotais,
          valor_unit: valorTabela30d || valorNegociadoMensal,
          ativo: true,
          observacao: `Telas: ${telas} | Inserções/Dia: ${insercoesTelaDia} | Impactos/Dia: ${impactosDia} | Valor Negociado: R$ ${valorNegociadoMensal}`,
          parceiro_id: cerradusPartner.id,
          parceiro_nome: cerradusPartner.nome_fantasia || "Cerradus DOOH",
          parceiro_cnpj: cerradusPartner.cnpj || "60.750.768/0001-04",
          comissao_inquilino_pct: 20.0,
          detalhes_venda: JSON.stringify({
            codigo,
            canal: sheetInfo.name,
            estabelecimento: localEstabelecimento,
            regiao_bairro: regiaoBairro,
            quantidade_telas: telas,
            insercoes_tela_dia: insercoesTelaDia,
            periodo_dias: periodoDias,
            impactos_dia: impactosDia,
            insercoes_totais: insercoesTotais,
            valor_tabela_30d: valorTabela30d,
            desconto_pct: row[11],
            valor_negociado_mensal: valorNegociadoMensal,
            _canal_macro: "OFF",
            _origem_produto: "PARCEIRO",
            _parceiro_nome: cerradusPartner.nome_fantasia,
          }),
        };

        const lookupKeyCode = `${cerradusPartner.id}_${codigo.toLowerCase()}`;
        const lookupKeyName = `${cerradusPartner.id}_${nomeProduto.toLowerCase()}`;
        const existing = prodIndexByKey.get(lookupKeyCode) || prodIndexByKey.get(lookupKeyName);

        if (existing) {
          await fetch(`${restUrl}/produtos?id=eq.${existing.id}`, {
            method: "PATCH",
            headers: authHeaders,
            body: JSON.stringify(payload),
          });
          productsUpdated++;
        } else {
          const insertRes = await fetch(`${restUrl}/produtos`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(payload),
          });
          const insertedData = await insertRes.json();
          if (Array.isArray(insertedData) && insertedData[0]) {
            prodIndexByKey.set(lookupKeyCode, insertedData[0]);
            prodIndexByKey.set(lookupKeyName, insertedData[0]);
          }
          productsInserted++;
        }

        sheetCount++;
      }

      // 2. Caso Opção Circuito Fechado
      else if (rawEstab && String(rawEstab).toUpperCase().includes("CIRCUITO")) {
        const descricaoCircuito = normalizeStr(rawEstab);
        const valorTabela = cleanNumber(row[9]) || 0;
        const valorNegociado = cleanNumber(row[12]) || 0;
        const desconto = cleanNumber(row[11]) || 0;

        let circCode = "CIRC-DOOH";
        if (descricaoCircuito.toUpperCase().includes("SAMAMBAIA")) circCode = "CIRC-COND-SAM";
        else if (descricaoCircuito.toUpperCase().includes("ÁGUAS CLARAS")) circCode = "CIRC-COND-AGUAS";
        else if (descricaoCircuito.toUpperCase().includes("GASTRONOMIA")) circCode = "CIRC-GASTRO-FULL";

        const nomeProduto = `[${circCode}] ${descricaoCircuito}`;

        // Extrair quantidade de telas do texto (ex: "71 Telas")
        const telasMatch = descricaoCircuito.match(/(\d+)\s*Telas/i);
        const telasCount = telasMatch ? parseInt(telasMatch[1], 10) : null;

        const payload: any = {
          tenant_id: tenantId,
          nome: nomeProduto,
          midia: "DOOH",
          tipo: `Circuito ${sheetInfo.categoria}`,
          formato: "Circuito Completo Multipontos",
          formato_ooh: "DOOH Indoor Circuito",
          endereco_ponto: "Brasília e Regiões Administrativas - DF",
          quantidade_telas: telasCount,
          tempo_exibicao_segundos: 15,
          duracao_segundos: 15,
          insercoes_padrao: 30000,
          valor_unit: valorTabela || valorNegociado,
          ativo: true,
          observacao: `Circuito Completo | Desconto: ${(desconto * 100).toFixed(0)}% | Negociado: R$ ${valorNegociado}`,
          parceiro_id: cerradusPartner.id,
          parceiro_nome: cerradusPartner.nome_fantasia || "Cerradus DOOH",
          parceiro_cnpj: cerradusPartner.cnpj || "60.750.768/0001-04",
          comissao_inquilino_pct: 20.0,
          detalhes_venda: JSON.stringify({
            codigo: circCode,
            circuito_nome: descricaoCircuito,
            quantidade_telas: telasCount,
            valor_tabela: valorTabela,
            desconto_pct: desconto,
            valor_negociado_mensal: valorNegociado,
            _canal_macro: "OFF",
            _origem_produto: "PARCEIRO",
            _parceiro_nome: cerradusPartner.nome_fantasia,
          }),
        };

        const lookupKeyCode = `${cerradusPartner.id}_${circCode.toLowerCase()}`;
        const lookupKeyName = `${cerradusPartner.id}_${nomeProduto.toLowerCase()}`;
        const existing = prodIndexByKey.get(lookupKeyCode) || prodIndexByKey.get(lookupKeyName);

        if (existing) {
          await fetch(`${restUrl}/produtos?id=eq.${existing.id}`, {
            method: "PATCH",
            headers: authHeaders,
            body: JSON.stringify(payload),
          });
          productsUpdated++;
        } else {
          const insertRes = await fetch(`${restUrl}/produtos`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(payload),
          });
          const insertedData = await insertRes.json();
          if (Array.isArray(insertedData) && insertedData[0]) {
            prodIndexByKey.set(lookupKeyCode, insertedData[0]);
            prodIndexByKey.set(lookupKeyName, insertedData[0]);
          }
          productsInserted++;
        }

        sheetCount++;
      }
    }

    console.log(`      ✅ Concluído: ${sheetCount} pontos processados na aba.`);
  }

  // 6. Contagem Total Final e Validação
  const finalProdsRes = await fetch(`${restUrl}/produtos?tenant_id=eq.${tenantId}&select=id`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, Prefer: "count=exact" },
  });
  const totalProdutosInquilino = finalProdsRes.headers.get("content-range")?.split("/")[1] || "N/A";

  const finalParceirosRes = await fetch(`${restUrl}/parceiros?tenant_id=eq.${tenantId}&select=id`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, Prefer: "count=exact" },
  });
  const totalParceirosInquilino = finalParceirosRes.headers.get("content-range")?.split("/")[1] || "N/A";

  console.log("\n================================================================================");
  console.log("🏁 RELATÓRIO CONSOLIDADO DE IMPORTAÇÃO E VÍNCULO AO TENANT");
  console.log("================================================================================");
  console.log(`🏢 Tenant Alvo: Nexo Representação e Mídia LTDA`);
  console.log(`📋 CNPJ: ${TARGET_CNPJ}`);
  console.log(`🆔 Tenant ID: ${tenantId}`);
  console.log("--------------------------------------------------------------------------------");
  console.log(`🤝 Parceiros Processados: ${PARTNER_DEFS.length}`);
  console.log(`   - Novos Parceiros Criados: ${partnersCreated}`);
  console.log(`   - Parceiros Atualizados: ${partnersUpdated}`);
  console.log(`   - Total de Parceiros Vinculados no Banco: ${totalParceirosInquilino}`);
  console.log("--------------------------------------------------------------------------------");
  console.log(`📦 Produtos de Mídia Processados: ${productsInserted + productsUpdated}`);
  console.log(`   - Novos Produtos Cadastrados: ${productsInserted}`);
  console.log(`   - Produtos Atualizados (Upsert): ${productsUpdated}`);
  console.log(`   - Total de Produtos Vinculados ao Tenant: ${totalProdutosInquilino}`);
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("❌ ERRO DURANTE A IMPORTAÇÃO:", err);
  process.exit(1);
});
