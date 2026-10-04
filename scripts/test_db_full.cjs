const fs = require('fs');

async function testProject(name, url, anonKey, email, password) {
  console.log(`\n========================================================`);
  console.log(`TESTANDO PROJETO: ${name} (${url})`);
  console.log(`========================================================`);

  // 1. Test Auth Login
  let authToken = null;
  let authUser = null;
  try {
    const resAuth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const authData = await resAuth.json();
    if (resAuth.ok && authData.access_token) {
      authToken = authData.access_token;
      authUser = authData.user;
      console.log(`[AUTH] Login com ${email}: SUCESSO (User ID: ${authUser.id})`);
    } else {
      console.log(`[AUTH] Login com ${email}: FALHOU (${resAuth.status} - ${authData.error_description || authData.msg || JSON.stringify(authData)})`);
    }
  } catch (err) {
    console.log(`[AUTH] Erro na requisição de login:`, err.message);
  }

  // Use authenticated token if available, otherwise fallback to anonKey
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${authToken || anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // 2. Test Tables List
  const tables = [
    'parceiros',
    'tenants',
    'profiles',
    'user_roles',
    'produto_tipos',
    'produtos',
    'clientes',
    'agencias',
    'propostas',
    'proposta_itens',
    'pis',
    'pi_itens',
    'financeiro_transacoes',
    'social_contas',
    'social_posts',
    'documentos_assinatura',
    'contratos',
    'campanha_rateios',
    'comprovantes_execucao',
    'indicadores',
    'comissoes_indicacao',
    'push_subscriptions',
    'planos'
  ];

  console.log(`\n--- Testando Leitura (SELECT) em ${tables.length} tabelas essenciais ---`);
  const statusSummary = {};

  for (const table of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=5`, { headers });
      if (res.ok) {
        const data = await res.json();
        statusSummary[table] = { select: 'OK', count: data.length, status: res.status };
        console.log(`[SELECT] ${table.padEnd(25)} -> OK (${data.length} registros encontrados)`);
      } else {
        const errText = await res.text();
        statusSummary[table] = { select: 'ERRO', status: res.status, error: errText.slice(0, 100) };
        console.log(`[SELECT] ${table.padEnd(25)} -> ERRO (${res.status}): ${errText.slice(0, 80)}`);
      }
    } catch (err) {
      statusSummary[table] = { select: 'FALHA_CONEXAO', error: err.message };
      console.log(`[SELECT] ${table.padEnd(25)} -> FALHA: ${err.message}`);
    }
  }

  // 3. Test Write (INSERT / UPDATE) specifically on parceiros
  console.log(`\n--- Testando Escrita (INSERT & UPDATE) em 'parceiros' ---`);
  if (statusSummary['parceiros']?.select === 'OK') {
    try {
      const testCnpj = `99.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}/0001-99`;
      const testPayload = {
        razao_social: `Parceiro Teste Automatizado ${Date.now()}`,
        nome_fantasia: 'Teste Escrita DB',
        cnpj: testCnpj,
        site: 'https://exemplo.com',
        comissao_padrao_pct: 20.0,
        ativo: true
      };

      const resIns = await fetch(`${url}/rest/v1/parceiros`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload)
      });

      if (resIns.ok) {
        const insData = await resIns.json();
        const createdId = Array.isArray(insData) ? insData[0]?.id : insData?.id;
        console.log(`[INSERT] parceiros -> SUCESSO! ID Criado: ${createdId}`);

        // Test UPDATE
        if (createdId) {
          const resUpd = await fetch(`${url}/rest/v1/parceiros?id=eq.${createdId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ nome_fantasia: 'Teste Atualizado com Sucesso' })
          });
          if (resUpd.ok) {
            console.log(`[UPDATE] parceiros -> SUCESSO! Registro atualizado.`);
          } else {
            console.log(`[UPDATE] parceiros -> ERRO (${resUpd.status}):`, await resUpd.text());
          }

          // Test DELETE (clean up test item)
          const resDel = await fetch(`${url}/rest/v1/parceiros?id=eq.${createdId}`, {
            method: 'DELETE',
            headers
          });
          if (resDel.ok) {
            console.log(`[DELETE] parceiros -> SUCESSO! Registro teste limpo.`);
          } else {
            console.log(`[DELETE] parceiros -> AVISO (${resDel.status}):`, await resDel.text());
          }
        }
      } else {
        const insErr = await resIns.text();
        console.log(`[INSERT] parceiros -> ERRO (${resIns.status}):`, insErr);
      }
    } catch (err) {
      console.log(`[INSERT] parceiros -> EXCEÇÃO:`, err.message);
    }
  }

  return { name, authToken: !!authToken, statusSummary };
}

async function run() {
  // Target Project: tvniawyweymutjiybxyo
  const targetKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmlhd3l3ZXltdXRqaXlieHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzkwNTcsImV4cCI6MjEwNjQ1NTA1N30.4SyTIJH3ZZzTN-fX4MjTsuR2Ez-8rF6zyytqZvnxtoQ';
  await testProject(
    'TARGET (tvniawyweymutjiybxyo - Midia-OS)',
    'https://tvniawyweymutjiybxyo.supabase.co',
    targetKey,
    'rafaelnexomidia@gmail.com',
    '21242628'
  );

  // Legacy Project: odgowgvhjhvpeazglsly
  const legacyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ293Z3Zoamh2cGVhemdsc2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODYwOTQsImV4cCI6MjA5NDY2MjA5NH0.X0-jxfLmUFTpxUm6O0-802xVK1iNt41He6Gho-oDb0E';
  await testProject(
    'LEGACY (odgowgvhjhvpeazglsly)',
    'https://odgowgvhjhvpeazglsly.supabase.co',
    legacyKey,
    'rafaelnexomidia@gmail.com',
    '21242628'
  );
}

run();
