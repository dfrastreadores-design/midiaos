/**
 * Catálogo Unificado de Mídias, Segmentos de Parceiros e Tipos Comerciais — Mídia.OS
 * Mapeia com precisão o que os veículos e parceiros homologados oferecem.
 */

export const MIDIAS_PARCEIROS_CATALOGO = [
  // Categorias Universais de Mídia
  "OOH",
  "DOOH",
  "RADIO",
  "DIGITAL",
  "PRINT",
  "TV",
  "CUSTOM",

  // Mídia Exterior, Telas e Painéis Digitais (OOH/DOOH)
  "Painéis Digitais de Rua",
  "Front Lights",
  "Painéis em Rodovias / Outdoor",
  "Telas em Elevadores Residenciais",
  "Telas em Elevadores Corporativos",
  "Espaços Comerciais em Shoppings e Hotéis",
  "Painéis em Shoppings",
  "Painéis em Aeroportos",
  "Painéis em Pontos de Ônibus",
  "Telas em Restaurantes e Barbearias",
  "Telas em Academias e Gastronomia",
  "Telas em Transporte por Aplicativo",
  "Adesivagem de Bancas de Jornal",

  // Mídia Broadcast / Tradicional
  "Radio",

  // Mídia Digital e Estratégica 360°
  "Digital / Redes Sociais",
  "Projetos Especiais",
] as const;

export const SEGMENTOS_MIDIA = [
  "DOOH",
  "Front Lights",
  "Telas em Transporte por Aplicativo",
  "Painéis Digitais de Rua",
  "Telas em Elevadores Residenciais",
  "Painéis em Pontos de Ônibus",
  "Adesivagem de Bancas de Jornal",
  "Telas em Restaurantes e Barbearias",
  "Painéis em Shoppings",
  "Espaços Comerciais em Shoppings e Hotéis",
  "Telas em Elevadores Corporativos",
  "Painéis em Rodovias / Outdoor",
  "Painéis em Aeroportos",
  "Telas em Academias e Gastronomia",
] as const;

export type MidiaCatalogo = (typeof MIDIAS_PARCEIROS_CATALOGO)[number] | string;

export const SUGESTOES_TIPOS_POR_MIDIA: Record<string, string[]> = {
  OOH: [
    "Front Light Estático",
    "Outdoor Rodoviário (9x3m)",
    "Empena Cega de Edifício",
    "Totem Urbano Dupla Face",
    "Painel Rodoviário Mega",
    "Mupi / Abrigo de Ônibus",
    "Painel em Shopping / Mall",
  ],
  DOOH: [
    "Painel de LED Digital",
    "Totem Digital Vertical",
    "Empena Digital",
    "Circuito de Painéis Digitais",
    "Painel de Entrada / Hall",
    "Vídeo Wall",
  ],
  DIGITAL: [
    "Banner Super Top (728x90)",
    "Banner Retângulo (300x250)",
    "Half Page (300x600)",
    "Publieditorial / Matéria Patrocinada",
    "Post Feed (Card / Carrossel)",
    "Stories com Link",
    "Reels / TikTok Vídeo",
    "Pre-roll Vídeo",
  ],
  PRINT: [
    "Página Inteira",
    "Meia Página Horizontal",
    "Meia Página Vertical",
    "1/4 de Página",
    "Encarte Especial",
    "Capa Falsa / Sobrecapa",
    "Página Dupla Central",
  ],
  RADIO: [
    "Spot 30s",
    "Spot 15s",
    "Chamada / Vinheta 5s",
    "Testemunhal / Ao Vivo",
    "Flash de 60s",
    "Patrocínio de Programa",
  ],
  CUSTOM: [
    "Formato Customizado do Inquilino",
    "Ação Promocional Integrada",
    "Patrocínio Especial",
    "Projeto 360° Omnichannel",
  ],
  "Painéis Digitais de Rua": [
    "Painel de LED Dupla Face",
    "Totem Digital Urbano",
    "Painel de LED Simples",
    "Painel em Canteiro Central",
    "Painel em Cruzamento Semafórico",
  ],
  "Front Lights": [
    "Front Light Estático Iluminado",
    "Front Light Mega Formato (9x3m)",
    "Front Light Duplo",
    "Front Light Rodoviário",
  ],
  "Telas em Elevadores Residenciais": [
    "Circuito Vertical Full HD",
    "Split Screen Notícias + Anúncio",
    "Tela Vertical 21.5\"",
    "Inserção 15s / 10s Rotativa",
  ],
  "Telas em Elevadores Corporativos": [
    "Tela Executiva Full HD",
    "Totem de Recepção / Lobby",
    "Circuito Edifícios Empresariais",
    "Vídeo Wall de Acesso",
  ],
  "Espaços Comerciais em Shoppings e Hotéis": [
    "Totem Digital de Mall",
    "Painel Praça de Alimentação",
    "Adesivagem de Elevadores Panorâmicos",
    "Lobby de Hotel / Balcão",
    "Painel de Entrada Principal",
  ],
  "Painéis em Shoppings": [
    "Painel Digital de Mall",
    "Adesivagem de Escadas Rolantes",
    "Totem Interativo",
    "Banners Aéreos / Praça Central",
  ],
  "Painéis em Rodovias / Outdoor": [
    "Outdoor Estático 9x3m (Bi-semana)",
    "Mega Painel Rodoviário",
    "Painel LED Rodovia",
    "Outdoor Iluminado / Backlight",
  ],
  "Painéis em Aeroportos": [
    "Saguão de Embarque",
    "Esteiras de Bagagem",
    "Pórtico de Desembarque",
    "Painel Digital Sala VIP",
  ],
  "Painéis em Pontos de Ônibus": [
    "Abrigo de Ônibus / Mupi",
    "Painel Iluminado de Ponto",
    "Adesivagem de Parada",
  ],
  "Telas em Restaurantes e Barbearias": [
    "Display de Mesa / Balcão",
    "Tela Salão Principal",
    "Circuito Gastronomia / Bar",
    "Menu Board Digital",
  ],
  "Telas em Academias e Gastronomia": [
    "Circuito Fitness / Cardio",
    "Vídeo Wall Musculação",
    "Totem de Entrada / Catraca",
    "Tela Recepção",
  ],
  "Telas em Transporte por Aplicativo": [
    "Tablet Interativo Uber / 99",
    "Encosto de Cabeça Digital",
    "Adesivagem Externa / Vidro Traseiro",
  ],
  "Adesivagem de Bancas de Jornal": [
    "Envelopamento Total da Banca",
    "Backlight Lateral",
    "Painel Testeira",
    "Adesivo Vitrine",
  ],
  TV: [
    "Comercial 30s",
    "Comercial 15s",
    "Comercial 60s",
    "Patrocínio / Vinheta 5s",
    "Merchandising / Testemunhal",
    "Break Exclusivo",
    "Reportagem Especial / VT",
  ],
  Radio: [
    "Spot 30s",
    "Spot 15s",
    "Chamada / Vinheta 5s",
    "Testemunhal / Ao Vivo",
    "Flash de 60s",
    "Patrocínio de Programa",
  ],
  "Digital / Redes Sociais": [
    "Post Feed (Card / Carrossel)",
    "Stories (Sequência 3 telas)",
    "Reels / TikTok Vídeo",
    "Banner Portal Web",
    "Disparo WhatsApp / E-mail",
  ],
  "Projetos Especiais": [
    "Ação Promocional com Promotores",
    "Cenografia e Estande de Vendas",
    "Distribuição de Brindes / Sampling",
    "Ativação de Marca em Evento",
    "Blitz Comercial",
  ],
};

export const FORMATOS_SUGERIDOS_POR_MIDIA: Record<string, string[]> = {
  OOH: ["Bi-semana (14 dias)", "Mensal (30 dias)", "Lona 9x3m", "Empena Especial", "Adesivagem", "Semestral", "Anual"],
  DOOH: ["15s no loop", "10s no loop", "Full Screen 16:9", "Vertical 9:16", "Vídeo 10s"],
  DIGITAL: ["Banner 728x90", "Banner 300x250", "Banner 300x600", "Post Feed 1080x1350", "Stories 1080x1920", "CPM", "Diária Fixa", "Mensal"],
  PRINT: ["Página Inteira", "1/2 Página Horizontal", "1/2 Página Vertical", "1/4 de Página", "Encarte", "Capa Falsa"],
  RADIO: ["Spot 30s", "Spot 15s", "Vinheta 5s", "Flash ao Vivo 60s", "Testemunhal"],
  TV: ["30s", "15s", "60s", "Vinheta 5s", "Testemunhal 60s"],
  CUSTOM: ["Formato Livre", "Projeto Especial", "Diária", "Pacote Personalizado"],
  "Painéis Digitais de Rua": ["15s no loop", "10s no loop", "Dupla Face 10s", "1080x1920", "1920x1080"],
  "Front Lights": ["Bi-semana (14 dias)", "Mensal (30 dias)", "Lona Vinílica 9x3m", "Mega Painel"],
  "Painéis em Rodovias / Outdoor": ["Bi-semana (14 dias)", "Mensal (30 dias)", "Lona 9x3m", "Papel 32 folhas"],
  "Telas em Elevadores Residenciais": ["15s no loop", "10s rotativo", "Vertical Full HD (1080x1920)"],
  "Telas em Elevadores Corporativos": ["15s no loop", "10s rotativo", "Vertical Full HD", "Banner Lateral"],
  "Espaços Comerciais em Shoppings e Hotéis": ["15s no loop", "Vídeo 10s", "Adesivagem", "Totem Interativo"],
  "Painéis em Shoppings": ["15s no loop", "10s no loop", "Banner Aéreo", "Adesivo Escada"],
  "Painéis em Aeroportos": ["15s no loop", "Full HD 10s", "Painel Estático", "Adesivagem Totem"],
  "Painéis em Pontos de Ônibus": ["Bi-semana (14 dias)", "Mupi Estático Iluminado", "Painel Digital 10s"],
  "Telas em Restaurantes e Barbearias": ["15s rotativo", "10s no loop", "Display Digital"],
  "Telas em Academias e Gastronomia": ["15s rotativo", "10s no loop", "Vídeo Cardio"],
  "Telas em Transporte por Aplicativo": ["15s interativo", "Banner touch", "Vídeo 10s"],
  "Adesivagem de Bancas de Jornal": ["Mensal (30 dias)", "Envelopamento Total", "Backlight"],
  Radio: ["Spot 30s", "Spot 15s", "Vinheta 5s", "Flash ao Vivo 60s"],
  "Digital / Redes Sociais": ["Card Feed 1080x1350", "Stories 1080x1920", "Reels 9:16", "Banner 728x90"],
  "Projetos Especiais": ["Diária", "Turno 4h", "Ação de Final de Semana", "Evento Completo"],
};

export const PROGRAMAS_SUGERIDOS_POR_MIDIA: Record<string, string[]> = {
  OOH: ["Fluxo Contínuo 24h", "Sentido Centro / Plano Piloto", "Sentido Bairros / Cidades Satélites", "Ponto Estratégico Rodovia"],
  DOOH: ["Circuito Geral", "Grade Rotativa Contínua", "Horário Nobre Urbano"],
  DIGITAL: ["Topo do Portal (Home)", "Seção Economia / Notícias", "Feed Oficial", "Stories em Destaque", "Publieditorial Exclusivo"],
  PRINT: ["Caderno Principal", "Caderno de Economia", "Caderno Cidades / Variedades", "Revista / Encarte de Domingo"],
  RADIO: ["Manhã Notícias", "Tarde Musical", "Rotativo Comercial", "Hora do Rush", "A Voz do Brasil (Entorno)"],
  TV: ["DF Alerta", "Jornal Local", "Break Comercial Rotativo", "Programa de Auditório", "Superliga"],
  CUSTOM: ["Espaço Customizado", "Ação Promocional", "Blitz em Pontos de Venda", "Patrocínio Oficial"],
  "Painéis Digitais de Rua": ["Circuito Vias Principais", "Cruzamentos Estratégicos", "Fluxo Diário"],
  "Front Lights": ["Exibição Contínua 24h", "Iluminação Noturna", "Ponto Estratégico Rodovia"],
  "Painéis em Rodovias / Outdoor": ["Exibição Contínua 24h", "Sentido Plano Piloto", "Sentido Cidades Satélites"],
  "Telas em Elevadores Residenciais": ["Circuito Bairros Nobres", "Elevadores Sociais", "Fluxo Manhã / Noite"],
  "Telas em Elevadores Corporativos": ["Horário Comercial Executivo", "Circuito Torres Empresariais", "Hall Principal"],
  "Espaços Comerciais em Shoppings e Hotéis": ["Horário de Funcionamento do Mall", "Praça de Alimentação", "Circuito Hoteleiro"],
  "Painéis em Shoppings": ["Horário de Shopping (10h às 22h)", "Corredores Principais"],
  "Painéis em Aeroportos": ["Embarque / Desembarque Geral", "Área Restrita / Raio-X", "Salas VIP"],
  "Painéis em Pontos de Ônibus": ["Linhas de Alto Fluxo", "Paradas Centrais"],
  "Telas em Restaurantes e Barbearias": ["Horário de Almoço e Jantar", "Happy Hour"],
  "Telas em Academias e Gastronomia": ["Horário de Pico Fitness (Manhã e Noite)", "Área de Musculação"],
  "Telas em Transporte por Aplicativo": ["Corridas no DF e Entorno", "Frotas Urbanas"],
  "Adesivagem de Bancas de Jornal": ["Pontos Nobres Comerciais", "W3 Sul/Norte / Esplanada"],
  Radio: ["Manhã Notícias", "Tarde Musical", "Rotativo Comercial", "Hora do Rush", "A Voz do Brasil (Entorno)"],
  "Digital / Redes Sociais": ["Instagram @nexomidia", "Portal de Notícias", "LinkedIn Comercial", "Campanhas Meta Ads"],
  "Projetos Especiais": ["Ativação Promocional", "Blitz em Pontos de Venda", "Patrocínio Oficial"],
};

export function getMacroCanalParaMidia(midia: string): "OFF" | "ON" | "HIBRIDO" {
  const m = midia.toLowerCase();
  if (
    m === "digital" ||
    m.includes("digital / redes") ||
    m.includes("social") ||
    m.includes("internet") ||
    m.includes("web") ||
    m.includes("portal")
  ) {
    return "ON";
  }
  if (m.includes("projetos especiais") || m.includes("híbrido") || m.includes("360")) {
    return "HIBRIDO";
  }
  return "OFF";
}
