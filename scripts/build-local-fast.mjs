import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

console.log("====================================================");
console.log("⚡ COMPILAÇÃO DE ALTA VELOCIDADE EM DISCO LOCAL (D:)");
console.log("====================================================");

const sourceDir = path.resolve(".");
const buildDir = "D:\\midiaos_build";

console.log(`\n📁 [1/4] Preparando workspace em ${buildDir}...`);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Arquivos e pastas a sincronizar
const itemsToCopy = [
  "src",
  "public",
  "supabase",
  "scripts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  ".env",
  "hostinger.mjs",
  "components.json",
  "postcss.config.js",
  "tailwind.config.ts",
];

for (const item of itemsToCopy) {
  const srcPath = path.join(sourceDir, item);
  const destPath = path.join(buildDir, item);
  if (!fs.existsSync(srcPath)) continue;

  const stat = fs.statSync(srcPath);
  if (stat.isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

console.log("\n📦 [2/4] Instalando dependências limpas em disco local rápido (npm ci)...");
const npmCmd = process.platform === "win32" ? "cmd /c npm" : "npm";
execSync(`${npmCmd} install --prefer-offline --no-audit --no-fund`, {
  cwd: buildDir,
  stdio: "inherit",
});

console.log("\n🚀 [3/4] Compilando aplicação completa (npm run build)...");
execSync(`${npmCmd} run build`, {
  cwd: buildDir,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: "--max-old-space-size=4096",
  },
});

console.log("\n📥 [4/4] Sincronizando novo .output de volta para o projeto...");
const outputSrc = path.join(buildDir, ".output");
const outputDest = path.join(sourceDir, ".output");

if (fs.existsSync(outputDest)) {
  fs.rmSync(outputDest, { recursive: true, force: true });
}
fs.cpSync(outputSrc, outputDest, { recursive: true });

console.log("\n✅ Compilação concluída com sucesso!");
console.log("👉 .output atualizado com todas as novas rotas (/centralizadores, /assinaturas, etc.).");
