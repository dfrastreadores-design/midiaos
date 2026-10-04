import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import https from "node:https";
import http from "node:http";

const DEPLOY_TOKEN = "midiaos_deploy_sec_9938210491823712";
const APP_URL = "https://midiaos.online";

console.log("====================================================");
console.log("🚀 DEPLOY AUTOMÁTICO DE ALTA VELOCIDADE - HOSTINGER");
console.log("====================================================");

// Ler .env
let ftpHost = process.env.HOSTINGER_FTP_HOST;
let ftpUser = process.env.HOSTINGER_FTP_USER;
let ftpPass = process.env.HOSTINGER_FTP_PASS;

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...v] = trimmed.split("=");
    const val = v
      .join("=")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (k.trim() === "HOSTINGER_FTP_HOST" && !ftpHost) ftpHost = val;
    if (k.trim() === "HOSTINGER_FTP_USER" && !ftpUser) ftpUser = val;
    if (k.trim() === "HOSTINGER_FTP_PASS" && !ftpPass) ftpPass = val;
  }
}

if (!ftpHost || !ftpUser || !ftpPass) {
  console.error("❌ Credenciais de FTP não encontradas no arquivo .env!");
  console.error("Configure HOSTINGER_FTP_HOST, HOSTINGER_FTP_USER e HOSTINGER_FTP_PASS.");
  process.exit(1);
}

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const startTime = Date.now();

// [1/4] Build da aplicação
if (!skipBuild) {
  console.log("\n📦 [1/4] Compilando a aplicação para produção (npm run build)...");
  const buildCmd =
    process.platform === "win32"
      ? `cmd /c "set NODE_OPTIONS=--max-old-space-size=4096 && npm run build"`
      : `NODE_OPTIONS=--max-old-space-size=4096 npm run build`;
  execSync(buildCmd, { stdio: "inherit" });
} else {
  console.log("\n⚡ [1/4] Pulando compilação (usando .output existente)...");
}

// [2/4] Compactar arquivos
console.log("\n🗜️  [2/4] Gerando pacote ultra-rápido hostinger_deploy.zip...");
execSync("node scripts/package-hostinger.mjs --skip-build", { stdio: "inherit" });

const zipPath = path.resolve("./hostinger_deploy.zip");
if (!fs.existsSync(zipPath)) {
  console.error("❌ Falha: hostinger_deploy.zip não foi gerado!");
  process.exit(1);
}
const zipSizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);

// [3/4] Envio via FTP com curl
console.log(`\n🌐 [3/4] Enviando arquivos para Hostinger FTP (${ftpHost})...`);

// 3.1 Enviar deploy_api.php
console.log("  -> Enviando scripts/deploy_api.php...");
const apiUpload = spawnSync(
  "curl.exe",
  [
    "-s",
    "-k",
    "-u",
    `${ftpUser}:${ftpPass}`,
    "-T",
    "scripts/deploy_api.php",
    `ftp://${ftpHost}/deploy_api.php`,
  ],
  { stdio: "inherit" },
);

if (apiUpload.status !== 0) {
  console.error("❌ Erro ao enviar deploy_api.php via FTP!");
  process.exit(1);
}

if (fs.existsSync(".htaccess")) {
  console.log("  -> Enviando .htaccess...");
  spawnSync("curl.exe", [
    "-s",
    "-k",
    "-u",
    `${ftpUser}:${ftpPass}`,
    "-T",
    ".htaccess",
    `ftp://${ftpHost}/.htaccess`,
  ]);
}

if (fs.existsSync(".env")) {
  console.log("  -> Enviando .env...");
  spawnSync("curl.exe", [
    "-s",
    "-k",
    "-u",
    `${ftpUser}:${ftpPass}`,
    "-T",
    ".env",
    `ftp://${ftpHost}/.env`,
  ]);
}

// 3.2 Enviar hostinger_deploy.zip (fluxo contínuo com progresso)
console.log(`  -> Enviando hostinger_deploy.zip (${zipSizeMb} MB)...`);
const uploadStart = Date.now();
const zipUpload = spawnSync(
  "curl.exe",
  [
    "--progress-bar",
    "-k",
    "-u",
    `${ftpUser}:${ftpPass}`,
    "-T",
    "hostinger_deploy.zip",
    `ftp://${ftpHost}/hostinger_deploy.zip`,
  ],
  { stdio: "inherit" },
);

if (zipUpload.status !== 0) {
  console.error("❌ Erro ao enviar hostinger_deploy.zip via FTP!");
  process.exit(1);
}
const uploadElapsed = ((Date.now() - uploadStart) / 1000).toFixed(1);
console.log(`  ✅ Upload concluído em ${uploadElapsed}s!`);

// [4/4] Disparo do deploy atômico no servidor
console.log("\n⚡ [4/4] Executando extração e reiniciando aplicação no servidor...");

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      })
      .on("error", reject);
  });
}

try {
  const triggerUrl = `${APP_URL}/deploy_api.php?token=${DEPLOY_TOKEN}&action=extract`;
  const result = await requestJson(triggerUrl);

  if (result.status === 200 && result.body && result.body.success) {
    console.log("  ✅ Extração realizada com sucesso no servidor!");
    console.log(`  📦 Arquivos atualizados: ${result.body.files_extracted}`);
    console.log(
      `  🔄 Passenger/Node.js reiniciado: ${result.body.passenger_restarted ? "SIM" : "OK"}`,
    );

    // [5/5] Limpeza de arquivos temporários locais e remotos
    console.log("\n🧹 [5/5] Executando higienização pós-deploy (removendo zips temporários)...");
    
    // 5.1 Limpeza remota
    try {
      const cleanUrl = `${APP_URL}/deploy_api.php?token=${DEPLOY_TOKEN}&action=cleanup`;
      const cleanRes = await requestJson(cleanUrl);
      if (cleanRes.status === 200 && cleanRes.body?.success) {
        console.log("  ✅ Arquivo hostinger_deploy.zip removido do servidor com sucesso!");
      }
    } catch (cleanErr) {
      console.warn("  ⚠️ Aviso ao solicitar limpeza remota:", cleanErr.message);
    }

    // 5.2 Limpeza local
    if (fs.existsSync(zipPath)) {
      fs.rmSync(zipPath, { force: true });
      console.log("  ✅ Arquivo local hostinger_deploy.zip removido com sucesso!");
    }
  } else {
    console.warn("  ⚠️ Resposta do deploy:", result.body || result.raw);
  }
} catch (err) {
  console.error("  ⚠️ Aviso ao chamar trigger de extração:", err.message);
} finally {
  // Garantir que o zip local nunca permaneça no repositório
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
    console.log("  🧹 Limpeza de segurança: arquivo local hostinger_deploy.zip eliminado.");
  }
}

// Verificação final do site
console.log("\n🔍 Verificando status do site no ar...");
try {
  const verifyRes = await new Promise((resolve, reject) => {
    https
      .get(APP_URL, { rejectUnauthorized: false }, (res) => {
        resolve(res.statusCode);
      })
      .on("error", reject);
  });

  if (verifyRes === 200) {
    console.log(`  ✅ ${APP_URL} respondendo com HTTP 200 OK!`);
  } else {
    console.log(`  ℹ️ ${APP_URL} retornou código HTTP ${verifyRes}`);
  }
} catch (err) {
  console.log(`  ℹ️ Verificação do site: ${err.message}`);
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log("\n====================================================");
console.log("🎉 DEPLOY NA HOSTINGER FINALIZADO COM SUCESSO!");
console.log(`⏱️  Tempo total de execução: ${totalTime}s`);
console.log(`🔗 Aplicação online: ${APP_URL}`);
console.log("====================================================");

