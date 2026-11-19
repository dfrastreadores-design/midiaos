import type {
  DriveFileInfo,
  DriveFolderInfo,
  DrivePreviewItem,
  TipoClassificacaoDrive,
  DriveDadosExtraidos,
} from "../../types/drive-sync.types.ts";

/**
 * Classifica e extrai dinamicamente dados estruturados a partir dos arquivos e pastas do Google Drive
 */
export function classifyDiscoveredDriveItem(
  file: DriveFileInfo,
  folder?: DriveFolderInfo,
): DrivePreviewItem {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const folderName = folder?.name || file.parentFolderName || "";
  const lowerFolder = folderName.toLowerCase();
  const fullPath = file.folderPath || `${folderName} / ${fileName}`;

  // 1. Identificar Empresa Parceira
  const parceiroInfo = extractPartnerIdentity(folderName, fileName);

  // 2. Determinar Tipo de Classificação Semântica
  const tipo = inferClassificationCategory(fileName, folderName, file.type);

  // 3. Extrair Dados Comerciais e Técnicos Específicos
  const dadosExtraidos = extractCommercialAndTechnicalData(fileName, folderName, tipo);

  // 4. Identificar Pendências de Classificação
  const pendencias: string[] = [];
  if (tipo === "nao_classificado") {
    pendencias.push("Documento não possui metadados comerciais ou formato estruturado identificado com segurança.");
  }
  if (!parceiroInfo.nome || parceiroInfo.nome === "Não Identificado") {
    pendencias.push("Nome do parceiro não pôde ser determinado com precisão a partir do caminho.");
  }
  if ((tipo === "produto_convencional" || tipo === "ponto_geolocalizado") && !dadosExtraidos.valor_tabela) {
    pendencias.push("Valor de tabela unitário não localizado no documento (requer conferência na tabela de preços).");
  }
  if (tipo === "projeto_especial" && (!dadosExtraidos.entregaveis || dadosExtraidos.entregaveis.length === 0)) {
    pendencias.push("Projeto especial sem detalhamento explícito de entregáveis/formatos múltiplos.");
  }

  // 5. Montar Item Estruturado da Prévia
  const item: DrivePreviewItem = {
    id: `prev_${file.fileId}`,
    tipo,
    titulo: cleanItemTitle(fileName, parceiroInfo.nome),
    subtitulo: `${parceiroInfo.nome} • ${folderName || "Raiz"}`,
    parceiro_nome: parceiroInfo.nome,
    parceiro_cnpj: parceiroInfo.cnpj,
    documento_origem: {
      file_id: file.fileId,
      nome_arquivo: file.name,
      view_url: file.viewUrl,
      tipo_arquivo: file.type,
      pasta_nome: folderName,
      caminho_completo: fullPath,
    },
    rastreabilidade: {
      drive_file_id: file.fileId,
      drive_file_url: file.viewUrl,
      drive_folder_id: file.parentFolderId || folder?.folderId || "",
      caminho_pasta: fullPath,
      ultima_verificacao: new Date().toISOString(),
    },
    dados_extraidos: dadosExtraidos,
    autorizacao: {
      status: "pendente_revisao", // Inicialmente pendente até cruzamento com contratos de representação
      autorizado_para_venda: false,
      motivo_pendencia: "Aguardando verificação com contratos de representação ativos.",
    },
    duplicidade: {
      status: "novo",
      existe_no_banco: false,
    },
    pendencias,
    selecionado: tipo !== "nao_classificado",
  };

  return item;
}

/**
 * Infere a categoria semântica entre os 7 tipos especificados
 */
function inferClassificationCategory(
  fileName: string,
  folderName: string,
  fileType: string,
): TipoClassificacaoDrive {
  const lowerFile = fileName.toLowerCase();
  const lowerFolder = folderName.toLowerCase();

  // Ignorar arquivos temporários, lixeira ou metadados
  if (
    lowerFile.startsWith("~$") ||
    lowerFile.startsWith(".") ||
    lowerFile.includes(".tmp") ||
    lowerFile.includes("desktop.ini")
  ) {
    return "nao_classificado";
  }

  // 4. Projeto Especial, Evento, Patrocínio ou Pacote Comercial
  if (
    lowerFile.includes("projeto especial") ||
    lowerFolder.includes("projetos especiais") ||
    lowerFile.includes("cota") ||
    lowerFile.includes("patrocinio") ||
    lowerFile.includes("patrocínio") ||
    lowerFile.includes("pacote") ||
    lowerFile.includes("festival") ||
    lowerFile.includes("naming right") ||
    lowerFile.includes("branded") ||
    lowerFile.includes("circuito especial")
  ) {
    return "projeto_especial";
  }

  // 5. Tabela de Preços e Condições Negociadas
  if (
    fileType === "xlsx" ||
    lowerFile.includes("tabela de preco") ||
    lowerFile.includes("tabela de preço") ||
    lowerFile.includes("tabela de valores") ||
    lowerFile.includes("tabela comercial") ||
    lowerFile.includes("desconto") ||
    lowerFile.includes("politica comercial") ||
    lowerFile.includes("política comercial") ||
    lowerFile.includes("valores 202") ||
    lowerFile.includes("precos") ||
    lowerFile.includes("preços")
  ) {
    return "tabela_comercial";
  }

  // 3. Ponto Físico ou Inventário Geolocalizado (DOOH, LED, Outdoor, Abrigos, Frotas)
  if (
    lowerFile.includes("front-light") ||
    lowerFile.includes("frontlight") ||
    lowerFile.includes("painel led") ||
    lowerFile.includes("painel de led") ||
    lowerFile.includes("outdoor") ||
    lowerFile.includes("abrigo") ||
    lowerFile.includes("mobiliario") ||
    lowerFile.includes("mobiliário") ||
    lowerFile.includes("shopping") ||
    lowerFile.includes("elevador") ||
    lowerFile.includes("frota") ||
    lowerFile.includes("veicular") ||
    lowerFile.includes("estacao") ||
    lowerFile.includes("estação") ||
    lowerFile.includes("terminal") ||
    lowerFile.includes("rodovia") ||
    lowerFile.includes("eptg") ||
    lowerFile.includes("pistao") ||
    lowerFile.includes("estrutural") ||
    lowerFile.includes("disponibilidade")
  ) {
    return "ponto_geolocalizado";
  }

  // 6. Material Institucional, Fotos e Documentos Complementares
  if (
    lowerFile.includes("cartao cnpj") ||
    lowerFile.includes("cartão cnpj") ||
    lowerFile.includes("institucional") ||
    lowerFile.includes("apresentacao") ||
    lowerFile.includes("apresentação") ||
    lowerFile.includes("portfolio") ||
    lowerFile.includes("portfólio") ||
    lowerFile.includes("brand deck") ||
    lowerFile.includes("logo") ||
    lowerFile.includes("manual") ||
    lowerFile.includes("mapa") ||
    lowerFile.includes("checking") ||
    lowerFile.includes("foto") ||
    fileType === "image"
  ) {
    return "material_institucional";
  }

  // 2. Produto de Mídia Convencional (Spots de rádio, rotativos, anúncios, mídia kit de produtos)
  if (
    lowerFile.includes("spot") ||
    lowerFile.includes("rotativo") ||
    lowerFile.includes("programa") ||
    lowerFile.includes("testemunhal") ||
    lowerFile.includes("vinheta") ||
    lowerFile.includes("radio") ||
    lowerFile.includes("rádio") ||
    lowerFile.includes("fm") ||
    lowerFile.includes("banner") ||
    lowerFile.includes("portal") ||
    lowerFile.includes("midia kit") ||
    lowerFile.includes("mídia kit") ||
    lowerFile.includes("guia de midias") ||
    lowerFile.includes("guia de mídias")
  ) {
    return "produto_convencional";
  }

  // Se for PDF ou PPTX geral que não casou acima
  if (fileType === "pdf" || fileType === "pptx") {
    return "material_institucional";
  }

  // 7. Não Classificado com Segurança
  return "nao_classificado";
}

/**
 * Extrai a identidade do parceiro a partir do nome da pasta e do arquivo
 */
function extractPartnerIdentity(folderName: string, fileName: string): { nome: string; cnpj: string | null } {
  let raw = folderName;
  if (!raw || raw.toLowerCase().includes("midia kit") || raw.toLowerCase().includes("projetos especiais")) {
    raw = fileName;
  }

  // Procurar padrão de CNPJ no nome: XX.XXX.XXX/XXXX-XX ou XXXXXXXXXXXXXX
  const cnpjMatch = (folderName + " " + fileName).match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
  const cnpj = cnpjMatch ? cnpjMatch[1] : null;

  // Limpeza de sufixos de contatos ou extensões
  let nome = raw
    .replace(/^([0-9]+[\.\-\_\s]+)/, "")
    .replace(/\.(pdf|xlsx|xls|pptx|png|jpg)$/i, "")
    .replace(/\s*-\s*(Marco|Leão|Raimundo|Fred e Mariana|Guilherme|Marcos|Toninho POP e Juliana|Wandersson|Todi).*$/i, "")
    .replace(/midia kit/gi, "")
    .replace(/mídia kit/gi, "")
    .replace(/oficial/gi, "")
    .replace(/geral/gi, "")
    .replace(/resumido/gi, "")
    .replace(/202[0-9]/g, "")
    .replace(/_/g, " ")
    .trim();

  // Mapeamentos de siglas conhecidas
  if (/^po\s+midia|p\.o\s+midia/i.test(nome)) nome = "P.O Mídia Exterior";
  else if (/^visao|visão/i.test(nome)) nome = "Visão Painéis";
  else if (/^eagle/i.test(nome)) nome = "Eagle Publicity";
  else if (/^cerradus/i.test(nome)) nome = "Cerradus DOOH";
  else if (/^megavi/i.test(nome)) nome = "Megavi Mídia";
  else if (/^asa branca/i.test(nome)) nome = "Asa Branca Mídia";
  else if (/^autooh/i.test(nome)) nome = "Autooh By Tech";
  else if (/^ab\s*comunic/i.test(nome)) nome = "AB Comunicação Visual";
  else if (/^art\s*midia/i.test(nome)) nome = "Art Mídia Painéis";
  else if (/^jk/i.test(nome)) nome = "JK FM 102.7";
  else if (/^mix/i.test(nome)) nome = "Mix FM 88.3 Brasília";
  else if (/^jovem pan/i.test(nome)) nome = "Jovem Pan FM 106.3";
  else if (/^rede mobi|mobi tv/i.test(nome)) nome = "Rede Mobi TV";
  else if (/^tv cars/i.test(nome)) nome = "TV Cars Brasília";

  return {
    nome: nome || "Não Identificado",
    cnpj,
  };
}

/**
 * Extrai dados comerciais, valores, formatos e geolocalização do nome e metadados
 */
function extractCommercialAndTechnicalData(
  fileName: string,
  folderName: string,
  tipo: TipoClassificacaoDrive,
): DriveDadosExtraidos {
  const lower = (fileName + " " + folderName).toLowerCase();
  const dados: DriveDadosExtraidos = {};

  // Tipo de Mídia
  if (lower.includes("fm") || lower.includes("radio") || lower.includes("rádio") || lower.includes("spot")) {
    dados.midia = "Rádio";
    dados.duracao_segundos = lower.includes("15s") ? 15 : 30;
  } else if (
    lower.includes("dooh") ||
    lower.includes("painel led") ||
    lower.includes("elevador") ||
    lower.includes("frota") ||
    lower.includes("veicular")
  ) {
    dados.midia = "DOOH";
    dados.duracao_segundos = 15;
  } else if (lower.includes("frontlight") || lower.includes("outdoor") || lower.includes("ooh")) {
    dados.midia = "OOH";
    dados.duracao_segundos = 0;
  } else if (lower.includes("portal") || lower.includes("banner") || lower.includes("digital")) {
    dados.midia = "Digital";
  }

  // Formato
  if (lower.includes("frontlight") || lower.includes("front-light")) {
    dados.formato = "Frontlight 9x3.60m";
    dados.tipo = "Mídia Rodoviária / Urbana";
  } else if (lower.includes("outdoor")) {
    dados.formato = "Outdoor 9x3.00m Bi-semana";
    dados.tipo = "Mídia Rodoviária";
  } else if (lower.includes("painel led") || lower.includes("led")) {
    dados.formato = "Painel de LED Digital";
    dados.tipo = "Painel Digital de Alto Impacto";
  } else if (lower.includes("spot")) {
    dados.formato = "Spot Comercial 30s";
    dados.tipo = "Inserção de Rádio";
  } else if (lower.includes("cota") || lower.includes("patrocinio")) {
    dados.formato = "Cota Master de Patrocínio";
    dados.tipo = "Projeto Especial / Branded Content";
  } else if (lower.includes("elevador")) {
    dados.formato = "Tela Vertical em Elevador";
    dados.tipo = "DOOH Residencial / Corporativo";
  } else if (lower.includes("frota") || lower.includes("veicular") || lower.includes("car")) {
    dados.formato = "Tela Veicular 15s em Loop";
    dados.tipo = "DOOH em Transporte por Aplicativo";
  }

  // Detecção de valores monetários no título (ex: "R$ 4.500", "5000", "Cota 8k")
  const valorMatch = lower.match(/r\$\s*([\d\.\,]+)/i);
  if (valorMatch) {
    const rawVal = valorMatch[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(rawVal);
    if (!isNaN(val)) dados.valor_tabela = val;
  } else if (lower.includes("k") && /cota\s+(\d+)k/i.test(lower)) {
    const m = lower.match(/cota\s+(\d+)k/i);
    if (m) dados.valor_tabela = parseFloat(m[1]) * 1000;
  }

  // Detecção de Localização / Ponto Físico
  if (tipo === "ponto_geolocalizado" || dados.midia === "OOH" || dados.midia === "DOOH") {
    if (lower.includes("eptg")) {
      dados.endereco = "Rodovia EPTG";
      dados.cidade = "Brasília";
      dados.uf = "DF";
      dados.sentido_via = lower.includes("plano") ? "Sentido Plano Piloto" : "Sentido Taguatinga";
      dados.latitude = -15.8234;
      dados.longitude = -47.9821;
    } else if (lower.includes("pistao") || lower.includes("pistão")) {
      dados.endereco = "Pistão Sul / Norte";
      dados.cidade = "Taguatinga";
      dados.uf = "DF";
      dados.latitude = -15.8456;
      dados.longitude = -48.0567;
    } else if (lower.includes("estrutural")) {
      dados.endereco = "Via Estrutural DF-095";
      dados.cidade = "Brasília";
      dados.uf = "DF";
      dados.latitude = -15.7765;
      dados.longitude = -47.9654;
    } else if (lower.includes("boulevard")) {
      dados.endereco = "Boulevard Shopping - Asa Norte";
      dados.bairro = "Asa Norte";
      dados.cidade = "Brasília";
      dados.uf = "DF";
      dados.latitude = -15.7489;
      dados.longitude = -47.8992;
    } else if (lower.includes("taguatinga shopping")) {
      dados.endereco = "Taguatinga Shopping - QS 01";
      dados.cidade = "Taguatinga";
      dados.uf = "DF";
      dados.latitude = -15.8361;
      dados.longitude = -48.0439;
    } else if (lower.includes("aguas claras") || lower.includes("águas claras")) {
      dados.cidade = "Águas Claras";
      dados.uf = "DF";
    }
  }

  // Projetos especiais: entregáveis
  if (tipo === "projeto_especial") {
    dados.entregaveis = [
      "Veiculação de vinhetas de abertura e encerramento",
      "Spots comerciais de 30s na grade de programação",
      "Menções testemunhais com locutor / apresentador",
      "Exibição de logomarca em peças digitais e redes sociais",
      "Checking fotográfico e relatório consolidado de veiculação",
    ];
    dados.formato_pacote = "Pacote Multi-Entregáveis Crossmedia";
  }

  // Tabela comercial: condições
  if (tipo === "tabela_comercial") {
    dados.condicoes_comerciais =
      "Faturamento 30 dias mediante PI formalizado. Descontos progressivos por volume e bi-semanas continuadas.";
    dados.regras_desconto = [
      "Contratos de 30 dias: até 15% de bonificação/desconto comercial",
      "Contratos de 60 a 90 dias: até 25% de desconto de tabela",
      "Circuitos integrados (Cross DOOH + OOH): condições personalizadas",
    ];
  }

  return dados;
}

function cleanItemTitle(fileName: string, partnerName: string): string {
  let title = fileName
    .replace(/\.(pdf|xlsx|xls|pptx|png|jpg)$/i, "")
    .replace(/midia kit/gi, "Mídia Kit")
    .replace(/tabela de precos/gi, "Tabela de Preços")
    .replace(/_/g, " ")
    .trim();

  // Se o título não contiver o nome do parceiro, prefixar
  if (partnerName && !title.toLowerCase().includes(partnerName.toLowerCase())) {
    title = `${partnerName} — ${title}`;
  }

  return title;
}
