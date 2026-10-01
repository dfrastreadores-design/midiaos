import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const skipBuild = process.argv.includes("--skip-build");

if (!skipBuild) {
  console.log("🚀 [1/2] Compilando a aplicação para produção (npm run build)...");
  const cmd =
    process.platform === "win32"
      ? `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096 && npm run build"`
      : `NODE_OPTIONS=--max-old-space-size=4096 npm run build`;
  execSync(cmd, { stdio: "inherit" });
} else {
  console.log("⚡ [1/2] Pulando compilação (usando .output existente)...");
}

console.log("\n📦 [2/2] Gerando pacote ultra-rápido hostinger_deploy.zip...");
const startTime = Date.now();

let outputDir = "./.output";
if (fs.existsSync("D:\\midiaos_build\\.output")) {
  outputDir = "D:\\midiaos_build\\.output";
  console.log("⚡ Usando .output de alta velocidade diretamente de D:\\midiaos_build\\.output");
} else if (!fs.existsSync(outputDir)) {
  console.error("❌ Erro: Diretório .output não encontrado! Execute npm run build antes.");
  process.exit(1);
}

// Criar diretório temporário de staging
const stagingDir = path.join(process.env.TEMP || "./node_modules/.cache", "hostinger_staging_" + Date.now());
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

try {
  console.log("  -> Copiando arquivos do servidor SSR e assets...");
  fs.cpSync(outputDir, stagingDir, { recursive: true });
  const pubDir = path.join(outputDir, "public");
  if (fs.existsSync(pubDir)) {
    fs.cpSync(pubDir, stagingDir, { recursive: true });
  }

  // Arquivos adicionais na raiz do pacote
  if (fs.existsSync("./hostinger.mjs")) {
    fs.copyFileSync("./hostinger.mjs", path.join(stagingDir, "hostinger.mjs"));
  }
  if (fs.existsSync("./package.json")) {
    fs.copyFileSync("./package.json", path.join(stagingDir, "package.json"));
  }
  if (fs.existsSync("./.env")) {
    console.log("  -> Incluindo variáveis de ambiente (.env)...");
    fs.copyFileSync("./.env", path.join(stagingDir, ".env"));
  }
  if (fs.existsSync("./supabase/schema_completo.sql")) {
    console.log("  -> Incluindo schema do banco (schema_banco_de_dados.sql)...");
    fs.copyFileSync("./supabase/schema_completo.sql", path.join(stagingDir, "schema_banco_de_dados.sql"));
  }
  if (fs.existsSync("./.htaccess")) {
    console.log("  -> Incluindo configuração de servidor (.htaccess)...");
    fs.copyFileSync("./.htaccess", path.join(stagingDir, ".htaccess"));
  }

  const zipPath = path.resolve("./hostinger_deploy.zip");
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
  }

  console.log("  -> Compactando pacote com alta performance...");
  // Usar tar.exe nativo do Windows (libarchive com suporte a ZIP)
  execSync(`tar.exe -a -cf "${zipPath}" -C "${stagingDir}" .`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);

  console.log(`\n✅ Pacote gerado com sucesso em ${elapsed}s!`);
  console.log(`📁 Arquivo: hostinger_deploy.zip (${sizeMb} MB)`);
  console.log(`👉 Pronto para envio via FTP.`);
} finally {
  try {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  } catch (e) {
    // Ignora se o temp estiver em uso
  }
}
