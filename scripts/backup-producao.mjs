#!/usr/bin/env node
/**
 * Script de Backup Local de Produção — Mídia.OS
 *
 * Executa exportação completa de segurança de todas as tabelas vitais para JSON local.
 * Uso:
 *   node scripts/backup-producao.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Carrega .env simples se existir
function loadEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return {};
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

const env = { ...process.env, ...loadEnv() };

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Erro: SUPABASE_URL ou Chave do Supabase não encontradas no arquivo .env");
  process.exit(1);
}

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
];

async function fetchTable(table) {
  const endpoint = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
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
}

async function main() {
  console.log("=================================================");
  console.log("🔒 INICIANDO BACKUP DE DADOS DE PRODUÇÃO - MÍDIA.OS");
  console.log(`URL: ${SUPABASE_URL}`);
  console.log("=================================================");

  const backupsDir = path.join(rootDir, "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-midiaos-${dateStr}.json`;
  const filePath = path.join(backupsDir, fileName);

  const backupPayload = {
    metadata: {
      data_iso: now.toISOString(),
      timestamp: now.getTime(),
      url: SUPABASE_URL,
      versao: "1.0-producao",
    },
    tabelas: {},
    resumo: {},
  };

  let totalLinhas = 0;

  for (const tabela of TABELAS) {
    process.stdout.write(`Exportando [${tabela.padEnd(25, " ")}] ... `);
    const { error, rows } = await fetchTable(tabela);

    if (error) {
      console.log(`⚠️ Ignorado (${error})`);
      backupPayload.resumo[tabela] = { status: "erro", erro: error, count: 0 };
    } else {
      console.log(`✅ ${rows.length} registros`);
      backupPayload.tabelas[tabela] = rows;
      backupPayload.resumo[tabela] = { status: "ok", count: rows.length };
      totalLinhas += rows.length;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), "utf8");

  const stat = fs.statSync(filePath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

  console.log("=================================================");
  console.log("✅ BACKUP CONCLUÍDO COM SUCESSO!");
  console.log(`📁 Arquivo: ${filePath}`);
  console.log(`📊 Total de registros salvos: ${totalLinhas}`);
  console.log(`💾 Tamanho do arquivo: ${sizeMb} MB`);
  console.log("=================================================");
}

main().catch((err) => {
  console.error("❌ Falha crítica no backup:", err);
  process.exit(1);
});
