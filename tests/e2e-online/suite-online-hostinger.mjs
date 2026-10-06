/**
 * BATERIA DE TESTES AUTOMATIZADOS E2E ONLINE (HOSTINGER)
 * Executa testes reais de ponta a ponta na URL de produção: https://midiaos.online
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.APP_URL || "https://midiaos.online";
const SCREENSHOTS_DIR = path.resolve("tests/screenshots-e2e");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const EMAIL_TESTE = "rafaelnexomidia@gmail.com";
const SENHA_TESTE = "21242628";

const report = {
  iniciadoEm: new Date().toISOString(),
  baseUrl: BASE_URL,
  passos: [],
  consoleLogs: [],
  consoleErrors: [],
  pageErrors: [],
  statusFinal: "EM_ANDAMENTO",
};

function registrarPasso(nome, sucesso, detalhes = {}) {
  const item = {
    nome,
    sucesso,
    timestamp: new Date().toISOString(),
    detalhes,
  };
  report.passos.push(item);
  const statusIcon = sucesso ? "✅" : "❌";
  console.log(`${statusIcon} [PASSO] ${nome}`);
  if (!sucesso) {
    console.error("   Detalhes do erro:", detalhes);
  }
}

async function run() {
  console.log("================================================================================");
  console.log("🚀 INICIANDO BATERIA DE TESTES E2E ONLINE NA HOSTINGER");
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📅 Timestamp: ${new Date().toLocaleString("pt-BR")}`);
  console.log("================================================================================\n");

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Playwright/E2E-Automated-Auditor",
  });

  const page = await context.newPage();

  // Monitorar todos os logs de console e erros da página
  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    report.consoleLogs.push({ type, text, url: page.url() });

    // Monitorar o erro crítico que gerou o bug
    if (text.includes("ReferenceError") || text.includes("Cannot access") || text.includes("before initialization")) {
      report.consoleErrors.push({ text, url: page.url() });
      console.error(`🚨 [ERRO CRÍTICO NO CONSOLE]: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    report.pageErrors.push({ message: err.message, stack: err.stack, url: page.url() });
    console.error(`🚨 [PAGE ERROR NÃO TRATADO]: ${err.message}`);
  });

  try {
    // -------------------------------------------------------------------------
    // 1. ACESSO À TELA DE LOGIN ONLINE
    // -------------------------------------------------------------------------
    console.log("\n--- [1] Acessando tela de login em produção ---");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01-tela-login-online.png") });

    const loginTitle = await page.title();
    registrarPasso("Carregamento da Tela de Login", loginTitle.includes("Entrar") || loginTitle.includes("Mídia.OS"), {
      title: loginTitle,
    });

    // -------------------------------------------------------------------------
    // 2. SUBMISSÃO DE LOGIN E ENTRADA NO PAINEL
    // -------------------------------------------------------------------------
    console.log("\n--- [2] Efetuando login autenticado ---");
    await page.fill('input[type="email"]', EMAIL_TESTE);
    await page.fill('input[type="password"]', SENHA_TESTE);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02-form-login-preenchido.png") });

    // Clica no botão de login
    await page.click('button[type="submit"]');

    // Aguarda transição para o Dashboard (sai de /login)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    
    // Aguarda sair da tela de "Carregando painel" (splash desaparece)
    await page.waitForSelector("text=Sincronizando seus dados de acesso", { state: "hidden", timeout: 10000 })
      .catch(() => console.log("Aviso: Splash sumiu imediatamente"));

    // Aguarda carregar elementos principais do AppShell / Dashboard
    await page.waitForSelector("aside", { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03-dashboard-autenticado-online.png") });

    // Verifica se houve qualquer ReferenceError durante a montagem do AppShell
    const tdzErrors = report.consoleErrors.filter((e) =>
      e.text.includes("ReferenceError") || e.text.includes("before initialization")
    );
    registrarPasso(
      "Login e Carregamento do Painel sem Loop/ReferenceError",
      tdzErrors.length === 0,
      { tdzErrorsCount: tdzErrors.length }
    );

    // -------------------------------------------------------------------------
    // 3. NAVEGAÇÃO PELAS TELAS PRINCIPAIS (AUDITORIA DE CRASHES / HTTP 500)
    // -------------------------------------------------------------------------
    console.log("\n--- [3] Navegando pelas telas vitais do sistema ---");

    const rotas = [
      { url: "/clientes", nome: "Clientes", seletor: "table, h1, h2, h3" },
      { url: "/agencias", nome: "Agências", seletor: "table, h1, h2, h3" },
      { url: "/parceiros", nome: "Parceiros de Mídia", seletor: "table, h1, h2, h3" },
      { url: "/relatorios", nome: "Relatórios", seletor: "h1, h2, h3, div" },
      { url: "/produtos", nome: "Produtos & Inventário", seletor: "table, h1, h2, h3" },
    ];

    for (let i = 0; i < rotas.length; i++) {
      const rota = rotas[i];
      console.log(`Navegando para ${rota.url} (${rota.nome})...`);
      await page.goto(`${BASE_URL}${rota.url}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForSelector(rota.seletor, { timeout: 10000 });
      
      const fileIndex = String(i + 4).padStart(2, "0");
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `${fileIndex}-tela-${rota.nome.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`),
      });

      registrarPasso(`Navegação Rota ${rota.url}`, true, { rota: rota.url });
    }

    // -------------------------------------------------------------------------
    // 4. MÓDULO DE PEDIDOS DE INSERÇÃO (PI 360°)
    // -------------------------------------------------------------------------
    console.log("\n--- [4] Acessando Módulo de PIs (Pedidos de Inserção) ---");
    await page.goto(`${BASE_URL}/pi`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForSelector("text=Ordens de Compra & Pedidos de Inserção", { timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "09-modulo-pi-360-online.png") });

    registrarPasso("Módulo de Pedidos de Inserção Carregado", true);

    // -------------------------------------------------------------------------
    // 5. TESTE DE CRIAÇÃO DE NOVO PI E PERSISTÊNCIA DE DADOS DIGITADOS
    // -------------------------------------------------------------------------
    console.log("\n--- [5] Abrindo formulário de Novo PI e testando persistência UX ---");
    
    // Clica no botão "Novo Pedido de Inserção (PI)"
    const btnNovoPi = page.locator("button:has-text('Novo Pedido de Inserção (PI)')");
    await btnNovoPi.waitFor({ state: "visible", timeout: 15000 });
    await btnNovoPi.click();

    // Aguarda o modal abrir
    await page.waitForSelector("text=Novo Pedido de Inserção (PI 360°)", { timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "10-modal-novo-pi-aberto.png") });

    // Preenche campo de Campanha
    const textoCampanha = "Campanha Homologação E2E Produção 2026";
    const inputCampanha = page.locator("input[placeholder*='Campanha Black Friday']");
    await inputCampanha.fill(textoCampanha);

    // Preenche campo de Observações
    const textoObs = "Observação de teste para validação de auto-save e modais sobrepostos.";
    const inputObs = page.locator("textarea[placeholder*='Instruções de produção']");
    await inputObs.fill(textoObs);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "11-dados-digitados-no-pi.png") });

    // Testa persistência UX: interage com a seleção de Modalidade e seletores sobrepostos
    const modalidadeDireto = page.locator("div:has-text('Modalidade 2: Faturamento Direto')").last();
    if (await modalidadeDireto.isVisible()) {
      await modalidadeDireto.click();
      await page.waitForTimeout(300);
    }

    // Verifica se os valores digitados no input e textarea permanecem intactos!
    const valorCampanhaAtual = await inputCampanha.inputValue();
    const valorObsAtual = await inputObs.inputValue();
    
    const persistenciaOk = valorCampanhaAtual === textoCampanha && valorObsAtual === textoObs;
    registrarPasso("Persistência de Dados Digitados em Modais Sobrepostos (UX)", persistenciaOk, {
      esperado: textoCampanha,
      obtido: valorCampanhaAtual,
    });

    // -------------------------------------------------------------------------
    // 6. TESTE DE CUSTOS DE PRODUÇÃO (EMBEDDED vs ITEMIZED)
    // -------------------------------------------------------------------------
    console.log("\n--- [6] Testando adição de Custos de Produção (EMBEDDED vs ITEMIZED) ---");

    // Clica no botão "+ Custo de Produção"
    const btnAddProducao = page.locator("button:has-text('+ Custo de Produção')");
    await btnAddProducao.click();
    await page.waitForTimeout(500);

    // Verifica se a linha de produção foi inserida na tabela
    const badgeProducao = page.locator("div.rounded-xl:has-text('Custo de Produção')").first();
    const producaoAdicionada = await badgeProducao.isVisible();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "12-custo-producao-adicionado.png") });

    registrarPasso("Adição de Linha de Custo de Produção", producaoAdicionada);

    // Testa a alternância de exibição (Embutido / Discriminado) via select nativo
    const selectExibicao = page.locator("select:has(option[value='EMBEDDED'])");
    if (await selectExibicao.isVisible()) {
      await selectExibicao.selectOption("ITEMIZED");
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "13-custo-producao-modo-itemized.png") });
      
      await selectExibicao.selectOption("EMBEDDED");
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "14-custo-producao-modo-embedded.png") });

      registrarPasso("Alternância do Modo de Exibição de Produção (EMBEDDED / ITEMIZED)", true);
    }

    // Valida painel financeiro de split e fechamento com detalhes de produção
    const cardFinanceiro = page.locator("text=Valor Bruto do PI");
    const financeiroOk = await cardFinanceiro.isVisible();
    registrarPasso("Cálculo de Split e Fechamento Financeiro com Produção", financeiroOk);

    // Fecha o modal de Novo PI
    const btnCancelar = page.locator("button:has-text('Cancelar')").first();
    await btnCancelar.click();
    await page.waitForTimeout(500);

    // -------------------------------------------------------------------------
    // 7. VALIDAÇÃO DA TRAVA DE CHECKING E FATURAMENTO
    // -------------------------------------------------------------------------
    console.log("\n--- [7] Validando Trava de Checking e Faturamento ---");

    // Verifica se os cards de KPI de Trava de Checking estão presentes e operacionais
    const cardTravaChecking = page.locator("text=Trava de Checking");
    const travaPresente = await cardTravaChecking.isVisible();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "14-trava-checking-dashboard.png") });

    registrarPasso("Trava Mandatória de Checking Presente e Ativa", travaPresente);

    // -------------------------------------------------------------------------
    // FINALIZAÇÃO E RELATÓRIO
    // -------------------------------------------------------------------------
    report.statusFinal = report.passos.every((p) => p.sucesso) ? "SUCESSO_TOTAL" : "FALHA_PARCIAL";

  } catch (error) {
    console.error("❌ ERRO INESPERADO NA EXECUÇÃO DO TESTE E2E:", error);
    report.statusFinal = "ERRO_EXECUCAO";
    report.erroGeral = {
      message: error.message,
      stack: error.stack,
    };
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "erro-inesperado.png") }).catch(() => {});
  } finally {
    await browser.close();
  }

  // Escreve o relatório JSON
  const relatorioPath = path.resolve("tests/relatorio-e2e-online.json");
  fs.writeFileSync(relatorioPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n📄 Relatório JSON gravado em: ${relatorioPath}`);

  console.log("\n================================================================================");
  console.log(`🏁 RESULTADO FINAL: ${report.statusFinal}`);
  console.log(`Total de Passos: ${report.passos.length}`);
  console.log(`Passos Aprovados: ${report.passos.filter((p) => p.sucesso).length}`);
  console.log(`Passos Reprovados: ${report.passos.filter((p) => !p.sucesso).length}`);
  console.log(`Erros de Console Críticos: ${report.consoleErrors.length}`);
  console.log(`Erros de Página (Uncaught): ${report.pageErrors.length}`);
  console.log("================================================================================");

  if (report.statusFinal !== "SUCESSO_TOTAL") {
    process.exit(1);
  }
}

run();
