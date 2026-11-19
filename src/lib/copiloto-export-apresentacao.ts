// ==============================================================================
// EXPORTADOR DE APRESENTAÇÃO EXECUTIVA — COPILOTO IA DE PLANEJAMENTO
// Gera arquivos profissionais .PPTX e .PDF com as 9 seções estratégicas
// ==============================================================================

import PptxGenJS from "pptxgenjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PlanejamentoEstrategicoCompleto } from "./copiloto-planejamento.types";

const fmtBRL = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const fmtNum = (val: number) =>
  new Intl.NumberFormat("pt-BR").format(val || 0);

export async function exportarPlanejamentoPPTX(
  plano: PlanejamentoEstrategicoCompleto,
  nomeEmpresa = "Mídia.OS"
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Mídia.OS Copiloto Estratégico IA";
  pptx.company = nomeEmpresa;
  pptx.title = `Planejamento Estratégico de Mídia — ${plano.briefing.cliente_nome}`;

  const COR_FUNDO = "0B132B"; // Dark Navy
  const COR_CARD = "1C2541"; // Slate escuro
  const COR_BORDA = "3A506B";
  const COR_DESTAQUE = "10B981"; // Emerald
  const COR_AZUL = "38BDF8"; // Sky Blue
  const COR_TEXTO_BRANCO = "FFFFFF";
  const COR_TEXTO_MUTED = "94A3B8";

  // Helper para adicionar rodapé padrão
  const addFooter = (slide: PptxGenJS.Slide, tituloSlide: string) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 0.4,
      w: 11.7,
      h: 0.35,
      fill: { color: "131B2E" },
      line: { color: COR_BORDA, width: 1 },
    });
    slide.addText(`COPILOTO IA DE PLANEJAMENTO DE MÍDIA  •  ${plano.briefing.cliente_nome.toUpperCase()}  —  ${tituloSlide.toUpperCase()}`, {
      x: 0.9,
      y: 0.42,
      w: 11.5,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: COR_AZUL,
      fontFace: "Arial",
    });
  };

  // -------------------------------------------------------------
  // SLIDE 1: CAPA EXECUTIVA
  // -------------------------------------------------------------
  const slide1 = pptx.addSlide();
  slide1.background = { color: COR_FUNDO };

  slide1.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.5,
    w: 4.5,
    h: 0.4,
    fill: { color: "064E3B" },
    line: { color: COR_DESTAQUE, width: 1 },
  });
  slide1.addText("PLANEJAMENTO ESTRATÉGICO DE MÍDIA 3.0", {
    x: 0.9,
    y: 1.52,
    w: 4.3,
    h: 0.35,
    fontSize: 11,
    bold: true,
    color: "6EE7B7",
    fontFace: "Arial",
  });

  slide1.addText(`Campanha Integrada de Mídia:\n${plano.briefing.cliente_nome}`, {
    x: 0.8,
    y: 2.1,
    w: 11.5,
    h: 1.6,
    fontSize: 32,
    bold: true,
    color: COR_TEXTO_BRANCO,
    fontFace: "Arial",
  });

  slide1.addText(`Tese Estratégica, Racional Comercial & Alocação Inteligente de Inventário\nPraça foco: ${plano.briefing.praca_alvo}  •  Duração: ${plano.briefing.duracao_dias} dias  •  Investimento Total: ${fmtBRL(plano.briefing.orcamento_total)}`, {
    x: 0.8,
    y: 4.0,
    w: 11.5,
    h: 0.8,
    fontSize: 14,
    color: COR_TEXTO_MUTED,
    fontFace: "Arial",
  });

  slide1.addText(`Desenvolvido por Estrategista Sênior de Mídia (${nomeEmpresa} Copiloto IA)\nData: ${new Date().toLocaleDateString("pt-BR")}`, {
    x: 0.8,
    y: 6.2,
    w: 11.5,
    h: 0.6,
    fontSize: 11,
    italic: true,
    color: "64748B",
    fontFace: "Arial",
  });

  // -------------------------------------------------------------
  // SLIDE 2: BRIEFING & DIAGNÓSTICO ESTRATÉGICO
  // -------------------------------------------------------------
  const slide2 = pptx.addSlide();
  slide2.background = { color: COR_FUNDO };
  addFooter(slide2, "1. Briefing & 2. Diagnóstico Estratégico");

  slide2.addText("Diagnóstico Estratégico & Análise de Mercado", {
    x: 0.8,
    y: 1.0,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COR_TEXTO_BRANCO,
  });

  // Card Esquerdo: Briefing
  slide2.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.8,
    w: 5.6,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COR_CARD },
    line: { color: COR_BORDA, width: 1 },
  });
  slide2.addText("BRIEFING & METADADOS COMERCIAIS", {
    x: 1.1,
    y: 2.0,
    w: 5.0,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: COR_DESTAQUE,
  });
  const briefingLines = [
    `• Anunciante: ${plano.briefing.cliente_nome}`,
    `• Segmento: ${plano.briefing.segmento}`,
    `• Praça Foco: ${plano.briefing.praca_alvo}`,
    `• Orçamento Previsto: ${fmtBRL(plano.briefing.orcamento_total)}`,
    `• Público-Alvo: ${plano.briefing.publico_alvo.perfil}`,
    `• Demografia: ${plano.briefing.publico_alvo.faixa_etaria} | Classe ${plano.briefing.publico_alvo.classe_social}`,
    `• Rotina de Deslocamento: ${plano.briefing.publico_alvo.habitos_deslocamento}`,
  ];
  slide2.addText(briefingLines.join("\n\n"), {
    x: 1.1,
    y: 2.5,
    w: 5.0,
    h: 3.8,
    fontSize: 11,
    color: COR_TEXTO_BRANCO,
    lineSpacing: 18,
  });

  // Card Direito: Diagnóstico
  slide2.addShape(pptx.ShapeType.roundRect, {
    x: 6.7,
    y: 1.8,
    w: 5.8,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COR_CARD },
    line: { color: COR_BORDA, width: 1 },
  });
  slide2.addText("DIAGNÓSTICO SITUACIONAL & TERRITÓRIO", {
    x: 7.0,
    y: 2.0,
    w: 5.2,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: COR_AZUL,
  });
  const diagLines = [
    `• Análise de Mercado: ${plano.diagnostico.analise_mercado}`,
    `• Oportunidade Territorial: ${plano.diagnostico.oportunidades_territoriais}`,
    `• Barreira de Comunicação: ${plano.diagnostico.desafios_comunicacao}`,
    `• Concorrência: ${plano.diagnostico.posicionamento_concorrencia}`,
  ];
  slide2.addText(diagLines.join("\n\n"), {
    x: 7.0,
    y: 2.5,
    w: 5.2,
    h: 3.8,
    fontSize: 11,
    color: COR_TEXTO_BRANCO,
    lineSpacing: 18,
  });

  // -------------------------------------------------------------
  // SLIDE 3: OBJETIVOS DA CAMPANHA & KPIS DE IMPACTO
  // -------------------------------------------------------------
  const slide3 = pptx.addSlide();
  slide3.background = { color: COR_FUNDO };
  addFooter(slide3, "3. Objetivos & Projeções de Impacto");

  slide3.addText("Objetivos Comerciais & Métricas Projetadas", {
    x: 0.8,
    y: 1.0,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COR_TEXTO_BRANCO,
  });

  // 4 Cards de Métricas de Topo
  const kpis = [
    { label: "PESSOAS ÚNICAS (ALCANCE)", val: fmtNum(plano.objetivos.kpis_projetados.alcance_pessoas_unicas), desc: "População economicamente ativa impactada", cor: COR_AZUL },
    { label: "IMPACTOS VISUAIS TOTAIS", val: fmtNum(plano.objetivos.kpis_projetados.impactos_visuais_totais), desc: "Volume total de visualizações na praça", cor: COR_DESTAQUE },
    { label: "FREQUÊNCIA MÉDIA", val: `${plano.objetivos.kpis_projetados.frequencia_media.toFixed(1)}x`, desc: "Exposições repetidas durante a campanha", cor: "F59E0B" },
    { label: "CPM ESTIMADO", val: `R$ ${plano.objetivos.kpis_projetados.cpm_estimado.toFixed(2)}`, desc: "Custo por cada 1.000 visualizações reais", cor: "EC4899" },
  ];

  kpis.forEach((kpi, idx) => {
    const posX = 0.8 + idx * 2.95;
    slide3.addShape(pptx.ShapeType.roundRect, {
      x: posX,
      y: 1.8,
      w: 2.8,
      h: 1.8,
      rectRadius: 0.1,
      fill: { color: COR_CARD },
      line: { color: kpi.cor, width: 1.5 },
    });
    slide3.addText(kpi.label, { x: posX + 0.15, y: 1.95, w: 2.5, h: 0.3, fontSize: 9, bold: true, color: COR_TEXTO_MUTED });
    slide3.addText(kpi.val, { x: posX + 0.15, y: 2.25, w: 2.5, h: 0.6, fontSize: 20, bold: true, color: kpi.cor });
    slide3.addText(kpi.desc, { x: posX + 0.15, y: 2.9, w: 2.5, h: 0.5, fontSize: 9, color: "CBD5E1" });
  });

  // Card Inferior com Objetivos Primário e Secundários
  slide3.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 3.9,
    w: 11.7,
    h: 2.7,
    rectRadius: 0.1,
    fill: { color: COR_CARD },
    line: { color: COR_BORDA, width: 1 },
  });
  slide3.addText("OBJETIVO PRIMÁRIO:", { x: 1.1, y: 4.1, w: 11.0, h: 0.3, fontSize: 12, bold: true, color: COR_DESTAQUE });
  slide3.addText(plano.objetivos.objetivo_primario, { x: 1.1, y: 4.45, w: 11.0, h: 0.6, fontSize: 13, bold: true, color: COR_TEXTO_BRANCO });

  slide3.addText("OBJETIVOS SECUNDÁRIOS & ATIVAÇÕES TÁTICAS:", { x: 1.1, y: 5.15, w: 11.0, h: 0.3, fontSize: 11, bold: true, color: COR_AZUL });
  const secText = plano.objetivos.objetivos_secundarios.map((s) => `• ${s}`).join("    |    ");
  slide3.addText(secText, { x: 1.1, y: 5.5, w: 11.0, h: 0.8, fontSize: 11, color: "E2E8F0" });

  // -------------------------------------------------------------
  // SLIDE 4: ESTRATÉGIA RECOMENDADA & 5 PILARES
  // -------------------------------------------------------------
  const slide4 = pptx.addSlide();
  slide4.background = { color: COR_FUNDO };
  addFooter(slide4, "4. Estratégia Recomendada & Pilares");

  slide4.addText("Tese de Mídia & Os 5 Pilares Estratégicos", {
    x: 0.8,
    y: 1.0,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COR_TEXTO_BRANCO,
  });

  // Tese
  slide4.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.8,
    w: 11.7,
    h: 1.3,
    rectRadius: 0.1,
    fill: { color: "132E27" },
    line: { color: COR_DESTAQUE, width: 1.5 },
  });
  slide4.addText("TESE CENTRAL DO ESTRATEGISTA SÊNIOR:", { x: 1.1, y: 1.95, w: 11.0, h: 0.3, fontSize: 10, bold: true, color: "6EE7B7" });
  slide4.addText(plano.estrategia.tese_central, { x: 1.1, y: 2.25, w: 11.0, h: 0.7, fontSize: 12, color: COR_TEXTO_BRANCO });

  // 5 Pilares
  const pilaresArr = [
    { nome: "1. Afinidade Territorial", nota: plano.estrategia.pilares.afinidade_territorial.nota, desc: plano.estrategia.pilares.afinidade_territorial.descricao },
    { nome: "2. Frequência de Impacto", nota: plano.estrategia.pilares.frequencia_impacto.nota, desc: plano.estrategia.pilares.frequencia_impacto.descricao },
    { nome: "3. Visibilidade & Status", nota: plano.estrategia.pilares.visibilidade_autoridade.nota, desc: plano.estrategia.pilares.visibilidade_autoridade.descricao },
    { nome: "4. Mobilidade & Jornada", nota: plano.estrategia.pilares.mobilidade_jornada.nota, desc: plano.estrategia.pilares.mobilidade_jornada.descricao },
    { nome: "5. Ativação de Ação", nota: plano.estrategia.pilares.ativacao_conversao.nota, desc: plano.estrategia.pilares.ativacao_conversao.descricao },
  ];

  pilaresArr.forEach((p, idx) => {
    const posX = 0.8 + idx * 2.36;
    slide4.addShape(pptx.ShapeType.roundRect, {
      x: posX,
      y: 3.3,
      w: 2.25,
      h: 3.2,
      rectRadius: 0.1,
      fill: { color: COR_CARD },
      line: { color: COR_BORDA, width: 1 },
    });
    slide4.addText(p.nome, { x: posX + 0.1, y: 3.45, w: 2.05, h: 0.5, fontSize: 10, bold: true, color: COR_AZUL });
    slide4.addText(`${p.nota}/10`, { x: posX + 0.1, y: 3.95, w: 2.05, h: 0.5, fontSize: 24, bold: true, color: COR_DESTAQUE });
    slide4.addText(p.desc, { x: posX + 0.1, y: 4.55, w: 2.05, h: 1.8, fontSize: 9, color: "CBD5E1" });
  });

  // -------------------------------------------------------------
  // SLIDE 5: PLANO DE MÍDIA DETALHADO (INVENTÁRIO)
  // -------------------------------------------------------------
  const slide5 = pptx.addSlide();
  slide5.background = { color: COR_FUNDO };
  addFooter(slide5, "5. Plano de Mídia & Seleção de Inventário");

  slide5.addText("Plano de Mídia & Seleção Territorial de Pontos", {
    x: 0.8,
    y: 1.0,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COR_TEXTO_BRANCO,
  });

  const tableRows: PptxGenJS.TableRow[] = [
    [
      { text: "Ponto / Ativo de Mídia", options: { bold: true, fill: { color: "1E293B" }, color: "38BDF8" } },
      { text: "Meio / Tipo", options: { bold: true, fill: { color: "1E293B" }, color: "38BDF8" } },
      { text: "Localização / Praça", options: { bold: true, fill: { color: "1E293B" }, color: "38BDF8" } },
      { text: "Impactos/mês", options: { bold: true, fill: { color: "1E293B" }, color: "38BDF8", align: "right" } },
      { text: "Investimento Negociado", options: { bold: true, fill: { color: "1E293B" }, color: "10B981", align: "right" } },
    ],
  ];

  plano.plano_midia.slice(0, 6).forEach((p) => {
    tableRows.push([
      { text: p.nome, options: { color: "FFFFFF", fontSize: 10 } },
      { text: `${p.midia} (${p.formato || p.tipo})`, options: { color: "CBD5E1", fontSize: 9 } },
      { text: p.endereco || p.cidade || p.praca, options: { color: "94A3B8", fontSize: 9 } },
      { text: fmtNum(p.impactos_mes), options: { color: "38BDF8", fontSize: 10, align: "right" } },
      { text: fmtBRL(p.valor_negociado), options: { color: "10B981", fontSize: 10, bold: true, align: "right" } },
    ]);
  });

  slide5.addTable(tableRows, {
    x: 0.8,
    y: 1.8,
    w: 11.7,
    fontSize: 10,
    border: { pt: 1, color: "334155" },
    fill: { color: "0F172A" },
  });

  slide5.addText(`Total Alocado em Ativos: ${fmtBRL(plano.distribuicao_investimento.valor_total)} distribuídos em ${plano.plano_midia.length} pontos estratégicos.`, {
    x: 0.8,
    y: 6.2,
    w: 11.7,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: COR_DESTAQUE,
  });

  // -------------------------------------------------------------
  // SLIDE 6: DISTRIBUIÇÃO DE INVESTIMENTO & SHARE DE VERBA
  // -------------------------------------------------------------
  const slide6 = pptx.addSlide();
  slide6.background = { color: COR_FUNDO };
  addFooter(slide6, "6. Distribuição de Investimento");

  slide6.addText("Distribuição Orçamentária & Mix Tático de Canais", {
    x: 0.8,
    y: 1.0,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COR_TEXTO_BRANCO,
  });

  plano.distribuicao_investimento.mix_canais.forEach((canal, idx) => {
    const posY = 1.8 + idx * 0.95;
    slide6.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: posY,
      w: 11.7,
      h: 0.85,
      rectRadius: 0.1,
      fill: { color: COR_CARD },
      line: { color: COR_BORDA, width: 1 },
    });

    slide6.addText(`${canal.canal} (${canal.percentual}%)`, {
      x: 1.1,
      y: posY + 0.12,
      w: 4.5,
      h: 0.35,
      fontSize: 13,
      bold: true,
      color: COR_AZUL,
    });
    slide6.addText(fmtBRL(canal.valor), {
      x: 1.1,
      y: posY + 0.45,
      w: 4.5,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: COR_DESTAQUE,
    });
    slide6.addText(canal.papel_estrategico, {
      x: 5.8,
      y: posY + 0.15,
      w: 6.4,
      h: 0.55,
      fontSize: 10,
      color: "E2E8F0",
    });
  });

  // -------------------------------------------------------------
  // SLIDE 7: DEFESA COMERCIAL & QUEBRA DE OBJEÇÕES
  // -------------------------------------------------------------
  const slide7 = pptx.addSlide();
  slide7.background = { color: COR_FUNDO };
  addFooter(slide7, "7. Defesa Comercial & Teses");

  slide7.addText("Defesa Estratégica & Racional de Blindagem", {
    x: 0.8,
    y: 1.0,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COR_TEXTO_BRANCO,
  });

  // Card Racional
  slide7.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.8,
    w: 11.7,
    h: 1.4,
    rectRadius: 0.1,
    fill: { color: COR_CARD },
    line: { color: COR_DESTAQUE, width: 1 },
  });
  slide7.addText("RACIONAL DO INVESTIMENTO:", { x: 1.1, y: 1.95, w: 11.0, h: 0.3, fontSize: 11, bold: true, color: COR_DESTAQUE });
  slide7.addText(plano.defesa_comercial.racional_investimento, { x: 1.1, y: 2.25, w: 11.0, h: 0.8, fontSize: 11, color: COR_TEXTO_BRANCO });

  // 3 Objeções
  slide7.addText("QUEBRA DE OBJEÇÕES & ARGUMENTOS SÊNIOR:", { x: 0.8, y: 3.4, w: 11.7, h: 0.3, fontSize: 12, bold: true, color: COR_AZUL });
  plano.defesa_comercial.respostas_objecoes.slice(0, 3).forEach((item, idx) => {
    const posX = 0.8 + idx * 3.95;
    slide7.addShape(pptx.ShapeType.roundRect, {
      x: posX,
      y: 3.8,
      w: 3.8,
      h: 2.8,
      rectRadius: 0.1,
      fill: { color: "131B2E" },
      line: { color: "334155", width: 1 },
    });
    slide7.addText(`Objeção: "${item.objecao}"`, { x: posX + 0.15, y: 3.95, w: 3.5, h: 0.6, fontSize: 10, bold: true, color: "F87171" });
    slide7.addText(item.resposta_estrategica, { x: posX + 0.15, y: 4.6, w: 3.5, h: 1.8, fontSize: 9.5, color: "E2E8F0" });
  });

  // -------------------------------------------------------------
  // SLIDE 8: SIMULAÇÃO DE CENÁRIOS COMPARATIVOS
  // -------------------------------------------------------------
  const slide8 = pptx.addSlide();
  slide8.background = { color: COR_FUNDO };
  addFooter(slide8, "8. Simulação de Cenários");

  slide8.addText("Simulação de Cenários de Investimento", {
    x: 0.8,
    y: 1.0,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COR_TEXTO_BRANCO,
  });

  plano.cenarios.lista.forEach((cenario, idx) => {
    const posX = 0.8 + idx * 3.95;
    const isRec = cenario.destaque || cenario.id === "recomendado";
    slide8.addShape(pptx.ShapeType.roundRect, {
      x: posX,
      y: 1.8,
      w: 3.8,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: isRec ? "132E27" : COR_CARD },
      line: { color: isRec ? COR_DESTAQUE : COR_BORDA, width: isRec ? 2 : 1 },
    });

    slide8.addText(cenario.nome.toUpperCase(), { x: posX + 0.2, y: 2.0, w: 3.4, h: 0.4, fontSize: 14, bold: true, color: isRec ? COR_DESTAQUE : COR_AZUL });
    slide8.addText(fmtBRL(cenario.investimento_total), { x: posX + 0.2, y: 2.4, w: 3.4, h: 0.6, fontSize: 22, bold: true, color: COR_TEXTO_BRANCO });
    slide8.addText(cenario.descricao, { x: posX + 0.2, y: 3.0, w: 3.4, h: 0.8, fontSize: 10, color: COR_TEXTO_MUTED });

    const cenarioStats = [
      `• Alcance: ${fmtNum(cenario.alcance_estimado)} pessoas`,
      `• Impactos: ${fmtNum(cenario.impactos_totais)}`,
      `• Freq: ${cenario.frequencia_media.toFixed(1)}x`,
      `• CPM: R$ ${cenario.cpm.toFixed(2)}`,
    ];
    slide8.addText(cenarioStats.join("\n"), { x: posX + 0.2, y: 3.8, w: 3.4, h: 1.3, fontSize: 10, bold: true, color: "CBD5E1" });

    slide8.addText(cenario.diferenciais.map((d) => `✓ ${d}`).join("\n"), { x: posX + 0.2, y: 5.2, w: 3.4, h: 1.2, fontSize: 9, color: "A7F3D0" });
  });

  // -------------------------------------------------------------
  // SLIDE 9: APRESENTAÇÃO EXECUTIVA & ENCERRAMENTO
  // -------------------------------------------------------------
  const slide9 = pptx.addSlide();
  slide9.background = { color: COR_FUNDO };
  addFooter(slide9, "9. Conclusão Executiva & Próximos Passos");

  slide9.addText("Aprovação do Plano & Próximos Passos", {
    x: 0.8,
    y: 1.0,
    w: 11.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COR_TEXTO_BRANCO,
  });

  slide9.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.8,
    w: 11.7,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COR_CARD },
    line: { color: COR_DESTAQUE, width: 1.5 },
  });

  slide9.addText(plano.apresentacao_executiva.conclusao_executiva || `A execução do presente planejamento estratégico de mídia garante a ${plano.briefing.cliente_nome} autoridade imediata, alta visibilidade territorial e impacto contínuo no público decisor de ${plano.briefing.praca_alvo}.`, {
    x: 1.2,
    y: 2.2,
    w: 10.9,
    h: 1.5,
    fontSize: 14,
    color: COR_TEXTO_BRANCO,
    lineSpacing: 22,
  });

  const nextSteps = [
    "1. Validação e Aprovação do Plano Estratégico com a Diretoria do Anunciante",
    "2. Emissão Automatizada do Pedido de Inserção (PI) e Reserva Imediata dos Pontos de Inventário",
    "3. Upload e Homologação Técnica das Peças e VTs Publicitários",
    "4. Início da Veiculação com Acompanhamento em Tempo Real e Emissão de Checking Fotográfico",
  ];
  slide9.addText(nextSteps.join("\n\n"), {
    x: 1.2,
    y: 3.8,
    w: 10.9,
    h: 2.4,
    fontSize: 12,
    bold: true,
    color: COR_AZUL,
  });

  // Fazer o download do arquivo
  const filename = `Planejamento_Estrategico_${plano.briefing.cliente_nome.replace(/[^a-zA-Z0-9]/g, "_")}.pptx`;
  await pptx.writeFile({ fileName: filename });
}

export async function exportarPlanejamentoPDF(
  plano: PlanejamentoEstrategicoCompleto,
  nomeEmpresa = "Mídia.OS"
): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cores
  const COR_ESCURA = [11, 19, 43] as const;
  const COR_CARD = [28, 37, 65] as const;
  const COR_EMERALD = [16, 185, 129] as const;
  const COR_AZUL = [56, 189, 248] as const;

  // Helper de fundo
  const drawPageBase = (titulo: string) => {
    doc.setFillColor(...COR_ESCURA);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Header bar
    doc.setFillColor(19, 27, 46);
    doc.roundedRect(12, 10, pageWidth - 24, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COR_AZUL);
    doc.text(`MÍDIA.OS 3.0  •  COPILOTO IA DE PLANEJAMENTO  •  ${plano.briefing.cliente_nome.toUpperCase()}  —  ${titulo.toUpperCase()}`, 16, 16.5);
  };

  // PÁGINA 1: CAPA
  drawPageBase("Capa Executiva");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(plano.briefing.cliente_nome, 16, 45);

  doc.setFontSize(16);
  doc.setTextColor(...COR_EMERALD);
  doc.text("Planejamento Estratégico de Mídia & Tese Comercial", 16, 56);

  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(`Praça: ${plano.briefing.praca_alvo}   |   Segmento: ${plano.briefing.segmento}   |   Investimento Total: ${fmtBRL(plano.briefing.orcamento_total)}   |   Duração: ${plano.briefing.duracao_dias} dias`, 16, 68);

  doc.setFillColor(...COR_CARD);
  doc.roundedRect(16, 80, pageWidth - 32, 70, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TESE CENTRAL DE MÍDIA:", 22, 92);
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  const teseLines = doc.splitTextToSize(plano.estrategia.tese_central, pageWidth - 50);
  doc.text(teseLines, 22, 102);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gerado via Copiloto IA de Planejamento de Mídia (${nomeEmpresa}) em ${new Date().toLocaleDateString("pt-BR")}`, 16, pageHeight - 12);

  // PÁGINA 2: PLANO DE MÍDIA (TABELA)
  doc.addPage();
  drawPageBase("5. Plano de Mídia e Inventário Alocado");

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Ativos de Mídia Selecionados no Inventário Real", 16, 30);

  const tableData = plano.plano_midia.map((p) => [
    p.nome,
    `${p.midia}\n(${p.formato || p.tipo})`,
    p.endereco || p.cidade || p.praca,
    fmtNum(p.impactos_mes),
    fmtBRL(p.valor_tabela),
    fmtBRL(p.valor_negociado),
  ]);

  autoTable(doc, {
    startY: 36,
    margin: { left: 16, right: 16 },
    head: [["Ativo de Mídia", "Formato / Meio", "Localização / Praça", "Impactos/mês", "Tabela", "Negociado"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [56, 189, 248],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fillColor: [15, 23, 42],
      textColor: [241, 245, 249],
      fontSize: 8.5,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [20, 30, 52],
    },
  });

  // PÁGINA 3: DISTRIBUIÇÃO & DEFESA COMERCIAL
  doc.addPage();
  drawPageBase("6. Distribuição & 7. Defesa Comercial");

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Distribuição de Investimento e Racional de Blindagem", 16, 30);

  // Coluna 1: Mix de Canais
  doc.setFillColor(...COR_CARD);
  doc.roundedRect(16, 38, 125, pageHeight - 55, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(...COR_AZUL);
  doc.text("MIX DE CANAIS RECOMENDADO", 22, 48);

  let curY = 58;
  plano.distribuicao_investimento.mix_canais.forEach((c) => {
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${c.canal} (${c.percentual}%) — ${fmtBRL(c.valor)}`, 22, curY);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const papLines = doc.splitTextToSize(c.papel_estrategico, 110);
    doc.text(papLines, 22, curY + 5);
    curY += 18;
  });

  // Coluna 2: Defesa Comercial & Objeções
  doc.setFillColor(...COR_CARD);
  doc.roundedRect(148, 38, pageWidth - 164, pageHeight - 55, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(...COR_EMERALD);
  doc.text("DEFESA COMERCIAL & QUEBRA DE OBJEÇÕES", 154, 48);

  let curY2 = 58;
  plano.defesa_comercial.respostas_objecoes.slice(0, 3).forEach((item) => {
    doc.setFontSize(9);
    doc.setTextColor(248, 113, 113);
    doc.text(`"${item.objecao}"`, 154, curY2);
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    const respLines = doc.splitTextToSize(item.resposta_estrategica, pageWidth - 180);
    doc.text(respLines, 154, curY2 + 5);
    curY2 += 22;
  });

  const filename = `Planejamento_Estrategico_${plano.briefing.cliente_nome.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(filename);
}

// Aliases para máxima compatibilidade
export const exportarApresentacaoPptx = exportarPlanejamentoPPTX;
export const exportarPlanejamentoPdf = exportarPlanejamentoPDF;

