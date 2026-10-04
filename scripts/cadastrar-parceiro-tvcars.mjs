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
console.log("🚀 CADASTRO COMPLETO DO PARCEIRO TV CARS & PRODUTOS");
console.log(`📡 URL Alvo: ${supabaseUrl}`);
console.log("================================================================================\n");

async function main() {
  const restUrl = `${supabaseUrl}/rest/v1`;
  const authUrl = `${supabaseUrl}/auth/v1`;

  // 1. Autenticação com credenciais operacionais da Nexo
  const authRes = await fetch(`${authUrl}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "rafaelnexomidia@gmail.com", password: "21242628" }),
  });

  const authData = await authRes.json();
  if (!authRes.ok || !authData.access_token) {
    console.error("❌ Falha na autenticação:", authData);
    process.exit(1);
  }

  const token = authData.access_token;
  const userId = authData.user.id;

  const profileRes = await fetch(`${restUrl}/profiles?id=eq.${userId}&select=tenant_id`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
  });
  const [{ tenant_id }] = await profileRes.json();
  console.log(`✅ Autenticado com sucesso! Usuário: ${userId} | Tenant: ${tenant_id}`);

  const authHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 2. Verificar se parceiro TV CARS já existe
  console.log("\n1️⃣ Verificando parceiro TV CARS...");
  const checkParceiroRes = await fetch(
    `${restUrl}/parceiros?tenant_id=eq.${tenant_id}&nome_fantasia=ilike.*TV CARS*&select=*`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } },
  );
  const existingParceiros = await checkParceiroRes.json();

  let parceiroId = null;

  const parceiroPayload = {
    tenant_id,
    razao_social: "TV CARS BRASILIA PUBLICIDADE E MIDIA DIGITAL LTDA",
    nome_fantasia: "TV CARS",
    cnpj: null,
    segmentos: ["Telas em Transporte por Aplicativo", "DOOH"],
    modelo_remuneracao: "comissao_percentual",
    comissao_padrao_pct: 20.0,
    prazo_repasse: "10 dias após o mês de veiculação",
    condicoes_comerciais:
      "Contrato padrão de 3 meses. Pagamento 10 dias após mês de veiculação via PIX, boleto ou cartão parcelado. Desconto de 10% para contratos semestrais e anuais. Clientes Black possuem adicional de 10% (planos Smart e Plus). Não inclui produção de peças.",
    contato_nome: "Marco Antonio Gomes",
    contato_email: "brasilia@tvcars.com.br",
    contato_telefone: "+55 61 99690-9738",
    site: "https://tvcars.com.br",
    endereco: "Brasília - DF",
    ativo: true,
  };

  if (Array.isArray(existingParceiros) && existingParceiros.length > 0) {
    parceiroId = existingParceiros[0].id;
    console.log(`   Parceiro já cadastrado. Atualizando ID: ${parceiroId}`);
    await fetch(`${restUrl}/parceiros?id=eq.${parceiroId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(parceiroPayload),
    });
  } else {
    console.log("   Cadastrando novo parceiro TV CARS...");
    const createRes = await fetch(`${restUrl}/parceiros`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(parceiroPayload),
    });
    const createText = await createRes.text();
    console.log(`   Parceiro status: HTTP ${createRes.status}`);
    try {
      const createdData = JSON.parse(createText);
      parceiroId = createdData[0]?.id;
    } catch {}
    console.log(`✅ Parceiro criado com ID: ${parceiroId}`);
  }

  // 3. Cadastrar métricas de audiência do parceiro
  console.log("\n2️⃣ Cadastrando métricas de audiência...");
  const metricas = [
    {
      tenant_id,
      parceiro_id: parceiroId,
      tipo_metrica: "passageiros_mensais",
      valor_numerico: 60000,
      descricao: "60.000 passageiros transportados por mês na frota consolidada",
      fonte: "Mídia Kit TV Cars 2025/2026",
      data_referencia: "2026-01-01",
    },
    {
      tenant_id,
      parceiro_id: parceiroId,
      tipo_metrica: "usuarios_potenciais_df",
      valor_numerico: 1000000,
      descricao: "+1 milhão de usuários de aplicativos de transporte no DF (1/3 da população)",
      fonte: "Mídia Kit TV Cars 2025/2026",
      data_referencia: "2026-01-01",
    },
    {
      tenant_id,
      parceiro_id: parceiroId,
      tipo_metrica: "telas_ativas_frota",
      valor_numerico: 58,
      descricao: "58 telas ativas no projeto consolidado (meta: 200 veículos até jun/26 e 500 até 2027)",
      fonte: "Mídia Kit TV Cars 2025/2026",
      data_referencia: "2026-01-01",
    },
  ];

  for (const m of metricas) {
    try {
      await fetch(`${restUrl}/parceiro_metricas`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(m),
      });
    } catch {}
  }
  console.log("✅ Métricas de audiência registradas.");

  // 4. Cadastrar Produtos / Planos Comerciais
  console.log("\n3️⃣ Cadastrando os 6 Planos Comerciais da TV Cars...");

  const fotosProdutos = [
    "/images/parceiros/tvcars/tvcars_tela_encosto.png",
    "/images/parceiros/tvcars/tvcars_tela_passageiro.png",
  ];

  const planos = [
    {
      nome: "TV Cars - Plano Smart (10 Telas em Carros de App)",
      midia: "Telas em Transporte por Aplicativo",
      tipo: "Carros de Aplicativo",
      programa: "Frota TV Cars Brasília DF",
      formato: "Vídeo HD 1080x720px (10 a 15s) + QR Code",
      faixa: "Rotativo Integral (Corridas Diárias)",
      duracao_segundos: 15,
      insercoes_padrao: 24000,
      valor_unit: 990.0,
      quantidade_telas: 10,
      resolucao: "1080x720px",
      tempo_exibicao_segundos: 15,
      loop_minutos: 10,
      horas_operacao_dia: 16,
      canal_macro: "OFF",
      origem_produto: "PARCEIRO",
      parceiro_id: parceiroId,
      parceiro_nome: "TV CARS",
      comissao_inquilino_pct: 20.0,
      fotos: fotosProdutos,
      detalhes_venda:
        "10 telas instaladas atrás dos bancos em carros de aplicativo no DF. 9.500 passageiros únicos/mês e cerca de 24.000 visualizações. 2 a 3 inserções por corrida média de 20 min. 1 campanha mensal (troca de mídia). Rastreamento via QR Code. Condições Black: adicional de 10%.",
    },
    {
      nome: "TV Cars - Plano Plus (20 Telas em Carros de App)",
      midia: "Telas em Transporte por Aplicativo",
      tipo: "Carros de Aplicativo",
      programa: "Frota TV Cars Brasília DF",
      formato: "Vídeo HD 1080x720px (10 a 15s) + QR Code",
      faixa: "Rotativo Integral (Corridas Diárias)",
      duracao_segundos: 15,
      insercoes_padrao: 48000,
      valor_unit: 1413.0,
      quantidade_telas: 20,
      resolucao: "1080x720px",
      tempo_exibicao_segundos: 15,
      loop_minutos: 10,
      horas_operacao_dia: 16,
      canal_macro: "OFF",
      origem_produto: "PARCEIRO",
      parceiro_id: parceiroId,
      parceiro_nome: "TV CARS",
      comissao_inquilino_pct: 20.0,
      fotos: fotosProdutos,
      detalhes_venda:
        "20 telas instaladas em carros de app no DF. 16.000 passageiros únicos/mês e cerca de 48.000 visualizações. Permite 2 campanhas mensais simultâneas. Alta atenção sem distrações e sem botão de pular anúncio. Condições Black: adicional de 10%.",
    },
    {
      nome: "TV Cars - Plano Premium (30 Telas em Carros de App)",
      midia: "Telas em Transporte por Aplicativo",
      tipo: "Carros de Aplicativo",
      programa: "Frota TV Cars Brasília DF",
      formato: "Vídeo HD 1080x720px (10 a 15s) + QR Code",
      faixa: "Rotativo Integral (Corridas Diárias)",
      duracao_segundos: 15,
      insercoes_padrao: 72000,
      valor_unit: 1593.0,
      quantidade_telas: 30,
      resolucao: "1080x720px",
      tempo_exibicao_segundos: 15,
      loop_minutos: 10,
      horas_operacao_dia: 16,
      canal_macro: "OFF",
      origem_produto: "PARCEIRO",
      parceiro_id: parceiroId,
      parceiro_nome: "TV CARS",
      comissao_inquilino_pct: 20.0,
      fotos: fotosProdutos,
      detalhes_venda:
        "30 telas ativas. 28.000 passageiros únicos/mês e cerca de 72.000 visualizações mensais. Até 4 campanhas mensais (troca de criativos). Relatórios mensais detalhados de alcance e interações via QR Code.",
    },
    {
      nome: "TV Cars - Plano Ultra (40 Telas em Carros de App)",
      midia: "Telas em Transporte por Aplicativo",
      tipo: "Carros de Aplicativo",
      programa: "Frota TV Cars Brasília DF",
      formato: "Vídeo HD 1080x720px (10 a 15s) + QR Code",
      faixa: "Rotativo Integral (Corridas Diárias)",
      duracao_segundos: 15,
      insercoes_padrao: 96000,
      valor_unit: 1782.0,
      quantidade_telas: 40,
      resolucao: "1080x720px",
      tempo_exibicao_segundos: 15,
      loop_minutos: 10,
      horas_operacao_dia: 16,
      canal_macro: "OFF",
      origem_produto: "PARCEIRO",
      parceiro_id: parceiroId,
      parceiro_nome: "TV CARS",
      comissao_inquilino_pct: 20.0,
      fotos: fotosProdutos,
      detalhes_venda:
        "40 telas ativas. 32.000 passageiros únicos/mês e 96.000 visualizações mensais. Até 4 campanhas mensais. Segmentação por regiões administrativas, rotas e horários estratégicos no Distrito Federal.",
    },
    {
      nome: "TV Cars - Plano Pro (50 Telas em Carros de App)",
      midia: "Telas em Transporte por Aplicativo",
      tipo: "Carros de Aplicativo",
      programa: "Frota TV Cars Brasília DF",
      formato: "Vídeo HD 1080x720px (10 a 15s) + QR Code",
      faixa: "Rotativo Integral (Corridas Diárias)",
      duracao_segundos: 15,
      insercoes_padrao: 120000,
      valor_unit: 1980.0,
      quantidade_telas: 50,
      resolucao: "1080x720px",
      tempo_exibicao_segundos: 15,
      loop_minutos: 10,
      horas_operacao_dia: 16,
      canal_macro: "OFF",
      origem_produto: "PARCEIRO",
      parceiro_id: parceiroId,
      parceiro_nome: "TV CARS",
      comissao_inquilino_pct: 20.0,
      fotos: fotosProdutos,
      detalhes_venda:
        "50 telas ativas. 40.000 passageiros únicos/mês e 120.000 visualizações. Até 4 campanhas. Ampla dominância urbana nas principais vias e polos de consumo de Brasília.",
    },
    {
      nome: "TV Cars - Plano Full (58 Telas / Cobertura Total da Frota)",
      midia: "Telas em Transporte por Aplicativo",
      tipo: "Carros de Aplicativo",
      programa: "Frota TV Cars Brasília DF",
      formato: "Vídeo HD 1080x720px (10 a 15s) + QR Code",
      faixa: "Rotativo Integral (Corridas Diárias)",
      duracao_segundos: 15,
      insercoes_padrao: 150000,
      valor_unit: 2160.0,
      quantidade_telas: 58,
      resolucao: "1080x720px",
      tempo_exibicao_segundos: 15,
      loop_minutos: 10,
      horas_operacao_dia: 16,
      canal_macro: "OFF",
      origem_produto: "PARCEIRO",
      parceiro_id: parceiroId,
      parceiro_nome: "TV CARS",
      comissao_inquilino_pct: 20.0,
      fotos: fotosProdutos,
      detalhes_venda:
        "Dominância urbana total em 100% da frota ativa (58 telas). 55.000 passageiros únicos/mês e 150.000 visualizações/impactos. 4 campanhas mensais. O plano queridinho dos anunciantes para máxima visibilidade, autoridade e conversão.",
    },
  ];

  let cadastrados = 0;
  for (const plano of planos) {
    // Verificar se já existe produto com esse nome para o parceiro
    const checkProdRes = await fetch(
      `${restUrl}/produtos?tenant_id=eq.${tenant_id}&nome=eq.${encodeURIComponent(plano.nome)}&select=id`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } },
    );
    const existingProds = await checkProdRes.json();

    const payload = {
      tenant_id,
      nome: plano.nome,
      midia: plano.midia,
      tipo: plano.tipo,
      programa: plano.programa,
      formato: plano.formato,
      faixa: plano.faixa,
      duracao_segundos: plano.duracao_segundos,
      insercoes_padrao: plano.insercoes_padrao,
      valor_unit: plano.valor_unit,
      quantidade_telas: plano.quantidade_telas,
      resolucao: plano.resolucao,
      tempo_exibicao_segundos: plano.tempo_exibicao_segundos,
      loop_minutos: plano.loop_minutos,
      horas_operacao_dia: plano.horas_operacao_dia,
      parceiro_id: parceiroId,
      parceiro_nome: plano.parceiro_nome,
      comissao_inquilino_pct: plano.comissao_inquilino_pct,
      ativo: true,
      fotos: plano.fotos,
      detalhes_venda: JSON.stringify({
        descricao: plano.detalhes_venda,
        _canal_macro: "OFF",
        _origem_produto: "PARCEIRO",
        _parceiro_nome: "TV CARS",
        _telas: plano.quantidade_telas,
        _valor_tabela: plano.valor_unit,
        _insercoes_mes: plano.insercoes_padrao,
        _fotos: plano.fotos,
      }),
    };

    if (Array.isArray(existingProds) && existingProds.length > 0) {
      const prodId = existingProds[0].id;
      const upRes = await fetch(`${restUrl}/produtos?id=eq.${prodId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      console.log(`   [ATUALIZADO] ${plano.nome} (HTTP ${upRes.status})`);
    } else {
      const inRes = await fetch(`${restUrl}/produtos`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const inText = await inRes.text();
      console.log(`   [CADASTRADO] ${plano.nome} (HTTP ${inRes.status} -> ${inText})`);
    }
    cadastrados++;
  }

  console.log(`\n✅ ${cadastrados} planos/produtos processados com sucesso!`);
  console.log("\n================================================================================");
  console.log("🎉 PARCEIRO TV CARS E SEUS PRODUTOS ESTÃO PRONTOS PARA COMERCIALIZAÇÃO!");
  console.log("================================================================================");
}

main().catch(console.error);
