import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

console.log("====================================================");
console.log("⚡ BUILD INCREMENTAL RÁPIDO EM DISCO LOCAL (D:)");
console.log("====================================================");

const sourceDir = path.resolve(".");
const buildDir = "D:\\midiaos_build";

if (!fs.existsSync(buildDir)) {
  console.error("Diretório D:\\midiaos_build não existe. Execute build-local-fast.mjs primeiro.");
  process.exit(1);
}

console.log("\n📁 [1/3] Sincronizando código-fonte e configurações para D:\\midiaos_build...");
const itemsToSync = [
  "src",
  "public",
  "scripts",
  "supabase",
  ".env",
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  "hostinger.mjs",
  "tailwind.config.ts",
  "postcss.config.js"
];
for (const item of itemsToSync) {
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

console.log("\n🚀 [2/3] Compilando aplicação (npm run build)...");
const npmCmd = process.platform === "win32" ? "cmd /c npm" : "npm";
execSync(`${npmCmd} run build`, {
  cwd: buildDir,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: "--max-old-space-size=4096",
  },
});

console.log("\n📥 [3/3] Sincronizando novo .output de volta para o projeto...");
const outputSrc = path.join(buildDir, ".output");
const outputDest = path.join(sourceDir, ".output");

if (fs.existsSync(outputDest)) {
  fs.rmSync(outputDest, { recursive: true, force: true });
}
fs.cpSync(outputSrc, outputDest, { recursive: true });

console.log("\n✅ Build incremental concluído com sucesso!");
