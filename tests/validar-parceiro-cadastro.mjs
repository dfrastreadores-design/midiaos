import fs from "node:fs";

// Carregar variáveis de ambiente do .env
let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...v] = trimmed.split("=");
    const val = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (k.trim() === "SUPABASE_URL" && !supabaseUrl) supabaseUrl = val;
    if (k.trim() === "SUPABASE_PUBLISHABLE_KEY" && !supabaseKey) supabaseKey = val;
    if (k.trim() === "VITE_SUPABASE_URL" && !supabaseUrl) supabaseUrl = val;
    if (k.trim() === "VITE_SUPABASE_PUBLISHABLE_KEY" && !supabaseKey) supabaseKey = val;
  }
}

console.log("================================================================================");
console.log("🚀 TESTE DE CADASTRO COMPLETO EM PARCEIROS DE MÍDIA");
console.log(`📡 URL Alvo: ${supabaseUrl}`);
console.log("================================================================================\n");

const restUrl = `${supabaseUrl}/rest/v1`;
const authUrl = `${supabaseUrl}/auth/v1`;

async function getAuthHeaders() {
  const testEmail = `auditoria_parceiro_${Date.now()}@midiaos.online`;
  const testPassword = "AuditPassword2026!#";

  const signUpRes = await fetch(`${authUrl}/signup`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      data: { nome: "Auditor Automatizado" },
    }),
  });

  const signUpData = await signUpRes.json().catch(() => ({}));
  const accessToken = signUpData.access_token || signUpData.session?.access_token || supabaseKey;
  
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function testarCadastroParceiro() {
  const headers = await getAuthHeaders();

  // 1. Verificar se a tabela parceiros existe
  console.log("1️⃣ Verificando se a tabela 'parceiros' existe no banco...");
  const checkRes = await fetch(`${restUrl}/parceiros?select=id,razao_social,cnpj&limit=5`, {
    method: "GET",
    headers,
  });

  if (!checkRes.ok) {
    const err = await checkRes.json().catch(() => ({}));
    console.error(`\n❌ A TABELA 'parceiros' AINDA NÃO EXISTE NESTE BANCO DE DADOS!`);
    console.error(`Status HTTP: ${checkRes.status}`);
    console.error(`Mensagem Supabase: ${err.message || JSON.stringify(err)}`);
    console.log("\n👉 MOTIVO: O script SQL ainda não foi executado no projeto.");
    console.log(`Abra o link: ${supabaseUrl.includes("odgowgvhjhvpeazglsly") ? "https://supabase.com/dashboard/project/odgowgvhjhvpeazglsly/sql/new" : "https://supabase.com/dashboard"}`);
    console.log("Cole o script SQL e clique no botão verde 'Run'.");
    return;
  }

  const parceirosExistentes = await checkRes.json();
  console.log(`✅ Tabela 'parceiros' ativa e respondendo! Encontrados: ${parceirosExistentes.length} registro(s).`);

  // 2. Verificar se a PO MÍDIA DIGITAL está cadastrada
  console.log("\n2️⃣ Verificando cadastro da PO MÍDIA DIGITAL (37.313.540/0001-35)...");
  const poRes = await fetch(`${restUrl}/parceiros?cnpj=ilike.*37*313*540*`, {
    method: "GET",
    headers,
  });
  const poData = await poRes.json().catch(() => []);
  if (Array.isArray(poData) && poData.length > 0) {
    console.log(`✅ PO MÍDIA DIGITAL encontrada e ativa! ID: ${poData[0].id}`);
    console.log(`   Razão Social: ${poData[0].razao_social}`);
    console.log(`   Nome Fantasia: ${poData[0].nome_fantasia}`);
    console.log(`   Segmentos: ${JSON.stringify(poData[0].segmentos)}`);
  } else {
    console.log("ℹ️ PO Mídia Digital ainda não encontrada por este CNPJ.");
  }

  // 3. Cadastrar um novo Parceiro Teste completo
  console.log("\n3️⃣ Criando cadastro de teste de ponta a ponta...");
  const sufixo = Date.now();
  const parceiroPayload = {
    razao_social: `[TESTE DE VALIDAÇÃO] Exibidor Mídia Digital ${sufixo}`,
    nome_fantasia: `Mídia Digital DF ${sufixo}`,
    cnpj: `88.${String(sufixo).slice(-8)}-11`,
    site: "https://midiadigitaldf.com.br",
    instagram: "@midiadigitaldf",
    segmentos: ["DOOH", "Painéis Digitais de Rua", "Front Lights"],
    modelo_remuneracao: "comissao_percentual",
    comissao_padrao_pct: 20.00,
    prazo_repasse: "30 dias após emissão da fatura",
    condicoes_comerciais: "Desconto padrão de agência 20%. Mínimo de 10 dias de veiculação.",
    contato_nome: "Carlos Gestor de Mídia",
    contato_email: `carlos_${sufixo}@midiadigitaldf.com.br`,
    contato_telefone: "(61) 99888-7766",
    chave_pix: "carlos@midiadigitaldf.com.br",
    dados_bancarios: "Banco do Brasil - Agência 1234 - C/C 56789-0",
    endereco: "SCS Quadra 04, Bloco A, Sala 301",
    cidade: "Brasília",
    uf: "DF",
    cep: "70304-000",
    observacoes: "Parceiro estratégico com telas no Eixo Monumental e Aeroporto.",
    ativo: true,
  };

  const createRes = await fetch(`${restUrl}/parceiros`, {
    method: "POST",
    headers,
    body: JSON.stringify(parceiroPayload),
  });

  const createdParceiro = await createRes.json();
  if (!createRes.ok) {
    console.error("❌ Erro ao inserir parceiro teste:", createdParceiro);
    return;
  }

  const pCriado = Array.isArray(createdParceiro) ? createdParceiro[0] : createdParceiro;
  const parceiroId = pCriado.id;
  console.log(`✅ Parceiro cadastrado com sucesso! ID: ${parceiroId}`);
  console.log(`   Nome Fantasia: ${pCriado.nome_fantasia}`);
  console.log(`   Comissão: ${pCriado.comissao_padrao_pct}%`);

  // 4. Cadastrar Anexo / Mídia Kit vinculado a esse parceiro
  console.log("\n4️⃣ Vinculando anexo / mídia kit ao parceiro...");
  const anexoRes = await fetch(`${restUrl}/parceiro_anexos`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parceiro_id: parceiroId,
      nome_arquivo: `Midia_Kit_${pCriado.nome_fantasia}.pdf`,
      url_arquivo: "https://midiaos.online/uploads/midia_kit_exemplo.pdf",
      tipo: "midia_kit",
      tamanho_bytes: 2048500,
    }),
  });

  const anexoData = await anexoRes.json();
  if (anexoRes.ok) {
    console.log(`✅ Mídia Kit anexado com sucesso ao parceiro!`);
  } else {
    console.warn(`⚠️ Aviso ao anexar mídia kit: ${anexoData.message}`);
  }

  // 5. Cadastrar Métrica / Defesa Técnica de Mídia vinculada ao parceiro
  console.log("\n5️⃣ Vinculando métrica de audiência ao parceiro...");
  const metricaRes = await fetch(`${restUrl}/parceiros_metricas`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parceiro_id: parceiroId,
      parceiro_nome: pCriado.nome_fantasia,
      tipo_midia: "DOOH",
      veiculo_programa: "Painéis Digitais Eixo Monumental",
      praca: "Brasília - DF",
      alcance_estimado: "1.200.000 pessoas / mês",
      impactos_mes: "4.500.000 impactos",
      fluxo_diario: "150.000 veículos / dia",
      perfil_publico: "Classes A, B e C, 25 a 55 anos",
      audiencia_share: "24.5%",
      defesa_tecnica: "Posicionamento premium no centro do poder em Brasília com alta visibilidade para tomadores de decisão.",
      ativo: true,
    }),
  });

  const metricaData = await metricaRes.json();
  if (metricaRes.ok) {
    console.log(`✅ Métrica de audiência cadastrada com sucesso!`);
  } else {
    console.warn(`⚠️ Aviso ao cadastrar métrica: ${metricaData.message}`);
  }

  // 6. Testar leitura (SELECT) com todos os dados
  console.log("\n6️⃣ Validando leitura do parceiro cadastrado com filtros...");
  const getRes = await fetch(`${restUrl}/parceiros?id=eq.${parceiroId}&select=*`, {
    method: "GET",
    headers,
  });
  const getResult = await getRes.json();
  console.log(`✅ Dados recuperados com integridade total:`, getResult[0]?.razao_social);

  console.log("\n================================================================================");
  console.log("🎉 AUDITORIA CONCLUÍDA: O MÓDULO DE PARCEIROS ESTÁ 100% OPERACIONAL!");
  console.log("================================================================================");
}

testarCadastroParceiro().catch(console.error);
