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
  texto: z.string().min(10).max(300000),
  tabelaPrecosTexto: z.string().optional().nullable(),
  parceiroNome: z.string().optional().nullable(),
});

export const extrairProdutosDeMidiaKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExtrairInputSchema.parse(d))
  .handler(async ({ data }) => {
    const key =
      process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    const systemPrompt = `Você é um especialista em Mídia Kits, tabelas de preços e apresentações comerciais de veículos de comunicação (TV, Rádio, Painéis de LED/DOOH, Portais de Notícias, Mídia OOH, Mídia Impressa e Digital).
Sua missão é extrair rigorosamente todos os produtos, cotas de patrocínio, formatos comerciais e espaços de mídia apresentados no material do parceiro, com suporte nativo a GEOLOCALIZAÇÃO para mídia exterior (OOH/DOOH).

Regras de Extração:
1. Identifique cada espaço/produto como um item independente na lista de "produtos".
2. Para cada produto, defina:
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
3. Se houver Tabela de Preços complementar, cruze os nomes dos produtos com os valores da tabela.
4. Retorne APENAS um objeto JSON válido no formato especificado, sem formatação markdown ao redor.`;

    const userPrompt = `Material do Parceiro ${data.parceiroNome ? `(${data.parceiroNome})` : ""}:
--- CONTEÚDO DO MÍDIA KIT / APRESENTAÇÃO ---
${data.texto}

${data.tabelaPrecosTexto ? `--- TABELA DE PREÇOS / TARIFÁRIO ---\n${data.tabelaPrecosTexto}` : ""}

Retorne JSON no formato:
{
  "parceiro_identificado": string,
  "resumo_apresentacao": string,
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
            model: isLovable ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash",
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
          const parsed = JSON.parse(content);
          const rawProds: any[] = Array.isArray(parsed.produtos) ? parsed.produtos : [];

          const produtos: ProdutoExtraidoMidiaKit[] = rawProds.map((p, idx) => {
            const fullContext = `${p.nome || ""} ${p.faixa || ""} ${p.detalhes_venda || ""} ${p.ponto_referencia || ""}`;
            const geoExtracted = extrairCoordenadasDeTextoOuUrl(p.link_maps || fullContext);
            const rotaExtracted = extrairRotaEReferencia(fullContext);

            const isOff = ["DOOH", "OOH", "TV", "Radio", "Impresso"].includes(p.midia) ||
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

          return {
            sucesso: true,
            parceiroIdentificado: parsed.parceiro_identificado || data.parceiroNome || "",
            resumoApresentacao: parsed.resumo_apresentacao || "",
            produtos,
          };
        }
      } catch (err) {
        console.warn("Falha na chamada de IA para Mídia Kit, usando extrator semântico:", err);
      }
    }

    // Fallback: extração semântica com Expressões Regulares se a IA estiver sem créditos
    const linhas = data.texto.split("\n").map((l) => l.trim()).filter(Boolean);
    const produtosFallback: ProdutoExtraidoMidiaKit[] = [];

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      // Procura padrões de preço (ex: R$ 1.500,00 ou 1500,00)
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
          if (produtosFallback.length >= 25) break;
        }
      }
    }

    return {
      sucesso: true,
      parceiroIdentificado: data.parceiroNome || "",
      resumoApresentacao: "Extração textual concluída.",
      produtos: produtosFallback,
    };
  });

const SalvarProdutosSchema = z.object({
  parceiroId: z.string().uuid(),
  parceiroNome: z.string().optional().nullable(),
  parceiroCnpj: z.string().optional().nullable(),
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

    // 2. Buscar dados do parceiro se não informados
    let parceiroNome = data.parceiroNome;
    let parceiroCnpj = data.parceiroCnpj;
    if (!parceiroNome || !parceiroCnpj) {
      const { data: parc } = await supabase
        .from("parceiros")
        .select("nome_fantasia, razao_social, cnpj")
        .eq("id", data.parceiroId)
        .maybeSingle();
      if (parc) {
        parceiroNome = parc.nome_fantasia || parc.razao_social;
        parceiroCnpj = parc.cnpj;
      }
    }

    let cadastrados = 0;
    const erros: string[] = [];

    // 3. Cadastrar cada produto vinculado ao parceiro
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
        observacao: prod.observacao || `Importado via Mídia Kit IA em ${new Date().toLocaleDateString("pt-BR")}`,
        parceiro_id: data.parceiroId,
        parceiro_nome: parceiroNome || null,
        parceiro_cnpj: parceiroCnpj || null,
        ativo: true,
        fotos: Array.isArray(prod.fotos) ? prod.fotos.slice(0, 2) : [],
        created_by: userId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      };

      const { error: insErr } = await supabase.from("produtos").insert(payload);
      if (insErr) {
        // Tenta fallback sem colunas que possam não existir em ambientes com migrações pendentes
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

    // 4. Se houver anexo do Mídia Kit / Apresentação, registrar no histórico de anexos do parceiro
    if (data.arquivoKitUrl && data.arquivoKitNome) {
      try {
        await supabase.from("parceiro_anexos").insert({
          parceiro_id: data.parceiroId,
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
      total: data.produtos.length,
    };
  });
