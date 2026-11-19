/**
 * CATÁLOGO UNIVERSAL DE VERTICAIS PUBLICITÁRIAS E MULTI-MEIOS — MÍDIA.OS
 * Arquitetura Cross-Media com 14 verticais completas de mídia para campanhas integradas 360°.
 */

export interface VerticalMidiaConfig {
  id: string;
  codigo: string;
  nome: string;
  categoriaMacro: "OFF" | "ON" | "HIBRIDO" | "ESPECIAL";
  descricao: string;
  formatosPadrao: string[];
  metricasChave: string[];
  beneficiosComerciais: string[];
}

export const CATALOGO_14_VERTICAIS: VerticalMidiaConfig[] = [
  {
    id: "televisao",
    codigo: "TV",
    nome: "Televisão (Aberta & Fechada)",
    categoriaMacro: "OFF",
    descricao: "Maior poder de alcance simultâneo, autoridade instantânea de marca e impacto audiovisual.",
    formatosPadrao: ["VT 30s", "VT 15s", "Merchandising Integrado", "Patrocínio Master", "Break Exclusivo", "Cota de Participação"],
    metricasChave: ["GRP / TRP", "Audiência Domiciliar / Pontos de Ibope", "Alcance Acumulado (Reach)", "Afinidade de Público"],
    beneficiosComerciais: [
      "Penetração massiva em todas as faixas etárias e classes sociais",
      "Gera recall de marca imediato e impulsiona buscas no Google e redes sociais",
      "Garante máxima credibilidade institucional para a marca anunciante",
    ],
  },
  {
    id: "radio",
    codigo: "RADIO",
    nome: "Rádio (FM/AM & Rádio Web)",
    categoriaMacro: "OFF",
    descricao: "Companhia constante na jornada do consumidor (trânsito, trabalho e domicílio), com alta frequência e custo por mil eficiente.",
    formatosPadrao: ["Spot 30s", "Spot 15s", "Testemunhal de Locutor", "Flash Ao Vivo", "Patrocínio de Programete", "Vinheta de Hora Certa"],
    metricasChave: ["Ouvintes por Minuto", "Alcance Semanal", "Frequência Média de Exposição", "Impactos no Trânsito"],
    beneficiosComerciais: [
      "Forte apelo emocional e proximidade da voz dos locutores locais",
      "Alta frequência com ótimo custo-benefício para memorização do produto",
      "Excelente cobertura no horário de pico do trânsito",
    ],
  },
  {
    id: "portais_noticias",
    codigo: "PORTAIS",
    nome: "Portais de Notícias & Sites",
    categoriaMacro: "ON",
    descricao: "Veiculação de alta autoridade jornalística em veículos de notícia e sites especializados com audiência qualificada.",
    formatosPadrao: ["Super Banner (728x90 / 970x90)", "Half Page (300x600)", "Retângulo Médio (300x250)", "Publieditorial com Link", "Takeover / Fundo de Tela", "Vídeo In-Banner"],
    metricasChave: ["Pageviews / Visualizações", "Visitantes Únicos (UV)", "CTR (Taxa de Cliques)", "Tempo Médio de Permanência"],
    beneficiosComerciais: [
      "Associação da marca ao contexto de credibilidade editorial e notícias quentes",
      "Tráfego qualificado de tomadores de decisão e formadores de opinião",
      "Excelente para lançamentos, comunicados e artigos de autoridade",
    ],
  },
  {
    id: "redes_sociais",
    codigo: "SOCIAL",
    nome: "Redes Sociais Oficiais dos Veículos",
    categoriaMacro: "ON",
    descricao: "Presença nos canais oficiais de Instagram, TikTok, LinkedIn, YouTube e Facebook com base consolidada de seguidores.",
    formatosPadrao: ["Post Carrossel Feed", "Reels / TikTok Patrocinado", "Sequência de Stories com Link", "Collab Oficial com o Veículo", "Live Transmitida"],
    metricasChave: ["Alcance Orgânico & Pago", "Taxa de Engajamento", "Salvamentos & Compartilhamentos", "Cliques no Link"],
    beneficiosComerciais: [
      "Engajamento direto e conversas bidirecionais com o público",
      "Potencial de viralização e compartilhamento comunitário",
      "Aproveita a base fiel de seguidores já conquistada pelo veículo",
    ],
  },
  {
    id: "ooh_dooh",
    codigo: "OOH",
    nome: "Mídia Exterior (OOH & DOOH)",
    categoriaMacro: "OFF",
    descricao: "Impacto urbano inevitável na jornada de deslocamento: painéis digitais de LED, frontlights, abrigos de ônibus e mobiliário urbano.",
    formatosPadrao: ["Painel de LED Digital (DOOH)", "Frontlight Estático", "Abrigo de Ônibus / MUB", "Painel Rodoviário / Topo de Prédio", "Eletromídia em Edifícios", "Mega Empena"],
    metricasChave: ["Fluxo Diário de Veículos (VDM)", "Impactos / Oportunidades de Contato", "Loop de Exibição / Inserções por Hora", "Horas de Operação"],
    beneficiosComerciais: [
      "100% de visão real: imune a ad-blockers e sem botão de pular anúncio",
      "Domínio territorial estratégico nos principais eixos de circulação",
      "Formato gigante e luminoso com alto impacto e memorização",
    ],
  },
  {
    id: "midia_impressa",
    codigo: "IMPRESSA",
    nome: "Mídia Impressa (Jornais & Revistas)",
    categoriaMacro: "OFF",
    descricao: "Tradição, durabilidade e prestígio físico em edições impressas, suplementos de fim de semana e revistas de circulação regional.",
    formatosPadrao: ["Página Inteira", "Página Dupla Central", "Meia Página", "Rodapé de Página", "Encarte Publicitário", "Informe Comercial"],
    metricasChave: ["Tiragem Certificada", "Leitores por Exemplar", "Distribuição Estratégica", "Pontos de Venda / Assinantes"],
    beneficiosComerciais: [
      "Atenção exclusiva e sem distrações digitais durante a leitura",
      "Prestígio tradicional junto a executivos e classes de alto poder aquisitivo",
      "Maior tempo de retenção física com o anúncio",
    ],
  },
  {
    id: "eventos_experiencias",
    codigo: "EVENTOS",
    nome: "Eventos & Ativações de Marca",
    categoriaMacro: "HIBRIDO",
    descricao: "Conexão sensorial e experiencial ao vivo: feiras de negócios, fóruns, shows, circuitos esportivos e ativações de PDV.",
    formatosPadrao: ["Cota Master de Patrocínio", "Estande / Lounge Exclusivo", "Ativação com Sampling / Degustação", "Naming Rights de Palco", "Brindes no Welcome Kit"],
    metricasChave: ["Público Presente Auditado", "Leads Capturados ao Vivo", "Mídia Espontânea Gerada (PR)", "Brand Recall Pós-Evento"],
    beneficiosComerciais: [
      "Gera memória afetiva e relacionamento pessoal com o cliente",
      "Oportunidade ímpar de experimentação física do produto ou serviço",
      "Alto volume de conteúdo gerado pelos próprios participantes",
    ],
  },
  {
    id: "influenciadores_creators",
    codigo: "CREATORS",
    nome: "Influenciadores & Creators de Mídia",
    categoriaMacro: "ON",
    descricao: "Recomendação com prova social genuína através de apresentadores, jornalistas, colunistas e personalidades de destaque.",
    formatosPadrao: ["Embaixador de Marca (Contrato Mensal)", "Vídeo Review / Demonstração", "Presença VIP em Loja / Evento", "Stories em Tempo Real com Cupom", "Unboxing Exclusivo"],
    metricasChave: ["Engajamento Real", "Afinidade com a Persona", "Cliques com Rastreamento (UTM)", "Conversões de Cupom"],
    beneficiosComerciais: [
      "Transfere a confiança e o carisma do creator diretamente para a marca",
      "Comunicação humanizada que quebra a barreira da propaganda tradicional",
      "Audiência hiper-segmentada e altamente receptiva",
    ],
  },
  {
    id: "midia_performance",
    codigo: "PERFORMANCE",
    nome: "Mídia de Performance & Tráfego Pago",
    categoriaMacro: "ON",
    descricao: "Foco absoluto em conversão, aquisição de leads qualificados e vendas diretas com mensuração de ROI por centavo.",
    formatosPadrao: ["Campanha Google Search (Palavras-Chave)", "Meta Ads (Feed & Stories Conversão)", "Campanha de Retargeting Dinâmico", "Mídia Programática", "LinkedIn Ads B2B"],
    metricasChave: ["Custo por Clique (CPC)", "Custo por Lead (CPL)", "Taxa de Conversão", "ROAS (Retorno sobre Investimento Publicitário)"],
    beneficiosComerciais: [
      "Segmentação cirúrgica por interesses, intenção de busca e renda",
      "Otimização contínua por algoritmos de conversão",
      "Rastreabilidade completa de ponta a ponta",
    ],
  },
  {
    id: "cinema_entretenimento",
    codigo: "CINEMA",
    nome: "Cinema & Entretenimento",
    categoriaMacro: "OFF",
    descricao: "Experiência de máxima imersão com som surround 7.1, tela gigante de alta definição e público 100% receptivo.",
    formatosPadrao: ["Vinheta 30s antes do Filme", "Vinheta 60s antes dos Trailers", "Ação de Foyer / Pôster Iluminado", "Adesivação de Pipocas e Copos", "Sessão Fechada Corporativa"],
    metricasChave: ["Público Espectador por Sala", "Sessões Exibidas por Semana", "Taxa de Atenção Total", "Recall Imediato"],
    beneficiosComerciais: [
      "Ambiente escuro sem distrações de smartphones",
      "Consumidor em momento de lazer e alta propensão a consumo",
      "Qualidade técnica impecável de som e imagem cinematográfica",
    ],
  },
  {
    id: "retail_media",
    codigo: "RETAIL",
    nome: "Varejo & PDV (Retail Media)",
    categoriaMacro: "HIBRIDO",
    descricao: "Impacto no momento crítico de decisão de compra: telas em supermercados, drogarias, shoppings e totens de autoatendimento.",
    formatosPadrao: ["Telas Digitais no Check-out", "Mobiliário em Corredores de Alto Fluxo", "Totem Digital Interativo", "Tela em Carrinho de Compras", "Adesivação de Portas de Entrada"],
    metricasChave: ["Transações no PDV", "Fluxo de Visitantes na Loja", "Lift de Vendas (Aumento no Caixa)", "Frequência de Visita"],
    beneficiosComerciais: [
      "Impacto direto a poucos metros ou segundos da compra",
      "Integração entre o estímulo publicitário e o produto na prateleira",
      "Alta taxa de conversão impulsiva",
    ],
  },
  {
    id: "comunicacao_direta",
    codigo: "DIRETA",
    nome: "Comunicação Direta (WhatsApp, SMS & E-mail)",
    categoriaMacro: "ON",
    descricao: "Canal proprietário e direto na palma da mão do cliente, com altíssimas taxas de abertura e resposta imediata.",
    formatosPadrao: ["Mensagem de WhatsApp Oficial (Meta API)", "Disparo de SMS com Link Rastreável", "Newsletter Segmentada", "Régua Automatizada de Reativação"],
    metricasChave: ["Taxa de Entrega", "Taxa de Abertura (Open Rate)", "Taxa de Resposta / Conversão", "Opt-in Ativo"],
    beneficiosComerciais: [
      "Comunicação direta sem depender de algoritmos de feed",
      "Agilidade para promoções relâmpago e ofertas do dia",
      "Excelente para fidelização e recompra de clientes da base",
    ],
  },
  {
    id: "servicos_produtoras",
    codigo: "SERVICOS",
    nome: "Serviços Publicitários & Produtoras de Mídia",
    categoriaMacro: "ESPECIAL",
    descricao: "Criação de roteiros, gravação de filmes, produção de jingles e spots, motion graphics, diagramação e artes finais de alta qualidade.",
    formatosPadrao: ["Produção de VT Comercial 30s", "Gravação de Spot de Áudio 30s", "Adaptação de Formatos para OOH/DOOH", "Criação de Identidade Visual de Campanha", "Edição de Pílulas para Redes"],
    metricasChave: ["Prazo de Entrega (SLA)", "Resolução & Codec de Homologação", "Direitos Autorais e Concessão", "Aprovação OPEC"],
    beneficiosComerciais: [
      "Garante que o criativo atenda às rigorosas especificações técnicas dos veículos",
      "Eleva a qualidade estética da mensagem da marca",
      "Solução chave na mão (turnkey) do conceito à veiculação",
    ],
  },
  {
    id: "modelos_especiais",
    codigo: "ESPECIAIS",
    nome: "Modelos Especiais (Permuta, Bonificação & Naming Rights)",
    categoriaMacro: "ESPECIAL",
    descricao: "Engenharias comerciais diferenciadas para viabilizar grandes campanhas: permutas de bens/serviços, bonificações estratégicas e patrocínios perenes.",
    formatosPadrao: ["Contrato de Permuta Comercial", "Plano com Bonificação de Inserções", "Naming Rights de Espaço / Programa", "Co-Branding Estratégico", "Cota de Incentivo"],
    metricasChave: ["Valoração de Permuta (Equivalência R$)", "Fator de Bonificação (1+1)", "Tempo de Associação da Marca", "Ganhos Tributários"],
    beneficiosComerciais: [
      "Viabiliza veiculações expressivas preservando o fluxo de caixa do cliente",
      "Multiplica o volume de inserções da campanha",
      "Gera parcerias institucionais duradouras entre veículo e anunciante",
    ],
  },
];

export function getVerticalById(id: string): VerticalMidiaConfig | undefined {
  return CATALOGO_14_VERTICAIS.find((v) => v.id === id || v.codigo.toLowerCase() === id.toLowerCase());
}
