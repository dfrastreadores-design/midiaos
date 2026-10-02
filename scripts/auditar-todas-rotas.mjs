import fs from "node:fs";
import path from "node:path";

const routesDir = path.resolve("src/routes");
const routeTreePath = path.resolve("src/routeTree.gen.ts");
const routeTreeContent = fs.readFileSync(routeTreePath, "utf-8");

console.log("=== VERIFICANDO ROTAS vs ROUTETREE.GEN.TS ===");

function getRouteFiles(dir, base = "") {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const rel = path.join(base, file).replace(/\\/g, "/");
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getRouteFiles(fullPath, rel));
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      if (file !== "__root.tsx") {
        results.push(rel);
      }
    }
  }
  return results;
}

const allRoutes = getRouteFiles(routesDir);
console.log(`Total de arquivos de rotas encontrados: ${allRoutes.length}`);

const missingInTree = [];
for (const r of allRoutes) {
  // Converte nome do arquivo para padrão de busca
  const cleanName = r.replace(/\.tsx?$/, "");
  // Verifica se o arquivo é importado em routeTree
  if (!routeTreeContent.includes(`./routes/${cleanName}`) && !routeTreeContent.includes(`./routes/${r}`)) {
    missingInTree.push(r);
  }
}

if (missingInTree.length > 0) {
  console.error("❌ ROTAS AUSENTES NO ROUTETREE.GEN.TS:");
  missingInTree.forEach((m) => console.error(" - " + m));
} else {
  console.log("✅ Todas as rotas estão presentes no routeTree.gen.ts!");
}

console.log("\n=== VERIFICANDO USO DE WINDOW/LOCALSTORAGE/DOCUMENT NO SSR ===");
const ssrIssues = [];
for (const r of allRoutes) {
  const content = fs.readFileSync(path.join(routesDir, r), "utf-8");
  // Procura por window. ou localStorage. ou sessionStorage. fora de useEffect / callbacks / typeof window
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    // Se a linha tem window. ou localStorage. ou document. mas não tem typeof window ou 'undefined'
    if (
      (line.includes("localStorage.") || line.includes("window.location") || line.includes("window.navigator") || line.includes("document.cookie")) &&
      !line.includes("typeof window") &&
      !line.includes("typeof document")
    ) {
      // checa se está no corpo do arquivo fora de funções
      if (line.match(/^const\s+.*=\s*(window|localStorage|document)\./)) {
        ssrIssues.push({ route: r, line: idx + 1, code: line.trim() });
      }
    }
  });
}

if (ssrIssues.length > 0) {
  console.error("⚠️ POSSÍVEIS PROBLEMAS DE SSR:");
  ssrIssues.forEach((i) => console.error(` - [${i.route}:${i.line}] ${i.code}`));
} else {
  console.log("✅ Nenhum acesso global inseguro no nível superior das rotas detectado.");
}
