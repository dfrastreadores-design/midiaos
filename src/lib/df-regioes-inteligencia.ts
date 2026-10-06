// Inteligência Geográfica do Distrito Federal para o Planejador 360° e Radar de Expansão
// Mapeamento das 35 Regiões Administrativas do DF, rotas troncais de transbordamento,
// perfil de público, formatos recomendados e entidades locais de captação.

export interface RegiaoDFInteligencia {
  nome: string;
  apelidos: string[];
  perfilPredominante: string;
  classesSugeridas: ("Classe A/B" | "Classe B/C" | "Classe C/D")[];
  estilosVidaSugeridos: (
    | "Famílias/Moradores Locais"
    | "Executivos/Tomadores de Decisão"
    | "Estudantes/Jovens"
    | "Consumo/Comércio"
  )[];
  formatosRecomendados: {
    formato: string;
    icone: string;
    porQue: string;
  }[];
  viasTransbordamento: {
    via: string;
    descricao: string;
    fluxoEstimado: string;
    pontosEstrategicos: string[];
  }[];
  prospectsLocaisSugeridos: {
    categoria: string;
    exemplos: string[];
    contatoDica: string;
  }[];
  pitchConsultor: string;
}

export const PILARES_360 = [
  {
    id: "deslocamento",
    numero: 1,
    nome: "Deslocamento & Rodovias",
    tagline: "Impacto no trajeto diário de ida e volta",
    icone: "Car",
    formatos: ["Painel LED Rodoviário", "Outdoor", "Front Light", "Abrigo de Ônibus", "Empena Rodoviária"],
    beneficio: "Autoridade máxima e alta frequência de repetição nas vias troncais de acesso à região.",
  },
  {
    id: "moradia",
    numero: 2,
    nome: "Moradia & Rotina (Elevadores)",
    tagline: "Presença no local de descanso e convivência",
    icone: "Building2",
    formatos: ["Mídia em Elevador Residencial", "Mídia em Elevador Corporativo", "Display em Hall de Entrada", "Telas em Condomínios"],
    beneficio: "Atenção cativa 100% livre de distrações, impacto direto nos momentos de rotina familiar.",
  },
  {
    id: "lazer_consumo",
    numero: 3,
    nome: "Lazer & Consumo (Restaurantes e Shoppings)",
    tagline: "Presença no momento de decisão e compra",
    icone: "Utensils",
    formatos: ["Totem em Shopping", "Display Praça de Alimentação", "TV Indoor Restaurantes", "Tela em Academias"],
    beneficio: "Público predisposto ao consumo e entretenimento nos polos gastronômicos e comerciais.",
  },
  {
    id: "ativacao_eventos",
    numero: 4,
    nome: "Ativação Presencial & Eventos",
    tagline: "Experiência física direta com cobertura ao vivo",
    icone: "Radio",
    formatos: ["Ação de Blitz no PDV", "Locução / Flash Comercial ao Vivo em Rádio", "Carro de Som / Trio Show", "Distribuição Promocional"],
    beneficio: "Sensação de evento ao vivo, gerando urgência de compra imediata e tráfego físico à loja.",
  },
  {
    id: "digital",
    numero: 5,
    nome: "Conexão Digital & Cross-Media",
    tagline: "Conversão na palma da mão com QR Code",
    icone: "Globe",
    formatos: ["TV Car com QR Code Dinâmico", "Post Patrocinado em Canal de Grande Audiência", "Geofencing Mobile", "Banner em Portal Regional"],
    beneficio: "Fecha o ciclo phygital, transformando o impacto visual da rua em clique, engajamento e WhatsApp.",
  },
] as const;

export const HISTORICO_SUCESSO_OPCOES = [
  { id: "pdv_inauguracao", label: "Ações no PDV / Inauguração", icone: "Store" },
  { id: "radio_locucao", label: "Rádio / Locução Comercial", icone: "Radio" },
  { id: "outdoors_paineis", label: "Outdoors / Painéis Rodoviários", icone: "Layers" },
  { id: "trafego_pago_redes", label: "Tráfego Pago / Redes Sociais", icone: "Share2" },
  { id: "eventos_parcerias", label: "Eventos / Parcerias Comerciais", icone: "Handshake" },
] as const;

export const REGIOES_DF_INTELIGENCIA: Record<string, RegiaoDFInteligencia> = {
  "Ceilândia": {
    nome: "Ceilândia",
    apelidos: ["Ceilândia Centro", "Ceilândia Sul", "Ceilândia Norte", "P Sul", "P Norte", "Guariroba"],
    perfilPredominante: "Maior polo comercial e populacional do DF (mais de 450 mil habitantes), forte comércio de rua e feiras tradicionais.",
    classesSugeridas: ["Classe B/C", "Classe C/D"],
    estilosVidaSugeridos: ["Consumo/Comércio", "Famílias/Moradores Locais"],
    formatosRecomendados: [
      {
        formato: "Front Lights & Painéis de LED de Esquina",
        icone: "Tv",
        porQue: "Av. Hélio Prates e Centro de Ceilândia concentram intenso tráfego lento de pedestres e veículos em busca de compras.",
      },
      {
        formato: "Carros de Som / Blitz Promocional com Rádio",
        icone: "Radio",
        porQue: "Cultura popular fortíssima com alta aceitação a eventos presenciais, locução e carro-show com brindes.",
      },
      {
        formato: "Outdoors nas Rodovias de Acesso (Estrutural e EPTG)",
        icone: "Layers",
        porQue: "Fluxo pendular de centenas de milhares de trabalhadores que se deslocam diariamente para o Plano Piloto.",
      },
    ],
    viasTransbordamento: [
      {
        via: "Via Estrutural (DF-095)",
        descricao: "Eixo troncal direto conectando Ceilândia ao Plano Piloto e SIA, com retenções no horário de pico.",
        fluxoEstimado: "90.000 veículos/dia",
        pontosEstrategicos: ["Entrada da Estrutural", "Viaduto de Integração", "Painéis próximo à Cidade do Automóvel"],
      },
      {
        via: "EPTG (DF-085) / Linha Verde",
        descricao: "Via expressa com corredor exclusivo e passarelas com painéis de retenção de alta visibilidade.",
        fluxoEstimado: "120.000 veículos/dia",
        pontosEstrategicos: ["EPTG km 2 a 8", "Sentido Plano Piloto manhã", "Sentido Ceilândia tarde"],
      },
      {
        via: "Avenida Hélio Prates",
        descricao: "Avenida comercial que une Ceilândia a Taguatinga com circulação constante.",
        fluxoEstimado: "70.000 veículos/dia",
        pontosEstrategicos: ["Próximo ao JK Shopping", "Feira dos Importados de Ceilândia"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Associações & Entidades Comerciais",
        exemplos: ["ACIC - Associação Comercial e Industrial de Ceilândia", "Feira Central de Ceilândia"],
        contatoDica: "Parcerias de exibição em totens e panfletagem credenciada.",
      },
      {
        categoria: "Veículos e Rádios Comunitárias Locais",
        exemplos: ["Rádios comunitárias de Ceilândia", "Canais locais de notícias e Instagram comunitário"],
        contatoDica: "Divulgação cruzada com locutores tradicionais respeitados pelos comerciantes locais.",
      },
      {
        categoria: "Bancas & Mobiliário Urbano Central",
        exemplos: ["Bancas da Praça do Relógio / Ceilândia Centro", "Empenas na Av. Central"],
        contatoDica: "Captação de empenas em edifícios comerciais de 2 a 3 andares.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  },
  "Samambaia": {
    nome: "Samambaia",
    apelidos: ["Samambaia Norte", "Samambaia Sul", "Expansão de Samambaia"],
    perfilPredominante: "Cidade satélite com forte crescimento vertical residencial, comércio vibrante em expansão e mobilidade pelo Metrô/BRT.",
    classesSugeridas: ["Classe B/C", "Classe C/D"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Consumo/Comércio"],
    formatosRecomendados: [
      {
        formato: "Mídia em Elevadores Residenciais em Condomínios Novos",
        icone: "Building2",
        porQue: "Centenas de novos prédios residenciais verticais construídos nos últimos 5 anos com famílias jovens.",
      },
      {
        formato: "Painéis de Retenção no Pistão Sul e EPNB",
        icone: "Layers",
        porQue: "Principal gargalo de saída e retorno de quem mora em Samambaia e trabalha nas áreas centrais.",
      },
      {
        formato: "Totens Digitais e Abrigos em Estações de Metrô",
        icone: "Tv",
        porQue: "Estações Samambaia e Samambaia Sul concentram grande fluxo a pé nos horários de pico.",
      },
    ],
    viasTransbordamento: [
      {
        via: "Pistão Sul (Taguatinga / Samambaia)",
        descricao: "Ligação direta entre Samambaia, Taguatinga e EPNB, repleta de concessionárias e faculdades.",
        fluxoEstimado: "85.000 veículos/dia",
        pontosEstrategicos: ["Próximo ao Taguatinga Shopping", "Saída da Samambaia Sul para DF-001"],
      },
      {
        via: "EPNB (DF-075) / Estrada Parque Núcleo Bandeirante",
        descricao: "Via troncal obrigatória que canaliza o fluxo de Samambaia, Riacho Fundo e Recanto das Emas.",
        fluxoEstimado: "95.000 veículos/dia",
        pontosEstrategicos: ["Trecho Riacho Fundo / Bandeirante", "Entrada do Park Way"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Associações Comerciais & Administradoras de Condomínio",
        exemplos: ["Associação Comercial de Samambaia (ACIS)", "Administradoras de condomínios da 1ª e 2ª Avenidas"],
        contatoDica: "Contratos de telas digitais em halls de condomínios clube.",
      },
      {
        categoria: "Empenas e Fachadas Comerciais",
        exemplos: ["Prédios comerciais nas Avenidas Primeira e Segunda"],
        contatoDica: "Locação de faces laterais de alta visibilidade voltadas para as avenidas.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  },
  "Taguatinga": {
    nome: "Taguatinga",
    apelidos: ["Taguatinga Centro", "Taguatinga Norte", "Taguatinga Sul", "Sandu", "Comercial Norte"],
    perfilPredominante: "Capital econômica e financeira do interior do DF, polo consolidado de moda, autopeças, hospitais e faculdades.",
    classesSugeridas: ["Classe A/B", "Classe B/C"],
    estilosVidaSugeridos: ["Consumo/Comércio", "Executivos/Tomadores de Decisão", "Famílias/Moradores Locais"],
    formatosRecomendados: [
      {
        formato: "Mega Painéis de LED no Túnel de Taguatinga e Relógio",
        icone: "Tv",
        porQue: "O novo Boulevard do Túnel de Taguatinga é a maior vitrine de mobilidade urbana da cidade.",
      },
      {
        formato: "Front Lights na Comercial e Sandu",
        icone: "Layers",
        porQue: "Maior adensamento de compras do Centro-Oeste com público altamente comprador.",
      },
      {
        formato: "Displays em Shoppings (Taguatinga Shopping e Alameda)",
        icone: "Utensils",
        porQue: "Atração direta de público qualificado das classes A, B e C nos momentos de lazer.",
      },
    ],
    viasTransbordamento: [
      {
        via: "Túnel Rei Pelé & Boulevard Central",
        descricao: "Ponto nevrálgico que recebe mais de 135 mil carros/dia entre Ceilândia, Samambaia e Plano.",
        fluxoEstimado: "135.000 veículos/dia",
        pontosEstrategicos: ["Boulevard Superior", "Entrada do Túnel sentido Plano", "Praça do Relógio"],
      },
      {
        via: "EPTG (DF-085)",
        descricao: "Via expressa mais movimentada do DF com retenção nas passarelas.",
        fluxoEstimado: "120.000 veículos/dia",
        pontosEstrategicos: ["Próximo à Só Reparos", "Viaduto de Vicente Pires / Taguatinga"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Associações e Sindicatos do Comércio",
        exemplos: ["ACIT - Associação Comercial e Industrial de Taguatinga", "CDL Taguatinga"],
        contatoDica: "Mapeamento das empenas mais cobiçadas da Comercial Norte e Sul.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Mapeamos os pontos estratégicos do Túnel de Taguatinga, Pistão e EPTG para assegurar impacto contínuo.",
  },
  "Águas Claras": {
    nome: "Águas Claras",
    apelidos: ["Águas Claras Vertical", "Avenida Castanheiras", "Avenida Araucárias", "Park Way / Águas Claras"],
    perfilPredominante: "Cidade 100% vertical de alto poder aquisitivo, jovem, tecnológica, com forte consumo de delivery, gastronomia e serviços premium.",
    classesSugeridas: ["Classe A/B", "Classe B/C"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Executivos/Tomadores de Decisão", "Jovens/Estudantes"],
    formatosRecomendados: [
      {
        formato: "Mídia em Elevadores Residenciais (Circuitos Verticais)",
        icone: "Building2",
        porQue: "Mais de 750 edifícios residenciais onde o elevador é a primeira e última mídia vista no dia.",
      },
      {
        formato: "Painéis de LED em Centros Gastronômicos (Castanheiras e Araucárias)",
        icone: "Tv",
        porQue: "Ruas com tráfego lento e praças com restaurantes lotados todas as noites.",
      },
      {
        formato: "Conexão Digital via Geofencing e TV Car com QR Code",
        icone: "Globe",
        porQue: "População ultra conectada ao smartphone e propensa a escanear QR Code para compras online.",
      },
    ],
    viasTransbordamento: [
      {
        via: "EPTG / Viaduto Israel Pinheiro",
        descricao: "Acesso principal dos moradores de Águas Claras para o Plano Piloto.",
        fluxoEstimado: "110.000 veículos/dia",
        pontosEstrategicos: ["Viaduto Israel Pinheiro", "Marginais da EPTG"],
      },
      {
        via: "Estrada Parque Núcleo Bandeirante (EPNB)",
        descricao: "Saída sul de Águas Claras pelo Park Way.",
        fluxoEstimado: "80.000 veículos/dia",
        pontosEstrategicos: ["Acesso Park Way / EPNB"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Administradoras de Condomínio e Mídia Indoor",
        exemplos: ["Redes de telas de elevador homologadas em Águas Claras"],
        contatoDica: "Pacotes fechados por blocos de quadras (Quadras 100 a 300).",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Garantimos que sua marca esteja dentro dos elevadores residenciais e nas avenidas de entrada de Águas Claras.",
  },
  "Plano Piloto (Asa Sul / Asa Norte / Centro)": {
    nome: "Plano Piloto (Asa Sul / Asa Norte / Centro)",
    apelidos: ["Asa Sul", "Asa Norte", "Eixo Monumental", "Setor Comercial Sul", "Setor Comercial Norte", "Esplanada"],
    perfilPredominante: "Centro político, judiciário e financeiro do país, altíssima renda per capita, servidores públicos e executivos.",
    classesSugeridas: ["Classe A/B"],
    estilosVidaSugeridos: ["Executivos/Tomadores de Decisão", "Famílias/Moradores Locais", "Consumo/Comércio"],
    formatosRecomendados: [
      {
        formato: "Painéis de LED de Grande Porte no Eixo Monumental e W3",
        icone: "Tv",
        porQue: "Exposição com status de autoridade nacional e recall instantâneo.",
      },
      {
        formato: "Mídia em Elevadores Corporativos nos Setores Comerciais e Bancários",
        icone: "Building2",
        porQue: "Impacto cirúrgico em diretores, advogados, parlamentares e empresários.",
      },
      {
        formato: "Banners em Portais de Notícias de Grande Audiência + TV Cars",
        icone: "Globe",
        porQue: "Consumo diário intensivo de notícias políticas e econômicas locais.",
      },
    ],
    viasTransbordamento: [
      {
        via: "Eixo Rodoviário (Eixão Sul e Norte)",
        descricao: "Espinha dorsal do trânsito de Brasília conectando as asas ao aeroporto e saídas norte/sul.",
        fluxoEstimado: "150.000 veículos/dia",
        pontosEstrategicos: ["Eixinho W e L", "Eixo Monumental cruzamento W3", "Acesso ao Aeroporto"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Shoppings e Complexos Corporativos",
        exemplos: ["Pátio Brasil", "Brasília Shopping", "Conjunto Nacional", "Venâncio 2000"],
        contatoDica: "Telas de grande formato e lounges de ativação.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Estruturamos os pontos de maior prestígio no Plano Piloto para posicionar sua marca com máxima autoridade.",
  },
  "Gama": {
    nome: "Gama",
    apelidos: ["Gama Centro", "Setor Leste", "Setor Oeste", "Setor Sul", "Setor de Indústria do Gama"],
    perfilPredominante: "Polo tradicional do sul do DF com identidade cultural própria, forte comércio médico, automobilístico e esportivo.",
    classesSugeridas: ["Classe B/C", "Classe C/D"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Consumo/Comércio"],
    formatosRecomendados: [
      {
        formato: "Outdoors e Front Lights na DF-040 / DF-480",
        icone: "Layers",
        porQue: "Corredor obrigatório de acesso ao Gama e Santa Maria.",
      },
      {
        formato: "Ações de Blitz no PDV com Cobertura em Rádio FM",
        icone: "Radio",
        porQue: "Comércio central com grande concentração de famílias aos sábados.",
      },
    ],
    viasTransbordamento: [
      {
        via: "EPIA Sul (DF-003) & DF-040",
        descricao: "Acesso de alta velocidade entre Gama e o Plano Piloto.",
        fluxoEstimado: "75.000 veículos/dia",
        pontosEstrategicos: ["Trevo do Catetinho", "Acesso ao Balão do Periquito"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Associações Comerciais & Veículos Locais",
        exemplos: ["Associação Comercial do Gama", "Rádios locais da região sul"],
        contatoDica: "Parcerias de veiculação e cobertura de ofertas de varejo.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  },
  "Sobradinho (I e II)": {
    nome: "Sobradinho (I e II)",
    apelidos: ["Sobradinho I", "Sobradinho II", "Grande Colorado", "Setor de Mansões Sobradinho"],
    perfilPredominante: "Porta de entrada norte do DF, forte presença de condomínios fechados horizontais de boa renda e comércio no Colorado.",
    classesSugeridas: ["Classe A/B", "Classe B/C"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Executivos/Tomadores de Decisão"],
    formatosRecomendados: [
      {
        formato: "Painéis Rodoviários Unipole na BR-020 (Subida do Colorado)",
        icone: "Layers",
        porQue: "Principal gargalo de retenção diária de toda a saída norte do DF.",
      },
      {
        formato: "Mídia em Centros Comerciais e Supermercados do Colorado",
        icone: "Utensils",
        porQue: "Parada obrigatória de compras de famílias na volta para os condomínios.",
      },
    ],
    viasTransbordamento: [
      {
        via: "BR-020 / Subida do Colorado",
        descricao: "Rodovia federal que escoa o tráfego de Sobradinho, Planaltina e Formosa.",
        fluxoEstimado: "95.000 veículos/dia",
        pontosEstrategicos: ["Balão do Colorado", "Trevo do Torto", "Viadutos da BR-020"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Comércio Local e Associações de Condomínios",
        exemplos: ["Associação Comercial de Sobradinho", "Centros comerciais do Colorado"],
        contatoDica: "Exibição em totens e outdoors rodoviários autorizados pelo DER.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  },
  "Planaltina": {
    nome: "Planaltina",
    apelidos: ["Planaltina DF", "Setor Tradicional", "Vila Buritis", "Arapoanga", "Vale do Amanhecer"],
    perfilPredominante: "Cidade histórica com identidade secular, forte vocação agropecuária, feiras e comércio tradicional autônomo.",
    classesSugeridas: ["Classe B/C", "Classe C/D"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Consumo/Comércio"],
    formatosRecomendados: [
      {
        formato: "Outdoors de Entrada na BR-020 e DF-130",
        icone: "Layers",
        porQue: "Impacto no fluxo de ligação entre o agronegócio e a área urbana.",
      },
      {
        formato: "Carros de Som & Blitz de Loja com Rádio",
        icone: "Radio",
        porQue: "Consumo popular muito receptivo a ativações com promotores e locução.",
      },
    ],
    viasTransbordamento: [
      {
        via: "BR-020 (Trecho Planaltina - Sobradinho)",
        descricao: "Ligação pendular contínua entre Planaltina e a área central do DF.",
        fluxoEstimado: "70.000 veículos/dia",
        pontosEstrategicos: ["Trevo de Planaltina", "Acesso ao Vale do Amanhecer"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Associações Rurais e Comércio Tradicional",
        exemplos: ["Associação Comercial de Planaltina", "Sindicato Rural de Planaltina"],
        contatoDica: "Captação de espaços em feiras e pontos no Setor Tradicional.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  },
  "Santa Maria": {
    nome: "Santa Maria",
    apelidos: ["Santa Maria Norte", "Santa Maria Sul", "Total Ville"],
    perfilPredominante: "Região com forte adensamento populacional no sul do DF, grande circulação do BRT Sul e novo polo residencial Total Ville.",
    classesSugeridas: ["Classe B/C", "Classe C/D"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Consumo/Comércio"],
    formatosRecomendados: [
      {
        formato: "Painéis e Abrigos no Corredor do BRT Sul",
        icone: "Tv",
        porQue: "Mais de 60 mil passageiros diários embarcando nas estações expressas.",
      },
      {
        formato: "Painéis Rodoviários na BR-040",
        icone: "Layers",
        porQue: "Rodovia federal de escoamento para Valparaíso e Goiás com alta lentidão.",
      },
    ],
    viasTransbordamento: [
      {
        via: "BR-040 / DF-290",
        descricao: "Eixo de integração entre Santa Maria, Gama e o Entorno Sul.",
        fluxoEstimado: "85.000 veículos/dia",
        pontosEstrategicos: ["Entrada de Santa Maria", "Trevo do Total Ville"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Comércio Local e Associações",
        exemplos: ["Associação Comercial de Santa Maria", "Lojistas da Av. Alagados"],
        contatoDica: "Prospecção de empenas e fachadas comerciais na Avenida Alagados.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  },
  "Vicente Pires": {
    nome: "Vicente Pires",
    apelidos: ["Rua 3 a 12", "Colônia Agrícola Samambaia", "Jóquei Clube"],
    perfilPredominante: "Bairro horizontal nobre em forte consolidação urbana, alta densidade de condomínios de casas e polo gastronômico nas ruas principais.",
    classesSugeridas: ["Classe A/B", "Classe B/C"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Consumo/Comércio"],
    formatosRecomendados: [
      {
        formato: "Painéis de LED nas Ruas 3, 8 e 12",
        icone: "Tv",
        porQue: "Avenidas comerciais internas com tráfego lento e circulação constante de moradores.",
      },
      {
        formato: "Front Lights na Marginal da EPTG e Via Estrutural",
        icone: "Layers",
        porQue: "Acessos diretos de entrada e saída de Vicente Pires.",
      },
    ],
    viasTransbordamento: [
      {
        via: "Marginal EPTG e Rua 3",
        descricao: "Principal gargalo de entrada e saída para quem vai ao Plano Piloto.",
        fluxoEstimado: "90.000 veículos/dia",
        pontosEstrategicos: ["Viaduto de Vicente Pires na EPTG", "Acesso pela Estrutural"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Comércio Local e Restaurantes",
        exemplos: ["Associação Comercial de Vicente Pires", "Polo Gastronômico da Rua 8"],
        contatoDica: "Instalação de totens digitais e telas em estacionamentos de centros gastronômicos.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  },
  "Jardim Botânico / Lago Sul": {
    nome: "Jardim Botânico / Lago Sul",
    apelidos: ["Jardim Botânico", "Lago Sul", "Tororó", "Condomínios do Altiplano Leste"],
    perfilPredominante: "Área de mais alta renda do Distrito Federal, condomínios fechados horizontais de luxo, centros de conveniência boutique.",
    classesSugeridas: ["Classe A/B"],
    estilosVidaSugeridos: ["Executivos/Tomadores de Decisão", "Famílias/Moradores Locais"],
    formatosRecomendados: [
      {
        formato: "Mega Painéis de LED nas Pontes JK e Costa e Silva",
        icone: "Tv",
        porQue: "Acesso obrigatório e exclusivo aos centros de decisão e lazer do Plano Piloto.",
      },
      {
        formato: "Displays em Centros Gastronômicos e Shoppings Boutique",
        icone: "Utensils",
        porQue: "Consumo sofisticado nos polos gastronômicos do Jardim Botânico e Gilberto Salomão.",
      },
    ],
    viasTransbordamento: [
      {
        via: "Ponte JK e Estrada Parque Dom Bosco (DF-025)",
        descricao: "Maior concentração de carros de luxo e tomadores de decisão do Centro-Oeste.",
        fluxoEstimado: "70.000 veículos/dia",
        pontosEstrategicos: ["Acesso à Ponte JK", "Subida da DF-001 sentido Jardim Botânico"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Centros Comerciais Boutique e Clubes",
        exemplos: ["Gilberto Salomão", "Jardim Botânico Shopping", "Iate Clube de Brasília"],
        contatoDica: "Exibição em totens e patrocínios de eventos exclusivos.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Mapeamos os pontos nobres na Ponte JK e centros de consumo do Jardim Botânico para impactar os principais tomadores de decisão.",
  },
  "Recanto das Emas / Riacho Fundo (I e II)": {
    nome: "Recanto das Emas / Riacho Fundo (I e II)",
    apelidos: ["Recanto das Emas", "Riacho Fundo I", "Riacho Fundo II", "Sucupira"],
    perfilPredominante: "Regiões residenciais com forte comércio interno em avenidas comerciais e trânsito pendular pela EPNB e DF-001.",
    classesSugeridas: ["Classe B/C", "Classe C/D"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Consumo/Comércio"],
    formatosRecomendados: [
      {
        formato: "Outdoors e Painéis de Retenção na EPNB",
        icone: "Layers",
        porQue: "Gargalo rodoviário com retenção diária de veículos de ida e volta do trabalho.",
      },
      {
        formato: "Carros de Som & Blitz Promocional nas Feiras e Avenidas Centrais",
        icone: "Radio",
        porQue: "Forte impacto local em eventos de fim de semana e finais de tarde.",
      },
    ],
    viasTransbordamento: [
      {
        via: "EPNB (DF-075)",
        descricao: "Ligação direta do Recanto e Riacho ao Núcleo Bandeirante e Plano Piloto.",
        fluxoEstimado: "90.000 veículos/dia",
        pontosEstrategicos: ["Entrada do Riacho Fundo I", "Balão de acesso ao Recanto das Emas"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Associações e Feiras Regionais",
        exemplos: ["Feira do Recanto das Emas", "Associação Comercial do Riacho Fundo"],
        contatoDica: "Bancas de revista, empenas comerciais e parcerias com sonorização de rua.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  },
};

// Fallback universal para qualquer RA do DF não explicitada acima
export function getInteligenciaRegiaoDF(regiaoNome: string): RegiaoDFInteligencia {
  if (!regiaoNome) return REGIOES_DF_INTELIGENCIA["Ceilândia"];

  // Busca exata ou por substring
  const key = Object.keys(REGIOES_DF_INTELIGENCIA).find(
    (k) =>
      k.toLowerCase() === regiaoNome.toLowerCase() ||
      REGIOES_DF_INTELIGENCIA[k].apelidos.some((a) =>
        regiaoNome.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(regiaoNome.toLowerCase()),
      ) ||
      regiaoNome.toLowerCase().includes(k.toLowerCase()),
  );

  if (key && REGIOES_DF_INTELIGENCIA[key]) {
    return REGIOES_DF_INTELIGENCIA[key];
  }

  // Modelo dinâmico inteligente para RAs satélites sem mapa dedicado
  return {
    nome: regiaoNome,
    apelidos: [regiaoNome],
    perfilPredominante: `Região Administrativa do DF com forte integração rodoviária, comunidade local ativa e mobilidade pendular diária.`,
    classesSugeridas: ["Classe B/C", "Classe C/D"],
    estilosVidaSugeridos: ["Famílias/Moradores Locais", "Consumo/Comércio"],
    formatosRecomendados: [
      {
        formato: "Painéis de Retenção nas Vias de Acesso e Rodovias",
        icone: "Layers",
        porQue: "Impacto garantido nos pontos de entrada e saída por onde a população circula obrigatoriamente.",
      },
      {
        formato: "Ativação no PDV & Cobertura em Rádio e Redes Sociais",
        icone: "Radio",
        porQue: "Ativação com promotores e locução gera urgência de compra imediata na comunidade local.",
      },
      {
        formato: "Mídia em Elevadores e Displays em Centros de Compra",
        icone: "Building2",
        porQue: "Presença cativa na rotina dos moradores e consumidores da região.",
      },
    ],
    viasTransbordamento: [
      {
        via: "Eixo Rodoviário Troncal de Acesso ao Plano Piloto",
        descricao: `Via expressa de conexão que transporta os moradores de ${regiaoNome} aos centros de trabalho e compras do DF.`,
        fluxoEstimado: "70.000+ veículos/dia",
        pontosEstrategicos: ["Acesso principal da região", "Entroncamentos com EPIA, EPTG ou Estrutural"],
      },
    ],
    prospectsLocaisSugeridos: [
      {
        categoria: "Associação Comercial e Lojistas Locais",
        exemplos: [`Associação Comercial de ${regiaoNome}`, "Lojas âncoras da Avenida Central"],
        contatoDica: "Mapeamento de empenas e fachadas comerciais para instalação de novas faces de mídia.",
      },
      {
        categoria: "Veículos e Canais Comunitários",
        exemplos: [`Rádios e portais locais de ${regiaoNome}`, "Páginas comunitárias de grande audiência"],
        contatoDica: "Parcerias de mídia cruzada para potencializar campanhas 360°.",
      },
    ],
    pitchConsultor:
      "Nossa agência opera em modelo 360° sob demanda. Identificamos as avenidas de maior fluxo da sua região e já estamos mapeando as melhores faces e oportunidades locais com nossos parceiros homologados para garantir exclusividade para a sua marca.",
  };
}

export const TODAS_RAS_DF = [
  "Plano Piloto (Asa Sul / Asa Norte / Centro)",
  "Águas Claras",
  "Taguatinga",
  "Ceilândia",
  "Samambaia",
  "Guará (I e II)",
  "Sudoeste / Octogonal",
  "Noroeste",
  "Cruzeiro",
  "Gama",
  "Sobradinho",
  "Sobradinho II",
  "Planaltina",
  "Santa Maria",
  "Vicente Pires",
  "Jardim Botânico",
  "Lago Sul",
  "Lago Norte",
  "São Sebastião",
  "Recanto das Emas",
  "Riacho Fundo",
  "Riacho Fundo II",
  "Núcleo Bandeirante",
  "Candangolândia",
  "Brazlândia",
  "Paranoá",
  "Itapoã",
  "SCIA / Estrutural",
  "SIA (Setor de Indústria e Abastecimento)",
  "Park Way",
  "Arniqueira",
  "Sol Nascente / Pôr do Sol",
  "Fercal",
  "Varjão",
  "Arapoanga",
  "Água Quente",
];

export const UFS_BRASIL = [
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "GO", nome: "Goiás / Entorno" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "BA", nome: "Bahia" },
  { uf: "PR", nome: "Paraná" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "CE", nome: "Ceará" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "PA", nome: "Pará" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "PI", nome: "Piauí" },
  { uf: "TO", nome: "Tocantins" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "AC", nome: "Acre" },
  { uf: "RR", nome: "Roraima" },
  { uf: "AP", nome: "Amapá" },
] as const;

export function getInteligenciaGeografica(
  regiaoNome: string,
  estadoUf?: string | null,
  tipoAbrangencia?: "local" | "regional" | "nacional" | string | null,
): RegiaoDFInteligencia {
  const isNacional =
    tipoAbrangencia === "nacional" ||
    (estadoUf || "").toUpperCase() === "BR" ||
    (regiaoNome || "").toLowerCase().includes("nacional") ||
    (regiaoNome || "").toLowerCase().includes("brasil");

  if (isNacional) {
    return {
      nome: "Cobertura Nacional / Todo o Brasil",
      apelidos: ["Nacional", "Brasil", "Multi-estadual", "Todo o Brasil", "Todas as Praças"],
      perfilPredominante:
        "Planejamento com escala de âmbito nacional, integrando canais de massa digitais, portais web, redes de TV/áudio e circuitos estruturais de OOH nas principais capitais brasileiras.",
      classesSugeridas: ["Classe A/B", "Classe B/C"],
      estilosVidaSugeridos: ["Executivos/Tomadores de Decisão", "Famílias/Moradores Locais", "Consumo/Comércio"],
      formatosRecomendados: [
        {
          formato: "Mídia Digital & Redes Nacionais (Web / Portais)",
          icone: "Globe",
          porQue: "Alcance multi-regional instantâneo com precisão geográfica e mensuração de cliques.",
        },
        {
          formato: "Circuitos DOOH em Capitais & Aeroportos",
          icone: "Monitor",
          porQue: "Alta autoridade e impacto visual qualificado no trânsito aéreo e corporativo interestadual.",
        },
        {
          formato: "Veiculação em Redes Nacionais de TV & Rádio",
          icone: "Tv",
          porQue: "Cobertura massiva e construção imediata de recall e credibilidade institucional.",
        },
      ],
      viasTransbordamento: [
        {
          via: "Circuitos Aeroportuários e Capitais Principais (BSB, SP, RJ, BH, CWB, SSA, REC)",
          descricao: "Eixos aéreos e rodovias troncais que conectam os principais polos econômicos do país.",
          fluxoEstimado: "2.500.000+ passageiros/dia",
          pontosEstrategicos: ["Aeroporto de Brasília", "Congonhas / Guarulhos (SP)", "Santos Dumont / Galeão (RJ)", "Confins (BH)"],
        },
      ],
      prospectsLocaisSugeridos: [
        {
          categoria: "Grandes Redes e Marcas Nacionais",
          exemplos: ["Franquias nacionais", "E-commerces", "Instituições financeiras e fintechs", "Grandes redes varejistas"],
          contatoDica: "Proposta de cotas integradas de mídia multiplataforma e presença simultânea nos maiores mercados.",
        },
      ],
      pitchConsultor:
        "Nosso ecossistema opera como um Hub Estratégico de Mídia com cobertura nacional. Combinamos serviços próprios de inteligência e criação com parcerias homologadas em múltiplos estados, entregando escala unificada e rentabilidade comercial máxima.",
    };
  }

  const ufUpper = (estadoUf || "").trim().toUpperCase();

  // Se for fora do DF (ex: Goiás, São Paulo, etc.)
  if (ufUpper && ufUpper !== "DF") {
    const nomePraça = regiaoNome?.trim() || `Praça Regional (${ufUpper})`;
    const viasSug =
      ufUpper === "GO"
        ? [
            {
              via: "BR-040 / BR-060 (Eixo Brasília • Luziânia • Valparaíso • Goiânia)",
              descricao: `Corredor rodoviário com fluxo intenso de conexão entre o DF e as principais cidades de Goiás (${nomePraça}).`,
              fluxoEstimado: "120.000+ veículos/dia",
              pontosEstrategicos: ["Trecho Luziânia / Valparaíso", "Entrada de Goiânia", "Postos de retenção e pedágios"],
            },
          ]
        : ufUpper === "SP"
        ? [
            {
              via: "Marginais Tietê / Pinheiros & Corredores Metropolitanos de SP",
              descricao: "Vias expressas de maior fluxo comercial e concentração de decisores na Grande São Paulo.",
              fluxoEstimado: "350.000+ veículos/dia",
              pontosEstrategicos: ["Av. Paulista", "Faria Lima", "Marginal Pinheiros", "Aeroporto de Congonhas"],
            },
          ]
        : [
            {
              via: `Principais Avenidas Comerciais e Rodovias de Acesso — ${nomePraça} (${ufUpper})`,
              descricao: `Corredores estratégicos de entrada, saída e comércio em ${nomePraça}.`,
              fluxoEstimado: "65.000+ veículos/dia",
              pontosEstrategicos: ["Centro Comercial", "Avenida Troncal Principal", "Entrada da Cidade"],
            },
          ];

    return {
      nome: `${nomePraça} — ${ufUpper}`,
      apelidos: [nomePraça, ufUpper, `${nomePraça} - ${ufUpper}`, `${nomePraça}/${ufUpper}`],
      perfilPredominante: `Região de forte tração comercial e polo econômico estratégico em ${ufUpper}, com alta circulação diária de moradores, frotas e público consumidor qualificado.`,
      classesSugeridas: ["Classe B/C", "Classe A/B"],
      estilosVidaSugeridos: ["Famílias/Moradores Locais", "Consumo/Comércio", "Executivos/Tomadores de Decisão"],
      formatosRecomendados: [
        {
          formato: "Painéis de LED e Outdoors em Vias de Entrada",
          icone: "Car",
          porQue: "Impacto dominante na principal via de acesso da cidade com repetição obrigatória diária.",
        },
        {
          formato: "Mídia Digital Local & Portais Regionais",
          icone: "Globe",
          porQue: "Hiper-segmentação por cidade com engajamento direto e direcionamento para WhatsApp da loja.",
        },
        {
          formato: "Rádio Local e Ativações Promocionais",
          icone: "Radio",
          porQue: "Forte conexão afetiva e liderança de audiência comunitária no comércio da cidade.",
        },
      ],
      viasTransbordamento: viasSug,
      prospectsLocaisSugeridos: [
        {
          categoria: `Rede Lojista e Empresarial de ${nomePraça}`,
          exemplos: [`CDL / Associação Comercial de ${nomePraça}`, "Concessionárias locais", "Redes de farmácias e supermercados"],
          contatoDica: "Mapeamento ativo no radar de captação para novos inventários de mídia e contratos exclusivos.",
        },
      ],
      pitchConsultor: `Nossa representação atua como hub completo de soluções em ${nomePraça} e ${ufUpper}. Oferecemos curadoria minuciosa dos melhores pontos da cidade com tabela comercial transparente e consultoria tática de mídia 360°.`,
    };
  }

  // Caso padrão: DF
  return getInteligenciaRegiaoDF(regiaoNome);
}

