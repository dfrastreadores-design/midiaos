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
console.log("🔐 TESTE DE GRAVAÇÃO COMPLETA DAS ROTAS DO BANCO DE DADOS");
console.log(`📡 URL Alvo: ${supabaseUrl}`);
console.log("================================================================================\n");

async function run() {
  const restUrl = `${supabaseUrl}/rest/v1`;
  const authUrl = `${supabaseUrl}/auth/v1`;

  // 1. Autenticar com o usuário principal do sistema
  const loginEmail = "rafaelnexomidia@gmail.com";
  const loginPassword = "AuditPassword2026!#"; // fallback
  const realPassword = "21242628";

  let authRes = await fetch(`${authUrl}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: loginEmail, password: realPassword }),
  });

  let authData = await authRes.json().catch(() => ({}));
  if (!authRes.ok || !authData.access_token) {
    console.error("Falha na autenticação:", authData);
    return;
  }

  const accessToken = authData.access_token;
  const userId = authData.user.id;
  console.log(`✅ Usuário autenticado com sucesso! Email: ${loginEmail} (ID: ${userId})`);

  const authHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // Buscar tenant_id
  const profRes = await fetch(`${restUrl}/profiles?id=eq.${userId}&select=*`, { headers: authHeaders });
  const profiles = await profRes.json();
  const tenantId = profiles[0]?.tenant_id;
  console.log(`🏢 Tenant Ativo: ${tenantId}`);

  const sufixo = Date.now();

  // Testes das entidades principais da aplicação
  const rotas = [
    {
      tabela: "clientes",
      nome: "Clientes / Anunciantes",
      payload: {
        razao_social: `[TESTE AUDITORIA] Cliente Temporário ${sufixo}`,
        nome_fantasia: `Cliente Teste ${sufixo}`,
        cnpj: `00.${String(sufixo).slice(-8)}-91`,
        tenant_id: tenantId,
        created_by: userId
      },
      updatePayload: { nome_fantasia: `Cliente Atualizado ${sufixo}` }
    },
    {
      tabela: "agencias",
      nome: "Agências de Publicidade",
      payload: {
        razao_social: `[TESTE AUDITORIA] Agência Temporária ${sufixo}`,
        nome_fantasia: `Agência Teste ${sufixo}`,
        cnpj: `00.${String(sufixo).slice(-8)}-72`,
        tenant_id: tenantId,
        created_by: userId
      },
      updatePayload: { nome_fantasia: `Agência Atualizada ${sufixo}` }
    },
    {
      tabela: "propostas",
      nome: "Propostas Comerciais (Orçamentos)",
      payload: {
        numero: `PROP-TEST-${sufixo}`,
        campanha: `[TESTE AUDITORIA] Campanha Q4 ${sufixo}`,
        status: "rascunho",
        valor_tabela: 5000,
        valor_desconto: 0,
        valor_negociado: 5000,
        total_insercoes: 10,
        tenant_id: tenantId,
        created_by: userId
      },
      updatePayload: { valor_negociado: 4800 }
    },
    {
      tabela: "pis",
      nome: "Pedidos de Inserção (PIs)",
      payload: {
        numero: `TESTE-PI-${sufixo}`,
        campanha: `[TESTE AUDITORIA] Campanha PI ${sufixo}`,
        status: "rascunho",
        valor_tabela: 10000,
        valor_negociado: 8500,
        mes_veiculacao: new Date().getMonth() + 1,
        ano_veiculacao: new Date().getFullYear(),
        tenant_id: tenantId,
        created_by: userId
      },
      updatePayload: { valor_negociado: 9000 }
    },
    {
      tabela: "produtos",
      nome: "Produtos / Formatos de Mídia",
      payload: {
        nome: `[TESTE AUDITORIA] VT 30s ${sufixo}`,
        midia: "TV",
        tipo: "VT",
        valor_unit: 4500,
        ativo: true,
        tenant_id: tenantId,
        created_by: userId
      },
      updatePayload: { valor_unit: 4800 }
    },
    {
      tabela: "parceiros",
      nome: "Parceiros de Mídia",
      payload: {
        razao_social: `[TESTE AUDITORIA] Parceiro Digital ${sufixo}`,
        cnpj: `99.${String(sufixo).slice(-8)}-99`,
        ativo: true,
        comissao_padrao_pct: 20
      },
      updatePayload: { nome_fantasia: `Parceiro Atualizado ${sufixo}` }
    }
  ];

  console.log("\n================================================================================");
  console.log("🧪 EXECUTANDO TESTE DE GRAVAÇÃO (INSERT -> UPDATE -> DELETE)");
  console.log("================================================================================");

  let sucessos = 0;
  let falhas = 0;

  for (const r of rotas) {
    const inicio = performance.now();
    let gravou = false;
    let atualizou = false;
    let deletou = false;
    let motivo = null;

    try {
      // 1. INSERT
      const iRes = await fetch(`${restUrl}/${r.tabela}`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(r.payload),
      });

      const iJson = await iRes.json().catch(() => ({}));

      if (!iRes.ok) {
        throw new Error(`INSERT HTTP ${iRes.status}: ${iJson.message || JSON.stringify(iJson)}`);
      }

      gravou = true;
      const criado = Array.isArray(iJson) ? iJson[0] : iJson;
      const id = criado?.id;

      if (id) {
        // 2. UPDATE
        const uRes = await fetch(`${restUrl}/${r.tabela}?id=eq.${id}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify(r.updatePayload),
        });

        if (!uRes.ok) {
          const uJson = await uRes.json().catch(() => ({}));
          throw new Error(`UPDATE HTTP ${uRes.status}: ${uJson.message || JSON.stringify(uJson)}`);
        }
        atualizou = true;

        // 3. DELETE (Limpeza segura por ID exato)
        const dRes = await fetch(`${restUrl}/${r.tabela}?id=eq.${id}`, {
          method: "DELETE",
          headers: authHeaders,
        });

        if (!dRes.ok) {
          const dJson = await dRes.json().catch(() => ({}));
          throw new Error(`DELETE HTTP ${dRes.status}: ${dJson.message || JSON.stringify(dJson)}`);
        }
        deletou = true;
      }
    } catch (err) {
      motivo = err.message;
    }

    const tempo = Math.round(performance.now() - inicio);
    const ok = gravou && atualizou && deletou;

    if (ok) sucessos++;
    else falhas++;

    const icone = ok ? "✅ OK" : "❌ PENDÊNCIA";
    console.log(`\n• [${r.tabela.padEnd(16)}] ${r.nome}`);
    console.log(`  Status: ${icone} (${tempo}ms) | Insert: ${gravou ? "OK" : "NO"} | Update: ${atualizou ? "OK" : "NO"} | Delete: ${deletou ? "OK" : "NO"}`);
    if (motivo) {
      console.log(`  ⚠️ Detalhe: ${motivo}`);
    }
  }

  console.log("\n================================================================================");
  console.log(`📊 RESULTADO CONSOLIDADO:`);
  console.log(`  - Rotas de Gravação com Sucesso Total: ${sucessos}/${rotas.length}`);
  console.log(`  - Rotas com Restrição ou Pendência:    ${falhas}/${rotas.length}`);
  console.log("================================================================================");
}

run().catch(console.error);
