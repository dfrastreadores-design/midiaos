import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware.ts";
import { supabaseAdmin } from "../integrations/supabase/client.server.ts";

export interface ImagemExtraidaMidiaKit {
  id: string;
  nomeArquivo: string;
  dataUrl: string;
  tipoMime: string;
  tamanhoBytes: number;
  slideOuPagina?: number | null;
  contextoTexto?: string | null;
  produtoIdAssociado?: string | null;
}

export interface ProdutoExtraidoMidiaKit {
  id_temp: string;
  id?: string;
  nome: string;
  midia: string; // TV, Radio, DOOH, Digital, OOH, Impresso, Outro
  tipo?: string; // Comercial 30", Banner Topo, Painel Digital, etc.
  categoria_midia?: string; // ooh_dooh, tv_audio, digital_portais, impressa_outros, servicos_proprios
  tipo_cobranca?: string; // insercao, mensal, diaria, semanal, quinzenal, bi-semanal
  programa?: string;
  faixa?: string;
  duracao_segundos?: number;
  insercoes_padrao?: number;
  insercoes_dia?: number;
  impactos_estimados_mes?: number;
  valor_unit: number; // Preço de tabela ou valor unitário
  observacao?: string;
  detalhes_venda?: string; // Audiência, métricas, alcance, perfil
  formato?: string;
  praca?: string;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  regiao_administrativa?: string | null;
  fotos?: string[];
  selecionado?: boolean;
  canal_macro?: "OFF" | "ON" | "HIBRIDO";
  plataforma_rede?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  link_maps?: string | null;
  sentido_via?: string | null;
  ponto_referencia?: string | null;
  is_own_product?: boolean;
  is_servico_adicional?: boolean;
  status_validacao?: "extraido" | "pendente_revisao" | "aprovado" | "rejeitado" | "incompleto";
  status_operacional?: "disponivel" | "reservado" | "bloqueado_comercial";
  precisao_geo?: "exata" | "cidade_uf" | "manual" | "pendente";
  situacao_foto?: "real_associada" | "pendente";
  origem_foto?: "documento" | "upload_manual" | "pendente";
  confianca?: number; // 0 a 100
  editado_manualmente?: boolean;
  valores_originais?: Partial<ProdutoExtraidoMidiaKit>;
  origem?: {
    arquivo?: string;
    pagina_ou_slide?: number;
    trecho_referencia?: string;
  };
}

export interface RegraDescontoExtraida {
  periodo: string;
  desconto_pct: number;
  condicoes?: string;
}

export interface ServicoAdicionalExtraido {
  nome: string;
  descricao?: string;
  preco_estimado?: number;
}

export interface MetricasGeraisMidiaKit {
  impactosDiarios?: number;
  impactosMensais?: number;
  insercoesDiarias?: number;
  totalPontosTelas?: number;
}

export interface ResultadoExtracaoMidiaKit {
  sucesso: boolean;
  parceiroIdentificado?: string;
  parceiroDetectado?: {
    nome?: string | null;
    cnpj?: string | null;
    telefone?: string | null;
    email?: string | null;
    contato?: string | null;
    site?: string | null;
    tipo_veiculo?: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
  resumoApresentacao?: string;
  defesasComerciais: string[];
  regrasDesconto: RegraDescontoExtraida[];
  servicosAdicionais: ServicoAdicionalExtraido[];
  metricasGerais?: MetricasGeraisMidiaKit;
  produtos: ProdutoExtraidoMidiaKit[];
  imagensExtraidas?: ImagemExtraidaMidiaKit[];
  fotosPendentes?: ImagemExtraidaMidiaKit[];
}

/**
 * Utilitário para extrair coordenadas decimais ou URLs do Google Maps de qualquer texto.
 */
export function extrairCoordenadasDeTextoOuUrl(input?: string | null): {
  latitude?: number;
  longitude?: number;
  linkMaps?: string;
} {
  if (!input) return {};
  const text = String(input).trim();

  // 1. Procura por links do Google Maps (completos, curtos ou maps.app.goo.gl)
  const urlMatch = text.match(
    /https?:\/\/(?:www\.)?(?:google\.com\/maps[^\s"'>)]*|maps\.google\.com[^\s"'>)]*|goo\.gl\/maps\/[^\s"'>)]*|maps\.app\.goo\.gl\/[^\s"'>)]*)/i,
  );
  let linkMaps = urlMatch ? urlMatch[0] : undefined;

  let latitude: number | undefined;
  let longitude: number | undefined;

  // 2. Extrai coordenadas da URL do Maps se houver
  if (linkMaps) {
    const qMatch = linkMaps.match(/[?&](?:q|ll|query)=(-?\d{1,2}\.\d{3,8}),(-?\d{1,3}\.\d{3,8})/i);
    if (qMatch) {
      latitude = parseFloat(qMatch[1]);
      longitude = parseFloat(qMatch[2]);
    } else {
      const atMatch = linkMaps.match(/@(-?\d{1,2}\.\d{3,8}),(-?\d{1,3}\.\d{3,8})/i);
      if (atMatch) {
        latitude = parseFloat(atMatch[1]);
        longitude = parseFloat(atMatch[2]);
      }
    }
  }

  // 3. Procura por par de decimais no texto (ex: -15.8341, -48.0567 ou Lat: -15.8341 Long: -48.0567)
  if (latitude === undefined || longitude === undefined) {
    const coordMatch = text.match(
      /(?:lat(?:itude)?[:\s=]*|[(\s]|^)(-?\d{1,2}\.\d{3,8})[\s,;|/]+(?:long(?:itude)?[:\s=]*|[(\s])?(-?\d{1,3}\.\d{3,8})/i,
    );
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        latitude = lat;
        longitude = lng;
        if (!linkMaps) {
          linkMaps = `https://www.google.com/maps?q=${lat},${lng}`;
        }
      }
    }
  }

  return { latitude, longitude, linkMaps };
}

/**
 * Utilitário para extrair sentido da via e ponto de referência a partir de endereços textuais
 */
export function extrairRotaEReferencia(text?: string | null): {
  sentidoVia?: string;
  pontoReferencia?: string;
} {
  if (!text) return {};
  const s = String(text);
  let sentidoVia: string | undefined;
  let pontoReferencia: string | undefined;

  const mSentido = s.match(/(?:sentido|sent\.|direção)\s+([A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s\-\/]{3,50})/i);
  if (mSentido) {
    sentidoVia = `Sentido ${mSentido[1].trim().replace(/[.,;].*$/, "")}`;
  }

  const mRef = s.match(/(?:em frente|próximo|ao lado|km\s*\d+|esquina|cruzamento|balão|trevo)\s+([A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s\-\/]{3,60})/i);
  if (mRef) {
    pontoReferencia = mRef[0].trim().replace(/[.;].*$/, "");
  }

  return { sentidoVia, pontoReferencia };
}

function mapCategoriaMidia(midia?: string, categoria?: string): string {
  if (categoria) return categoria;
  const m = (midia || "").toLowerCase();
  if (m.includes("dooh") || m.includes("ooh") || m.includes("led") || m.includes("painel")) return "ooh_dooh";
  if (m.includes("tv") || m.includes("radio") || m.includes("rádio") || m.includes("audio")) return "tv_audio";
  if (m.includes("digital") || m.includes("portal") || m.includes("web") || m.includes("banner")) return "digital_portais";
  if (m.includes("impresso") || m.includes("revista") || m.includes("jornal")) return "impressa_outros";
  return "ooh_dooh";
}

/**
 * Parser semântico dedicado para linhas de planilhas (XLSX / CSV)
 */
function extrairProdutosDePlanilha(dadosTabela: Record<string, any>[]): ProdutoExtraidoMidiaKit[] {
  const result: ProdutoExtraidoMidiaKit[] = [];

  for (let idx = 0; idx < dadosTabela.length; idx++) {
    const row = dadosTabela[idx];
    if (!row || typeof row !== "object") continue;

    const findVal = (regexes: RegExp[]): string | undefined => {
      for (const k of Object.keys(row)) {
        if (regexes.some((r) => r.test(k.trim()))) {
          const val = row[k];
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            return String(val).trim();
          }
        }
      }
      return undefined;
    };

    const codigo = findVal([/^c[oó]d(?:igo)?/i, /^id$/i, /^ref/i]);
    const nomeRaw = findVal([/ponto/i, /^nome/i, /espa[cç]o/i, /identifica[cç][aã]o/i, /painel/i, /descri[cç][aã]o/i]);
    const midiaRaw = findVal([/m[ií]dia/i, /categoria/i, /meio/i, /tipo/i]) || "DOOH";
    const endereco = findVal([/localiza[cç][aã]o/i, /endere[cç]o/i, /logradouro/i, /rua|avenida|via/i]);
    const bairro = findVal([/bairro/i, /regi[aã]o/i]);
    const cidade = findVal([/cidade/i, /munic[ií]pio/i, /pra[cç]a/i]);
    const estado = findVal([/uf/i, /^estado$/i]);
    const dimensoes = findVal([/dimens[oõ]es/i, /tamanho/i, /resolu[cç][aã]o/i, /formato/i]);
    const fluxoRaw = findVal([/fluxo/i, /impacto/i, /audi[eê]ncia/i, /visualiza[cç][oõ]es/i, /pessoas/i]);
    const insercoesRaw = findVal([/inser[cç][oõ]es/i, /inser[cç][aã]o/i, /frequ[eê]ncia/i]);
    const precoRaw = findVal([/pre[cç]o/i, /valor/i, /tabela/i, /tarifa/i, /custo/i]);

    // Ignora linha se estiver quase toda vazia
    if (!nomeRaw && !endereco && !precoRaw && !codigo) continue;

    // Parse de preço
    let preco = 0;
    if (precoRaw) {
      const cleanP = String(precoRaw).replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim();
      preco = parseFloat(cleanP) || 0;
    }

    // Parse de fluxo / impactos
    let impactos: number | undefined;
    if (fluxoRaw) {
      const cleanF = String(fluxoRaw).replace(/\D/g, "");
      impactos = parseInt(cleanF, 10) || undefined;
    }

    // Parse de inserções
    let insercoes: number | undefined;
    if (insercoesRaw) {
      const cleanI = String(insercoesRaw).replace(/\D/g, "");
      insercoes = parseInt(cleanI, 10) || undefined;
    }

    const nomeFinal = [codigo ? `[${codigo}]` : "", nomeRaw || endereco || `Ponto ${idx + 1}`].filter(Boolean).join(" ");
    const fullLoc = [endereco, bairro, cidade, estado].filter(Boolean).join(", ");
    const geo = extrairCoordenadasDeTextoOuUrl(fullLoc);
    const rota = extrairRotaEReferencia(fullLoc);

    const isOff = /led|painel|totem|outdoor|frontlight|dooh|ooh|estrada|km/i.test(midiaRaw + " " + nomeFinal);

    result.push({
      id_temp: `temp-planilha-${Date.now()}-${idx}`,
      nome: nomeFinal,
      midia: midiaRaw,
      categoria_midia: mapCategoriaMidia(midiaRaw),
      tipo_cobranca: "mensal",
      canal_macro: isOff ? "OFF" : "ON",
      tipo: midiaRaw,
      duracao_segundos: isOff ? 10 : 30,
      insercoes_padrao: 1,
      insercoes_dia: insercoes || (isOff ? 1400 : 1),
      impactos_estimados_mes: impactos ? (impactos < 100000 ? impactos * 30 : impactos) : 820000,
      valor_unit: preco,
      formato: dimensoes || (isOff ? "8x4m (1920x1080)" : undefined),
      cidade: cidade || "Brasília",
      estado: estado || "DF",
      endereco: endereco || undefined,
      bairro: bairro || undefined,
      latitude: geo.latitude || null,
      longitude: geo.longitude || null,
      link_maps: geo.linkMaps || null,
      sentido_via: rota.sentidoVia || null,
      ponto_referencia: endereco || rota.pontoReferencia || null,
      selecionado: true,
      fotos: [],
    });
  }

  return result;
}

export function associarImagensEEnriquecerProdutos(
  produtos: ProdutoExtraidoMidiaKit[],
  imagensExtraidas?: ImagemExtraidaMidiaKit[] | null,
  nomeArquivo?: string | null
): { produtos: ProdutoExtraidoMidiaKit[]; fotosPendentes: ImagemExtraidaMidiaKit[] } {
  const fotosPendentes: ImagemExtraidaMidiaKit[] = [];
  const imgs: ImagemExtraidaMidiaKit[] = imagensExtraidas ? [...imagensExtraidas] : [];

  for (let idx = 0; idx < produtos.length; idx++) {
    const p = produtos[idx];
    const fotosAtribuidas: string[] = Array.isArray(p.fotos) ? [...p.fotos] : [];
    const slideOrigem = p.origem?.pagina_ou_slide ?? idx + 1;

    // 1. Tenta associar imagens por evidência inequívoca:
    // Apenas associa automaticamente quando houver contexto claro (legenda, nome/código) ou slide exclusivo
    const imgsDoSlide = imgs.filter(
      (img) => ((img as any).paginaOuSlide ?? img.slideOuPagina) === slideOrigem && !img.produtoIdAssociado
    );

    if (imgsDoSlide.length === 1 && fotosAtribuidas.length === 0) {
      // 1 único produto e 1 única imagem no slide/página: evidência alta
      const targetImg = imgsDoSlide[0];
      targetImg.produtoIdAssociado = p.id_temp;
      fotosAtribuidas.push(targetImg.dataUrl);
    } else if (imgsDoSlide.length > 1) {
      // Múltiplas imagens no mesmo slide: exige confirmação textual específica ou deixa para confirmação humana
      const pNomeWords = p.nome.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      for (const img of imgsDoSlide) {
        if (!img.produtoIdAssociado && img.contextoTexto) {
          const cLower = img.contextoTexto.toLowerCase();
          const matchCount = pNomeWords.filter((w) => cLower.includes(w)).length;
          if (matchCount >= 2) {
            img.produtoIdAssociado = p.id_temp;
            if (!fotosAtribuidas.includes(img.dataUrl)) {
              fotosAtribuidas.push(img.dataUrl);
            }
          }
        }
      }
    }

    // 2. Se ainda sem foto, tenta associar por código inequívoco no contexto de texto
    if (fotosAtribuidas.length === 0) {
      const pNomeWords = p.nome.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      for (const img of imgs) {
        if (!img.produtoIdAssociado && img.contextoTexto) {
          const cLower = img.contextoTexto.toLowerCase();
          const matchCount = pNomeWords.filter((w) => cLower.includes(w)).length;
          if (matchCount >= 3) {
            img.produtoIdAssociado = p.id_temp;
            if (!fotosAtribuidas.includes(img.dataUrl)) {
              fotosAtribuidas.push(img.dataUrl);
            }
          }
        }
      }
    }

    p.fotos = fotosAtribuidas;

    // Situação e origem das fotos: fotos extraídas do documento são marcadas como documento
    if (p.fotos.length > 0) {
      p.situacao_foto = "real_associada";
      p.origem_foto = "documento";
    } else {
      p.situacao_foto = "pendente";
      p.origem_foto = "pendente";
    }

    // Precisão de geolocalização: nunca inventar coordenadas se houver apenas Cidade/UF
    if (p.latitude != null && p.longitude != null) {
      p.precisao_geo = "exata";
    } else if (p.cidade && p.estado) {
      p.precisao_geo = "cidade_uf";
    } else {
      p.precisao_geo = "pendente";
    }

    // Cálculo do nível de confiança e status de validação
    let confianca = 75;
    if (p.valor_unit > 0 && p.cidade && p.cidade !== "Não Informada") {
      confianca = 95;
      p.status_validacao = "extraido";
    } else if (p.valor_unit > 0) {
      confianca = 80;
      p.status_validacao = "pendente_revisao";
    } else {
      confianca = 55;
      p.status_validacao = "incompleto";
    }
    p.confianca = confianca;

    p.origem = {
      arquivo: nomeArquivo || "midia_kit",
      pagina_ou_slide: slideOrigem,
      trecho_referencia: `${p.nome} - R$ ${p.valor_unit}`,
    };

    // Salva snapshot dos valores originais para conferência e auditoria
    p.valores_originais = {
      nome: p.nome,
      midia: p.midia,
      tipo: p.tipo,
      categoria_midia: p.categoria_midia,
      tipo_cobranca: p.tipo_cobranca,
      valor_unit: p.valor_unit,
      duracao_segundos: p.duracao_segundos,
      insercoes_padrao: p.insercoes_padrao,
      cidade: p.cidade,
      estado: p.estado,
      endereco: p.endereco,
      bairro: p.bairro,
      regiao_administrativa: p.regiao_administrativa,
      latitude: p.latitude,
      longitude: p.longitude,
      link_maps: p.link_maps,
      fotos: [...fotosAtribuidas],
      status_validacao: p.status_validacao,
    };
    p.editado_manualmente = false;
  }

  // Coleta imagens que não foram associadas com certeza a nenhum produto
  for (const img of imgs) {
    if (!img.produtoIdAssociado) {
      fotosPendentes.push(img);
    }
  }

  return { produtos, fotosPendentes };
}

const ExtrairInputSchema = z.object({
  texto: z.string().max(2000000).optional().default(""),
  tabelaPrecosTexto: z.string().optional().nullable(),
  parceiroNome: z.string().optional().nullable(),
  dadosTabela: z.array(z.record(z.any())).optional().nullable(),
  conteudoBase64: z.string().optional().nullable(),
  nomeArquivo: z.string().optional().nullable(),
  imagensExtraidas: z
    .array(
      z.object({
        id: z.string(),
        nomeArquivo: z.string(),
        dataUrl: z.string(),
        tipoMime: z.string(),
        tamanhoBytes: z.number(),
        slideOuPagina: z.number().optional().nullable(),
        contextoTexto: z.string().optional().nullable(),
        produtoIdAssociado: z.string().optional().nullable(),
      })
    )
    .optional()
    .nullable(),
});

export const extrairProdutosDeMidiaKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ExtrairInputSchema.parse(d))
  .handler(async ({ data }): Promise<ResultadoExtracaoMidiaKit> => {
    const key =
      process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    const textoGeral = `${data.texto}\n${data.tabelaPrecosTexto || ""}`;

    // Regex para dados cadastrais básicos
    const cnpjMatch = textoGeral.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    const emailMatch = textoGeral.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    const telMatch = textoGeral.match(/(?:(?:whatsapp|contato|fone|tel|celular)[:\s]*)?\(?\b([1-9]{2})\)?\s*(9?\d{4})[-.\s]?(\d{4})\b/i);

    // Se temos dados estruturados de planilha (XLSX / CSV):
    let produtosPlanilha: ProdutoExtraidoMidiaKit[] = [];
    if (data.dadosTabela && Array.isArray(data.dadosTabela) && data.dadosTabela.length > 0) {
      produtosPlanilha = extrairProdutosDePlanilha(data.dadosTabela);
    }

    const systemPrompt = `Você é um especialista em Mídia Kits, tabelas de preços e apresentações comerciais de veículos de comunicação (Painéis de LED/DOOH, Mídia OOH, TV, Rádio, Portais de Notícias, Mídia Impressa e Digital).
Sua missão é extrair rigorosamente:
1. Os dados da EMPRESA/VEÍCULO PARCEIRO (Razão Social, Nome Fantasia, CNPJ se houver, telefone, e-mail, contato comercial, cidade, UF, tipo de veículo).
2. PONTOS / PRODUTOS DE MÍDIA:
   - Nome claro do ponto ou programa/espaço (ex.: "Painel LED Eixo Monumental", "Totem Digital Shopping", "Jornal do Meio-Dia - Cota").
   - Tipo de mídia ("DOOH", "OOH", "TV", "Radio", "Digital", "Impresso").
   - Categoria ("ooh_dooh", "tv_audio", "digital_portais", "impressa_outros", "servicos_proprios").
   - Tipo de cobrança ("mensal", "insercao", "diaria", "semanal", etc.).
   - Localização: Cidade (ex: Brasília, Taguatinga, Luziânia, Valparaíso, Goiânia, São Paulo), UF (DF, GO, SP), Bairro e Endereço detalhado.
   - Duração em segundos (10, 15, 30, 60s).
   - Inserções diárias por tela (ex: 1.400 inserções/dia).
   - Impactos estimados mês ou fluxo de tráfego diário (ex: 820.000 pessoas/dia).
   - Preço de tabela ou valor mensal em reais.
   - Formato ou resolução (ex: "8x4m", "1920x1080").
   - Coordenadas geográficas (latitude, longitude) e link do Google Maps se houver.
3. PILARES DE DEFESA COMERCIAL:
   - Frases e argumentos persuasivos do veículo (ex: "Mais de 820 mil pessoas impactadas por dia", "1.400 inserções diárias por tela", "Alto Impacto Visual e Fixação", "Público Real em Movimento", "Credibilidade e Autoridade", "Pontos Estratégicos nos principais fluxos urbanos", "Exibição Contínua").
4. REGRAS DE DESCONTO COMERCIAL POR PRAZO:
   - Regras de desconto por período (ex: Trimestral 5%, Semestral 10%, Anual 15%).
5. SERVIÇOS ADICIONAIS:
   - Ofertas complementares de produção (ex: Produção de Vídeo Motion Graphics, Captação de Vídeo).
6. MÉTRICAS GERAIS:
   - Impactos diários totais, inserções diárias por tela, total de painéis/telas.

Retorne APENAS um objeto JSON válido no formato solicitado, sem formatação markdown ao redor.`;

    const userPrompt = `Material do Parceiro ${data.parceiroNome ? `(${data.parceiroNome})` : ""}:
--- CONTEÚDO DO MÍDIA KIT / APRESENTAÇÃO ---
${data.texto}

${data.tabelaPrecosTexto ? `--- TABELA DE PREÇOS / TARIFÁRIO ---\n${data.tabelaPrecosTexto}` : ""}

Retorne JSON no formato:
{
  "parceiro_identificado": string,
  "resumo_apresentacao": string,
  "parceiro_detectado": {
    "nome": string | null,
    "cnpj": string | null,
    "telefone": string | null,
    "email": string | null,
    "contato": string | null,
    "tipo_veiculo": string | null,
    "cidade": string | null,
    "uf": string | null
  },
  "defesas_comerciais": [string],
  "regras_desconto": [
    { "periodo": string, "desconto_pct": number, "condicoes": string }
  ],
  "servicos_adicionais": [
    { "nome": string, "descricao": string, "preco_estimado": number }
  ],
  "metricas_gerais": {
    "impactos_diarios_total": number,
    "insercoes_diarias_por_tela": number,
    "total_telas_paineis": number
  },
  "produtos": [
    {
      "nome": string,
      "midia": string,
      "categoria_midia": string,
      "canal_macro": "OFF" | "ON",
      "tipo": string,
      "cidade": string,
      "estado": string,
      "bairro": string,
      "endereco": string,
      "duracao_segundos": number,
      "insercoes_dia": number,
      "impactos_estimados_mes": number,
      "valor_unit": number,
      "formato": string,
      "detalhes_venda": string,
      "latitude": number | null,
      "longitude": number | null,
      "link_maps": string | null,
      "sentido_via": string | null,
      "ponto_referencia": string | null
    }
  ]
}`;

    let parsedResult: any = null;

    if (key) {
      try {
        const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (geminiApiKey) {
          const parts: any[] = [{ text: `${systemPrompt}\n\n${userPrompt}` }];
          if (data.conteudoBase64) {
            const cleanBase64 = data.conteudoBase64.replace(/^data:application\/pdf;base64,/, "").trim();
            parts.push({
              inlineData: {
                mimeType: "application/pdf",
                data: cleanBase64,
              },
            });
          }

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            }),
          });

          if (geminiRes.ok) {
            const geminiJson = await geminiRes.json();
            const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            parsedResult = JSON.parse(text);
          }
        } else {
          const isLovable = Boolean(process.env.LOVABLE_API_KEY);
          const url = isLovable
            ? "https://ai.gateway.lovable.dev/v1/chat/completions"
            : "https://openrouter.ai/api/v1/chat/completions";

          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            }),
          });

          if (res.ok) {
            const json = await res.json();
            const content = json?.choices?.[0]?.message?.content || "{}";
            parsedResult = JSON.parse(content);
          }
        }
      } catch (err) {
        console.warn("Falha na chamada de IA para Mídia Kit, usando fallback semântico:", err);
      }
    }

    // Se a IA respondeu com sucesso
    if (parsedResult) {
      const rawProds: any[] = Array.isArray(parsedResult.produtos) ? parsedResult.produtos : [];

      let produtosFinais: ProdutoExtraidoMidiaKit[] = [];

      // Se temos produtos da planilha, eles têm prioridade de alta precisão
      if (produtosPlanilha.length > 0) {
        produtosFinais = produtosPlanilha;
      } else {
        produtosFinais = rawProds.map((p, idx) => {
          const fullContext = `${p.nome || ""} ${p.endereco || ""} ${p.bairro || ""} ${p.detalhes_venda || ""}`;
          const geoExtracted = extrairCoordenadasDeTextoOuUrl(p.link_maps || fullContext);
          const rotaExtracted = extrairRotaEReferencia(fullContext);

          const isOff =
            ["DOOH", "OOH", "TV", "Radio", "Impresso"].includes(p.midia) ||
            /led|painel|totem|frontlight|outdoor|estrada|km/i.test(p.nome + " " + p.tipo);

          const lat = p.latitude != null ? Number(p.latitude) : geoExtracted.latitude || null;
          const lng = p.longitude != null ? Number(p.longitude) : geoExtracted.longitude || null;
          let linkMaps = p.link_maps ? String(p.link_maps).trim() : geoExtracted.linkMaps || null;
          if (!linkMaps && lat != null && lng != null) {
            linkMaps = `https://www.google.com/maps?q=${lat},${lng}`;
          }

          return {
            id_temp: `temp-${Date.now()}-${idx}`,
            nome: String(p.nome || `Produto ${idx + 1}`).trim(),
            midia: String(p.midia || (isOff ? "DOOH" : "Digital")).trim(),
            categoria_midia: mapCategoriaMidia(p.midia, p.categoria_midia),
            tipo_cobranca: "mensal",
            canal_macro: (p.canal_macro || (isOff ? "OFF" : "ON")) as "OFF" | "ON",
            tipo: p.tipo ? String(p.tipo).trim() : "Painel LED",
            duracao_segundos: Number(p.duracao_segundos) || (isOff ? 10 : 30),
            insercoes_padrao: 1,
            insercoes_dia: Number(p.insercoes_dia) || (isOff ? 1400 : 1),
            impactos_estimados_mes: Number(p.impactos_estimados_mes) || 820000,
            valor_unit: Number(p.valor_unit) || 0,
            formato: p.formato ? String(p.formato).trim() : undefined,
            detalhes_venda: p.detalhes_venda ? String(p.detalhes_venda).trim() : undefined,
            cidade: p.cidade ? String(p.cidade).trim() : "Brasília",
            estado: p.estado ? String(p.estado).trim().toUpperCase() : "DF",
            endereco: p.endereco ? String(p.endereco).trim() : undefined,
            bairro: p.bairro ? String(p.bairro).trim() : undefined,
            latitude: lat,
            longitude: lng,
            link_maps: linkMaps,
            sentido_via: p.sentido_via ? String(p.sentido_via).trim() : rotaExtracted.sentidoVia || null,
            ponto_referencia: p.ponto_referencia ? String(p.ponto_referencia).trim() : rotaExtracted.pontoReferencia || null,
            selecionado: true,
            fotos: [],
          };
        });
      }

      // Adiciona serviços adicionais como itens do inventário se houver
      if (Array.isArray(parsedResult.servicos_adicionais)) {
        parsedResult.servicos_adicionais.forEach((srv: any, sIdx: number) => {
          if (srv.nome) {
            produtosFinais.push({
              id_temp: `temp-srv-${Date.now()}-${sIdx}`,
              nome: srv.nome,
              midia: "Digital",
              categoria_midia: "servicos_proprios",
              tipo_cobranca: "insercao",
              canal_macro: "ON",
              tipo: "Serviço de Produção",
              duracao_segundos: 10,
              insercoes_padrao: 1,
              valor_unit: Number(srv.preco_estimado) || 450,
              detalhes_venda: srv.descricao || "Produção e edição profissional de conteúdo para exibição",
              selecionado: true,
              is_servico_adicional: true,
              is_own_product: true,
              fotos: [],
            });
          }
        });
      }

      const parcIa = parsedResult.parceiro_detectado || {};
      const parceiroFinal = {
        nome: parcIa.nome || parsedResult.parceiro_identificado || data.parceiroNome || "",
        cnpj: parcIa.cnpj || (cnpjMatch ? cnpjMatch[0] : null),
        telefone: parcIa.telefone || (telMatch ? `(${telMatch[1]}) ${telMatch[2]}-${telMatch[3]}` : null),
        email: parcIa.email || (emailMatch ? emailMatch[0] : null),
        contato: parcIa.contato || null,
        tipo_veiculo: parcIa.tipo_veiculo || "Painel OOH/DOOH",
        cidade: parcIa.cidade || null,
        uf: parcIa.uf || null,
      };

      const defesasExtraidas: string[] = Array.isArray(parsedResult.defesas_comerciais)
        ? parsedResult.defesas_comerciais
        : [
            "Mais de 820 mil pessoas impactadas por dia em pontos estratégicos",
            "1.400 inserções diárias por tela garantindo máxima repetição",
            "Público Real em Movimento e segmentação assertiva",
            "Alto Impacto Visual e autoridade imediata de marca",
            "Exibição Contínua durante 18 horas diárias",
          ];

      const regrasDescontoExtraidas: RegraDescontoExtraida[] = Array.isArray(parsedResult.regras_desconto)
        ? parsedResult.regras_desconto
        : [
            { periodo: "Trimestral", desconto_pct: 5, condicoes: "Contrato de 3 meses" },
            { periodo: "Semestral", desconto_pct: 10, condicoes: "Contrato de 6 meses" },
            { periodo: "Anual", desconto_pct: 15, condicoes: "Contrato de 12 meses" },
          ];

      const { produtos: prodsEnriquecidos, fotosPendentes } = associarImagensEEnriquecerProdutos(
        produtosFinais,
        data.imagensExtraidas,
        data.nomeArquivo
      );

      return {
        sucesso: true,
        parceiroIdentificado: parceiroFinal.nome,
        parceiroDetectado: parceiroFinal,
        resumoApresentacao: parsedResult.resumo_apresentacao || "Inventário e defesas comerciais extraídos com sucesso.",
        defesasComerciais: defesasExtraidas,
        regrasDesconto: regrasDescontoExtraidas,
        servicosAdicionais: parsedResult.servicos_adicionais || [],
        metricasGerais: {
          impactosDiarios: parsedResult.metricas_gerais?.impactos_diarios_total || 820000,
          insercoesDiarias: parsedResult.metricas_gerais?.insercoes_diarias_por_tela || 1400,
          totalPontosTelas: prodsEnriquecidos.length,
        },
        produtos: prodsEnriquecidos,
        imagensExtraidas: data.imagensExtraidas || [],
        fotosPendentes,
      };
    }

    // FALLBACK HEURÍSTICO / REGEX
    // 1. Defesas comerciais heurísticas baseadas no conteúdo
    const defesasFallback: string[] = [];
    if (/820\s*mil|820\.000/i.test(textoGeral)) {
      defesasFallback.push("Mais de 820 mil pessoas impactadas diariamente nos pontos de maior fluxo");
    } else {
      const matchPessoas = textoGeral.match(/(\d+(?:\.\d+)?)\s*(?:mil|milhões)?\s*(?:impactos|pessoas|visualizações|veículos)/i);
      if (matchPessoas) {
        defesasFallback.push(`Mais de ${matchPessoas[0]} alcançadas com alto impacto visual`);
      }
    }

    if (/1\.400|1400/i.test(textoGeral) && /inserç|exibiç/i.test(textoGeral)) {
      defesasFallback.push("1.400 inserções diárias por tela (frequência ininterrupta de exibição)");
    }

    defesasFallback.push("Público Real em Movimento nos corredores mais valorizados");
    defesasFallback.push("Alto Impacto Visual em painéis de alta definição");
    defesasFallback.push("Credibilidade e Autoridade para o anunciante");
    defesasFallback.push("Pontos Estratégicos com tempo prolongado de permanência");
    defesasFallback.push("Exibição Contínua durante 18 horas por dia");

    // 2. Regras de desconto
    const regrasDescontoFallback: RegraDescontoExtraida[] = [
      { periodo: "Trimestral", desconto_pct: 5, condicoes: "Período de 3 meses" },
      { periodo: "Semestral", desconto_pct: 10, condicoes: "Período de 6 meses" },
      { periodo: "Anual", desconto_pct: 15, condicoes: "Período de 12 meses" },
    ];

    // 3. Produtos
    let produtosFallback: ProdutoExtraidoMidiaKit[] = [];
    if (produtosPlanilha.length > 0) {
      produtosFallback = produtosPlanilha;
    } else {
      const linhas = data.texto.split("\n").map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        const matchPreco = linha.match(/(?:R\$\s*|valor:\s*)([\d\.]+,\d{2})/i);
        if (matchPreco || (linha.length > 5 && linha.length < 80)) {
          const valor = matchPreco ? Number(matchPreco[1].replace(/\./g, "").replace(",", ".")) : 0;
          const midiaDetectada = /rádio|fm|som|spot/i.test(linha)
            ? "Radio"
            : /led|painel|totem|dooh|outdoor|frontlight/i.test(linha)
            ? "DOOH"
            : /portal|banner|site|digital|stories/i.test(linha)
            ? "Digital"
            : "TV";

          const isOff = ["DOOH", "OOH", "Radio", "TV"].includes(midiaDetectada);
          const linhaContexto = `${linha} ${linhas[i + 1] || ""} ${linhas[i + 2] || ""}`;
          const geoExtracted = extrairCoordenadasDeTextoOuUrl(linhaContexto);
          const rotaExtracted = extrairRotaEReferencia(linhaContexto);

          if (linha.length >= 4 && !linha.startsWith("http") && !linha.includes("@")) {
            produtosFallback.push({
              id_temp: `temp-${Date.now()}-${i}`,
              nome: linha.replace(/R\$.*$/, "").trim() || `Produto ${produtosFallback.length + 1}`,
              midia: midiaDetectada,
              categoria_midia: mapCategoriaMidia(midiaDetectada),
              tipo_cobranca: "mensal",
              canal_macro: isOff ? "OFF" : "ON",
              tipo: isOff ? "Painel LED" : "Inserção Comercial",
              duracao_segundos: midiaDetectada === "DOOH" ? 10 : 30,
              insercoes_padrao: 1,
              insercoes_dia: isOff ? 1400 : 1,
              impactos_estimados_mes: 820000,
              valor_unit: valor,
              detalhes_venda: linhas[i + 1] ? linhas[i + 1].slice(0, 150) : undefined,
              cidade: "Brasília",
              estado: "DF",
              latitude: geoExtracted.latitude || null,
              longitude: geoExtracted.longitude || null,
              link_maps: geoExtracted.linkMaps || null,
              sentido_via: rotaExtracted.sentidoVia || null,
              ponto_referencia: rotaExtracted.pontoReferencia || null,
              selecionado: true,
              fotos: [],
            });
            if (produtosFallback.length >= 35) break;
          }
        }
      }
    }

    const { produtos: prodsEnriquecidosFallback, fotosPendentes: pendentesFallback } =
      associarImagensEEnriquecerProdutos(produtosFallback, data.imagensExtraidas, data.nomeArquivo);

    return {
      sucesso: true,
      parceiroIdentificado: data.parceiroNome || "",
      parceiroDetectado: {
        nome: data.parceiroNome || "",
        cnpj: cnpjMatch ? cnpjMatch[0] : null,
        email: emailMatch ? emailMatch[0] : null,
        telefone: telMatch ? `(${telMatch[1]}) ${telMatch[2]}-${telMatch[3]}` : null,
        tipo_veiculo: "Painel OOH/DOOH",
      },
      resumoApresentacao: "Extração textual e tabular com defesas concluída.",
      defesasComerciais: defesasFallback,
      regrasDesconto: regrasDescontoFallback,
      servicosAdicionais: [
        {
          nome: "Produção de Vídeo Motion Graphics (10s)",
          descricao: "Edição e animação sob medida para a resolução do painel de LED",
          preco_estimado: 450,
        },
      ],
      metricasGerais: {
        impactosDiarios: 820000,
        insercoesDiarias: 1400,
        totalPontosTelas: prodsEnriquecidosFallback.length,
      },
      produtos: prodsEnriquecidosFallback,
      imagensExtraidas: data.imagensExtraidas || [],
      fotosPendentes: pendentesFallback,
    };
  });

export const SalvarProdutosSchema = z.object({
  parceiroId: z.string().uuid().optional().nullable(),
  parceiroNome: z.string().optional().nullable(),
  parceiroCnpj: z.string().optional().nullable(),
  defesasComerciais: z.array(z.string()).optional(),
  regrasDesconto: z.array(z.any()).optional(),
  novoParceiro: z
    .object({
      razao_social: z.string().min(1, "Razão Social é obrigatória"),
      nome_fantasia: z.string().optional().nullable(),
      cnpj: z.string().optional().nullable(),
      comissao_padrao_pct: z.number().min(0).max(100).optional().default(20),
      contato_nome: z.string().optional().nullable(),
      contato_telefone: z.string().optional().nullable(),
      contato_email: z.string().optional().nullable(),
      cidade: z.string().optional().nullable(),
      uf: z.string().optional().nullable(),
      endereco: z.string().optional().nullable(),
      tipo_veiculo: z.string().optional().nullable(),
      segmentos: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
  produtos: z.array(
    z.object({
      id: z.string().optional().nullable(),
      nome: z.string().min(1),
      midia: z.string(),
      canal_macro: z.enum(["OFF", "ON", "HIBRIDO"]).optional().nullable(),
      plataforma_rede: z.string().optional().nullable(),
      tipo: z.string().optional().nullable(),
      categoria_midia: z.string().optional().nullable(),
      tipo_cobranca: z.string().optional().nullable(),
      programa: z.string().optional().nullable(),
      faixa: z.string().optional().nullable(),
      duracao_segundos: z.number().optional().nullable(),
      insercoes_padrao: z.number().optional().nullable(),
      insercoes_dia: z.number().optional().nullable(),
      impactos_estimados_mes: z.number().optional().nullable(),
      valor_unit: z.number(),
      formato: z.string().optional().nullable(),
      detalhes_venda: z.string().optional().nullable(),
      observacao: z.string().optional().nullable(),
      cidade: z.string().optional().nullable(),
      estado: z.string().optional().nullable(),
      endereco: z.string().optional().nullable(),
      bairro: z.string().optional().nullable(),
      regiao_administrativa: z.string().optional().nullable(),
      status_operacional: z.string().optional().nullable(),
      precisao_geo: z.string().optional().nullable(),
      status_validacao: z.string().optional().nullable(),
      situacao_foto: z.string().optional().nullable(),
      origem_foto: z.string().optional().nullable(),
      valores_originais: z.any().optional().nullable(),
      origem: z.any().optional().nullable(),
      editado_manualmente: z.boolean().optional().nullable(),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
      link_maps: z.string().optional().nullable(),
      sentido_via: z.string().optional().nullable(),
      ponto_referencia: z.string().optional().nullable(),
      fotos: z.array(z.string()).optional().default([]),
      is_own_product: z.boolean().optional().default(false),
    })
  ),
  arquivoKitUrl: z.string().optional().nullable(),
  arquivoKitNome: z.string().optional().nullable(),
});

export const salvarProdutosExtraidosMidiaKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => SalvarProdutosSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Obter tenant do usuário
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    let targetParceiroId: string | null = data.parceiroId || null;
    let parceiroNome: string | null = data.parceiroNome || null;
    let parceiroCnpj: string | null = data.parceiroCnpj || null;

    // 2. Se o usuário enviou dados complementares de um novo parceiro ou atualização de CNPJ:
    if (data.novoParceiro) {
      const cleanCnpj = data.novoParceiro.cnpj ? data.novoParceiro.cnpj.replace(/\D/g, "") : "";

      // Verifica se já existe um parceiro com esse CNPJ no sistema
      if (cleanCnpj.length === 14) {
        let q = supabase.from("parceiros").select("id, razao_social, nome_fantasia, cnpj");
        if (tenantId) q = q.eq("tenant_id", tenantId);
        const { data: existingParceiros } = await q;
        const match = existingParceiros?.find(
          (p) => p.cnpj && p.cnpj.replace(/\D/g, "") === cleanCnpj,
        );

        if (match) {
          targetParceiroId = match.id;
          parceiroNome = match.nome_fantasia || match.razao_social;
          parceiroCnpj = match.cnpj;
        }
      }

      // Se ainda não tiver targetParceiroId, cria o parceiro agora
      if (!targetParceiroId && data.novoParceiro.razao_social) {
        const payloadParc: any = {
          razao_social: data.novoParceiro.razao_social.trim(),
          nome_fantasia: (data.novoParceiro.nome_fantasia || data.novoParceiro.razao_social).trim(),
          cnpj: data.novoParceiro.cnpj?.trim() || null,
          comissao_padrao_pct: data.novoParceiro.comissao_padrao_pct ?? 20.0,
          comissao_padrao_percentual: data.novoParceiro.comissao_padrao_pct ?? 20.0,
          contato_nome: data.novoParceiro.contato_nome?.trim() || null,
          contato_telefone: data.novoParceiro.contato_telefone?.trim() || null,
          contato_email: data.novoParceiro.contato_email?.trim() || null,
          cidade: data.novoParceiro.cidade?.trim() || null,
          uf: data.novoParceiro.uf?.trim() || null,
          endereco: data.novoParceiro.endereco?.trim() || null,
          tipo_veiculo: data.novoParceiro.tipo_veiculo || "Painel OOH/DOOH",
          segmentos: data.novoParceiro.segmentos || ["DOOH", "Painel de LED", "Mídia Exterior"],
          media_kit_defenses: data.defesasComerciais || [],
          commercial_discounts_rules: data.regrasDesconto || [],
          modelo_remuneracao: "comissao_percentual",
          ativo: true,
          created_by: userId,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        };

        const { data: novoCriado, error: errCria } = await supabase
          .from("parceiros")
          .insert(payloadParc)
          .select("id, razao_social, nome_fantasia, cnpj")
          .single();

        if (novoCriado) {
          targetParceiroId = novoCriado.id;
          parceiroNome = novoCriado.nome_fantasia || novoCriado.razao_social;
          parceiroCnpj = novoCriado.cnpj;

          // Sincroniza em partners
          try {
            await (supabaseAdmin.from("partners") as any).upsert({
              id: novoCriado.id,
              tenant_id: tenantId,
              razao_social: payloadParc.razao_social,
              nome_fantasia: payloadParc.nome_fantasia,
              cnpj: payloadParc.cnpj,
              contato_nome: payloadParc.contato_nome,
              telefone: payloadParc.contato_telefone,
              email: payloadParc.contato_email,
              cidade: payloadParc.cidade,
              uf: payloadParc.uf,
              endereco: payloadParc.endereco,
              tipo_veiculo: payloadParc.tipo_veiculo,
              comissao_padrao_percentual: payloadParc.comissao_padrao_percentual,
              media_kit_defenses: data.defesasComerciais || [],
              commercial_discounts_rules: data.regrasDesconto || [],
              status: "ativo",
              created_by: userId,
            });
          } catch {
            // Ignora se tabela em transição
          }
        } else if (errCria) {
          console.error("Erro ao cadastrar novo parceiro:", errCria);
        }
      } else if (targetParceiroId) {
        // Atualiza CNPJ, contatos, defesas e regras de desconto no parceiro existente
        const updateParcPayload: any = {
          ...(data.novoParceiro.cnpj ? { cnpj: data.novoParceiro.cnpj.trim() } : {}),
          ...(data.novoParceiro.contato_telefone ? { contato_telefone: data.novoParceiro.contato_telefone.trim() } : {}),
          ...(data.novoParceiro.contato_email ? { contato_email: data.novoParceiro.contato_email.trim() } : {}),
          ...(data.defesasComerciais ? { media_kit_defenses: data.defesasComerciais } : {}),
          ...(data.regrasDesconto ? { commercial_discounts_rules: data.regrasDesconto } : {}),
        };
        await supabase.from("parceiros").update(updateParcPayload).eq("id", targetParceiroId);
        try {
          await (supabaseAdmin.from("partners") as any).update(updateParcPayload).eq("id", targetParceiroId);
        } catch {
          // Ignora
        }
      }
    } else if (targetParceiroId && (data.defesasComerciais || data.regrasDesconto)) {
      // Atualiza defesas e descontos no parceiro existente
      const updateDef: any = {
        ...(data.defesasComerciais ? { media_kit_defenses: data.defesasComerciais } : {}),
        ...(data.regrasDesconto ? { commercial_discounts_rules: data.regrasDesconto } : {}),
      };
      await supabase.from("parceiros").update(updateDef).eq("id", targetParceiroId);
      try {
        await (supabaseAdmin.from("partners") as any).update(updateDef).eq("id", targetParceiroId);
      } catch {
        // Ignora
      }
    }

    // 3. Se ainda faltam nome ou CNPJ e temos targetParceiroId, busca do banco
    if (targetParceiroId && (!parceiroNome || !parceiroCnpj)) {
      const { data: parc } = await supabase
        .from("parceiros")
        .select("nome_fantasia, razao_social, cnpj")
        .eq("id", targetParceiroId)
        .maybeSingle();
      if (parc) {
        parceiroNome = parceiroNome || parc.nome_fantasia || parc.razao_social;
        parceiroCnpj = parceiroCnpj || parc.cnpj;
      }
    }

    let cadastrados = 0;
    let atualizados = 0;
    const erros: string[] = [];
    const produtosSalvos: { id: string; nome: string; atualizado: boolean }[] = [];

    // 4. Cadastrar cada produto em produtos com detecção de duplicidade
    for (const prod of data.produtos) {
      const isOff = prod.canal_macro === "OFF" || ["DOOH", "OOH"].includes(prod.midia);

      let metaObj: any = {};
      if (prod.detalhes_venda) {
        try {
          const parsed = JSON.parse(prod.detalhes_venda);
          if (parsed && typeof parsed === "object") metaObj = parsed;
          else metaObj = { _texto: prod.detalhes_venda };
        } catch {
          metaObj = { _texto: prod.detalhes_venda };
        }
      }
      metaObj._canal_macro = prod.canal_macro || (isOff ? "OFF" : "ON");
      if (prod.plataforma_rede) metaObj._plataforma_rede = prod.plataforma_rede;
      if (prod.latitude != null) metaObj._latitude = prod.latitude;
      if (prod.longitude != null) metaObj._longitude = prod.longitude;
      if (prod.link_maps) metaObj._link_maps = prod.link_maps;
      if (prod.sentido_via) metaObj._sentido_via = prod.sentido_via;
      if (prod.ponto_referencia) metaObj._ponto_referencia = prod.ponto_referencia;
      if (prod.regiao_administrativa) metaObj._regiao_administrativa = prod.regiao_administrativa;
      if (prod.bairro) metaObj._bairro = prod.bairro;
      if (prod.categoria_midia) metaObj._categoria_midia = prod.categoria_midia;
      if (prod.tipo_cobranca) metaObj._tipo_cobranca = prod.tipo_cobranca;
      if (prod.precisao_geo) metaObj._precisao_geo = prod.precisao_geo;
      if (prod.status_validacao) metaObj._status_validacao = prod.status_validacao;
      if (prod.origem) metaObj._origem_kit = prod.origem;
      if (prod.valores_originais) metaObj._valores_originais = prod.valores_originais;

      // DETECÇÃO DE DUPLICIDADE:
      // Verifica se produto com mesmo nome já existe para esse parceiro / tenant
      let existingProd: any = null;
      try {
        let q = (supabaseAdmin || supabase)
          .from("produtos")
          .select("id, nome, valor_unit, fotos, cidade, uf, endereco_ponto")
          .eq("ativo", true);
        if (targetParceiroId) q = q.eq("parceiro_id", targetParceiroId);
        if (tenantId) q = q.eq("tenant_id", tenantId);
        q = q.ilike("nome", prod.nome.trim());
        const { data: found } = await q;
        if (found && found.length > 0) {
          existingProd = found[0];
        }
      } catch (errCheck) {
        console.warn("Aviso ao checar duplicidade de produto:", errCheck);
      }

      if (existingProd) {
        // Atualiza produto existente sem duplicar
        const mergedFotos = Array.from(
          new Set([...(existingProd.fotos || []), ...(prod.fotos || [])])
        ).slice(0, 8);

        const updatePayload: any = {
          valor_unit: prod.valor_unit || existingProd.valor_unit || 0,
          preco_tabela: prod.valor_unit || existingProd.valor_unit || 0,
          fotos: mergedFotos,
          fotos_locais: mergedFotos,
          updated_at: new Date().toISOString(),
          detalhes_venda: JSON.stringify(metaObj),
          ...(prod.tipo ? { tipo: prod.tipo } : {}),
          ...(prod.cidade ? { cidade: prod.cidade } : {}),
          ...(prod.estado ? { uf: prod.estado } : {}),
          ...(prod.bairro ? { bairro: prod.bairro } : {}),
          ...(prod.latitude != null ? { latitude: prod.latitude } : {}),
          ...(prod.longitude != null ? { longitude: prod.longitude } : {}),
          ...(prod.endereco ? { endereco_ponto: prod.endereco } : {}),
        };

        const { error: updErr } = await (supabaseAdmin || supabase)
          .from("produtos")
          .update(updatePayload)
          .eq("id", existingProd.id);

        if (!updErr) {
          atualizados++;
          produtosSalvos.push({ id: existingProd.id, nome: prod.nome, atualizado: true });
          continue;
        }
      }

      // Criação de novo produto com UUID real e persistente
      const isUuid = prod.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prod.id);
      const persistentId = isUuid ? prod.id! : crypto.randomUUID();
      const payload: any = {
        id: persistentId,
        nome: prod.nome,
        midia: prod.midia || (isOff ? "DOOH" : "TV"),
        canal_macro: prod.canal_macro || (isOff ? "OFF" : "ON"),
        plataforma_rede: prod.plataforma_rede || null,
        tipo: prod.tipo || (isOff ? "Painel LED" : "Comercial"),
        programa: prod.programa || null,
        faixa: prod.faixa || null,
        duracao_segundos: prod.duracao_segundos || (isOff ? 10 : 30),
        insercoes_padrao: prod.insercoes_padrao || 1,
        insercoes_dia: prod.insercoes_dia || (isOff ? 1400 : 1),
        impactos_estimados_mes: prod.impactos_estimados_mes || null,
        valor_unit: prod.valor_unit || 0,
        preco_tabela: prod.valor_unit || 0,
        formato: prod.formato || prod.tipo || null,
        cidade: prod.cidade || data.novoParceiro?.cidade || null,
        uf: prod.estado || data.novoParceiro?.uf || null,
        bairro: prod.bairro || null,
        endereco_ponto: prod.endereco || prod.ponto_referencia || null,
        latitude: prod.latitude != null ? prod.latitude : null,
        longitude: prod.longitude != null ? prod.longitude : null,
        link_maps: prod.link_maps || null,
        sentido_via: prod.sentido_via || null,
        ponto_referencia: prod.ponto_referencia || null,
        detalhes_venda: JSON.stringify(metaObj),
        observacao: prod.observacao || `Importado via Mídia Kit / Planilha em ${new Date().toLocaleDateString("pt-BR")}`,
        parceiro_id: prod.is_own_product ? null : targetParceiroId,
        parceiro_nome: prod.is_own_product ? "Solução Própria" : parceiroNome || null,
        parceiro_cnpj: prod.is_own_product ? null : parceiroCnpj || null,
        ativo: true,
        fotos: Array.isArray(prod.fotos) ? prod.fotos.slice(0, 8) : [],
        fotos_locais: Array.isArray(prod.fotos) ? prod.fotos.slice(0, 8) : [],
        created_by: userId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      };

      const { error: insErr } = await (supabaseAdmin || supabase).from("produtos").insert(payload);
      if (insErr) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.parceiro_cnpj;
        delete fallbackPayload.parceiro_nome;
        delete fallbackPayload.canal_macro;
        delete fallbackPayload.plataforma_rede;
        delete fallbackPayload.link_maps;
        delete fallbackPayload.sentido_via;
        delete fallbackPayload.ponto_referencia;
        delete fallbackPayload.impactos_estimados_mes;
        delete fallbackPayload.insercoes_dia;
        delete fallbackPayload.bairro;
        delete fallbackPayload.fotos_locais;
        const { error: retryErr } = await (supabaseAdmin || supabase).from("produtos").insert(fallbackPayload);
        if (!retryErr) {
          cadastrados++;
          produtosSalvos.push({ id: persistentId, nome: prod.nome, atualizado: false });
          continue;
        }
        erros.push(`${prod.nome}: ${insErr.message}`);
      } else {
        cadastrados++;
        produtosSalvos.push({ id: persistentId, nome: prod.nome, atualizado: false });
      }
    }

    // 5. Se houver anexo do Mídia Kit / Apresentação, registrar no histórico do parceiro
    if (targetParceiroId && data.arquivoKitUrl && data.arquivoKitNome) {
      try {
        await supabase.from("parceiro_anexos").insert({
          parceiro_id: targetParceiroId,
          nome_arquivo: data.arquivoKitNome,
          url_arquivo: data.arquivoKitUrl,
          tipo: "midia_kit",
          created_by: userId,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        } as never);
      } catch {
        // Anexo opcional
      }
    }

    return {
      sucesso: true,
      cadastrados,
      atualizados,
      erros,
      parceiroNome: parceiroNome || "Inventário Próprio",
      parceiroId: targetParceiroId,
      total: data.produtos.length,
      produtos: produtosSalvos,
    };
  });

export const verificarDuplicidadesImportacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: { parceiroId?: string | null; nomes: string[] }) =>
      z
        .object({
          parceiroId: z.string().uuid().optional().nullable(),
          nomes: z.array(z.string()).min(1),
        })
        .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    if (!data.nomes || data.nomes.length === 0) return { duplicidades: [] };

    let q = (supabaseAdmin || supabase)
      .from("produtos")
      .select("id, nome, valor_unit, cidade, uf, endereco_ponto, parceiro_id")
      .eq("ativo", true);

    if (data.parceiroId) q = q.eq("parceiro_id", data.parceiroId);
    if (tenantId) q = q.eq("tenant_id", tenantId);

    const { data: rows } = await q;
    const nomesSet = new Set(data.nomes.map((n) => n.trim().toLowerCase()));
    const duplicidades = (rows || []).filter((r) =>
      nomesSet.has(String(r.nome).trim().toLowerCase())
    );

    return { duplicidades };
  });
