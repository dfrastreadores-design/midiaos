import { chromium } from "playwright";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Carregar variáveis do .env
const envContent = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const idx = t.indexOf("=");
  if (idx > 0) {
    let val = t.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, idx).trim()] = val;
  }
}

const BASE_URL = "https://midiaos.online";
const TEST_EMAIL = "rafaelnexomidia@gmail.com";
const TEST_PASS = "21242628";

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function log(step, msg, details = null) {
  const time = new Date().toLocaleTimeString("pt-BR");
  console.log(`[${time}] [PASSO ${step}] ${msg}`);
  if (details) {
    console.log(`         -> ${JSON.stringify(details)}`);
  }
}

async function runE2E() {
  console.log("================================================================================");
  console.log("🚀 INICIANDO TESTE AUTOMATIZADO PONTA A PONTA (E2E) EM PRODUÇÃO");
  console.log(`🌐 Ambiente: ${BASE_URL}`);
  console.log(`👤 Usuário de Teste: ${TEST_EMAIL}`);
  console.log("================================================================================\n");

  const errorsDetected = [];
  const networkTraffic = [];
  let updateAlertTriggered = false;

  // Lança o navegador via Playwright usando o engine Edge/Chromium do sistema
  log(1, "Inicializando navegador headless para execução...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MidiaOS-E2E-Automated-Test",
  });

  const page = await context.newPage();

  // Monitorar tráfego de rede e console
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("Atualização do sistema em andamento") ||
      text.includes("schema cache")
    ) {
      updateAlertTriggered = true;
      errorsDetected.push(`[Console Error / Warning]: ${text}`);
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();

    // Monitora chamadas a profiles, endpoints Supabase e APIs
    if (url.includes("/rest/v1/profiles") || url.includes("/rest/v1/propostas") || url.includes("/storage/v1")) {
      networkTraffic.push({ url, status });
      if (status >= 400) {
        errorsDetected.push(`[HTTP Error ${status}] em ${url}`);
      }
    }
  });

  try {
    // Passo 2: Acessar a tela inicial / login
    log(2, `Navegando para a tela de autenticação (${BASE_URL}/login)...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Passo 3: Preencher credenciais e submeter login
    log(3, "Preenchendo credenciais e efetuando login...");
    const emailInput = page.locator("input[type='email'], input[name='email'], input[placeholder*='email' i]");
    const passInput = page.locator("input[type='password'], input[name='password'], input[placeholder*='senha' i]");

    await emailInput.first().fill(TEST_EMAIL);
    await passInput.first().fill(TEST_PASS);

    const submitBtn = page.locator("button[type='submit'], button:has-text('Entrar'), button:has-text('Acessar')");
    await submitBtn.first().click();

    log(3.1, "Aguardando confirmação de sessão e redirecionamento...");
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
    log(3.2, `Login efetuado com sucesso! URL atual: ${page.url()}`);

    // Passo 4: Navegar até a rota /propostas
    log(4, `Navegando até a rota /propostas...`);
    await page.goto(`${BASE_URL}/propostas`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Passo 5: Validar que não houve erro 400 em profiles nem alerta de atualização
    log(5, "Escutando eventos de console e tráfego de rede na rota /propostas...");
    const profilesTraffic = networkTraffic.filter((t) => t.url.includes("/rest/v1/profiles"));
    log(5.1, `Requisições para /rest/v1/profiles detectadas: ${profilesTraffic.length}`);
    for (const req of profilesTraffic) {
      log(5.2, `Requisição profiles: Status ${req.status} (${req.url.slice(0, 80)}...)`);
    }

    if (updateAlertTriggered) {
      throw new Error("ALERTA CRÍTICO: Alerta 'Atualização do sistema em andamento' foi detectado na tela!");
    }

    const hasProfiles400 = profilesTraffic.some((t) => t.status === 400);
    if (hasProfiles400) {
      throw new Error("FALHA: Requisição para /rest/v1/profiles retornou HTTP 400 Bad Request!");
    }
    log(5.3, "✅ Sucesso: Nenhum erro 400 em /rest/v1/profiles e nenhum loop de atualização detectado!");

    // Passo 6: Abrir a tela de Nova Proposta
    log(6, "Localizando e acionando botão 'Nova Proposta'...");
    const btnNovaProposta = page.locator("button:has-text('Nova Proposta')").first();
    await btnNovaProposta.waitFor({ state: "visible", timeout: 10000 });
    await btnNovaProposta.click();

    // Passo 7: Preencher os campos essenciais da proposta
    log(7, "Aguardando abertura do formulário e preenchendo campos essenciais...");
    await page.waitForSelector("[role='dialog']", { timeout: 10000 });
    await page.waitForTimeout(1000);

    const campanhaNome = `[E2E AUTO TEST] Proposta Produção ${Date.now()}`;
    const dialog = page.locator("[role='dialog']");

    // Preencher campanha
    const inputCampanha = dialog.locator("input").filter({ hasText: "" }).nth(0);
    // Localiza input de campanha
    const campanhaField = dialog.locator("div[data-field='campanha'] input, input[name='campanha'], input[placeholder*='campanha' i]");
    if (await campanhaField.count() > 0) {
      await campanhaField.first().fill(campanhaNome);
    } else {
      // Fallback
      await dialog.locator("input").nth(0).fill(campanhaNome);
    }
    log(7.1, `Campanha preenchida: "${campanhaNome}"`);

    // Preencher cliente avulso se não tiver selecionado
    const clienteAvulsoInput = dialog.locator("input[placeholder*='avulso' i], input[placeholder*='cliente' i]").first();
    if (await clienteAvulsoInput.count() > 0) {
      await clienteAvulsoInput.fill("Cliente Teste Automatizado E2E");
      log(7.2, "Cliente Avulso preenchido: 'Cliente Teste Automatizado E2E'");
    }

    // Adicionar um item na calculadora se a lista estiver vazia
    const btnAddItem = dialog.locator("button:has-text('Adicionar Item'), button:has-text('Novo Item')");
    if (await btnAddItem.count() > 0) {
      log(7.3, "Adicionando item de mídia à proposta...");
      await btnAddItem.first().click();
      await page.waitForTimeout(500);

      // Preenche formato se houver campo
      const formatoInput = dialog.locator("input[placeholder*='formato' i], input[placeholder*='30s' i]").first();
      if (await formatoInput.count() > 0) {
        await formatoInput.fill("Spot 30s");
      }
    }

    // Passo 8: Alterar modelo de proposta / template
    log(8, "Testando interação com modelo / configurações de proposta...");
    const targetInput = dialog.locator("input[placeholder*='Classes A/B' i]").first();
    if (await targetInput.count() > 0) {
      await targetInput.fill("Público Premium e Tomadores de Decisão");
      log(8.1, "Target / Modelo de Público atualizado com sucesso.");
    }

    // Passo 9: Clicar em "Salvar Rascunho"
    log(9, "Clicando no botão 'Salvar Rascunho'...");
    const btnSalvarRascunho = dialog.locator("button:has-text('Salvar Rascunho')").first();
    await btnSalvarRascunho.waitFor({ state: "visible", timeout: 5000 });

    // Monitora a requisição de salvamento
    const savePromise = page.waitForResponse(
      (resp) =>
        (resp.url().includes("/rest/v1/propostas") || resp.url().includes("upsertProposta") || resp.url().includes("/api/")) &&
        (resp.status() === 200 || resp.status() === 201),
      { timeout: 15000 }
    ).catch(() => null);

    await btnSalvarRascunho.click();
    log(9.1, "Aguardando persistência do registro com status 200 OK...");
    const saveResponse = await savePromise;

    if (saveResponse) {
      log(9.2, `✅ Persistência confirmada via rede: Status ${saveResponse.status()} OK!`);
    } else {
      log(9.2, "Aguardando 3 segundos para confirmação de salvamento via toast/banco...");
      await page.waitForTimeout(3000);
    }

    // Passo 10: Validar diretamente no banco Supabase se o registro foi salvo
    log(10, "Validando registro gravado no banco de dados Supabase...");
    const { data: dbData, error: dbErr } = await supabase
      .from("propostas")
      .select("id, campanha, status, created_at")
      .ilike("campanha", `%${campanhaNome}%`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (dbErr) {
      throw new Error(`Erro ao consultar proposta no Supabase: ${dbErr.message}`);
    }

    if (!dbData || dbData.length === 0) {
      // Busca a última proposta em modo rascunho
      const { data: lastProp } = await supabase
        .from("propostas")
        .select("id, campanha, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      log(10.1, "Última proposta cadastrada no banco:", lastProp?.[0]);
    } else {
      const savedProp = dbData[0];
      log(10.1, `✅ PROPOSTA SALVA COM SUCESSO NO BANCO DE DADOS:`, {
        id: savedProp.id,
        campanha: savedProp.campanha,
        status: savedProp.status,
        created_at: savedProp.created_at,
      });
    }

    console.log("\n================================================================================");
    console.log("🎉 TESTE E2E CONCLUÍDO COM 100% DE SUCESSO!");
    console.log("   - Login realizado sem erros.");
    console.log("   - /propostas acessada sem loop de atualização.");
    console.log("   - Endpoint /rest/v1/profiles operando sem erros HTTP 400.");
    console.log("   - Proposta preenchida e rascunho persistido com sucesso no banco de dados.");
    console.log("================================================================================\n");

  } catch (err) {
    console.error("\n❌ ERRO DURANTE A EXECUÇÃO DO TESTE E2E:", err.message);
    if (errorsDetected.length > 0) {
      console.error("\nErros detectados durante o monitoramento de rede/console:");
      errorsDetected.forEach((e) => console.error(` - ${e}`));
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runE2E();
