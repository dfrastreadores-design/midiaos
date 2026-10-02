import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularRateio } from "./campanha-rateio.functions";

/**
 * Inicializa ou restaura o ambiente DEMO isolado com o fluxo completo de Mídia:
 * 1 Empresa Demo ("Central Brasil Mídia")
 * 1 Cliente ("Varejo SuperMax")
 * 1 Agência ("Agência Criativa 360")
 * 5 Parceiros (TV, Rádio, Portal Web, Painéis DOOH, Redes Sociais)
 * 10 Produtos variados
 * 1 Proposta comercial
 * 1 Campanha de R$ 100.000 com rateio entre os 5 parceiros
 * 5 PIs para Parceiros e 1 PI consolidada para Cliente
 * 1 Contrato preenchido
 * Transações financeiras com recebimentos e repasses
 * Comprovantes e Prestação de Contas
 */
export const provisionarTenantDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1. Cria ou obtém o Tenant Demo
    const demoSubdominio = "demo";
    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("subdominio", demoSubdominio)
      .maybeSingle();

    let tenantId = existingTenant?.id;

    if (!tenantId) {
      const fullTenantPayload = {
        razao_social: "Central Brasil Comunicação e Mídia Ltda (DEMO)",
        nome_fantasia: "Central Mídia (DEMO)",
        cnpj: "12.345.678/0001-90",
        subdominio: demoSubdominio,
        plano: "demo",
        status: "ativo",
        prefixo_pi: "DEMO-PI",
        prefixo_proposta: "DEMO-PROP",
        cor_primaria: "#2563eb",
        cor_secundaria: "#06b6d4",
        is_demo: true,
        contato_nome: "Demonstração Mídia OS",
        contato_email: "demo@midiaos.online",
        contato_whatsapp: "(61) 99999-0000",
        observacoes: "Ambiente demonstrativo oficial do Mídia OS com fluxo ponta a ponta.",
      };

      let { data: newTenant, error: tErr } = await supabase
        .from("tenants")
        .insert(fullTenantPayload)
        .select("id")
        .single();

      // Fallback defensivo: se colunas opcionais (ex: cor_secundaria, subdominio) não existirem no schema cache
      if (tErr && (tErr.message?.includes("schema cache") || tErr.message?.includes("column"))) {
        console.warn("Aviso: Tentando criação do Tenant Demo com campos essenciais devido a schema cache:", tErr.message);
        const safePayload = {
          razao_social: fullTenantPayload.razao_social,
          nome_fantasia: fullTenantPayload.nome_fantasia,
          cnpj: fullTenantPayload.cnpj,
          plano: fullTenantPayload.plano,
          status: fullTenantPayload.status,
          contato_nome: fullTenantPayload.contato_nome,
          contato_email: fullTenantPayload.contato_email,
          contato_whatsapp: fullTenantPayload.contato_whatsapp,
          observacoes: fullTenantPayload.observacoes,
        };
        const retry = await supabase
          .from("tenants")
          .insert(safePayload)
          .select("id")
          .single();
        newTenant = retry.data;
        tErr = retry.error;
      }

      if (tErr) throw new Error(`Falha ao criar Tenant Demo: ${tErr.message}`);
      tenantId = newTenant?.id;
    }

    // 2. Cliente Demo
    const { data: cliente, error: cErr } = await supabase
      .from("clientes")
      .insert({
        tenant_id: tenantId,
        razao_social: "SuperMax Varejo e Distribuição S/A",
        nome_fantasia: "SuperMax Varejo (Demo)",
        cnpj: "33.444.555/0001-22",
        cidade: "Brasília",
        uf: "DF",
        email: "marketing@supermax.com.br",
        telefone: "(61) 3333-4444",
        status: "ativo",
        segmento: "Varejo",
        created_by: userId,
      })
      .select("id")
      .single();

    if (cErr) throw new Error(`Falha ao criar Cliente Demo: ${cErr.message}`);

    // 3. Agência Demo
    const { data: agencia, error: aErr } = await supabase
      .from("agencias")
      .insert({
        tenant_id: tenantId,
        razao_social: "Criativa 360 Publicidade e Propaganda Ltda",
        nome_fantasia: "Agência Criativa 360 (Demo)",
        cnpj: "44.555.666/0001-33",
        cidade: "Brasília",
        uf: "DF",
        email: "midia@criativa360.com.br",
        telefone: "(61) 3222-1111",
        comissao: 20.0,
        status: "ativo",
        created_by: userId,
      })
      .select("id")
      .single();

    if (aErr) throw new Error(`Falha ao criar Agência Demo: ${aErr.message}`);

    // 4. Cinco Parceiros de Mídia
    const parceirosData = [
      {
        nome_fantasia: "TV Central Brasília",
        razao_social: "Rede Central de Televisão Ltda",
        cnpj: "11.111.111/0001-11",
        segmentos: ["TV"],
        comissao_padrao_pct: 30.0,
        chave_pix: "financeiro@tvcentral.com.br",
      },
      {
        nome_fantasia: "Rádio Top FM 98.3",
        razao_social: "Top Comunicações FM Ltda",
        cnpj: "22.222.222/0001-22",
        segmentos: ["Rádio"],
        comissao_padrao_pct: 20.0,
        chave_pix: "pix@radiotopfm.com.br",
      },
      {
        nome_fantasia: "Portal Capital Notícias",
        razao_social: "Capital Mídia Digital Ltda",
        cnpj: "33.333.333/0001-33",
        segmentos: ["Digital / Portais"],
        comissao_padrao_pct: 25.0,
        chave_pix: "pix@capitalnoticias.com.br",
      },
      {
        nome_fantasia: "MegaLED DOOH Circuitos",
        razao_social: "MegaLED Mídia Exterior S/A",
        cnpj: "44.444.444/0001-44",
        segmentos: ["DOOH", "OOH"],
        comissao_padrao_pct: 35.0,
        chave_pix: "repasse@megaled.com.br",
      },
      {
        nome_fantasia: "Creator Hub & Redes",
        razao_social: "Hub Digital de Influenciadores Ltda",
        cnpj: "55.555.555/0001-55",
        segmentos: ["Redes Sociais", "Influenciadores"],
        comissao_padrao_pct: 25.0,
        chave_pix: "financeiro@creatorhub.com.br",
      },
    ];

    const parceirosCriados: any[] = [];
    for (const p of parceirosData) {
      const { data: parc } = await supabase
        .from("parceiros")
        .insert({
          tenant_id: tenantId,
          razao_social: p.razao_social,
          nome_fantasia: p.nome_fantasia,
          cnpj: p.cnpj,
          segmentos: p.segmentos,
          comissao_padrao_pct: p.comissao_padrao_pct,
          chave_pix: p.chave_pix,
          cidade: "Brasília",
          uf: "DF",
          ativo: true,
          created_by: userId,
        })
        .select()
        .single();

      if (parc) parceirosCriados.push(parc);
    }

    // 5. Dez Produtos de Mídia variados
    const produtosData = [
      { nome: "VT 30s Horário Nobre (TV)", tipo: "VT 30s", parceiroIdx: 0, preco: 30000 },
      { nome: "Merchandising ao Vivo 60s (TV)", tipo: "Merchandising", parceiroIdx: 0, preco: 25000 },
      { nome: "Spot 30s Rotativo (Rádio)", tipo: "Spot 30s", parceiroIdx: 1, preco: 15000 },
      { nome: "Testemunhal com Locutor (Rádio)", tipo: "Testemunhal", parceiroIdx: 1, preco: 12000 },
      { nome: "Super Banner Topo Portal (Web)", tipo: "Banner Digital", parceiroIdx: 2, preco: 18000 },
      { nome: "Publieditorial Especial (Web)", tipo: "Publieditorial", parceiroIdx: 2, preco: 10000 },
      { nome: "Circuito 20 Painéis LED (DOOH)", tipo: "Painel LED", parceiroIdx: 3, preco: 35000 },
      { nome: "Totens Digitais Shopping (DOOH)", tipo: "Circuito Shopping", parceiroIdx: 3, preco: 20000 },
      { nome: "Combo 3 Reels + Stories (Redes)", tipo: "Reels / Stories", parceiroIdx: 4, preco: 22000 },
      { nome: "Campanha Tráfego Pago Meta/Google", tipo: "Tráfego Digital", parceiroIdx: 4, preco: 15000 },
    ];

    for (const prod of produtosData) {
      const parc = parceirosCriados[prod.parceiroIdx];
      await supabase.from("produtos").insert({
        tenant_id: tenantId,
        nome: prod.nome,
        tipo: prod.tipo,
        preco_tabela: prod.preco,
        parceiro_id: parc?.id || null,
        comissao_inquilino_pct: parc?.comissao_padrao_pct || 20,
        ativo: true,
        created_by: userId,
      });
    }

    // 6. Campanha Oficial de Demonstração (R$ 100.000)
    const valorCampanha = 100000;
    const { data: piMae, error: piErr } = await supabase
      .from("pis")
      .insert({
        tenant_id: tenantId,
        numero: "DEMO-PI-2026-001",
        campanha: "Campanha Mega Ofertas Aniversário SuperMax (DEMO)",
        cliente_id: cliente.id,
        agencia_id: agencia.id,
        mes_veiculacao: new Date().getMonth() + 1,
        ano_veiculacao: new Date().getFullYear(),
        periodo_inicio: new Date().toISOString().split("T")[0],
        periodo_fim: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        valor_tabela: 115000,
        valor_desconto: 15000,
        valor_negociado: valorCampanha,
        total_insercoes: 180,
        status: "aprovado",
        tipo_pi: "consolidada",
        observacao: "Campanha integrada multiplataforma: TV + Rádio + Portal + DOOH + Influenciadores.",
        created_by: userId,
      })
      .select("id")
      .single();

    if (piErr) throw new Error(`Falha ao criar Campanha Demo: ${piErr.message}`);

    // 7. Rateio da Campanha entre os 5 Parceiros (Fechamento Matemático Exato: R$ 100.000)
    // P1 (TV Central): R$ 30.000 | 30% comissão (R$ 9.000) | Repasse R$ 21.000
    // P2 (Rádio Top): R$ 20.000 | 20% comissão (R$ 4.000) | Repasse R$ 16.000
    // P3 (Portal Web): R$ 25.000 | 25% comissão (R$ 6.250) | Repasse R$ 18.750
    // P4 (MegaLED DOOH): R$ 15.000 | 35% comissão (R$ 5.250) | Repasse R$ 9.750
    // P5 (Creator Hub): R$ 10.000 | 25% comissão (R$ 2.500) | Repasse R$ 7.500
    // TOTAL: R$ 100.000 comercializado | R$ 27.000 comissão (27%) | R$ 73.000 repasse líquido
    const rateiosCalculados = [
      { pIdx: 0, valor: 30000, pct: 30 },
      { pIdx: 1, valor: 20000, pct: 20 },
      { pIdx: 2, valor: 25000, pct: 25 },
      { pIdx: 3, valor: 15000, pct: 35 },
      { pIdx: 4, valor: 10000, pct: 25 },
    ];

    let totalComissao = 0;
    let totalRepasse = 0;

    for (const r of rateiosCalculados) {
      const parc = parceirosCriados[r.pIdx];
      const { comissaoValor, repasseValor } = calcularRateio(r.valor, r.pct);
      totalComissao += comissaoValor;
      totalRepasse += repasseValor;

      await supabase.from("campanha_rateios").insert({
        tenant_id: tenantId,
        pi_id: piMae.id,
        parceiro_id: parc.id,
        valor_comercializado: r.valor,
        comissao_pct: r.pct,
        comissao_valor: comissaoValor,
        repasse_valor: repasseValor,
        status_repasse: "aprovado",
        data_previsao_repasse: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        observacoes: `Rateio aprovado de ${parc.nome_fantasia}.`,
      });

      // Cria PI individual para o parceiro
      await supabase.from("pis").insert({
        tenant_id: tenantId,
        pi_pai_id: piMae.id,
        parceiro_id: parc.id,
        tipo_pi: "parceiro",
        numero: `DEMO-PI-2026-001-${parc.nome_fantasia.slice(0, 3).toUpperCase()}`,
        cliente_id: cliente.id,
        agencia_id: agencia.id,
        campanha: `Campanha Aniversário SuperMax [${parc.nome_fantasia}]`,
        mes_veiculacao: new Date().getMonth() + 1,
        ano_veiculacao: new Date().getFullYear(),
        status: "aprovado",
        valor_tabela: r.valor,
        valor_negociado: r.valor,
        total_comissao: comissaoValor,
        total_repasse: repasseValor,
        observacao: `PI de Veiculação emitido para ${parc.razao_social}. Comissão: ${r.pct}%. Repasse: R$ ${repasseValor}.`,
        created_by: userId,
      });
    }

    // Atualiza totais no PI mãe
    await supabase
      .from("pis")
      .update({ total_comissao: totalComissao, total_repasse: totalRepasse })
      .eq("id", piMae.id);

    // 8. Contrato preenchido com variáveis
    const { data: modeloPadrao } = await supabase
      .from("contrato_modelos")
      .select("id, conteudo")
      .eq("tipo", "cliente")
      .limit(1)
      .maybeSingle();

    await supabase.from("contratos").insert({
      tenant_id: tenantId,
      numero: "DEMO-CTR-2026-001",
      tipo: "cliente",
      titulo: "Contrato de Mídia Publicitária — SuperMax Varejo",
      modelo_id: modeloPadrao?.id || null,
      cliente_id: cliente.id,
      agencia_id: agencia.id,
      pi_id: piMae.id,
      valor: valorCampanha,
      comissao_pct: 27.0,
      comissao_valor: totalComissao,
      repasse_valor: totalRepasse,
      status: "assinado",
      conteudo_gerado:
        modeloPadrao?.conteudo
          ? modeloPadrao.conteudo
              .replace(/\{\{\s*CLIENTE\s*\}\}/g, "SuperMax Varejo e Distribuição S/A")
              .replace(/\{\{\s*CAMPANHA\s*\}\}/g, "Campanha Aniversário SuperMax")
              .replace(/\{\{\s*VALOR\s*\}\}/g, "R$ 100.000,00")
          : "Contrato de veiculação e representação comercial formalizado.",
      created_by: userId,
    });

    // 9. Comprovantes de veiculação (Checking)
    const comprovantesDemo = [
      {
        parceiroIdx: 0,
        tipo: "video",
        titulo: "Checking VT 30s no Telejornal Noturno (TV Central)",
        data: new Date().toISOString().split("T")[0],
        hora: "20:45",
      },
      {
        parceiroIdx: 1,
        tipo: "relatorio",
        titulo: "Relatório de Veiculação Áudio Spot 30s (Top FM)",
        data: new Date().toISOString().split("T")[0],
        hora: "08:15",
      },
      {
        parceiroIdx: 2,
        tipo: "print",
        titulo: "Print Banner Super Topo Home (Capital Notícias)",
        data: new Date().toISOString().split("T")[0],
        hora: "10:30",
      },
      {
        parceiroIdx: 3,
        tipo: "foto",
        titulo: "Foto Noturna Painel LED Eixo Monumental (MegaLED)",
        data: new Date().toISOString().split("T")[0],
        hora: "19:20",
      },
    ];

    for (const c of comprovantesDemo) {
      await supabase.from("comprovantes_execucao").insert({
        tenant_id: tenantId,
        pi_id: piMae.id,
        parceiro_id: parceirosCriados[c.parceiroIdx]?.id || null,
        tipo: c.tipo,
        titulo: c.titulo,
        data_veiculacao: c.data,
        hora_veiculacao: c.hora,
        validado: true,
        created_by: userId,
      });
    }

    return {
      success: true,
      tenantId,
      piId: piMae.id,
      valorCampanha,
      totalComissao,
      totalRepasse,
      mensagem: "Ambiente DEMO completo provisionado com sucesso!",
    };
  });
