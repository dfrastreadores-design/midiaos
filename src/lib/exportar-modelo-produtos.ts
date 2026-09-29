import * as XLSX from "xlsx";

export interface ModeloProdutoRow {
  "Nome do Produto / Ponto": string;
  "Tipo de Mídia": "DOOH" | "TV" | "Radio";
  "Segmento / Categoria": string;
  "Circuito / Programa": string;
  "Formato da Exibição": string;
  "Faixa Horária": string;
  "Duração (Segundos)": number;
  "Inserções Estimadas": number;
  "Preço Tabela Unitário (R$)": number;
  "Ativo (Sim/Não)": "Sim" | "Não";
  "Nome do Parceiro": string;
  "CNPJ do Parceiro": string;
  "Comissão Inquilino (%)": number | string;
  "Endereço Completo": string;
  "CEP": string;
  "Quantidade de Telas / Faces": number | string;
  "Orientação da Tela": "Horizontal" | "Vertical" | "Estático";
  "Resolução": string;
  "Observações Comerciais": string;
}

export const PRODUTOS_EXEMPLO_MODELO: ModeloProdutoRow[] = [
  {
    "Nome do Produto / Ponto": "Painel Digital de Rua — Av. Paulista / Centro",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Painéis Digitais de Rua",
    "Circuito / Programa": "Circuito Urbano Premium",
    "Formato da Exibição": "Vídeo 15s",
    "Faixa Horária": "06h às 24h",
    "Duração (Segundos)": 15,
    "Inserções Estimadas": 120,
    "Preço Tabela Unitário (R$)": 180.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "Digital Street Media",
    "CNPJ do Parceiro": "12.345.678/0001-90",
    "Comissão Inquilino (%)": 20.0,
    "Endereço Completo": "Av. Paulista, 1000, Bela Vista, São Paulo - SP",
    "CEP": "01310-100",
    "Quantidade de Telas / Faces": 4,
    "Orientação da Tela": "Vertical",
    "Resolução": "1080x1920",
    "Observações Comerciais": "Fluxo diário de mais de 80 mil pedestres e veículos.",
  },
  {
    "Nome do Produto / Ponto": "Front Light Rodoviário — Eixo Sul Km 12",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Front Lights",
    "Circuito / Programa": "Eixo Rodoviário Sul",
    "Formato da Exibição": "Estático Iluminado",
    "Faixa Horária": "24 horas",
    "Duração (Segundos)": 30,
    "Inserções Estimadas": 1,
    "Preço Tabela Unitário (R$)": 4500.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "Mídia Rodovias S.A.",
    "CNPJ do Parceiro": "98.765.432/0001-10",
    "Comissão Inquilino (%)": 20.0,
    "Endereço Completo": "Rodovia DF-001, Km 12, Brasília - DF",
    "CEP": "71000-000",
    "Quantidade de Telas / Faces": 1,
    "Orientação da Tela": "Horizontal",
    "Resolução": "3840x2160",
    "Observações Comerciais": "Iluminação LED de alta potência com visibilidade a mais de 300 metros.",
  },
  {
    "Nome do Produto / Ponto": "Telas em Transporte por App — Frota 150 Carros",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Telas em Transporte por Aplicativo",
    "Circuito / Programa": "Circuito Passageiros Premium",
    "Formato da Exibição": "Vídeo Interativo 15s",
    "Faixa Horária": "07h às 23h",
    "Duração (Segundos)": 15,
    "Inserções Estimadas": 800,
    "Preço Tabela Unitário (R$)": 95.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "RideMedia Ads",
    "CNPJ do Parceiro": "45.123.789/0001-55",
    "Comissão Inquilino (%)": 25.0,
    "Endereço Completo": "Circulação Metropolitana — DF e Entorno",
    "CEP": "",
    "Quantidade de Telas / Faces": 150,
    "Orientação da Tela": "Horizontal",
    "Resolução": "1920x1080",
    "Observações Comerciais": "Telas no encosto do passageiro com QR Code interativo para conversão.",
  },
  {
    "Nome do Produto / Ponto": "Telas em Elevadores Residenciais — Circuito Asa Sul",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Telas em Elevadores Residenciais",
    "Circuito / Programa": "Condomínios Residenciais A/B",
    "Formato da Exibição": "Vídeo + Conteúdo 10s",
    "Faixa Horária": "24 horas",
    "Duração (Segundos)": 10,
    "Inserções Estimadas": 450,
    "Preço Tabela Unitário (R$)": 65.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "Elevator Mídia Brasil",
    "CNPJ do Parceiro": "23.456.789/0001-01",
    "Comissão Inquilino (%)": 22.0,
    "Endereço Completo": "SQS 305 Bloco C, Asa Sul, Brasília - DF",
    "CEP": "70352-030",
    "Quantidade de Telas / Faces": 24,
    "Orientação da Tela": "Vertical",
    "Resolução": "1080x1920",
    "Observações Comerciais": "Excelente índice de retenção diária com moradores de alto poder aquisitivo.",
  },
  {
    "Nome do Produto / Ponto": "Painel em Ponto de Ônibus — Praça do Relógio",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Painéis em Pontos de Ônibus",
    "Circuito / Programa": "Mobiliário Urbano",
    "Formato da Exibição": "Mupi Digital 10s",
    "Faixa Horária": "05h às 23h",
    "Duração (Segundos)": 10,
    "Inserções Estimadas": 300,
    "Preço Tabela Unitário (R$)": 110.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "Urban Point OOH",
    "CNPJ do Parceiro": "34.567.890/0001-23",
    "Comissão Inquilino (%)": 20.0,
    "Endereço Completo": "Praça do Relógio, Taguatinga - DF",
    "CEP": "72010-010",
    "Quantidade de Telas / Faces": 2,
    "Orientação da Tela": "Vertical",
    "Resolução": "1080x1920",
    "Observações Comerciais": "Ponto de grande circulação com visão frontal para a parada de transporte coletivo.",
  },
  {
    "Nome do Produto / Ponto": "Adesivagem de Banca de Jornal — SCS Quadra 4",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Adesivagem de Bancas de Jornal",
    "Circuito / Programa": "Bancas Centrais",
    "Formato da Exibição": "Envelopamento Total",
    "Faixa Horária": "Mensal",
    "Duração (Segundos)": 30,
    "Inserções Estimadas": 1,
    "Preço Tabela Unitário (R$)": 3200.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "Bancas & Mídia Urbana",
    "CNPJ do Parceiro": "56.789.012/0001-34",
    "Comissão Inquilino (%)": 18.0,
    "Endereço Completo": "SCS Quadra 4, Asa Sul, Brasília - DF",
    "CEP": "70304-000",
    "Quantidade de Telas / Faces": 1,
    "Orientação da Tela": "Estático",
    "Resolução": "",
    "Observações Comerciais": "Adesivação em 3 faces com película vinílica brilhante anti-risco.",
  },
  {
    "Nome do Produto / Ponto": "Telas em Restaurantes & Barbearias — Gourmet Style",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Telas em Restaurantes e Barbearias",
    "Circuito / Programa": "Circuito Gourmet & Lifestyle",
    "Formato da Exibição": "Vídeo 15s",
    "Faixa Horária": "11h às 23h",
    "Duração (Segundos)": 15,
    "Inserções Estimadas": 180,
    "Preço Tabela Unitário (R$)": 80.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "Lifestyle Screens TV",
    "CNPJ do Parceiro": "67.890.123/0001-45",
    "Comissão Inquilino (%)": 25.0,
    "Endereço Completo": "CLN 405 Bloco B, Asa Norte, Brasília - DF",
    "CEP": "70846-510",
    "Quantidade de Telas / Faces": 30,
    "Orientação da Tela": "Horizontal",
    "Resolução": "1920x1080",
    "Observações Comerciais": "Tempo de permanência médio de 45 minutos no local.",
  },
  {
    "Nome do Produto / Ponto": "Painel de LED Shopping — Praça de Alimentação",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Painéis em Shoppings",
    "Circuito / Programa": "Mall Digital Boulevard",
    "Formato da Exibição": "LED Curvo 15s",
    "Faixa Horária": "10h às 22h",
    "Duração (Segundos)": 15,
    "Inserções Estimadas": 200,
    "Preço Tabela Unitário (R$)": 250.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "Mall Media Displays",
    "CNPJ do Parceiro": "78.901.234/0001-56",
    "Comissão Inquilino (%)": 20.0,
    "Endereço Completo": "STN Cj. J, Asa Norte, Brasília - DF",
    "CEP": "70770-100",
    "Quantidade de Telas / Faces": 1,
    "Orientação da Tela": "Horizontal",
    "Resolução": "3840x2160",
    "Observações Comerciais": "Localizado no ponto central de maior fluxo da praça de alimentação.",
  },
  {
    "Nome do Produto / Ponto": "Espaço Comercial e Totem — Hotel Royal Lobby",
    "Tipo de Mídia": "DOOH",
    "Segmento / Categoria": "Espaços Comerciais em Shoppings e Hotéis",
    "Circuito / Programa": "Hospitalidade & Luxo",
    "Formato da Exibição": "Totem Touch + Stand",
    "Faixa Horária": "24 horas",
    "Duração (Segundos)": 30,
    "Inserções Estimadas": 100,
    "Preço Tabela Unitário (R$)": 1800.0,
    "Ativo (Sim/Não)": "Sim",
    "Nome do Parceiro": "Hotel Lounge Media",
    "CNPJ do Parceiro": "89.012.345/0001-67",
    "Comissão Inquilino (%)": 20.0,
    "Endereço Completo": "SHTN Trecho 1, Setor Hoteleiro Norte, Brasília - DF",
    "CEP": "70800-200",
    "Quantidade de Telas / Faces": 2,
    "Orientação da Tela": "Vertical",
    "Resolução": "1080x1920",
    "Observações Comerciais": "Totem interativo e espaço físico para promotores ou degustação.",
  },
];

export const INSTRUCOES_MODELO = [
  { "Campo / Coluna": "Nome do Produto / Ponto", "Obrigatório": "SIM", "Exemplo": "Painel Digital de Rua — Av. Paulista", "Descrição": "Nome identificador do produto de mídia ou ponto de veiculação." },
  { "Campo / Coluna": "Tipo de Mídia", "Obrigatório": "SIM", "Exemplo": "DOOH, TV, Radio", "Descrição": "Classificação da mídia. Para painéis, telas e out-of-home, use sempre DOOH." },
  { "Campo / Coluna": "Segmento / Categoria", "Obrigatório": "Recomendado", "Exemplo": "Painéis Digitais de Rua, Front Lights, Telas em Elevadores", "Descrição": "Categoria do produto de mídia para filtros e relatórios." },
  { "Campo / Coluna": "Circuito / Programa", "Obrigatório": "Opcional", "Exemplo": "Circuito Urbano Premium / Bom Dia DF", "Descrição": "Nome do circuito de telas ou programa de veiculação." },
  { "Campo / Coluna": "Formato da Exibição", "Obrigatório": "Opcional", "Exemplo": "Vídeo 15s / Spot 30s / Estático", "Descrição": "Especificação do formato do material publicitário." },
  { "Campo / Coluna": "Faixa Horária", "Obrigatório": "Opcional", "Exemplo": "06h às 24h / 24 horas", "Descrição": "Horário de funcionamento e exibição." },
  { "Campo / Coluna": "Duração (Segundos)", "Obrigatório": "Recomendado", "Exemplo": "15", "Descrição": "Tempo em segundos de cada inserção (número inteiro)." },
  { "Campo / Coluna": "Inserções Estimadas", "Obrigatório": "Recomendado", "Exemplo": "120", "Descrição": "Quantidade de exibições previstas no período." },
  { "Campo / Coluna": "Preço Tabela Unitário (R$)", "Obrigatório": "SIM", "Exemplo": "180.00", "Descrição": "Valor de tabela ou custo unitário da inserção/espaço." },
  { "Campo / Coluna": "Ativo (Sim/Não)", "Obrigatório": "Recomendado", "Exemplo": "Sim", "Descrição": "Define se o produto já entra ativo para negociação comercial." },
  { "Campo / Coluna": "Nome do Parceiro", "Obrigatório": "Opcional", "Exemplo": "Digital Street Media Ltda", "Descrição": "Nome da empresa parceira detentora do inventário." },
  { "Campo / Coluna": "CNPJ do Parceiro", "Obrigatório": "Opcional", "Exemplo": "12.345.678/0001-90", "Descrição": "CNPJ do parceiro para vínculo automático de faturamento." },
  { "Campo / Coluna": "Comissão Inquilino (%)", "Obrigatório": "Recomendado", "Exemplo": "20.0", "Descrição": "Percentual de comissão devido ao inquilino pela comercialização." },
  { "Campo / Coluna": "Endereço Completo", "Obrigatório": "Recomendado", "Exemplo": "Av. Paulista, 1000, São Paulo - SP", "Descrição": "Localização física do ponto para o mapa e geolocalização." },
  { "Campo / Coluna": "CEP", "Obrigatório": "Recomendado", "Exemplo": "01310-100", "Descrição": "CEP para preenchimento automático de coordenadas e endereço." },
  { "Campo / Coluna": "Quantidade de Telas / Faces", "Obrigatório": "Opcional", "Exemplo": "4", "Descrição": "Número de faces ou monitores vinculados ao produto." },
  { "Campo / Coluna": "Orientação da Tela", "Obrigatório": "Opcional", "Exemplo": "Vertical / Horizontal / Estático", "Descrição": "Disposição física da tela." },
  { "Campo / Coluna": "Resolução", "Obrigatório": "Opcional", "Exemplo": "1080x1920", "Descrição": "Resolução recomendada para as peças de arte/vídeo." },
  { "Campo / Coluna": "Observações Comerciais", "Obrigatório": "Opcional", "Exemplo": "Fluxo intenso de pedestres", "Descrição": "Destaques comerciais, diferenciais ou regras de veiculação." },
];

/**
 * Gera e realiza o download no navegador do arquivo Excel estruturado com múltiplas abas
 */
export function downloadModeloProdutosExcel(nomeArquivo = "modelo-importacao-produtos-cliente.xlsx") {
  const wb = XLSX.utils.book_new();

  // Aba 1: Dados e Exemplos dos Produtos
  const wsDados = XLSX.utils.json_to_sheet(PRODUTOS_EXEMPLO_MODELO);
  
  // Ajuste de largura das colunas da Aba 1
  wsDados["!cols"] = [
    { wch: 40 }, // Nome do Produto
    { wch: 15 }, // Tipo de Mídia
    { wch: 32 }, // Segmento / Categoria
    { wch: 28 }, // Circuito / Programa
    { wch: 22 }, // Formato da Exibição
    { wch: 16 }, // Faixa Horária
    { wch: 18 }, // Duração (Segundos)
    { wch: 20 }, // Inserções Estimadas
    { wch: 24 }, // Preço Tabela Unitário (R$)
    { wch: 16 }, // Ativo (Sim/Não)
    { wch: 26 }, // Nome do Parceiro
    { wch: 22 }, // CNPJ do Parceiro
    { wch: 22 }, // Comissão Inquilino (%)
    { wch: 45 }, // Endereço Completo
    { wch: 14 }, // CEP
    { wch: 26 }, // Quantidade de Telas / Faces
    { wch: 20 }, // Orientação da Tela
    { wch: 16 }, // Resolução
    { wch: 45 }, // Observações Comerciais
  ];

  XLSX.utils.book_append_sheet(wb, wsDados, "Produtos_Inventario");

  // Aba 2: Manual de Preenchimento das Colunas
  const wsInstrucoes = XLSX.utils.json_to_sheet(INSTRUCOES_MODELO);
  wsInstrucoes["!cols"] = [
    { wch: 28 }, // Campo / Coluna
    { wch: 14 }, // Obrigatório
    { wch: 40 }, // Exemplo
    { wch: 65 }, // Descrição
  ];

  XLSX.utils.book_append_sheet(wb, wsInstrucoes, "Instrucoes_e_Campos");

  // Exportar e acionar download no navegador
  XLSX.writeFile(wb, nomeArquivo);
}
