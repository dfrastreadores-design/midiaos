import https from "node:https";

const BASE_URL = "https://midiaos.online";

console.log("================================================================================");
console.log("🔬 AUDITORIA COMPLETA DE INTEGRIDADE EM PRODUÇÃO: " + BASE_URL);
console.log("================================================================================\n");

async function fetchUrl(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MidiaOS-Auditor/3.0",
      ...options.headers,
    },
    ...options,
  });
  const elapsed = Date.now() - start;
  const text = await res.text();
  return {
    url,
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    text,
    elapsed,
  };
}

const tests = [
  // 1. Páginas Públicas Institucionais
  { name: "Landing Page Oficial (/site)", path: "/site", expectStatus: 200, checkContent: ["Mídia.OS", "Plataforma"] },
  { name: "Vitrine Pública de Inventário (/site/inventario)", path: "/site/inventario", expectStatus: 200, checkContent: ["Inventário", "Mídia"] },
  { name: "Página de Planos e Preços (/site/precos)", path: "/site/precos", expectStatus: 200, checkContent: ["Preço", "Plano"] },
  { name: "Página de Recursos (/site/recursos)", path: "/site/recursos", expectStatus: 200, checkContent: ["Recursos"] },
  { name: "Página de Contato (/site/contato)", path: "/site/contato", expectStatus: 200, checkContent: ["Contato"] },
  { name: "Página de Demonstração (/site/demo)", path: "/site/demo", expectStatus: 200, checkContent: ["Demo"] },
  { name: "Termos de Uso (/site/termos)", path: "/site/termos", expectStatus: 200, checkContent: ["Termos"] },
  { name: "Política de Privacidade (/site/privacidade)", path: "/site/privacidade", expectStatus: 200, checkContent: ["Privacidade"] },

  // 2. Aplicação Core & Login
  { name: "Tela de Login (/login)", path: "/login", expectStatus: 200, checkContent: ["Mídia.OS", "Entrar"] },
  { name: "Raiz da Aplicação (/)", path: "/", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Produtos (/produtos)", path: "/produtos", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Propostas (/propostas)", path: "/propostas", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Pedidos de Inserção (/pi)", path: "/pi", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Planejamento (/planejamento)", path: "/planejamento", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Copiloto Comercial (/copiloto-comercial)", path: "/copiloto-comercial", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Nova Campanha (/nova-campanha)", path: "/nova-campanha", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Rede de Inventário (/rede-inventario)", path: "/rede-inventario", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo Financeiro (/financeiro)", path: "/financeiro", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Clientes (/clientes)", path: "/clientes", expectStatus: 200, checkContent: ["html"] },
  { name: "Módulo de Configurações (/configuracoes)", path: "/configuracoes", expectStatus: 200, checkContent: ["html"] },

  // 3. APIs & Serviços
  { name: "API de Inventário Público (/api/public/inventory-assets)", path: "/api/public/inventory-assets", expectStatus: 200, isJson: true, checkContent: ["\"success\":true"] },
  { name: "Sitemap XML (/sitemap.xml)", path: "/sitemap.xml", expectStatus: 200, checkContent: ["urlset", "https://midiaos.online"] },
];

let totalPassed = 0;
let totalFailed = 0;
const assetsToCheck = new Set();

console.log("📡 [ETAPA 1/3] VERIFICAÇÃO DE ROTAS E ENDPOINTS:");
for (const test of tests) {
  try {
    const result = await fetchUrl(test.path);
    let ok = result.status === test.expectStatus;

    if (test.checkContent) {
      for (const str of test.checkContent) {
        if (!result.text.toLowerCase().includes(str.toLowerCase())) {
          ok = false;
          console.error(`   ⚠️ Conteúdo esperado ausente em ${test.path}: "${str}"`);
        }
      }
    }

    if (test.isJson) {
      try {
        JSON.parse(result.text);
      } catch (jsonErr) {
        ok = false;
        console.error(`   ⚠️ Resposta não é JSON válido em ${test.path}`);
      }
    }

    // Extrair scripts e css para teste de assets estáticos
    const scriptMatches = result.text.matchAll(/src="(\/assets\/[^"]+)"/g);
    for (const m of scriptMatches) assetsToCheck.add(m[1]);
    const cssMatches = result.text.matchAll(/href="(\/assets\/[^"]+\.css)"/g);
    for (const m of cssMatches) assetsToCheck.add(m[1]);

    if (ok) {
      totalPassed++;
      console.log(`  ✅ [${result.status}] ${test.name.padEnd(50)} (${result.elapsed}ms)`);
    } else {
      totalFailed++;
      console.error(`  ❌ [${result.status}] ${test.name.padEnd(50)} FALHOU`);
    }
  } catch (err) {
    totalFailed++;
    console.error(`  ❌ [ERR] ${test.name.padEnd(50)}: ${err.message}`);
  }
}

console.log("\n📦 [ETAPA 2/3] VERIFICAÇÃO DE BUNDLES ESTÁTICOS (ASSETS COMPILADOS):");
console.log(`Total de bundles identificados no HTML: ${assetsToCheck.size}`);
let assetPassed = 0;
let assetFailed = 0;

for (const assetPath of assetsToCheck) {
  try {
    const res = await fetchUrl(assetPath);
    if (res.status === 200 && res.text.length > 50) {
      assetPassed++;
      console.log(`  ✅ [200] ${assetPath.padEnd(55)} (${(res.text.length / 1024).toFixed(1)} KB, ${res.elapsed}ms)`);
    } else {
      assetFailed++;
      console.error(`  ❌ [${res.status}] ${assetPath} FALHOU (Tamanho: ${res.text.length} bytes)`);
    }
  } catch (err) {
    assetFailed++;
    console.error(`  ❌ [ERR] ${assetPath}: ${err.message}`);
  }
}

console.log("\n🔌 [ETAPA 3/3] TESTE DE COMUNICAÇÃO SUPABASE / REST API:");
try {
  const supabaseUrl = "https://tvniawyweymutjiybxyo.supabase.co";
  const start = Date.now();
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ";
  const sbRes = await fetch(`${supabaseUrl}/rest/v1/produtos?select=id&limit=1`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const elapsed = Date.now() - start;
  if (sbRes.status === 200) {
    console.log(`  ✅ Supabase REST API operacional e respondendo em ${elapsed}ms! (Status 200 OK)`);
  } else {
    console.warn(`  ⚠️ Supabase respondeu com status: ${sbRes.status}`);
  }
} catch (err) {
  console.error("  ❌ Falha ao contatar Supabase:", err.message);
}

console.log("\n================================================================================");
console.log("📊 PAINEL FINAL DA AUDITORIA ONLINE DE PRODUÇÃO");
console.log("================================================================================");
console.log(`- Rotas e Endpoints Testados: ${tests.length}`);
console.log(`- Rotas Aprovadas:           ${totalPassed} (${((totalPassed / tests.length) * 100).toFixed(0)}%)`);
console.log(`- Bundles Estáticos Aprovados: ${assetPassed} / ${assetsToCheck.size}`);
console.log(`- Falhas Detectadas:          ${totalFailed + assetFailed}`);
console.log("================================================================================");

if (totalFailed + assetFailed === 0) {
  console.log("🎉 SISTEMA ONLINE 100% HOMOLOGADO E OPERACIONAL EM PRODUÇÃO!");
  process.exit(0);
} else {
  console.error("❌ IDENTIFICADAS FALHAS EM PRODUÇÃO.");
  process.exit(1);
}
