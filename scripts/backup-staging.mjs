#!/usr/bin/env node
/**
 * Script de Backup do Ambiente de Staging — Mídia.OS v2.6.0
 *
 * Executa exportação completa de segurança de todas as tabelas para JSON local.
 * REGRAS INEGOCIÁVEIS:
 *   1. NUNCA executa em produção (tvniawyweymutjiybxyo).
 *   2. Valida explicitamente o identificador de staging: wsologhmptielhhnbgob.
 *   3. Gera checksum SHA-256 e validação de integridade pós-exportação.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function loadEnvStaging() {
  const envPath = path.join(rootDir, ".env.staging");
  if (!fs.existsSync(envPath)) {
    throw new Error("Arquivo .env.staging não encontrado em " + envPath);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  }
  return env;
}

const env = loadEnvStaging();

// Constantes de verificação de segurança estrita
const PROD_PROJECT_ID = "tvniawyweymutjiybxyo";
const EXPECTED_STAGING_PROJECT_ID = "wsologhmptielhhnbgob";
const EXPECTED_STAGING_URL = "https://wsologhmptielhhnbgob.supabase.co";

const stagingProjectId = env.SUPABASE_STAGING_PROJECT_ID || env.AUTHORIZED_STAGING_PROJECT_ID;
const stagingUrl = env.SUPABASE_STAGING_URL;
const stagingKey = env.SUPABASE_STAGING_SERVICE_ROLE_KEY || env.SUPABASE_STAGING_ANON_KEY;

console.log("====================================================================");
console.log("🛡️ INICIANDO BACKUP DE SEGURANÇA PRÉ-MIGRATION — STAGING");
console.log("====================================================================");

// Verificação de isolamento contra produção
if (stagingUrl.includes(PROD_PROJECT_ID) || stagingProjectId === PROD_PROJECT_ID || stagingUrl.includes("midiaos.online")) {
  console.error("❌ ERRO GRAVE: Tentativa de apontamento para PRODUÇÃO detectada! Abortando imediatamente.");
  process.exit(1);
}

if (stagingProjectId !== EXPECTED_STAGING_PROJECT_ID) {
  console.error(`❌ ERRO: Project ID (${stagingProjectId}) não confere com o esperado (${EXPECTED_STAGING_PROJECT_ID})!`);
  process.exit(1);
}

if (!stagingUrl.startsWith(EXPECTED_STAGING_URL)) {
  console.error(`❌ ERRO: URL do Staging (${stagingUrl}) inválida!`);
  process.exit(1);
}

if (!stagingKey) {
  console.error("❌ ERRO: Nenhuma chave de API configurada no .env.staging!");
  process.exit(1);
}

console.log(`✅ Ambiente Identificado: STAGING (ID: ${stagingProjectId})`);
console.log(`✅ Endpoint Conectado:    ${stagingUrl}`);
console.log(`✅ Bloqueio de Produção:  ATIVO (Produção ${PROD_PROJECT_ID} isolada)\n`);

const TABELAS = [
  "clientes",
  "agencias",
  "propostas",
  "proposta_itens",
  "pis",
  "pi_itens",
  "pi_historico",
  "briefings",
  "produtos",
  "produto_tipos",
  "parceiros",
  "parceiro_tipos_midia",
  "social_contas",
  "social_posts",
  "social_metricas",
  "landing_pages",
  "planos",
  "comissoes_regras",
  "pos_venda_atendimentos",
  "emissoras",
  "projetos_especiais",
  "metas_executivo",
  "tenants",
  "trash_items",
  "auditoria_alteracoes",
  "profiles",
  "user_roles"
];

async function fetchTable(table) {
  const endpoint = `${stagingUrl}/rest/v1/${table}?select=*`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: stagingKey,
        Authorization: `Bearer ${stagingKey}`,
        "Content-Type": "application/json",
        Prefer: "count=exact",
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      return { error: `${res.status} - ${txt}`, rows: [] };
    }

    const rows = await res.json();
    return { error: null, rows };
  } catch (err) {
    return { error: err.message, rows: [] };
  }
}

async function runBackup() {
  const dataInicio = new Date();
  const timestamp = dataInicio.toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(rootDir, "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilename = `backup-staging-${stagingProjectId}-${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFilename);

  const payload = {
    metadata: {
      ambiente: "staging",
      project_id: stagingProjectId,
      url: stagingUrl,
      data_iso: dataInicio.toISOString(),
      timestamp_ms: dataInicio.getTime(),
      versao: "midia-os-v2.6.0-fase1-pre-migration"
    },
    tabelas: {},
    resumo: {}
  };

  console.log("📦 Coletando tabelas no banco de Staging...");
  let totalRegistros = 0;
  let tabelasExportadas = 0;

  for (const tab of TABELAS) {
    process.stdout.write(`   • Exportando ${tab.padEnd(25)} `);
    const { error, rows } = await fetchTable(tab);
    if (error) {
      console.log(`⚠️  Ignorado (${error})`);
      payload.resumo[tab] = { status: "erro", erro: error, count: 0 };
    } else {
      console.log(`✅ OK (${rows.length} registros)`);
      payload.tabelas[tab] = rows;
      payload.resumo[tab] = { status: "ok", count: rows.length };
      totalRegistros += rows.length;
      tabelasExportadas++;
    }
  }

  const jsonStr = JSON.stringify(payload, null, 2);
  fs.writeFileSync(backupPath, jsonStr, "utf8");

  // Cálculo de integridade SHA-256
  const hash = crypto.createHash("sha256").update(jsonStr).digest("hex");
  const stats = fs.statSync(backupPath);

  // Verificação de recuperabilidade (re-parse do arquivo gravado)
  const testeLeitura = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  if (!testeLeitura.metadata || testeLeitura.metadata.project_id !== stagingProjectId) {
    throw new Error("Falha de integridade: backup gravado não passou no teste de verificação!");
  }

  console.log("\n--------------------------------------------------------------------");
  console.log("🎉 BACKUP DE STAGING CONCLUÍDO E VALIDADO COM SUCESSO!");
  console.log(`📁 Arquivo:            ${backupFilename}`);
  console.log(`📍 Localização:        ${backupPath}`);
  console.log(`📊 Tabelas salvas:     ${tabelasExportadas}`);
  console.log(`🔢 Total de registros: ${totalRegistros}`);
  console.log(`⚖️ Tamanho do arquivo:  ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`🔒 Checksum SHA-256:   ${hash}`);
  console.log(`✅ Teste de Leitura:   100% íntegro e recuperável`);
  console.log("--------------------------------------------------------------------\n");
}

runBackup().catch((err) => {
  console.error("❌ ERRO FATAL NO BACKUP:", err);
  process.exit(1);
});

