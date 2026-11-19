import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import https from "node:https";

// 1. Carrega .env
const envPath = path.resolve(".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ Arquivo .env não encontrado!");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
let ftpHost = "";
let ftpUser = "";
let ftpPass = "";

for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const [k, ...v] = trimmed.split("=");
  const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
  if (k.trim() === "HOSTINGER_FTP_HOST") ftpHost = val;
  if (k.trim() === "HOSTINGER_FTP_USER") ftpUser = val;
  if (k.trim() === "HOSTINGER_FTP_PASS") ftpPass = val;
}

if (!ftpHost || !ftpUser || !ftpPass) {
  console.error("❌ Credenciais de FTP não encontradas no .env!");
  process.exit(1);
}

// 2. Gera novo token criptográfico seguro (256-bit)
const newToken = "midiaos_sec_" + crypto.randomBytes(32).toString("hex");
const oldToken = "midiaos_deploy_sec_9938210491823712";

// 3. Atualiza .env com o novo DEPLOY_TOKEN (sem exibir o valor)
let newEnvContent = envContent;
if (newEnvContent.includes("DEPLOY_TOKEN=")) {
  newEnvContent = newEnvContent.replace(/DEPLOY_TOKEN=.*/g, `DEPLOY_TOKEN=${newToken}`);
} else {
  newEnvContent += `\nDEPLOY_TOKEN=${newToken}\n`;
}
fs.writeFileSync(envPath, newEnvContent, "utf-8");
console.log("✅ Novo token gerado e armazenado com segurança no .env local.");

// 4. Atualiza scripts/deploy_api.php com o novo token
const deployApiPath = path.resolve("scripts/deploy_api.php");
let deployApiContent = fs.readFileSync(deployApiPath, "utf-8");
deployApiContent = deployApiContent.replace(/\$authSecret = ['"].*?['"];/, `$authSecret = '${newToken}';`);
fs.writeFileSync(deployApiPath, deployApiContent, "utf-8");
console.log("✅ Arquivo scripts/deploy_api.php atualizado localmente com o novo hash/segredo.");

// 5. Atualiza scripts/deploy-hostinger.mjs para ler exclusivamente de process.env.DEPLOY_TOKEN ou .env
const deployMjsPath = path.resolve("scripts/deploy-hostinger.mjs");
let deployMjsContent = fs.readFileSync(deployMjsPath, "utf-8");
deployMjsContent = deployMjsContent.replace(
  /const DEPLOY_TOKEN = ['"].*?['"];/,
  `// Token dinâmico lido das variáveis de ambiente / .env
let DEPLOY_TOKEN = process.env.DEPLOY_TOKEN;
if (!DEPLOY_TOKEN && fs.existsSync(".env")) {
  const envText = fs.readFileSync(".env", "utf-8");
  for (const l of envText.split("\\n")) {
    const t = l.trim();
    if (t.startsWith("DEPLOY_TOKEN=")) {
      DEPLOY_TOKEN = t.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
      break;
    }
  }
}
if (!DEPLOY_TOKEN) {
  console.error("❌ DEPLOY_TOKEN não configurado no .env!");
  process.exit(1);
}`
);
fs.writeFileSync(deployMjsPath, deployMjsContent, "utf-8");
console.log("✅ scripts/deploy-hostinger.mjs atualizado para carregar token dinamicamente do .env sem expor na fonte.");

// 6. Faz upload do scripts/deploy_api.php atualizado para o servidor Hostinger via FTP
console.log("🌐 Enviando scripts/deploy_api.php atualizado para a Hostinger via FTP...");
const uploadRes = spawnSync(
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
  { stdio: "inherit" }
);

if (uploadRes.status !== 0) {
  console.error("❌ Falha no envio FTP do deploy_api.php");
  process.exit(1);
}
console.log("✅ deploy_api.php atualizado com sucesso no servidor remoto.");

// 7. Testa a invalidação do token antigo
function testPing(token) {
  return new Promise((resolve) => {
    const req = https.request(
      "https://midiaos.online/deploy_api.php?action=ping",
      {
        method: "GET",
        headers: { "X-Deploy-Token": token },
        rejectUnauthorized: false,
      },
      (res) => {
        resolve(res.statusCode);
      }
    );
    req.on("error", () => resolve(null));
    req.end();
  });
}

const oldStatus = await testPing(oldToken);
console.log(`🔒 Teste de invalidação do token antigo: HTTP ${oldStatus} (Esperado: 403 Forbidden)`);

const newStatus = await testPing(newToken);
console.log(`🔑 Teste de autenticação com o novo token: HTTP ${newStatus} (Esperado: 200 OK)`);

if (oldStatus === 403 && newStatus === 200) {
  console.log("🎉 ROTAÇÃO DO TOKEN DE DEPLOY CONCLUÍDA COM SUCESSO TOTAL!");
} else {
  console.error("⚠️ Inconsistência nos testes de validação do token!");
  process.exit(1);
}
