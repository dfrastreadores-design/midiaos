// ==============================================================================
// TESTES DE INTEGRAÇÃO REAL HTTP / POSTGREST - ETAPA 6: HOMOLOGAÇÃO
// Projeto: midia.OS (D:\midiaos_build)
// Modo de Execução: Validação estrita de configuração, contratos e requisições.
// REGRAS MANDATÓRIAS:
//   1. NUNCA se conecta à produção (tvniawyweymutjiybxyo / midiaos.online).
//   2. Exige Project ID de staging explicitamente autorizado e consistente com a URL.
//   3. Aborta imediatamente em caso de ausência, inconsistência ou tentativa de conexão indevida.
//   4. NUNCA exibe chaves secretas ou credenciais nos logs.
//   5. ZERO conexão de rede durante a validação de configuração.
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('====================================================================');
console.log('🌐 VALIDAÇÃO DE CONFIGURAÇÃO DE STAGING - ETAPA 6: HOMOLOGAÇÃO');
console.log('====================================================================\n');

// ------------------------------------------------------------------------------
// 1. CARREGAR .env.staging CASO EXISTA LOCALMENTE
// ------------------------------------------------------------------------------
const envStagingPath = path.join(process.cwd(), '.env.staging');
if (fs.existsSync(envStagingPath)) {
  try {
    process.loadEnvFile(envStagingPath);
  } catch (err) {
    console.warn(`[AVISO] Falha ao ler .env.staging: ${err.message}`);
  }
}

// ------------------------------------------------------------------------------
// 2. CONSTANTES DE PRODUÇÃO (PROIBIÇÃO ABSOLUTA)
// ------------------------------------------------------------------------------
const PROD_PROJECT_ID = 'tvniawyweymutjiybxyo';
const PROD_DOMAINS = ['midiaos.online', 'tvniawyweymutjiybxyo.supabase.co', 'tvniawyweymutjiybxyo'];
const PROD_URL_CONFIGURADA = process.env.SUPABASE_URL || 'https://tvniawyweymutjiybxyo.supabase.co';

// ------------------------------------------------------------------------------
// 3. LEITURA DE VARIÁVEIS DO AMBIENTE DE HOMOLOGAÇÃO
// ------------------------------------------------------------------------------
const AUTHORIZED_STAGING_PROJECT_ID = process.env.AUTHORIZED_STAGING_PROJECT_ID;
const STAGING_PROJECT_ID = process.env.SUPABASE_STAGING_PROJECT_ID;
const STAGING_URL = process.env.SUPABASE_STAGING_URL;
// Suporte unificado para chave pública: legado (ANON_KEY) ou moderno (PUBLISHABLE_KEY)
const STAGING_PUBLIC_KEY = process.env.SUPABASE_STAGING_ANON_KEY || process.env.SUPABASE_STAGING_PUBLISHABLE_KEY;
const STAGING_SERVICE_ROLE_KEY = process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY;

// ------------------------------------------------------------------------------
// 4. FUNÇÕES DE SUPORTE A FORMATO E MASCARAMENTO SEGURO (NUNCA EXIBE SEGREDOS)
// ------------------------------------------------------------------------------
export function detectarFormatoChavePublica(chave) {
  if (!chave || chave.trim() === '') {
    return { tipo: 'VAZIA', valido: false, descricao: 'Não informada' };
  }
  const limpa = chave.trim();
  if (limpa.startsWith('sb_publishable_')) {
    return { tipo: 'PUBLISHABLE', valido: true, descricao: 'Publishable API Key moderna do Supabase (sb_publishable_...)' };
  }
  if (limpa.startsWith('eyJ')) {
    return { tipo: 'LEGACY_JWT_ANON', valido: true, descricao: 'Chave Anon legada em formato JWT (eyJ...)' };
  }
  return { tipo: 'DESCONHECIDO', valido: false, descricao: 'Formato não reconhecido (esperado sb_publishable_... ou eyJ...)' };
}

function formatarStatusSegredo(chave, nomeVar, tipo = 'geral') {
  if (!chave || chave.trim() === '') {
    return `❌ ${nomeVar}: PENDENTE (não configurado no .env.staging local)`;
  }
  const tamanho = chave.trim().length;
  if (tipo === 'publica') {
    const info = detectarFormatoChavePublica(chave);
    if (info.valido) {
      return `✅ ${nomeVar}: PRESENTE (${info.descricao}, ${tamanho} caracteres, valor protegido)`;
    }
    return `⚠️ ${nomeVar}: FORMATO INCOMUM (${info.descricao}, ${tamanho} caracteres, valor protegido)`;
  }
  return `✅ ${nomeVar}: PRESENTE (${tamanho} caracteres, valor protegido)`;
}

// ------------------------------------------------------------------------------
// 5. VALIDAÇÃO RIGOROSA DE CONFIGURAÇÃO SEM CONEXÃO DE REDE
// ------------------------------------------------------------------------------
export function validarConfiguracaoStaging() {
  console.log('🔍 Executando inspeção estática de configuração do ambiente de staging...\n');

  let erros = [];

  // A. Conferir AUTHORIZED_STAGING_PROJECT_ID
  console.log(`1. Project ID Autorizado pelo Operador: ${AUTHORIZED_STAGING_PROJECT_ID || '❌ NÃO DEFINIDO'}`);
  if (!AUTHORIZED_STAGING_PROJECT_ID) {
    erros.push('AUTHORIZED_STAGING_PROJECT_ID não está configurado.');
  }

  // B. Conferir SUPABASE_STAGING_PROJECT_ID
  console.log(`2. Project ID Configurado para Staging: ${STAGING_PROJECT_ID || '❌ NÃO DEFINIDO'}`);
  if (!STAGING_PROJECT_ID) {
    erros.push('SUPABASE_STAGING_PROJECT_ID não está configurado.');
  } else if (AUTHORIZED_STAGING_PROJECT_ID && STAGING_PROJECT_ID !== AUTHORIZED_STAGING_PROJECT_ID) {
    erros.push(`SUPABASE_STAGING_PROJECT_ID (${STAGING_PROJECT_ID}) diverge de AUTHORIZED_STAGING_PROJECT_ID (${AUTHORIZED_STAGING_PROJECT_ID}).`);
  }

  // C. Conferir SUPABASE_STAGING_URL
  console.log(`3. URL Configurada para Staging:       ${STAGING_URL || '❌ NÃO DEFINIDO'}`);
  if (!STAGING_URL) {
    erros.push('SUPABASE_STAGING_URL não está configurada.');
  } else {
    try {
      const parsed = new URL(STAGING_URL);
      const subdominio = parsed.hostname.split('.')[0];
      if (parsed.hostname.endsWith('.supabase.co') && subdominio !== STAGING_PROJECT_ID) {
        erros.push(`Subdomínio da URL (${subdominio}) não coincide com o Project ID (${STAGING_PROJECT_ID}).`);
      }
    } catch {
      erros.push('SUPABASE_STAGING_URL possui formato inválido.');
    }
  }

  // D. Blindagem Contra Produção
  const apontaProducao = (STAGING_PROJECT_ID && STAGING_PROJECT_ID.toLowerCase() === PROD_PROJECT_ID.toLowerCase())
    || (STAGING_URL && PROD_DOMAINS.some((d) => STAGING_URL.toLowerCase().includes(d.toLowerCase())))
    || (STAGING_URL && STAGING_URL.toLowerCase() === PROD_URL_CONFIGURADA.toLowerCase());

  console.log(`4. Isolamento em Relação à Produção:    ${apontaProducao ? '❌ VAZAMENTO DETECTADO' : '✅ 100% ISOLADO (tvniawyweymutjiybxyo bloqueado)'}`);
  if (apontaProducao) {
    erros.push('Variáveis de staging apontam indevidamente para o projeto de produção.');
  }

  // E. Conferência de Credenciais de Acesso (Anon / Publishable / Service Role)
  console.log('\n5. Verificação de Presença das Credenciais de Staging (Valores Redigidos):');
  console.log(`   ${formatarStatusSegredo(STAGING_PUBLIC_KEY, 'CHAVE PÚBLICA (ANON / PUBLISHABLE)', 'publica')}`);

  const temServiceRole = STAGING_SERVICE_ROLE_KEY && STAGING_SERVICE_ROLE_KEY.trim() !== '';
  if (temServiceRole) {
    console.log(`   ${formatarStatusSegredo(STAGING_SERVICE_ROLE_KEY, 'SUPABASE_STAGING_SERVICE_ROLE_KEY')}`);
  } else {
    console.log('   ℹ️ SUPABASE_STAGING_SERVICE_ROLE_KEY: NÃO INFORMADA (Opcional - Princípio do Menor Privilégio)');
    console.log('      • Testes de RLS avaliam o isolamento real sob credenciais de usuários e tokens simulados;');
    console.log('      • O uso de service_role contorna o RLS (bypassrls), sendo dispensável e desaconselhado nesses testes;');
    console.log('      • A criação das tabelas e políticas é realizada pelo SQL Editor no painel Supabase.');
  }

  const formatoPublico = detectarFormatoChavePublica(STAGING_PUBLIC_KEY);
  if (!STAGING_PUBLIC_KEY || STAGING_PUBLIC_KEY.trim() === '') {
    erros.push('Chave pública de staging (SUPABASE_STAGING_ANON_KEY ou SUPABASE_STAGING_PUBLISHABLE_KEY) não está configurada no .env.staging.');
  } else if (!formatoPublico.valido) {
    erros.push(`Chave pública de staging possui formato inválido: ${formatoPublico.descricao}.`);
  }

  // Retorno
  if (erros.length > 0) {
    console.log('\n--------------------------------------------------------------------');
    console.log('⚠️  RESULTADO DA VALIDAÇÃO: PENDÊNCIAS ENCONTRADAS (ZERO CONEXÃO DE REDE)');
    erros.forEach((e) => console.log(`   • ${e}`));
    console.log('--------------------------------------------------------------------\n');
    return { ok: false, erros };
  }

  console.log('\n--------------------------------------------------------------------');
  console.log('✅ RESULTADO DA VALIDAÇÃO: CONFIGURAÇÃO DE STAGING 100% VÁLIDA E ISOLADA');
  console.log('   Nenhuma conexão de rede foi realizada.');
  console.log('--------------------------------------------------------------------\n');
  return { ok: true, erros: [] };
}

// Execução imediata da validação
const resultado = validarConfiguracaoStaging();
if (!resultado.ok) {
  process.exit(1);
}

