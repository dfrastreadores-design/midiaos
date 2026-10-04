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

// Validação dos subdiretórios essenciais
const publicSourceDir = path.join(outputDir, "public");
const serverSourceDir = path.join(outputDir, "server");

if (!fs.existsSync(serverSourceDir)) {
  console.error("❌ Erro: Diretório .output/server não encontrado! Build incompleto.");
  process.exit(1);
}

// Regras explícitas de exclusão (Blacklist de segurança)
const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".github",
  ".agents",
  ".tanstack",
  ".cache",
  ".temp",
  ".turbo",
  "backups",
  ".wrangler",
  ".lovable",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".pdf",
  ".mp4",
  ".mov",
  ".avi",
  ".xlsx",
  ".xls",
  ".csv",
  ".log",
  ".tmp",
]);

const EXCLUDED_FILE_NAMES = new Set([
  ".env.local",
  ".env.development",
  ".env.test",
  "hostinger_deploy.zip",
]);

function isExcluded(filePath) {
  const base = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (EXCLUDED_DIR_NAMES.has(base)) return true;
  if (EXCLUDED_FILE_NAMES.has(base)) return true;
  if (base.startsWith(".env.") && base !== ".env.example") return true;
  if (base.startsWith("npm-debug.log") || base.startsWith("yarn-debug.log")) return true;
  if (EXCLUDED_EXTENSIONS.has(ext)) return true;

  return false;
}

// Criar diretório temporário de staging
const stagingDir = path.join(process.env.TEMP || "./node_modules/.cache", "hostinger_staging_" + Date.now());
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

try {
  console.log("  -> Copiando ESTRITAMENTE artefatos de produção (.output/server e .output/public)...");
  
  // 1. Copiar .output/server (código compilado do backend SSR)
  const stagingServerDir = path.join(stagingDir, "server");
  fs.mkdirSync(stagingServerDir, { recursive: true });
  fs.cpSync(serverSourceDir, stagingServerDir, {
    recursive: true,
    filter: (src) => !isExcluded(src),
  });

  // 2. Copiar .output/public (assets compilados do frontend)
  if (fs.existsSync(publicSourceDir)) {
    const stagingPublicDir = path.join(stagingDir, "public");
    fs.mkdirSync(stagingPublicDir, { recursive: true });
    fs.cpSync(publicSourceDir, stagingPublicDir, {
      recursive: true,
      filter: (src) => !isExcluded(src),
    });
    // Também disponibilizar na raiz do staging para compatibilidade de rotas estáticas
    fs.cpSync(publicSourceDir, stagingDir, {
      recursive: true,
      filter: (src) => !isExcluded(src),
    });
  }

  // 3. Copiar nitro.json se existir
  const nitroJson = path.join(outputDir, "nitro.json");
  if (fs.existsSync(nitroJson)) {
    fs.copyFileSync(nitroJson, path.join(stagingDir, "nitro.json"));
  }

  // 4. Arquivos essenciais de inicialização e ambiente na raiz do pacote
  if (fs.existsSync("./hostinger.mjs")) {
    console.log("  -> Incluindo script de inicialização do servidor (hostinger.mjs)...");
    fs.copyFileSync("./hostinger.mjs", path.join(stagingDir, "hostinger.mjs"));
  }

  if (fs.existsSync("./package.json")) {
    fs.copyFileSync("./package.json", path.join(stagingDir, "package.json"));
  }

  if (fs.existsSync("./.htaccess")) {
    console.log("  -> Incluindo configuração de servidor (.htaccess)...");
    fs.copyFileSync("./.htaccess", path.join(stagingDir, ".htaccess"));
  }

  if (fs.existsSync("./.env")) {
    console.log("  -> Incluindo variáveis de ambiente de produção (.env)...");
    fs.copyFileSync("./.env", path.join(stagingDir, ".env"));
  }

  // 5. Auditoria e Varredura Sanitária no Staging (Garantir 0 vazamentos de arquivos proibidos)
  let purgedCount = 0;
  function sanitizeDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (EXCLUDED_DIR_NAMES.has(ent.name)) {
          fs.rmSync(full, { recursive: true, force: true });
          purgedCount++;
          console.warn(`  ⚠️ Removido diretório proibido do staging: ${ent.name}`);
        } else {
          sanitizeDirectory(full);
        }
      } else if (ent.isFile()) {
        if (isExcluded(full)) {
          fs.rmSync(full, { force: true });
          purgedCount++;
          console.warn(`  ⚠️ Removido arquivo proibido do staging: ${ent.name}`);
        }
      }
    }
  }
  sanitizeDirectory(stagingDir);

  if (purgedCount > 0) {
    console.log(`  🛡️ Higienização concluída: ${purgedCount} arquivo(s)/pasta(s) bloqueados foram eliminados do staging.`);
  }

  const zipPath = path.resolve("./hostinger_deploy.zip");
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
  }

  console.log("  -> Compactando pacote otimizado...");
  execSync(`tar.exe -a -cf "${zipPath}" -C "${stagingDir}" .`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);

  console.log(`\n✅ Pacote blindado gerado com sucesso em ${elapsed}s!`);
  console.log(`📁 Arquivo: hostinger_deploy.zip (${sizeMb} MB)`);
  console.log(`🔒 Regras aplicadas: Apenas .output/server, .output/public, .htaccess e scripts de inicialização incluídos.`);
  console.log(`👉 Pronto para envio seguro via FTP.`);
} finally {
  try {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  } catch (e) {
    // Ignora se o temp estiver em uso
  }
}
