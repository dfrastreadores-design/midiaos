import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ProdutoExtraidoMidiaKit {
  id_temp: string;
  nome: string;
  midia: string; // TV, Radio, DOOH, Digital, OOH, Impresso, Outro
  tipo?: string; // Comercial 30", Banner Topo, Painel Digital, etc.
  programa?: string;
  faixa?: string;
  duracao_segundos?: number;
  insercoes_padrao?: number;
  valor_unit: number; // Preço de tabela ou valor unitário
  observacao?: string;
  detalhes_venda?: string; // Audiência, métricas, alcance, perfil
  formato?: string;
  praca?: string;
  fotos?: string[];
  selecionado?: boolean;
  canal_macro?: "OFF" | "ON" | "HIBRIDO";
  plataforma_rede?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  link_maps?: string | null;
  sentido_via?: string | null;
  ponto_referencia?: string | null;
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

const ExtrairInputSchema = z.object({
  texto: z.string().min(5).max(400000),
  tabelaPrecosTexto: z.string().optional().nullable(),
  parceiroNome: z.string().optional().nullable(),
});

export const extrairProdutosDeMidiaKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExtrairInputSchema.parse(d))
  .handler(async ({ data }) => {
    const key =
      process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    // Extrai pistas de CNPJ, telefone, e-mail e nome do texto via Regex para máxima precisão
    const textoGeral = `${data.texto}\n${data.tabelaPrecosTexto || ""}`;
    const cnpjMatch = textoGeral.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    const emailMatch = textoGeral.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    const telMatch = textoGeral.match(/(?:(?:whatsapp|contato|fone|tel|celular)[:\s]*)?\(?\b([1-9]{2})\)?\s*(9?\d{4})[-.\s]?(\d{4})\b/i);

    const systemPrompt = `Você é um especialista em Mídia Kits, tabelas de preços e apresentações comerciais de veículos de comunicação (TV, Rádio, Painéis de LED/DOOH, Portais de Notícias, Mídia OOH, Mídia Impressa e Digital).
Sua missão é extrair rigorosamente:
1. Os dados da EMPRESA/VEÍCULO PARCEIRO (Razão Social, Nome Fantasia, CNPJ se houver, telefone, e-mail, contato comercial).
2. Todos os produtos, cotas de patrocínio, formatos comerciais e espaços de mídia apresentados no material do parceiro, com suporte nativo a GEOLOCALIZAÇÃO para mídia exterior (OOH/DOOH).

Regras de Extração:
1. Identifique a empresa / parceiro no objeto "parceiro_detectado".
2. Identifique cada espaço/produto como um item independente na lista de "produtos".
3. Para cada produto, defina:
   - "nome": Nome claro do produto ou programa/espaço (ex.: "Jornal do Meio-Dia - Cota Master", "Painel LED Eixo Monumental", "Banner Super Topo 728x90").
   - "midia": Um dos valores padrão: "TV", "Radio", "DOOH", "Digital", "OOH", "Impresso" ou "Outro".
   - "canal_macro": "OFF" para TV, Rádio, DOOH, OOH, Impresso; "ON" para Digital, Redes Sociais, Portais.
   - "tipo": Formato comercial (ex: "VT 30s", "Spot 30s", "Banner", "Painel LED", "Front Light", "Totem Digital").
   - "programa": Nome do programa, veículo ou canal associado.
   - "faixa": Faixa horária, periodicidade ou localização física do ponto (ex: "12:00 às 13:30", "Av. Paulista, 1000", "EPTG km 4 em frente à Só Reparos").
   - "duracao_segundos": Duração em segundos se aplicável (30 por padrão para rádio/TV/spots, 10 para DOOH, 0 para banners).
   - "insercoes_padrao": 1 por padrão.
   - "valor_unit": Preço de tabela ou valor unitário (se for pacote mensal, informe o valor mensal). Apenas números decimais positivos (ex: 4500.00). Nunca retorne 0 se houver preço na tabela.
   - "formato": Resolução ou dimensões (ex: "1920x1080", "8x4m", "300x250").
   - "detalhes_venda": Breve defesa com dados de audiência, público-alvo, fluxo de veículos/dia ou alcance.
   - "latitude": Número decimal (ex: -15.8341) caso haja coordenadas no material.
   - "longitude": Número decimal (ex: -48.0567) caso haja coordenadas no material.
   - "link_maps": URL do Google Maps se mencionada (ex: maps.google.com/?q=... ou goo.gl/maps/...).
   - "sentido_via": Sentido da via/fluxo de trânsito (ex: "Sentido Plano Piloto", "Sentido Taguatinga").
   - "ponto_referencia": Referência física estruturada (ex: "EPTG km 4 em frente à Só Reparos", "Próximo ao shopping").
4. Se houver Tabela de Preços complementar, cruze os nomes dos produtos com os valores da tabela.
5. Retorne APENAS um objeto JSON válido no formato especificado, sem formatação markdown ao redor.`;

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
    "contato": string | null
  },
  "produtos": [
    {
      "nome": string,
      "midia": string,
      "canal_macro": "OFF" | "ON",
      "tipo": string,
      "programa": string,
      "faixa": string,
      "duracao_segundos": number,
      "insercoes_padrao": number,
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
      } catch (err) {
        console.warn("Falha na chamada de IA para Mídia Kit, usando extrator semântico:", err);
      }
    }

    if (parsedResult && Array.isArray(parsedResult.produtos)) {
      const rawProds: any[] = parsedResult.produtos;

      const produtos: ProdutoExtraidoMidiaKit[] = rawProds.map((p, idx) => {
        const fullContext = `${p.nome || ""} ${p.faixa || ""} ${p.detalhes_venda || ""} ${p.ponto_referencia || ""}`;
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
          canal_macro: (p.canal_macro || (isOff ? "OFF" : "ON")) as "OFF" | "ON",
          tipo: p.tipo ? String(p.tipo).trim() : "Comercial",
          programa: p.programa ? String(p.programa).trim() : undefined,
          faixa: p.faixa ? String(p.faixa).trim() : undefined,
          duracao_segundos: Number(p.duracao_segundos) || (isOff ? 10 : 30),
          insercoes_padrao: Number(p.insercoes_padrao) || 1,
          valor_unit: Number(p.valor_unit) || 0,
          formato: p.formato ? String(p.formato).trim() : undefined,
          detalhes_venda: p.detalhes_venda ? String(p.detalhes_venda).trim() : undefined,
          latitude: lat,
          longitude: lng,
          link_maps: linkMaps,
          sentido_via: p.sentido_via ? String(p.sentido_via).trim() : rotaExtracted.sentidoVia || null,
          ponto_referencia: p.ponto_referencia ? String(p.ponto_referencia).trim() : rotaExtracted.pontoReferencia || null,
          selecionado: true,
          fotos: [],
        };
      });

      const parcIa = parsedResult.parceiro_detectado || {};
      const parceiroFinal = {
        nome: parcIa.nome || parsedResult.parceiro_identificado || data.parceiroNome || "",
        cnpj: parcIa.cnpj || (cnpjMatch ? cnpjMatch[0] : null),
        telefone: parcIa.telefone || (telMatch ? `(${telMatch[1]}) ${telMatch[2]}-${telMatch[3]}` : null),
        email: parcIa.email || (emailMatch ? emailMatch[0] : null),
        contato: parcIa.contato || null,
      };

      return {
        sucesso: true,
        parceiroIdentificado: parceiroFinal.nome,
        parceiroDetectado: parceiroFinal,
        resumoApresentacao: parsedResult.resumo_apresentacao || "",
        produtos,
      };
    }

    // Fallback: extração semântica com Expressões Regulares se a IA estiver sem créditos
    const linhas = data.texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const produtosFallback: ProdutoExtraidoMidiaKit[] = [];

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
            canal_macro: isOff ? "OFF" : "ON",
            tipo: isOff ? "Painel / Ponto de Rua" : "Inserção Comercial",
            duracao_segundos: midiaDetectada === "DOOH" ? 10 : 30,
            insercoes_padrao: 1,
            valor_unit: valor,
            detalhes_venda: linhas[i + 1] ? linhas[i + 1].slice(0, 150) : undefined,
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

    return {
      sucesso: true,
      parceiroIdentificado: data.parceiroNome || "",
      parceiroDetectado: {
        nome: data.parceiroNome || "",
        cnpj: cnpjMatch ? cnpjMatch[0] : null,
        email: emailMatch ? emailMatch[0] : null,
        telefone: telMatch ? `(${telMatch[1]}) ${telMatch[2]}-${telMatch[3]}` : null,
      },
      resumoApresentacao: "Extração textual e tabular concluída.",
      produtos: produtosFallback,
    };
  });

const SalvarProdutosSchema = z.object({
  parceiroId: z.string().uuid().optional().nullable(),
  parceiroNome: z.string().optional().nullable(),
  parceiroCnpj: z.string().optional().nullable(),
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
      segmentos: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
  produtos: z.array(
    z.object({
      nome: z.string().min(1),
      midia: z.string(),
      canal_macro: z.enum(["OFF", "ON", "HIBRIDO"]).optional().nullable(),
      plataforma_rede: z.string().optional().nullable(),
      tipo: z.string().optional().nullable(),
      programa: z.string().optional().nullable(),
      faixa: z.string().optional().nullable(),
      duracao_segundos: z.number().optional().nullable(),
      insercoes_padrao: z.number().optional().nullable(),
      valor_unit: z.number(),
      formato: z.string().optional().nullable(),
      detalhes_venda: z.string().optional().nullable(),
      observacao: z.string().optional().nullable(),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
      link_maps: z.string().optional().nullable(),
      sentido_via: z.string().optional().nullable(),
      ponto_referencia: z.string().optional().nullable(),
      fotos: z.array(z.string()).optional().default([]),
    })
  ),
  arquivoKitUrl: z.string().optional().nullable(),
  arquivoKitNome: z.string().optional().nullable(),
});

export const salvarProdutosExtraidosMidiaKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SalvarProdutosSchema.parse(d))
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
          contato_nome: data.novoParceiro.contato_nome?.trim() || null,
          contato_telefone: data.novoParceiro.contato_telefone?.trim() || null,
          contato_email: data.novoParceiro.contato_email?.trim() || null,
          cidade: data.novoParceiro.cidade?.trim() || null,
          uf: data.novoParceiro.uf?.trim() || null,
          endereco: data.novoParceiro.endereco?.trim() || null,
          segmentos: data.novoParceiro.segmentos || ["DOOH", "Mídia Exterior"],
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
        } else if (errCria) {
          console.error("Erro ao cadastrar novo parceiro:", errCria);
        }
      } else if (targetParceiroId && data.novoParceiro.cnpj) {
        // Se já existia parceiro, mas CNPJ foi completado agora
        await supabase
          .from("parceiros")
          .update({
            cnpj: data.novoParceiro.cnpj.trim(),
            ...(data.novoParceiro.contato_telefone ? { contato_telefone: data.novoParceiro.contato_telefone.trim() } : {}),
            ...(data.novoParceiro.contato_email ? { contato_email: data.novoParceiro.contato_email.trim() } : {}),
          })
          .eq("id", targetParceiroId);
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
    const erros: string[] = [];

    // 3.1 Registrar novos tipos/particularidades em produto_tipos caso ainda não existam no catálogo
    const uniqueTipos = new Map<string, { nome: string; midia: string }>();
    for (const prod of data.produtos) {
      if (prod.tipo && prod.tipo.trim() && prod.midia) {
        const key = `${prod.midia}:${prod.tipo.trim().toLowerCase()}`;
        if (!uniqueTipos.has(key)) {
          uniqueTipos.set(key, { nome: prod.tipo.trim(), midia: prod.midia });
        }
      }
    }
    for (const item of uniqueTipos.values()) {
      try {
        const tipoPayload: any = {
          nome: item.nome,
          midia: item.midia,
          created_by: userId,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        };
        const { error: insTipoErr } = await supabase.from("produto_tipos").insert(tipoPayload);
        if (insTipoErr && insTipoErr.message.toLowerCase().includes("tenant_id")) {
          delete tipoPayload.tenant_id;
          await supabase.from("produto_tipos").insert(tipoPayload);
        }
      } catch {
        // Ignora duplicidade
      }
    }

    // 3.2 Se temos parceiro vinculado, adiciona novos segmentos/particularidades ao cadastro do parceiro
    if (targetParceiroId) {
      try {
        const { data: parcAtual } = await supabase
          .from("parceiros")
          .select("segmentos")
          .eq("id", targetParceiroId)
          .maybeSingle();

        const segmentosSet = new Set<string>(parcAtual?.segmentos || []);
        let houveMudanca = false;

        for (const prod of data.produtos) {
          if (prod.tipo && !segmentosSet.has(prod.tipo.trim())) {
            segmentosSet.add(prod.tipo.trim());
            houveMudanca = true;
          }
          if (prod.midia && !segmentosSet.has(prod.midia.trim())) {
            segmentosSet.add(prod.midia.trim());
            houveMudanca = true;
          }
        }

        if (houveMudanca) {
          await supabase
            .from("parceiros")
            .update({ segmentos: Array.from(segmentosSet).slice(0, 25) })
            .eq("id", targetParceiroId);
        }
      } catch (err: any) {
        console.warn("Aviso ao sincronizar segmentos do parceiro:", err?.message);
      }
    }

    // 4. Cadastrar cada produto vinculado ao parceiro
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

      const payload: any = {
        nome: prod.nome,
        midia: prod.midia || (isOff ? "DOOH" : "TV"),
        canal_macro: prod.canal_macro || (isOff ? "OFF" : "ON"),
        plataforma_rede: prod.plataforma_rede || null,
        tipo: prod.tipo || (isOff ? "Painel LED" : "Comercial"),
        programa: prod.programa || null,
        faixa: prod.faixa || null,
        duracao_segundos: prod.duracao_segundos || (isOff ? 10 : 30),
        insercoes_padrao: prod.insercoes_padrao || 1,
        valor_unit: prod.valor_unit || 0,
        formato: prod.formato || null,
        latitude: prod.latitude != null ? prod.latitude : null,
        longitude: prod.longitude != null ? prod.longitude : null,
        link_maps: prod.link_maps || null,
        sentido_via: prod.sentido_via || null,
        ponto_referencia: prod.ponto_referencia || null,
        detalhes_venda: JSON.stringify(metaObj),
        observacao: prod.observacao || `Importado via Mídia Kit / Planilha em ${new Date().toLocaleDateString("pt-BR")}`,
        parceiro_id: targetParceiroId,
        parceiro_nome: parceiroNome || null,
        parceiro_cnpj: parceiroCnpj || null,
        ativo: true,
        fotos: Array.isArray(prod.fotos) ? prod.fotos.slice(0, 4) : [],
        created_by: userId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      };

      const { error: insErr } = await supabase.from("produtos").insert(payload);
      if (insErr) {
        // Fallback resiliente caso alguma coluna não exista
        if (
          insErr.message.toLowerCase().includes("parceiro") ||
          insErr.message.toLowerCase().includes("foto") ||
          insErr.message.toLowerCase().includes("tenant_id") ||
          insErr.message.toLowerCase().includes("canal_macro") ||
          insErr.message.toLowerCase().includes("plataforma") ||
          insErr.message.toLowerCase().includes("link_maps") ||
          insErr.message.toLowerCase().includes("sentido_via") ||
          insErr.message.toLowerCase().includes("ponto_referencia")
        ) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.parceiro_cnpj;
          delete fallbackPayload.parceiro_nome;
          delete fallbackPayload.canal_macro;
          delete fallbackPayload.plataforma_rede;
          delete fallbackPayload.link_maps;
          delete fallbackPayload.sentido_via;
          delete fallbackPayload.ponto_referencia;
          const { error: retryErr } = await supabase.from("produtos").insert(fallbackPayload);
          if (!retryErr) {
            cadastrados++;
            continue;
          }
        }
        erros.push(`${prod.nome}: ${insErr.message}`);
      } else {
        cadastrados++;
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
      erros,
      parceiroNome: parceiroNome || "Inventário Próprio",
      parceiroId: targetParceiroId,
      total: data.produtos.length,
    };
  });

