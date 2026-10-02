import fs from "node:fs";
import path from "node:path";

const routesDir = path.resolve("src/routes");
const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

// Mapeia arquivos de rotas para URLs testáveis
function routeFileToUrl(filename) {
  if (filename === "__root.tsx" || filename === "sitemap[.]xml.ts") return null;
  if (filename === "index.tsx") return "/";
  if (filename.startsWith("site.")) {
    const sub = filename.replace("site.", "").replace(/\.tsx?$/, "");
    if (sub === "index") return "/site";
    return `/site/${sub}`;
  }
  if (filename === "site.tsx") return "/site";
  if (filename.includes("$token")) {
    const base = filename.split(".")[0];
    return `/${base}/token-teste-validacao`;
  }
  if (filename.includes("$slug")) {
    return "/demo-slug-teste";
  }
  if (filename.includes("$id")) {
    const base = filename.split(".")[0];
    return `/${base}/11111111-1111-1111-1111-111111111111`;
  }
  const clean = filename.replace(/\.tsx?$/, "");
  return `/${clean}`;
}

const urlsToTest = [];
for (const file of routeFiles) {
  const url = routeFileToUrl(file);
  if (url && !urlsToTest.includes(url)) {
    urlsToTest.push({ file, url });
  }
}

console.log(`=======================================================`);
console.log(`🌐 TESTANDO ${urlsToTest.length} PÁGINAS HTTP NO SERVIDOR LOCAL`);
console.log(`=======================================================\n`);

const results = [];
let passCount = 0;
let failCount = 0;

for (const item of urlsToTest) {
  const targetUrl = `http://localhost:3000${item.url}`;
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestRunner/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const status = res.status;
    const body = await res.text();

    const hasErrorTitle = body.includes("This page didn't load") || body.includes("Erro ao carregar");
    const has404 = body.includes("Page not found") || body.includes("Página não encontrada");
    const isRedirect = status >= 300 && status < 400;

    let resultado = "OK";
    if (status >= 500) {
      resultado = "FALHA 500 (Erro Servidor)";
      failCount++;
    } else if (hasErrorTitle) {
      resultado = "FALHA (This page didn't load)";
      failCount++;
    } else if (status === 404 && !item.url.includes("slug") && !item.url.includes("token")) {
      resultado = "404 (Não encontrada)";
      failCount++;
    } else {
      resultado = `SUCESSO (${status})`;
      passCount++;
    }

    results.push({
      file: item.file,
      url: item.url,
      status,
      resultado,
      hasErrorTitle,
      bodyLength: body.length,
    });

    const icon = resultado.startsWith("SUCESSO") ? "✅" : isRedirect ? "↪️" : "❌";
    console.log(`${icon} [${status}] ${item.url.padEnd(30)} -> ${resultado} (${(body.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    failCount++;
    console.log(`❌ [ERR] ${item.url.padEnd(30)} -> Conexão falhou: ${err.message}`);
    results.push({
      file: item.file,
      url: item.url,
      status: 0,
      resultado: `Erro de rede: ${err.message}`,
      hasErrorTitle: true,
      bodyLength: 0,
    });
  }
}

console.log("\n=======================================================");
console.log(`📊 RESUMO DO TESTE:`);
console.log(`- Total de Páginas Testadas: ${urlsToTest.length}`);
console.log(`- Páginas Aprovadas:        ${passCount}`);
console.log(`- Páginas com Falha:        ${failCount}`);
console.log("=======================================================");

const failedItems = results.filter((r) => r.hasErrorTitle || r.status >= 500);
if (failedItems.length > 0) {
  console.log("\n⚠️ PÁGINAS QUE APRESENTARAM FALHA / 'THIS PAGE DIDN'T LOAD':");
  for (const f of failedItems) {
    console.log(` • ${f.url} (${f.file}): ${f.resultado}`);
  }
}
