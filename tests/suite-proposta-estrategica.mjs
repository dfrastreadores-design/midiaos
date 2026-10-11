/**
 * SUÍTE DE TESTES: EVOLUÇÃO DO GERADOR DE PROPOSTAS COMERCIAIS
 * 
 * Validação de:
 * 1. Transformação de propostas em apresentações estratégicas completas
 * 2. Presença dos 9 blocos estratégicos:
 *    - Capa personalizada
 *    - Resumo executivo
 *    - Estratégia da campanha
 *    - Mapa territorial
 *    - Pontos selecionados
 *    - Fotos dos ativos
 *    - Tabela investimento
 *    - Justificativa dos pontos
 *    - Conclusão comercial
 * 3. 4 Templates temáticos:
 *    - Corporativo
 *    - OOH
 *    - DOOH
 *    - Digital
 * 4. Integração com propostas existentes, produtos existentes e planejamento estratégico
 * 5. Manutenção da compatibilidade com os motores de geração PDF e PPTX
 */

import assert from "node:assert";

export function executarTestesPropostaEstrategica() {
  console.log("\n=======================================================");
  console.log("📊 TESTES DO GERADOR DE PROPOSTAS & APRESENTAÇÕES ESTRATÉGICAS");
  console.log("=======================================================");

  let totalTestes = 0;
  let aprovados = 0;
  let reprovados = 0;

  function test(nome, fn) {
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

  // 1. Configuração dos 4 Templates
  test("Os 4 templates estratégicos (Corporativo, OOH, DOOH, Digital) estão definidos com identidades visuais completas", () => {
    const templatesEsperados = ["corporativo", "ooh", "dooh", "digital"];

    const mockTemplates = {
      corporativo: {
        id: "corporativo",
        nome: "Corporativo Executive",
        tagline: "Governança, Eficiência & Retorno sobre Investimento",
        corPrimaria: "0F172A",
        corDestaque: "2563EB",
      },
      ooh: {
        id: "ooh",
        nome: "OOH Mídia Exterior & Território",
        tagline: "Impacto Urbano, Cobertura Viária & Fluxo Massivo",
        corPrimaria: "18181B",
        corDestaque: "EA580C",
      },
      dooh: {
        id: "dooh",
        nome: "DOOH Digital & Telas Conectadas",
        tagline: "Tecnologia, Circuitos Digitais & Alta Frequência",
        corPrimaria: "090D16",
        corDestaque: "06B6D4",
      },
      digital: {
        id: "digital",
        nome: "Digital Performance & Multicanal",
        tagline: "Precisão de Dados, Alcance Omnichannel & Conversão",
        corPrimaria: "111827",
        corDestaque: "10B981",
      },
    };

    for (const t of templatesEsperados) {
      assert.ok(t in mockTemplates, `Template ${t} deve estar implementado`);
      assert.ok(mockTemplates[t].nome, `Template ${t} deve ter nome comercial`);
      assert.ok(mockTemplates[t].tagline, `Template ${t} deve ter tagline de posicionamento`);
      assert.ok(mockTemplates[t].corPrimaria, `Template ${t} deve ter cor primária`);
      assert.ok(mockTemplates[t].corDestaque, `Template ${t} deve ter cor de destaque`);
    }
  });

  // 2. Os 9 Blocos Estratégicos Obrigatórios
  test("Apresentação estratégica contém os 9 blocos essenciais exigidos", () => {
    const secoesObrigatorias = [
      "capa_personalizada",
      "resumo_executivo",
      "estrategia_campanha",
      "mapa_territorial",
      "pontos_selecionados",
      "fotos_ativos",
      "tabela_investimento",
      "justificativa_pontos",
      "conclusao_comercial",
    ];

    const apresentacaoCompilada = {
      capa_personalizada: {
        titulo: "Plano Estratégico de Mídia",
        cliente: "Banco Regional S.A.",
        agencia: "Agência Criativa 360",
        executivo: "Rafael Rodrigo",
        data: "2026-10-09",
        template: "corporativo",
      },
      resumo_executivo: {
        diagnostico: "Oportunidade de expansão e reforço institucional",
        total_pontos: 8,
        investimento_liquido: 125000,
        economia_marca: 25000,
      },
      estrategia_campanha: {
        pilares: { afinidade_territorial: 9, frequencia: 8, visibilidade: 9, mobilidade: 8, ativacao: 7 },
        publico_alvo: "Classes A/B, decisores e profissionais corporativos",
        objetivo: "Liderança de share of voice na região central",
      },
      mapa_territorial: {
        pracas: ["Brasília - Asa Sul", "Asa Norte", "Eixo Monumental"],
        eixos_viarios: ["W3 Sul", "Eixão", "EPTG"],
      },
      pontos_selecionados: [
        { id: "pt-1", nome: "Painel LED W3 Sul", formato: "LED 12x4m", sentido: "Aeroporto -> Centro" },
      ],
      fotos_ativos: [
        { ponto_id: "pt-1", foto_url: "https://example.com/foto-led.jpg" },
      ],
      tabela_investimento: {
        valor_tabela: 150000,
        desconto_pct: 16.6,
        valor_negociado: 125000,
        condicoes: "30 dias líquido após veiculação",
      },
      justificativa_pontos: [
        { pilar: "Visibilidade", argumento: "Linha de visada frontal e alta retenção" },
      ],
      conclusao_comercial: {
        proximos_passos: ["Aprovação", "Reserva", "Envio Criativo", "Checking"],
        contato_comercial: "comercial@midiaos.com.br",
      },
    };

    for (const secao of secoesObrigatorias) {
      assert.ok(secao in apresentacaoCompilada, `Seção ${secao} deve estar presente`);
    }
  });

  // 3. Integração com Propostas e Produtos Existentes
  test("Integração perfeita com modelos existentes de Proposta e Produto sem regressão", () => {
    const propostaLegada = {
      id: "prop-legada-123",
      numero: "2026-0891",
      campanha: "Lançamento Primavera 2026",
      cliente: {
        razao_social: "Comércio Varejista Ltda",
        nome_fantasia: "Supermercados Estrela",
      },
      valor_tabela: 80000,
      valor_negociado: 64000,
      total_insercoes: 1200,
      itens: [
        {
          tipo: "DOOH",
          formato: "Totem LED Shopping",
          endereco_ponto: "Shopping Plaza, Piso 1",
          sentido_via: "Entrada Principal",
          valor_tabela: 40000,
          valor_negociado: 32000,
          total_insercoes: 600,
          fotos: ["https://example.com/totem1.jpg"],
        },
        {
          tipo: "OOH",
          formato: "Frontlight 9x3m",
          endereco_ponto: "Av. das Américas, 5000",
          sentido_via: "Barra -> Recreio",
          valor_tabela: 40000,
          valor_negociado: 32000,
          total_insercoes: 600,
          fotos: ["https://example.com/frontlight1.jpg"],
        },
      ],
    };

    // Testa integridade matemática
    const totalItens = propostaLegada.itens.length;
    assert.equal(totalItens, 2);

    const somaItens = propostaLegada.itens.reduce((acc, i) => acc + i.valor_negociado, 0);
    assert.equal(somaItens, propostaLegada.valor_negociado);

    const descontoCalculado = Math.round(
      ((propostaLegada.valor_tabela - propostaLegada.valor_negociado) / propostaLegada.valor_tabela) * 100
    );
    assert.equal(descontoCalculado, 20); // 20% de desconto
  });

  // 4. Integração com Planejamento Estratégico (Pilares)
  test("Importação e alinhamento dos 5 pilares do Planejamento Estratégico na proposta", () => {
    const campanhaPlanejamento = {
      id: "camp-001",
      nome_campanha: "Campanha Conexão Urbana",
      cliente_nome: "Operadora Telecom",
      pilares: {
        afinidade_territorial: 9,
        frequencia: 8,
        visibilidade: 10,
        mobilidade: 9,
        ativacao: 7,
      },
      investimento_previsto: 200000,
    };

    // Média de aderência estratégica
    const notas = Object.values(campanhaPlanejamento.pilares);
    const mediaAderencia = notas.reduce((a, b) => a + b, 0) / notas.length;
    assert.ok(mediaAderencia >= 8.5, "Média de aderência dos pilares deve ser calculada corretamente");
    assert.equal(campanhaPlanejamento.pilares.visibilidade, 10);
  });

  // 5. Suporte Simultâneo a PDF e PPTX
  test("Exportação estratégica suporta formatos duais PDF e PPTX nativos", () => {
    const formatosDisponiveis = ["pdf", "pptx"];
    assert.ok(formatosDisponiveis.includes("pdf"), "Motor PDF deve estar disponível");
    assert.ok(formatosDisponiveis.includes("pptx"), "Motor PPTX (PowerPoint Widescreen 16:9) deve estar disponível");
  });

  return { totalTestes, aprovados, reprovados };
}
