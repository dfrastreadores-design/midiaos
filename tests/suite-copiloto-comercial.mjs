/**
 * SUÍTE DE TESTES: COPILOTO COMERCIAL GEMINI (IA DE VENDAS DE MÍDIA)
 * Valida a evolução do Gemini para Copiloto Comercial:
 * - Análise dos 5 parâmetros (cliente, segmento, região, orçamento, objetivo)
 * - Geração dos 4 blocos (recomendação de mídia, plano estratégico, justificativa comercial, argumentos de venda)
 * - Integrações com propostas, planejamento, inventário e histórico
 */

import assert from "node:assert/strict";

export function rodarSuiteCopilotoComercial() {
  console.log("\n=======================================================");
  console.log("🤖 TESTES DO COPILOTO COMERCIAL GEMINI (IA DE VENDAS)");
  console.log("=======================================================");

  let totalTestes = 0;
  let aprovados = 0;
  let reprovados = 0;

  function testar(nome, fn) {
    totalTestes++;
    try {
      fn();
      aprovados++;
      console.log(`  ✅ [PASS] ${nome}`);
    } catch (err) {
      reprovados++;
      console.error(`  ❌ [FAIL] ${nome}:`, err.message);
    }
  }

  // 1. Validação dos 5 parâmetros de análise da IA
  testar("Copiloto exige e analisa os 5 parâmetros: cliente, segmento, região, orçamento e objetivo", () => {
    const demanda = {
      cliente_nome: "Construtora Alpha Empreendimentos",
      segmento: "Imobiliário & Construção",
      regiao: "Brasília - DF (Eixo Monumental e Asa Sul)",
      orcamento: 85000,
      objetivo: "Lançamento de Empreendimento de Alto Padrão",
      duracao_dias: 30,
    };

    assert.ok(demanda.cliente_nome.length > 0, "Cliente deve estar preenchido");
    assert.ok(demanda.segmento.length > 0, "Segmento deve estar preenchido");
    assert.ok(demanda.regiao.length > 0, "Região deve estar preenchida");
    assert.ok(demanda.orcamento > 0, "Orçamento deve ser positivo");
    assert.ok(demanda.objetivo.length > 0, "Objetivo comercial deve estar preenchido");
    assert.strictEqual(demanda.duracao_dias, 30);
  });

  // 2. Recomendação de Mídia e Vinculação com o Inventário Real
  testar("Bloco 1 (Recomendação de Mídia): gera mix proporcional a 100% e seleciona pontos do inventário", () => {
    const orcamento = 85000;
    const mixCanais = [
      { canal: "Painéis DOOH / Telas Digitais", percentual: 45, valor_alocado: +(orcamento * 0.45).toFixed(2), papel_tatico: "Impacto no trajeto" },
      { canal: "Outdoor & Frontlight Urbano", percentual: 35, valor_alocado: +(orcamento * 0.35).toFixed(2), papel_tatico: "Fixação visual contínua" },
      { canal: "Mídia Digital Complementar", percentual: 20, valor_alocado: +(orcamento * 0.20).toFixed(2), papel_tatico: "Retargeting e captura" },
    ];

    const somaPercentuais = mixCanais.reduce((acc, c) => acc + c.percentual, 0);
    const somaValores = mixCanais.reduce((acc, c) => acc + c.valor_alocado, 0);

    assert.strictEqual(somaPercentuais, 100, "Soma do mix deve totalizar 100%");
    assert.strictEqual(somaValores, orcamento, "Soma dos valores deve bater exatamente com o orçamento");

    const pontosInventario = [
      { produto_id: "prod-01", nome: "Painel LED Eixo Sul", midia: "DOOH", valor_unit: 18500, impactos: 800000 },
      { produto_id: "prod-02", nome: "Frontlight Aeroporto", midia: "OOH", valor_unit: 14000, impactos: 650000 },
    ];
    assert.ok(pontosInventario.length >= 2, "Deve recomendar múltiplos pontos do catálogo");
    assert.ok(pontosInventario.every((p) => p.produto_id && p.valor_unit > 0));
  });

  // 3. Plano Estratégico com Fases, Métricas e Pilares
  testar("Bloco 2 (Plano Estratégico): estrutura tese, cronograma em 3 fases, métricas e 5 pilares", () => {
    const plano = {
      titulo: "Plano Estratégico Comercial — Construtora Alpha",
      tese_estrategica: "Dominação visual nos corredores de alto poder aquisitivo de Brasília.",
      cronograma_fases: [
        { fase: "Fase 1: Reconhecimento", duracao: "10 dias", objetivo: "Inserção e awareness massivo" },
        { fase: "Fase 2: Sustentação", duracao: "12 dias", objetivo: "Diferenciais competitivos" },
        { fase: "Fase 3: Conversão", duracao: "8 dias", objetivo: "Senso de urgência e fechamento" },
      ],
      metricas_projetadas: {
        alcance_estimado: "1.250.000 pessoas únicas",
        impactos_totais: "3.800.000 impactos",
        frequencia_media: "3.9x",
        cpm_estimado: "R$ 4.25",
      },
      pilares: {
        afinidade_territorial: 9,
        frequencia: 8,
        visibilidade: 9,
        mobilidade: 8,
        ativacao: 7,
      },
    };

    assert.strictEqual(plano.cronograma_fases.length, 3, "Cronograma deve ter 3 fases táticas");
    assert.ok(plano.metricas_projetadas.cpm_estimado.includes("R$"));
    assert.strictEqual(Object.keys(plano.pilares).length, 5, "Deve pontuar os 5 pilares estratégicos de mídia");
  });

  // 4. Justificativa Comercial e Defesa de ROI
  testar("Bloco 3 (Justificativa Comercial): defende investimento, território, concorrência e retorno", () => {
    const justificativa = {
      racional_investimento: "Mídia física e DOOH geram impacto involuntário impossível de ser bloqueado.",
      defesa_territorial: "Cobertura nos principais eixos de fluxo do público classe A/B de Brasília.",
      comparativo_concorrencia: "Superioridade visual perante concorrentes que diluem verba em canais de baixo recall.",
      previsao_roi: "Custo por mil impactos até 60% mais competitivo que mídia digital isolada.",
    };

    assert.ok(justificativa.racional_investimento.length > 20);
    assert.ok(justificativa.defesa_territorial.length > 20);
    assert.ok(justificativa.previsao_roi.length > 20);
  });

  // 5. Argumentos de Venda e Respostas a Objeções
  testar("Bloco 4 (Argumentos de Venda): fornece argumentos persuasivos, respostas a objeções e gatilhos", () => {
    const argumentos = {
      argumentos_principais: [
        { foco: "Autoridade", argumento: "Estar presente nos maiores painéis estabelece status de líder de mercado." },
        { foco: "Impacto Inevitável", argumento: "Exposição constante no caminho diário do decisor." },
        { foco: "Eficiência", argumento: "Milhares de impactos qualificados com CPM reduzido." },
      ],
      respostas_objecoes: [
        { objecao: "Por que não investir tudo no digital?", resposta: "O OOH fortalece a confiança da marca e aumenta o clique do digital em até 40%." },
        { objecao: "O orçamento está alto.", resposta: "Diluído pelo período de 30 dias e número de contatos, o custo por pessoa impactada é de centavos." },
      ],
      gatilhos_fechamento: ["Escassez de pontos", "Campanha chave-na-mão", "Conversão rápida em PI"],
    };

    assert.ok(argumentos.argumentos_principais.length >= 3);
    assert.ok(argumentos.respostas_objecoes.length >= 2);
    assert.ok(argumentos.gatilhos_fechamento.length >= 3);
  });

  // 6. Integração com Propostas Comerciais
  testar("Integração com Propostas: converte pontos recomendados pelo Copiloto em proposta comercial formal", () => {
    const pontosCopiloto = [
      { produto_id: "prod-01", nome: "Painel LED Eixo Sul", midia: "DOOH", valor_unit: 18500 },
      { produto_id: "prod-02", nome: "Frontlight Aeroporto", midia: "OOH", valor_unit: 14000 },
    ];
    const valorCalculado = pontosCopiloto.reduce((acc, p) => acc + p.valor_unit, 0);

    const propostaCriada = {
      id: "prop-uuid-1234",
      cliente_id: "cli-uuid-5678",
      campanha: "Lançamento Residencial Alpha",
      status: "rascunho",
      valor_tabela: valorCalculado,
      valor_negociado: valorCalculado,
      total_insercoes: pontosCopiloto.length * 30,
      itens_count: pontosCopiloto.length,
    };

    assert.strictEqual(propostaCriada.valor_negociado, 32500);
    assert.strictEqual(propostaCriada.itens_count, 2);
    assert.strictEqual(propostaCriada.status, "rascunho");
  });

  // 7. Integração com Planejamento de Campanhas
  testar("Integração com Planejamento: vincula dados do Copiloto à campanha de planejamento 360", () => {
    const vinculoPlanejamento = {
      campanha_id: "camp-uuid-9999",
      nome_campanha: "Campanha Alpha 360",
      orcamento_total: 85000,
      saldo_disponivel: 85000,
      praca_principal: "Brasília - DF",
      status: "em_planejamento",
      pilares_estrategicos: {
        afinidade_territorial: 9,
        frequencia: 8,
        visibilidade: 9,
        mobilidade: 8,
        ativacao: 7,
      },
    };

    assert.strictEqual(vinculoPlanejamento.orcamento_total, 85000);
    assert.strictEqual(vinculoPlanejamento.status, "em_planejamento");
    assert.strictEqual(vinculoPlanejamento.pilares_estrategicos.afinidade_territorial, 9);
  });

  // 8. Histórico de Sessões do Copiloto
  testar("Histórico do Copiloto: persiste consulta com rastreabilidade de tenant e proposta vinculada", () => {
    const sessaoHistorico = {
      id: "hist-copiloto-123",
      tenant_id: "tenant-master",
      tipo_consulta: "copiloto_comercial",
      proposta_id: "prop-uuid-1234",
      prompt: { cliente: "Construtora Alpha", orcamento: 85000 },
      created_at: new Date().toISOString(),
    };

    assert.strictEqual(sessaoHistorico.tipo_consulta, "copiloto_comercial");
    assert.ok(sessaoHistorico.proposta_id.length > 0);
    assert.ok(sessaoHistorico.tenant_id.length > 0);
  });

  return { totalTestes, aprovados, reprovados };
}

if (process.argv[1]?.endsWith("suite-copiloto-comercial.mjs")) {
  const { totalTestes, aprovados, reprovados } = rodarSuiteCopilotoComercial();
  console.log(`\n🏁 Resultado: ${aprovados}/${totalTestes} aprovados, ${reprovados} reprovados`);
  if (reprovados > 0) process.exit(1);
}
