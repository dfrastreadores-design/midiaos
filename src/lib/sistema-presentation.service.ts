import PptxGenJS from "pptxgenjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface SlideContent {
  id: number;
  badge: string;
  titulo: string;
  subtitulo: string;
  pontos: { titulo: string; desc: string; icon?: string }[];
  destaque?: string;
}

export const SLIDES_APRESENTACAO: SlideContent[] = [
  {
    id: 1,
    badge: "VISÃO GERAL DO SISTEMA",
    titulo: "Mídia.OS 3.0 — Plataforma Omnichannel de Operações e Vendas de Mídia",
    subtitulo: "O Sistema Operacional completo para Veículos de Comunicação, Agências e Representantes Comerciais.",
    pontos: [
      {
        titulo: "Ecossistema Integrado Ponta a Ponta",
        desc: "Conecta CRM, Catálogo Georreferenciado, Propostas Comerciais, Pedidos de Inserção (PI), Checking Operacional e Faturamento em fluxo contínuo.",
      },
      {
        titulo: "Arquitetura SaaS Multi-Tenant & White-Label",
        desc: "Isolamento estrito de dados por inquilino, personalização de identidade visual, logotipos, contratos e regras de comissão.",
      },
      {
        titulo: "Inteligência Artificial Nativa (Gemini)",
        desc: "Assistente estratégico para montagem de mix de mídia, defesas comerciais automáticas e argumentos persuasivos.",
      },
      {
        titulo: "Segurança Jurídica & Integridade Operacional",
        desc: "Assinaturas eletrônicas com hash SHA-256 (MP 2.200-2/2001), trilha de auditoria completa e política de zero perda de dados.",
      },
    ],
    destaque: "Redução de até 85% no tempo de elaboração de propostas e 100% de rastreabilidade em veiculações.",
  },
  {
    id: 2,
    badge: "MÓDULO: PLANEJAMENTO ESTRATÉGICO 360°",
    titulo: "Planejamento Estratégico & Os 5 Pilares de Mídia",
    subtitulo: "Estruturação profissional de campanhas orientada a objetivos, território e tese de mídia.",
    pontos: [
      {
        titulo: "1. Afinidade Territorial",
        desc: "Foco demográfico em clusters de alto interesse e regiões de consumo prioritárias da marca.",
      },
      {
        titulo: "2. Frequência",
        desc: "Repetição consistente da mensagem na rotina diária do público (circuitos digitais e itinerários).",
      },
      {
        titulo: "3. Visibilidade & Impacto",
        desc: "Telas monumentais, painéis de LED e empenas de alta permanência visual e ângulos privilegiados.",
      },
      {
        titulo: "4. Mobilidade & 5. Ativação",
        desc: "Captura de fluxos em eixos arteriais e conexão direta com lojas físicas ou gatilhos digitais de conversão.",
      },
    ],
    destaque: "Controle em tempo real de saldo orçamentário (budget) e conversão em proposta com um clique.",
  },
  {
    id: 3,
    badge: "MÓDULO: COPILOTO COMERCIAL GEMINI",
    titulo: "Copiloto Comercial IA — Inteligência de Vendas e Defesas de Mídia",
    subtitulo: "Um estrategista sênior integrado que defende o valor do investimento para o anunciante.",
    pontos: [
      {
        titulo: "Recomendação Inteligente de Mix",
        desc: "Analisa segmento, perfil do público, região e budget para sugerir a combinação ótima de formatos.",
      },
      {
        titulo: "Defesa Comercial Estruturada",
        desc: "Gera teses sólidas respondendo o porquê de cada praça, cada formato e o retorno esperado da campanha.",
      },
      {
        titulo: "Respostas a Objeções & Argumentos Persuasivos",
        desc: "Munir o executivo de vendas com argumentos de fechamento, diferenciais competitivos e gatilhos éticos.",
      },
      {
        titulo: "A IA Recomenda, o Humano Decide",
        desc: "Todas as sugestões podem ser refinadas e editadas antes da formalização da proposta comercial.",
      },
    ],
    destaque: "Transforma vendedores em consultores estratégicos de mídia de alta performance.",
  },
  {
    id: 4,
    badge: "MÓDULO: NOVA EXPERIÊNCIA DE VENDA",
    titulo: "Criar Campanha — Fluxo Comercial Unificado em 7 Passos",
    subtitulo: "A esteira ágil de vendas que elimina o trânsito manual entre múltiplos módulos do sistema.",
    pontos: [
      {
        titulo: "Passos 1 a 3: Cliente, Estratégia e Praças",
        desc: "Seleção do anunciante, definição de objetivos com metas orçamentárias e mapeamento de praças.",
      },
      {
        titulo: "Passo 4: Seleção Visual de Pontos",
        desc: "Escolha direta no mapa ou catálogo com acumulação do investimento e controle de saldo.",
      },
      {
        titulo: "Passo 5: Template Executivo (Deck)",
        desc: "Aplicação de design profissional (Corporativo, OOH Impacto, DOOH High-Tech ou Digital Omnichannel).",
      },
      {
        titulo: "Passos 6 e 7: Proposta & Conversão em PI",
        desc: "Geração instantânea da proposta comercial e conversão automática em Pedido de Inserção.",
      },
    ],
    destaque: "De 2 horas de trabalho manual para menos de 5 minutos da conversa ao envio da proposta.",
  },
  {
    id: 5,
    badge: "MÓDULO: REDE DE INVENTÁRIO & PROTEÇÃO",
    titulo: "Rede de Inventário — Próprio vs Representado & Blindagem de Imagens",
    subtitulo: "Gestão profissional de veículos parceiros garantindo segurança comercial e comissionamento.",
    pontos: [
      {
        titulo: "Segregação de Origens de Inventário",
        desc: "Diferenciação clara entre pontos próprios e representados com contratos, CNPJs e percentuais de comissão.",
      },
      {
        titulo: "Nome Interno vs Nome Comercial Blindado",
        desc: "O nome real do fornecedor/parceiro permanece protegido; o cliente final vê apenas a identidade comercial.",
      },
      {
        titulo: "Marca d'Água e Proteção de Fotos (Branding)",
        desc: "Geração automática de imagem comercial blindada com logo do inquilino, prevenindo desintermediação.",
      },
      {
        titulo: "Vitrine Pública de Inventário (/site/inventario)",
        desc: "Catálogo online aberto para captação de clientes sem expor os custos internos ou fornecedores.",
      },
    ],
    destaque: "Proteção total da carteira de representação comercial e transparência no comissionamento.",
  },
  {
    id: 6,
    badge: "MÓDULO: PROPOSTAS & APRESENTAÇÕES",
    titulo: "Gerador de Apresentações Estratégicas (PDF & PPTX)",
    subtitulo: "Apresentações executivas prontas para reuniões de diretoria e concorrências de agências.",
    pontos: [
      {
        titulo: "Exportação Nativa em PowerPoint (.PPTX)",
        desc: "Slides editáveis em widescreen 16:9 contendo lâminas institucionais, mapa, tabela de mídia e fotos.",
      },
      {
        titulo: "Exportação em PDF de Alta Resolução",
        desc: "Documento diagramado profissionalmente para envio rápido via WhatsApp ou E-mail.",
      },
      {
        titulo: "Simulador de Descontos e Rentabilidade",
        desc: "Cálculo de alçada comercial, margens líquidas, comissões de agência e BV em tempo real.",
      },
      {
        titulo: "Personalização de Logotipo do Cliente",
        desc: "Deck personalizado com o logotipo e identidade do anunciante na capa para maior impacto persuasivo.",
      },
    ],
    destaque: "Padrão visual de grandes agências de publicidade acessível a qualquer veículo comercial.",
  },
  {
    id: 7,
    badge: "MÓDULO: OPERAÇÃO, PIS & CHECKING",
    titulo: "Pedidos de Inserção (PI), Esteira de OPEC & Checking Fotográfico",
    subtitulo: "Segurança operacional total da contratação à comprovação de veiculação.",
    pontos: [
      {
        titulo: "Duplo Fluxo: Comercial e Operacional (OPEC)",
        desc: "Separação das etapas de venda, aprovação de crédito, envio de materiais técnicos e veiculação.",
      },
      {
        titulo: "Central de Assinaturas Digitais",
        desc: "Assinatura eletrônica com link seguro único, captura de IP, User-Agent e carimbo temporal auditável.",
      },
      {
        titulo: "Checking Fotográfico e Comprovantes",
        desc: "Upload de fotos e vídeos de veiculação com geração de relatório fotográfico para prestação de contas.",
      },
      {
        titulo: "Notificações Operacionais em Tempo Real",
        desc: "Alertas automáticos de PIs aprovados, início de veiculação, tarefas pendentes e prazos de encerramento.",
      },
    ],
    destaque: "Eliminação de falhas de veiculação e segurança jurídica absoluta com auditoria completa.",
  },
  {
    id: 8,
    badge: "MÓDULO: FINANCEIRO, METAS & GOVERNANÇA",
    titulo: "Gestão Financeira, DRE, Comissões e Auditoria de Produção",
    subtitulo: "Controle financeiro rigoroso com precisão monetária de centavos e visão executiva.",
    pontos: [
      {
        titulo: "Conciliação Financeira de Entradas e Saídas",
        desc: "Faturamento de PIs, conciliação de parcelas, emissão de cobranças e controle de repasses a parceiros.",
      },
      {
        titulo: "Gestão Automatizada de Comissões",
        desc: "Cálculo de comissão de executivos de vendas e indicadores PF/PJ com regras configuráveis por tenant.",
      },
      {
        titulo: "Dashboard Executivo de Inteligência",
        desc: "8 KPIs vitais: Receita, Faturamento vs Meta, Mídias mais vendidas, Top Anunciantes e Praças mais rentáveis.",
      },
      {
        titulo: "Governança e Política de Zero Perda de Dados",
        desc: "Lixeira segura com snapshot JSONB, reversão de exclusões e auditoria integral de alterações.",
      },
    ],
    destaque: "Decisões baseadas em dados em tempo real para maximizar a rentabilidade do inventário.",
  },
];

/**
 * Gera e faz download imediato da Apresentação Executiva em PPTX (PowerPoint)
 */
export async function exportarApresentacaoSistemaPPTX(nomeEmpresa = "Mídia.OS"): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Mídia.OS Platform";
  pptx.company = nomeEmpresa;
  pptx.title = `Apresentação Executiva — ${nomeEmpresa} 3.0`;

  const COR_PRIMARIA = "0284C7"; // Azul Mídia.OS
  const COR_ESCURA = "0F172A"; // Slate 900
  const COR_CINZA_CLARO = "F8FAFC";
  const COR_TEXTO = "334155";

  for (const slideData of SLIDES_APRESENTACAO) {
    const slide = pptx.addSlide();
    slide.background = { color: COR_ESCURA };

    // Barra de topo com Badge
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 0.5,
      w: 11.7,
      h: 0.35,
      fill: { color: "1E293B" },
      line: { color: COR_PRIMARIA, width: 1 },
    });

    slide.addText(`MÍDIA.OS 3.0  |  SLIDE ${slideData.id} DE ${SLIDES_APRESENTACAO.length}  —  ${slideData.badge}`, {
      x: 0.9,
      y: 0.52,
      w: 11.5,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: "38BDF8",
      fontFace: "Arial",
    });

    // Título Principal
    slide.addText(slideData.titulo, {
      x: 0.8,
      y: 1.1,
      w: 11.7,
      h: 0.8,
      fontSize: 22,
      bold: true,
      color: "FFFFFF",
      fontFace: "Arial",
    });

    // Subtítulo
    slide.addText(slideData.subtitulo, {
      x: 0.8,
      y: 1.85,
      w: 11.7,
      h: 0.5,
      fontSize: 13,
      italic: true,
      color: "94A3B8",
      fontFace: "Arial",
    });

    // Grid com 4 Pontos de Conteúdo
    const colWidth = 5.6;
    const startY = 2.6;
    const gapX = 0.5;

    slideData.pontos.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const posX = 0.8 + col * (colWidth + gapX);
      const posY = startY + row * 1.8;

      // Card de Fundo
      slide.addShape(pptx.ShapeType.roundRect, {
        x: posX,
        y: posY,
        w: colWidth,
        h: 1.6,
        rectRadius: 0.1,
        fill: { color: "1E293B" },
        line: { color: "334155", width: 1 },
      });

      // Título do Ponto
      slide.addText(`${idx + 1}. ${p.titulo}`, {
        x: posX + 0.2,
        y: posY + 0.15,
        w: colWidth - 0.4,
        h: 0.35,
        fontSize: 13,
        bold: true,
        color: "38BDF8",
        fontFace: "Arial",
      });

      // Descrição do Ponto
      slide.addText(p.desc, {
        x: posX + 0.2,
        y: posY + 0.5,
        w: colWidth - 0.4,
        h: 0.95,
        fontSize: 10,
        color: "CBD5E1",
        fontFace: "Arial",
        lineSpacing: 14,
      });
    });

    // Rodapé de Destaque
    if (slideData.destaque) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8,
        y: 6.4,
        w: 11.7,
        h: 0.5,
        fill: { color: "0369A1" },
      });

      slide.addText(`💡 IMPACTO: ${slideData.destaque}`, {
        x: 0.9,
        y: 6.45,
        w: 11.5,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: "FFFFFF",
        fontFace: "Arial",
      });
    }
  }

  const fileName = `MidiaOS_Apresentacao_Executiva_${new Date().toISOString().split("T")[0]}.pptx`;
  await pptx.writeFile({ fileName });
}

/**
 * Gera e faz download imediato do Manual do Usuário em PDF diagramado
 */
export async function exportarManualSistemaPDF(nomeEmpresa = "Mídia.OS"): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [2, 132, 199];
  const darkColor = [15, 23, 42];

  // Capa do Manual
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 297, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("MANUAL DO USUÁRIO & GUIA OPERACIONAL", 20, 70);

  doc.setFontSize(18);
  doc.setTextColor(56, 189, 248);
  doc.text("Mídia.OS 3.0 — Plataforma Omnichannel", 20, 85);

  doc.setFontSize(12);
  doc.setTextColor(203, 213, 225);
  doc.text("Guia de Operações Comerciais, Planejamento 360°, Copiloto IA, PIs e Faturamento", 20, 100);

  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(1);
  doc.line(20, 115, 190, 115);

  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(`Empresa / Licenciado: ${nomeEmpresa}`, 20, 130);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}`, 20, 138);
  doc.text("Versão do Sistema: 3.0 (Produção Homologada)", 20, 146);
  doc.text("Suporte Técnico: rafaelrodrigo.as@gmail.com | (61) 98474-6857", 20, 154);

  // Páginas de Conteúdo
  let pageNum = 1;

  for (const slide of SLIDES_APRESENTACAO) {
    doc.addPage();
    pageNum++;

    // Topo da página
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 18, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`MÍDIA.OS 3.0  —  MANUAL DO USUÁRIO  |  MÓDULO ${slide.id}`, 15, 12);
    doc.text(`Página ${pageNum}`, 180, 12);

    // Título da Seção
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(slide.titulo, 15, 32);

    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(slide.subtitulo, 15, 40, { maxWidth: 180 });

    // Tabela de Tópicos
    const tableData = slide.pontos.map((p, idx) => [
      `${idx + 1}. ${p.titulo}`,
      p.desc,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["Recurso / Funcionalidade", "Como Operar & Boas Práticas"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [51, 65, 85],
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: "bold" },
        1: { cellWidth: 120 },
      },
      margin: { left: 15, right: 15 },
    });

    // Caixa de Destaque
    if (slide.destaque) {
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(2, 132, 199);
      doc.roundedRect(15, finalY + 10, 180, 24, 3, 3, "FD");

      doc.setTextColor(2, 132, 199);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("💡 DICA OPERACIONAL DE SUCESSO:", 20, finalY + 18);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(slide.destaque, 20, finalY + 26, { maxWidth: 170 });
    }
  }

  doc.save(`MidiaOS_Manual_do_Usuario_${new Date().toISOString().split("T")[0]}.pdf`);
}
