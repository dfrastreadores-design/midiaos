import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const skipBuild = process.argv.includes("--skip-build");

if (!skipBuild) {
  console.log("🚀 [1/3] Compilando a aplicação para produção...");
  const cmd = process.platform === "win32"
    ? `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096 && npm run build"`
    : `NODE_OPTIONS=--max-old-space-size=4096 npm run build`;
  execSync(cmd, { stdio: "inherit" });
} else {
  console.log("⚡ [1/3] Pulando compilação (usando .output existente)...");
}

console.log("\n📦 [2/3] Organizando arquivos na pasta 'hostinger'...");
const hostingerDir = path.resolve("./hostinger");
if (fs.existsSync(hostingerDir)) {
  fs.rmSync(hostingerDir, { recursive: true, force: true });
}
fs.mkdirSync(hostingerDir, { recursive: true });

// Copia recursiva de .output
fs.cpSync("./.output", path.join(hostingerDir, ".output"), { recursive: true, force: true });
fs.copyFileSync("./hostinger.mjs", path.join(hostingerDir, "hostinger.mjs"));
fs.copyFileSync("./package.json", path.join(hostingerDir, "package.json"));
if (fs.existsSync("./.env")) {
  fs.copyFileSync("./.env", path.join(hostingerDir, ".env"));
}
if (fs.existsSync("./supabase/schema_completo.sql")) {
  fs.copyFileSync("./supabase/schema_completo.sql", path.join(hostingerDir, "schema_banco_de_dados.sql"));
}

console.log("\n🗜️  [3/3] Criando arquivo hostinger_deploy.zip...");
if (fs.existsSync("./hostinger_deploy.zip")) {
  fs.unlinkSync("./hostinger_deploy.zip");
}

const zipCommand = process.platform === "win32"
  ? `powershell -Command "Add-Type -AssemblyName 'System.IO.Compression.FileSystem'; [System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path 'hostinger'), (Join-Path (Get-Location) 'hostinger_deploy.zip'))"`
  : `cd hostinger && zip -r ../hostinger_deploy.zip ./*`;

try {
  execSync(zipCommand, { stdio: "inherit" });
  console.log("\n✅ Pacote gerado com sucesso: hostinger_deploy.zip");
  console.log("👉 Você pode fazer o upload deste arquivo diretamente no Gerenciador de Arquivos da Hostinger!");
} catch (err) {
  console.error("Aviso ao criar zip automático:", err.message);
}
