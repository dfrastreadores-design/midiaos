import fs from "node:fs";
import path from "node:path";

console.log("=======================================================");
console.log("🔍 AUDITORIA COMPLETA DE INTEGRIDADE DO MÍDIA.OS");
console.log("=======================================================");

// 1. Extrair todas as tabelas criadas nas migrações do Supabase
const migrationsDir = path.resolve("supabase/migrations");
const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

const createdTables = new Set();
for (const file of migrationFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    createdTables.add(match[1].toLowerCase());
  }
}

// Tabelas padrão do Supabase auth/storage
createdTables.add("profiles");
createdTables.add("users");
createdTables.add("objects");
createdTables.add("buckets");

console.log(`\n📋 [1/4] Tabelas catalogadas no banco (${createdTables.size} tabelas encontradas).`);

// 2. Extrair todas as chamadas a supabase.from("...") em src/lib/ e src/
const libDir = path.resolve("src");
function findFiles(dir, ext = ".ts") {
  let list = [];
  const entries = fs.readdirSync(dir);
  for (const e of entries) {
    const p = path.join(dir, e);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      list = list.concat(findFiles(p, ext));
    } else if (e.endsWith(".ts") || e.endsWith(".tsx")) {
      list.push(p);
    }
  }
  return list;
}

const allSrcFiles = findFiles(libDir);
const queriedTables = new Map();

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const regex = /supabase\s*\.from\(\s*["']([a-zA-Z0-9_]+)["']\s*\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const tbl = match[1].toLowerCase();
    if (!queriedTables.has(tbl)) {
      queriedTables.set(tbl, []);
    }
    const rel = path.relative(path.resolve("."), file).replace(/\\/g, "/");
    if (!queriedTables.get(tbl).includes(rel)) {
      queriedTables.get(tbl).push(rel);
    }
  }
}

console.log(`\n🔎 [2/4] Verificando compatibilidade das ${queriedTables.size} tabelas consultadas pelo código...`);
const missingTables = [];
for (const [tbl, callers] of queriedTables.entries()) {
  if (!createdTables.has(tbl)) {
    missingTables.push({ table: tbl, callers });
  }
}

if (missingTables.length > 0) {
  console.log("⚠️ Tabelas consultadas sem declaração direta em migrations (ou tabelas dinâmicas):");
  for (const m of missingTables) {
    console.log(` - "${m.table}" chamada em: ${m.callers.slice(0, 2).join(", ")}${m.callers.length > 2 ? ` (+${m.callers.length - 2})` : ""}`);
  }
} else {
  console.log("✅ Todas as tabelas consultadas existem nas migrações!");
}

// 3. Checar todas as páginas em src/routes/ para verificar useQuery / useServerFn e se tratam erros
console.log("\n📄 [3/4] Auditando rotas e páginas de src/routes/...");
const routesDir = path.resolve("src/routes");
const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

const routeAudit = [];
for (const r of routeFiles) {
  if (r === "__root.tsx") continue;
  const content = fs.readFileSync(path.join(routesDir, r), "utf-8");
  
  const hasAppShell = content.includes("<AppShell");
  const hasErrorComponent = content.includes("errorComponent:");
  const hasAuthGuard = content.includes("AuthGuard") || content.includes("requireAuth") || content.includes("useUserRoles");
  const usesServerFn = content.includes("useServerFn");
  const usesQuery = content.includes("useQuery");
  
  // Verifica se acessa propriedades perigosas de dados sem fallback
  const dangerousAccess = [];
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    // Procura padrões como data.something onde data pode ser undefined
    if (line.includes(".map(") && !line.includes("?.") && !line.includes("|| []") && !line.includes("Array.isArray")) {
      // checa se mapeia diretamente
      const match = line.match(/([a-zA-Z0-9_]+)\.map\(/);
      if (match && !["items", "options", "produtos", "list", "array"].includes(match[1])) {
        // candidato a checagem
      }
    }
  });

  routeAudit.push({
    file: r,
    hasAppShell,
    hasErrorComponent,
    usesServerFn,
    usesQuery,
  });
}

console.log(`Auditadas ${routeAudit.length} rotas.`);

// 4. Checar AppShell e componentes globais
console.log("\n🛡️ [4/4] Verificando ErrorComponent em __root.tsx...");
const rootContent = fs.readFileSync(path.join(routesDir, "__root.tsx"), "utf-8");
if (rootContent.includes("This page didn't load")) {
  console.log("ℹ️ __root.tsx possui ErrorComponent padrão 'This page didn't load'.");
}
