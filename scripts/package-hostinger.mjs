import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import JSZip from "jszip";

const skipBuild = process.argv.includes("--skip-build");

if (!skipBuild) {
  console.log("🚀 [1/2] Compilando a aplicação para produção (npm run build)...");
  const cmd = process.platform === "win32"
    ? `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096 && npm run build"`
    : `NODE_OPTIONS=--max-old-space-size=4096 npm run build`;
  execSync(cmd, { stdio: "inherit" });
} else {
  console.log("⚡ [1/2] Pulando compilação (usando .output existente)...");
}

console.log("\n📦 [2/2] Gerando pacote ultra-rápido hostinger_deploy.zip com JSZip...");
const startTime = Date.now();
const zip = new JSZip();

function addDirectoryToZip(dirPath, zipFolder) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      addDirectoryToZip(fullPath, zipFolder.folder(entry.name));
    } else if (entry.isFile()) {
      zipFolder.file(entry.name, fs.readFileSync(fullPath));
    }
  }
}

if (!fs.existsSync("./.output")) {
  console.error("❌ Erro: Diretório .output não encontrado! Execute npm run build antes.");
  process.exit(1);
}

// Adiciona o conteúdo de .output (server/, public/, nitro.json, etc.) diretamente na raiz
console.log("  -> Adicionando servidor SSR e assets compilados...");
addDirectoryToZip("./.output", zip);

// Arquivos de apoio
if (fs.existsSync("./hostinger.mjs")) {
  zip.file("hostinger.mjs", fs.readFileSync("./hostinger.mjs"));
}
if (fs.existsSync("./package.json")) {
  zip.file("package.json", fs.readFileSync("./package.json"));
}
if (fs.existsSync("./.env")) {
  console.log("  -> Incluindo variáveis de ambiente (.env)...");
  zip.file(".env", fs.readFileSync("./.env"));
}
if (fs.existsSync("./supabase/schema_completo.sql")) {
  console.log("  -> Incluindo schema do banco (schema_banco_de_dados.sql)...");
  zip.file("schema_banco_de_dados.sql", fs.readFileSync("./supabase/schema_completo.sql"));
}
if (fs.existsSync("./.htaccess")) {
  console.log("  -> Incluindo configuração de servidor (.htaccess)...");
  zip.file(".htaccess", fs.readFileSync("./.htaccess"));
}

console.log("  -> Compactando dados em buffer DEFLATE...");
const zipBuffer = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 6 },
});

const zipPath = path.resolve("./hostinger_deploy.zip");
fs.writeFileSync(zipPath, zipBuffer);

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
const sizeMb = (zipBuffer.length / (1024 * 1024)).toFixed(2);

console.log(`\n✅ Pacote gerado com sucesso em ${elapsed}s!`);
console.log(`📁 Arquivo: hostinger_deploy.zip (${sizeMb} MB)`);
console.log(`👉 Pronto para envio via FTP.`);
