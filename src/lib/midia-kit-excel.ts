import * as XLSX from "xlsx";
import type { ProdutoExtraidoMidiaKit } from "./midia-kit-ai.functions";

export interface CampoAlterado {
  campo: string;
  rotulo: string;
  valorAntigo: any;
  valorNovo: any;
}

export interface AlteracaoProdutoPlanilha {
  id_temp: string;
  nomeProduto: string;
  camposAlterados: CampoAlterado[];
}

export interface ErroLinhaPlanilha {
  linha: number;
  coluna: string;
  mensagem: string;
  valorInvalido?: any;
}

export interface ResultadoValidacaoPlanilha {
  totalLinhas: number;
  linhasValidas: number;
  linhasComErro: number;
  erros: ErroLinhaPlanilha[];
  alteracoes: AlteracaoProdutoPlanilha[];
  produtosAtualizados: ProdutoExtraidoMidiaKit[];
  podeAplicar: boolean;
}

/**
 * Exporta a grade de produtos extraídos para Excel (.xlsx) ou CSV,
 * contendo um identificador estável de importação (id_temp) e todos os campos editáveis.
 */
export function exportarProdutosMidiaKitExcel(
  produtos: ProdutoExtraidoMidiaKit[],
  nomeParceiro: string = "Parceiro",
  formato: "xlsx" | "csv" = "xlsx",
): void {
  const dados = produtos.map((p, idx) => ({
    ID_IMPORTACAO: p.id_temp,
    NUMERO: idx + 1,
    NOME_PRODUTO: p.nome || "",
    MIDIA: p.midia || "DOOH",
    TIPO_FORMATO: p.tipo || "",
    CATEGORIA_MIDIA: p.categoria_midia || "",
    TIPO_COBRANCA: p.tipo_cobranca || "insercao",
    PRECO_BRUTO_TABELA: Number(p.valor_unit) || 0,
    DURACAO_SEGUNDOS: p.duracao_segundos ?? 30,
    INSERCOES_PADRAO: p.insercoes_padrao ?? 1,
    CIDADE: p.cidade || "",
    UF: p.estado || "",
    REGIAO_ADMINISTRATIVA: p.regiao_administrativa || "",
    BAIRRO: p.bairro || "",
    ENDERECO_PONTO: p.endereco || "",
    PONTO_REFERENCIA: p.ponto_referencia || "",
    PRECISAO_GEO: p.precisao_geo || (p.latitude != null ? "exata" : p.cidade ? "cidade_uf" : "pendente"),
    LATITUDE: p.latitude != null ? p.latitude : "",
    LONGITUDE: p.longitude != null ? p.longitude : "",
    LINK_MAPS: p.link_maps || "",
    STATUS_REVISAO: p.status_validacao || "extraido",
    STATUS_OPERACIONAL: p.status_operacional || "disponivel",
    SLIDE_PAGINA_ORIGEM: p.origem?.pagina_ou_slide ?? "",
    FOTOS_QUANTIDADE: p.fotos?.length || 0,
    FOTOS_URLS: (p.fotos || []).join(" ; "),
    OBSERVACOES: p.observacao || "",
    DETALHES_VENDA: p.detalhes_venda || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(dados);

  // Ajuste visual de largura de colunas
  worksheet["!cols"] = [
    { wch: 22 }, // ID_IMPORTACAO
    { wch: 8 },  // NUMERO
    { wch: 35 }, // NOME_PRODUTO
    { wch: 14 }, // MIDIA
    { wch: 22 }, // TIPO_FORMATO
    { wch: 20 }, // CATEGORIA_MIDIA
    { wch: 16 }, // TIPO_COBRANCA
    { wch: 20 }, // PRECO_BRUTO_TABELA
    { wch: 18 }, // DURACAO_SEGUNDOS
    { wch: 18 }, // INSERCOES_PADRAO
    { wch: 20 }, // CIDADE
    { wch: 6 },  // UF
    { wch: 22 }, // REGIAO_ADMINISTRATIVA
    { wch: 20 }, // BAIRRO
    { wch: 35 }, // ENDERECO_PONTO
    { wch: 30 }, // PONTO_REFERENCIA
    { wch: 16 }, // PRECISAO_GEO
    { wch: 14 }, // LATITUDE
    { wch: 14 }, // LONGITUDE
    { wch: 30 }, // LINK_MAPS
    { wch: 18 }, // STATUS_REVISAO
    { wch: 18 }, // STATUS_OPERACIONAL
    { wch: 18 }, // SLIDE_PAGINA_ORIGEM
    { wch: 16 }, // FOTOS_QUANTIDADE
    { wch: 40 }, // FOTOS_URLS
    { wch: 35 }, // OBSERVACOES
    { wch: 35 }, // DETALHES_VENDA
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos_MidiaKit");

  const sanitized = nomeParceiro.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const dataIso = new Date().toISOString().slice(0, 10);
  const ext = formato === "csv" ? "csv" : "xlsx";
  const filename = `MidiaKit_Produtos_${sanitized}_${dataIso}.${ext}`;

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    XLSX.writeFile(workbook, filename, { bookType: ext });
  }

  return XLSX.write(workbook, { type: "buffer", bookType: ext });
}

/**
 * Lê e valida uma planilha de produtos retornada pelo usuário com correções.
 * Realiza validação por linha e coluna, casamento por ID estável de importação,
 * e gera um relatório detalhado de alterações para prévia antes de aplicar.
 */
export async function parsePlanilhaCorrigidaMidiaKit(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array | { arrayBuffer: () => Promise<ArrayBuffer> },
  produtosAtuais: ProdutoExtraidoMidiaKit[],
): Promise<ResultadoValidacaoPlanilha> {
  let buffer: any;
  if (fileOrBuffer instanceof ArrayBuffer || fileOrBuffer instanceof Uint8Array || Buffer.isBuffer(fileOrBuffer)) {
    buffer = fileOrBuffer;
  } else if (fileOrBuffer && typeof (fileOrBuffer as any).arrayBuffer === "function") {
    buffer = await (fileOrBuffer as any).arrayBuffer();
  } else {
    buffer = fileOrBuffer;
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      totalLinhas: 0,
      linhasValidas: 0,
      linhasComErro: 1,
      erros: [{ linha: 1, coluna: "Planilha", mensagem: "A planilha enviada não contém nenhuma aba de dados." }],
      alteracoes: [],
      produtosAtualizados: [...produtosAtuais],
      podeAplicar: false,
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    return {
      totalLinhas: 0,
      linhasValidas: 0,
      linhasComErro: 1,
      erros: [{ linha: 1, coluna: "Linhas", mensagem: "A planilha está vazia ou não possui linhas de dados." }],
      alteracoes: [],
      produtosAtualizados: [...produtosAtuais],
      podeAplicar: false,
    };
  }

  const produtosMap = new Map<string, ProdutoExtraidoMidiaKit>();
  produtosAtuais.forEach((p) => {
    produtosMap.set(p.id_temp, { ...p });
  });

  const erros: ErroLinhaPlanilha[] = [];
  const alteracoes: AlteracaoProdutoPlanilha[] = [];
  const produtosAtualizadosMap = new Map<string, ProdutoExtraidoMidiaKit>();
  produtosAtuais.forEach((p) => {
    produtosAtualizadosMap.set(p.id_temp, { ...p });
  });

  // Normalização de chaves da planilha (ignora maiúsculas/minúsculas e pontuação comum)
  function normalizarChave(k: string): string {
    return k
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "_");
  }

  rawRows.forEach((row, rowIdx) => {
    const numLinha = rowIdx + 2; // +1 cabeçalho, +1 base 1
    const rowNorm: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      rowNorm[normalizarChave(key)] = val;
    }

    // 1. Identificador estável de importação
    const idImportacao =
      rowNorm["ID_IMPORTACAO"] ||
      rowNorm["ID_TEMP"] ||
      rowNorm["ID"] ||
      rowNorm["CODIGO"];

    const nomeOriginal =
      rowNorm["NOME_PRODUTO"] ||
      rowNorm["PRODUTO"] ||
      rowNorm["NOME"] ||
      "";

    let targetProd: ProdutoExtraidoMidiaKit | undefined;

    if (idImportacao && produtosMap.has(String(idImportacao).trim())) {
      targetProd = produtosMap.get(String(idImportacao).trim());
    } else if (nomeOriginal) {
      // Casamento secundário por nome exato se não encontrar ID
      const matches = produtosAtuais.filter(
        (p) => p.nome.trim().toLowerCase() === String(nomeOriginal).trim().toLowerCase(),
      );
      if (matches.length === 1) {
        targetProd = matches[0];
      } else if (matches.length > 1) {
        erros.push({
          linha: numLinha,
          coluna: "NOME_PRODUTO",
          mensagem: `Múltiplos produtos possuem o mesmo nome "${nomeOriginal}". Use a coluna ID_IMPORTACAO para desambiguação.`,
          valorInvalido: nomeOriginal,
        });
        return;
      }
    }

    if (!targetProd) {
      erros.push({
        linha: numLinha,
        coluna: "ID_IMPORTACAO",
        mensagem: `Identificador "${idImportacao || nomeOriginal}" não corresponde a nenhum produto desta importação.`,
        valorInvalido: idImportacao || nomeOriginal,
      });
      return;
    }

    const prodId = targetProd.id_temp;
    const currentProd = produtosAtualizadosMap.get(prodId)!;
    const camposAlterados: CampoAlterado[] = [];

    // Helper para comparar e registrar alterações
    function registrarAlteracao(campo: keyof ProdutoExtraidoMidiaKit, rotulo: string, novoValor: any) {
      const antigo = currentProd[campo];
      const antigoStr = antigo === null || antigo === undefined ? "" : String(antigo).trim();
      const novoStr = novoValor === null || novoValor === undefined ? "" : String(novoValor).trim();

      if (antigoStr !== novoStr) {
        camposAlterados.push({
          campo: String(campo),
          rotulo,
          valorAntigo: antigo,
          valorNovo: novoValor,
        });
        (currentProd as any)[campo] = novoValor;
        currentProd.editado_manualmente = true;
      }
    }

    // 2. Validação e aplicação do Nome
    if (rowNorm["NOME_PRODUTO"] !== undefined && String(rowNorm["NOME_PRODUTO"]).trim().length > 0) {
      registrarAlteracao("nome", "Nome do Produto", String(rowNorm["NOME_PRODUTO"]).trim());
    }

    // 3. Validação do Preço Bruto / Tabela Unitária
    const rawPreco =
      rowNorm["PRECO_BRUTO_TABELA"] !== undefined && rowNorm["PRECO_BRUTO_TABELA"] !== ""
        ? rowNorm["PRECO_BRUTO_TABELA"]
        : rowNorm["VALOR_UNIT"] !== undefined && rowNorm["VALOR_UNIT"] !== ""
        ? rowNorm["VALOR_UNIT"]
        : undefined;

    if (rawPreco !== undefined) {
      let numPreco = 0;
      if (typeof rawPreco === "number") {
        numPreco = rawPreco;
      } else {
        const clean = String(rawPreco)
          .replace(/[R$\s]/g, "")
          .replace(/\.(?=\d{3}(,|$))/g, "")
          .replace(",", ".");
        numPreco = parseFloat(clean);
      }

      if (isNaN(numPreco) || numPreco < 0) {
        erros.push({
          linha: numLinha,
          coluna: "PRECO_BRUTO_TABELA",
          mensagem: "Preço bruto deve ser um valor numérico válido maior ou igual a zero.",
          valorInvalido: rawPreco,
        });
      } else {
        registrarAlteracao("valor_unit", "Preço Bruto (R$)", numPreco);
      }
    }

    // 4. Mídia e Categoria
    if (rowNorm["MIDIA"] !== undefined && String(rowNorm["MIDIA"]).trim()) {
      registrarAlteracao("midia", "Tipo de Mídia", String(rowNorm["MIDIA"]).trim().toUpperCase());
    }
    if (rowNorm["CATEGORIA_MIDIA"] !== undefined) {
      registrarAlteracao("categoria_midia", "Categoria de Mídia", String(rowNorm["CATEGORIA_MIDIA"]).trim());
    }
    if (rowNorm["TIPO_FORMATO"] !== undefined || rowNorm["TIPO"] !== undefined) {
      const tipoVal = String(rowNorm["TIPO_FORMATO"] || rowNorm["TIPO"] || "").trim();
      registrarAlteracao("tipo", "Formato / Tipo", tipoVal);
    }
    if (rowNorm["TIPO_COBRANCA"] !== undefined) {
      registrarAlteracao("tipo_cobranca", "Unidade de Cobrança", String(rowNorm["TIPO_COBRANCA"]).trim());
    }

    // 5. Duração e Inserções
    if (rowNorm["DURACAO_SEGUNDOS"] !== undefined && rowNorm["DURACAO_SEGUNDOS"] !== "") {
      const dur = parseInt(String(rowNorm["DURACAO_SEGUNDOS"]), 10);
      if (isNaN(dur) || dur < 0) {
        erros.push({
          linha: numLinha,
          coluna: "DURACAO_SEGUNDOS",
          mensagem: "Duração em segundos deve ser um número inteiro positivo.",
          valorInvalido: rowNorm["DURACAO_SEGUNDOS"],
        });
      } else {
        registrarAlteracao("duracao_segundos", "Duração (s)", dur);
      }
    }
    if (rowNorm["INSERCOES_PADRAO"] !== undefined && rowNorm["INSERCOES_PADRAO"] !== "") {
      const ins = parseInt(String(rowNorm["INSERCOES_PADRAO"]), 10);
      if (isNaN(ins) || ins < 1) {
        erros.push({
          linha: numLinha,
          coluna: "INSERCOES_PADRAO",
          mensagem: "Inserções padrão devem ser pelo menos 1.",
          valorInvalido: rowNorm["INSERCOES_PADRAO"],
        });
      } else {
        registrarAlteracao("insercoes_padrao", "Inserções Padrão", ins);
      }
    }

    // 6. Localização: Cidade, UF, Região Administrativa, Bairro, Endereço
    if (rowNorm["CIDADE"] !== undefined) {
      registrarAlteracao("cidade", "Cidade", String(rowNorm["CIDADE"]).trim());
    }
    if (rowNorm["UF"] !== undefined && String(rowNorm["UF"]).trim()) {
      const ufStr = String(rowNorm["UF"]).trim().toUpperCase();
      if (ufStr.length !== 2) {
        erros.push({
          linha: numLinha,
          coluna: "UF",
          mensagem: "UF deve conter exatamente 2 letras (ex: DF, SP, RJ).",
          valorInvalido: rowNorm["UF"],
        });
      } else {
        registrarAlteracao("estado", "UF", ufStr);
      }
    }
    if (rowNorm["REGIAO_ADMINISTRATIVA"] !== undefined) {
      registrarAlteracao("regiao_administrativa", "Região Administrativa", String(rowNorm["REGIAO_ADMINISTRATIVA"]).trim());
    }
    if (rowNorm["BAIRRO"] !== undefined) {
      registrarAlteracao("bairro", "Bairro", String(rowNorm["BAIRRO"]).trim());
    }
    if (rowNorm["ENDERECO_PONTO"] !== undefined || rowNorm["ENDERECO"] !== undefined) {
      const endVal = String(rowNorm["ENDERECO_PONTO"] || rowNorm["ENDERECO"] || "").trim();
      registrarAlteracao("endereco", "Endereço", endVal);
    }
    if (rowNorm["PONTO_REFERENCIA"] !== undefined) {
      registrarAlteracao("ponto_referencia", "Ponto de Referência", String(rowNorm["PONTO_REFERENCIA"]).trim());
    }

    // 7. Coordenadas e Precisão Geo
    if (rowNorm["LATITUDE"] !== undefined && rowNorm["LATITUDE"] !== "") {
      const lat = parseFloat(String(rowNorm["LATITUDE"]));
      if (isNaN(lat) || lat < -90 || lat > 90) {
        erros.push({
          linha: numLinha,
          coluna: "LATITUDE",
          mensagem: "Latitude deve ser entre -90 e 90.",
          valorInvalido: rowNorm["LATITUDE"],
        });
      } else {
        registrarAlteracao("latitude", "Latitude", lat);
      }
    }
    if (rowNorm["LONGITUDE"] !== undefined && rowNorm["LONGITUDE"] !== "") {
      const lng = parseFloat(String(rowNorm["LONGITUDE"]));
      if (isNaN(lng) || lng < -180 || lng > 180) {
        erros.push({
          linha: numLinha,
          coluna: "LONGITUDE",
          mensagem: "Longitude deve ser entre -180 e 180.",
          valorInvalido: rowNorm["LONGITUDE"],
        });
      } else {
        registrarAlteracao("longitude", "Longitude", lng);
      }
    }
    if (rowNorm["LINK_MAPS"] !== undefined) {
      registrarAlteracao("link_maps", "Link Google Maps", String(rowNorm["LINK_MAPS"]).trim());
    }

    // Atualiza precisão geo baseada nas informações disponíveis
    if (currentProd.latitude != null && currentProd.longitude != null) {
      currentProd.precisao_geo = "exata";
    } else if (currentProd.cidade && currentProd.estado) {
      currentProd.precisao_geo = "cidade_uf";
    } else {
      currentProd.precisao_geo = "pendente";
    }

    // 8. Status de Revisão e Status Operacional
    if (rowNorm["STATUS_REVISAO"] !== undefined && String(rowNorm["STATUS_REVISAO"]).trim()) {
      registrarAlteracao("status_validacao", "Status de Revisão", String(rowNorm["STATUS_REVISAO"]).trim().toLowerCase());
    }
    if (rowNorm["STATUS_OPERACIONAL"] !== undefined && String(rowNorm["STATUS_OPERACIONAL"]).trim()) {
      registrarAlteracao("status_operacional", "Disponibilidade Operacional", String(rowNorm["STATUS_OPERACIONAL"]).trim().toLowerCase());
    }

    // 9. Fotos (URLs separadas por ponto e vírgula)
    if (rowNorm["FOTOS_URLS"] !== undefined && String(rowNorm["FOTOS_URLS"]).trim()) {
      const urls = String(rowNorm["FOTOS_URLS"])
        .split(/[;,]/)
        .map((u) => u.trim())
        .filter((u) => u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:image/"));
      if (urls.length > 0) {
        registrarAlteracao("fotos", "Fotografias", urls);
        currentProd.situacao_foto = "real_associada";
      }
    }

    if (camposAlterados.length > 0) {
      alteracoes.push({
        id_temp: prodId,
        nomeProduto: currentProd.nome,
        camposAlterados,
      });
    }
  });

  const linhasComErro = new Set(erros.map((e) => e.linha)).size;
  const linhasValidas = rawRows.length - linhasComErro;
  const produtosAtualizados = Array.from(produtosAtualizadosMap.values());

  return {
    totalLinhas: rawRows.length,
    linhasValidas,
    linhasComErro,
    erros,
    alteracoes,
    produtosAtualizados,
    podeAplicar: alteracoes.length > 0 && erros.length === 0,
  };
}
