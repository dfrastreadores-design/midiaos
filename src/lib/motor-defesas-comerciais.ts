/**
 * MOTOR DE DEFESAS COMERCIAIS PERSUASIVAS E DE ALTA CONVERSÃO — MÍDIA.OS
 * Gera justificativas estratégicas e técnicas em linguagem corporativa culta para fechamento de propostas.
 */

export interface ParametrosDefesaComercial {
  clienteNome: string;
  campanha: string;
  publicoInteresse?: string | null;
  meiosUtilizados: string[];
  totalInvestimento?: number;
  totalInsercoes?: number;
  cidadesPracas?: string[];
  objetivoPrincipal?: "autoridade" | "vendas" | "lancamento" | "dominio_regional" | "lead";
}

export interface DefesaComercialCompleta {
  resumoExecutivo: string;
  dominanciaTerritorial: string;
  comparativoFisicoVsDigital: string;
  sinergiaCrossMedia: string;
  alinhamentoPublico: string;
  escassezReservaPraca: string;
  argumentoFechamentoDiretoria: string;
}

export function gerarDefesaComercialPersuasiva(params: ParametrosDefesaComercial): DefesaComercialCompleta {
  const cliente = params.clienteNome || "o cliente";
  const campanha = params.campanha || "sua campanha institucional";
  const publico = params.publicoInteresse?.trim() || "Classes A e B, decisores e consumidores com alto poder de compra";
  const pracas = params.cidadesPracas && params.cidadesPracas.length > 0 
    ? params.cidadesPracas.join(", ") 
    : "regiões de maior adensamento econômico e circulação qualificada";
  const meiosFormatados = (params.meiosUtilizados || []).join(", ") || "meios de alta visibilidade";

  // 1. Resumo Executivo
  const resumoExecutivo = `O planejamento estratégico formulado para ${cliente} visa a consolidação da campanha "${campanha}" por meio de uma arquitetura de mídia balanceada e de alto impacto, combinando frequência repetida e alcance qualificado em ${pracas}. O objetivo primário é blindar a presença de marca no mercado e acelerar o retorno direto de resultados comerciais.`;

  // 2. Dominância Territorial & Cerco da Jornada
  const dominanciaTerritorial = `A estratégia adota o princípio de "Cerco Contínuo da Jornada": o consumidor-alvo é interceptado de forma natural em seus três ambientes fundamentais do dia: na saída de sua residência, durante o deslocamento pelas principais vias e eixos estruturais de tráfego, e nos polos comerciais e de trabalho. Dessa forma, ${cliente} garante onipresença territorial estratégica sem pontos cegos de atenção.`;

  // 3. Mídia Física/DOOH vs. Digital Fracionado
  const comparativoFisicoVsDigital = `Enquanto o tráfego exclusivamente digital sofre com a saturação de ad-blockers, dispersão algorítmica e o botão de "pular anúncio em 5 segundos", a Mídia Física e os Painéis Digitais (OOH/DOOH) entregam 100% de visualização real e compulsória. A mensagem é percebida em tela gigante e de alta luminosidade, conferindo peso institucional, porte corporativo e um Custo por Mil Impactos (CPM) consideravelmente mais eficiente que as plataformas de leilão digital.`;

  // 4. Sinergia Cross-Media
  const sinergiaCrossMedia = `A sinergia entre ${meiosFormatados} produz o fenômeno de validação cruzada: o meio de massa (TV/OOH) desperta a consciência e a credibilidade institucional da marca, enquanto os canais de frequência e continuidade (Rádio, Digital e Redes) relembram a chamada para ação (Call to Action). Essa complementaridade reduz o custo de aquisição e multiplica o índice de memorização (Top of Mind) da marca perante a concorrência.`;

  // 5. Alinhamento com o Público de Interesse
  const alinhamentoPublico = `A seleção dos pontos, horários e canais foi calibrada para atingir o público de interesse prioritário: "${publico}". Cada espaço programado conta com métricas auditadas de afinidade socioeconômica, direcionando a verba publicitária exclusivamente para quem detém potencial real de decisão e contratação.`;

  // 6. Gatilho de Escassez e Reserva de Praça
  const escassezReservaPraca = `Ressaltamos que os inventários de alta performance e os pontos com visibilidade privilegiada possuem disponibilidade finita e alta concorrência por reserva. A aprovação tempestiva deste planejamento assegura a exclusividade do segmento na praça e garante as condições de tabela negociadas para ${cliente}, impedindo que concorrentes diretos ocupem os mesmos pontos-chave.`;

  // 7. Fechamento para Apresentação à Diretoria
  const argumentoFechamentoDiretoria = `Em síntese, o plano ora apresentado não se trata de uma despesa de divulgação isolada, mas sim de um ativo de dominância de mercado para ${cliente}, estruturado com rigor técnico, cobertura territorial e retorno estratégico documentado.`;

  return {
    resumoExecutivo,
    dominanciaTerritorial,
    comparativoFisicoVsDigital,
    sinergiaCrossMedia,
    alinhamentoPublico,
    escassezReservaPraca,
    argumentoFechamentoDiretoria,
  };
}
