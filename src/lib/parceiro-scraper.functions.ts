import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatCNPJ, onlyDigits } from "@/lib/cnpj";

export type DadosEnriquecidosParceiro = {
  sucesso: boolean;
  nome_fantasia?: string;
  razao_social?: string;
  cnpj?: string;
  descricao?: string;
  site?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  logo_url?: string;
  segmentos: string[];
  particularidades: string[];
  produtosDetectados: Array<{
    nome: string;
    midia: string;
    tipo: string;
    formato?: string;
    duracao_segundos?: number;
    insercoes_padrao?: number;
    valor_unit?: number;
    detalhes_venda?: string;
    particularidades?: string[];
  }>;
};

const ScraperInputSchema = z.object({
  siteUrl: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  nomeParceiro: z.string().optional().nullable(),
});

function normalizarUrl(input?: string | null): string | null {
  if (!input) return null;
  let str = input.trim();
  if (!str) return null;
  if (!str.startsWith("http://") && !str.startsWith("https://")) {
    str = `https://${str}`;
  }
  return str;
}

function normalizarInstagram(input?: string | null): string | null {
  if (!input) return null;
  let str = input.trim();
  if (!str) return null;
  if (str.startsWith("@")) {
    return str;
  }
  const match = str.match(/(?:instagram\.com\/)([a-zA-Z0-9._]+)/i);
  if (match) {
    return `@${match[1]}`;
  }
  return str.startsWith("http") ? str : `@${str.replace(/[^a-zA-Z0-9._]/g, "")}`;
}

export const enriquecerParceiroPorUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ScraperInputSchema.parse(d))
  .handler(async ({ data }) => {
    const siteUrl = normalizarUrl(data.siteUrl);
    const instagramHandle = normalizarInstagram(data.instagram);
    const nomeBase = data.nomeParceiro?.trim() || "";

    let htmlContent = "";
    let pageTitle = "";
    let metaDesc = "";
    let ogImage = "";
    let ogSiteName = "";
    let textSnippets = "";

    const telefonesEncontrados = new Set<string>();
    const emailsEncontrados = new Set<string>();
    const redesEncontradas: { instagram?: string; linkedin?: string; facebook?: string } = {};
    let cnpjEncontrado: string | undefined;

    // 1. Coleta dados do Website se URL fornecida
    if (siteUrl) {
      try {
        const ac = new AbortController();
        const timeout = setTimeout(() => ac.abort(), 12000);
        const res = await fetch(siteUrl, {
          signal: ac.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MidiaOS-Bot/1.0",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });
        clearTimeout(timeout);

        if (res.ok) {
          htmlContent = await res.text();

          // Title
          const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) pageTitle = titleMatch[1].trim();

          // Meta description
          const descMatch =
            htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
            htmlContent.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
          if (descMatch) metaDesc = descMatch[1].trim();

          // OpenGraph
          const ogImgMatch = htmlContent.match(
            /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
          );
          if (ogImgMatch) ogImage = ogImgMatch[1].trim();

          const ogSiteMatch = htmlContent.match(
            /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
          );
          if (ogSiteMatch) ogSiteName = ogSiteMatch[1].trim();

          // CNPJ no rodapé ou texto
          const cnpjMatch = htmlContent.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
          if (cnpjMatch) cnpjEncontrado = cnpjMatch[0];

          // Telefones e WhatsApp
          const waMatches = htmlContent.matchAll(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\d{10,13})/g);
          for (const m of waMatches) {
            telefonesEncontrados.add(m[1]);
          }
          const telMatches = htmlContent.matchAll(
            /(?:(?:whatsapp|contato|fone|tel|celular)[:\s]*)?\(?\b([1-9]{2})\)?\s*(9?\d{4})[-.\s]?(\d{4})\b/gi,
          );
          for (const m of telMatches) {
            telefonesEncontrados.add(`(${m[1]}) ${m[2]}-${m[3]}`);
          }

          // E-mails
          const emailMatches = htmlContent.matchAll(
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
          );
          for (const m of emailMatches) {
            const em = m[0].toLowerCase();
            if (!em.includes("w3.org") && !em.includes("sentry") && !em.endsWith(".png") && !em.endsWith(".jpg")) {
              emailsEncontrados.add(em);
            }
          }

          // Redes Sociais
          const igMatch = htmlContent.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i);
          if (igMatch && !["p", "reel", "explore", "stories"].includes(igMatch[1])) {
            redesEncontradas.instagram = `@${igMatch[1]}`;
          }
          const liMatch = htmlContent.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9._-]+)/i);
          if (liMatch) redesEncontradas.linkedin = `linkedin.com/company/${liMatch[1]}`;
          const fbMatch = htmlContent.match(/https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]+)/i);
          if (fbMatch && !["sharer", "share"].includes(fbMatch[1])) {
            redesEncontradas.facebook = `facebook.com/${fbMatch[1]}`;
          }

          // Limpa HTML para extrair apenas texto relevante (títulos, parágrafos, listas)
          const cleanText = htmlContent
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
            .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          textSnippets = cleanText.slice(0, 14000);
        }
      } catch (err: any) {
        console.warn("[enriquecerParceiroPorUrl] Aviso ao consultar site:", err?.message);
      }
    }

    const key =
      process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    let aiResult: any = null;

    if (key && (textSnippets || pageTitle || nomeBase || instagramHandle)) {
      try {
        const isLovable = Boolean(process.env.LOVABLE_API_KEY);
        const url = isLovable
          ? "https://ai.gateway.lovable.dev/v1/chat/completions"
          : "https://openrouter.ai/api/v1/chat/completions";

        const systemPrompt = `Você é um analista especialista em inteligência de mídia comercial (TV, Rádio, Painéis de LED/DOOH, Mídia Exterior OOH, Telas em Transporte/Mobilidade, Elevadores e Digital).
Sua missão é extrair dados detalhados, particularidades comerciais e formatos de produtos a partir das informações coletadas do website e redes sociais do parceiro de mídia.

Atenção especial para particularidades de produto:
- Cada veículo tem diferenciais únicos (ex: "Telas de 10 polegadas no encosto de bancos em carros de aplicativo Uber/99 com 20 minutos de tempo de permanência", "Painel de LED de rua com resolução P3.9 e 720 inserções/dia", "Telas em elevadores corporativos com público classe A", "Front Light rodoviário com iluminação 24h").
- Identifique rigorosamente os segmentos e particularidades técnicas de cada formato.

Retorne APENAS um objeto JSON no formato:
{
  "nome_fantasia": string,
  "razao_social": string | null,
  "cnpj": string | null,
  "descricao": string,
  "cidade": string | null,
  "uf": string | null,
  "endereco": string | null,
  "telefone": string | null,
  "email": string | null,
  "segmentos": string[],
  "particularidades": string[],
  "produtos": [
    {
      "nome": string,
      "midia": "DOOH" | "TV" | "Radio" | "Digital" | "OOH" | "Impresso",
      "tipo": string,
      "formato": string | null,
      "duracao_segundos": number,
      "insercoes_padrao": number,
      "valor_unit": number,
      "detalhes_venda": string,
      "particularidades": string[]
    }
  ]
}`;

        const userPrompt = `Parceiro: ${nomeBase || ogSiteName || "Veículo de Mídia"}
Site: ${siteUrl || "Não informado"}
Instagram: ${instagramHandle || redesEncontradas.instagram || "Não informado"}
Título da Página: ${pageTitle}
Descrição Meta: ${metaDesc}
Telefones Detectados: ${Array.from(telefonesEncontrados).join(", ") || "Nenhum"}
E-mails Detectados: ${Array.from(emailsEncontrados).join(", ") || "Nenhum"}
CNPJ Detectado: ${cnpjEncontrado || "Nenhum"}

Conteúdo Textual do Site:
${textSnippets || "Sem conteúdo textual extraído."}`;

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
          aiResult = JSON.parse(content);
        }
      } catch (err: any) {
        console.warn("[enriquecerParceiroPorUrl] Falha na IA, usando dados extraídos:", err?.message);
      }
    }

    // Mescla dados da IA com pistas extraídas diretamente do HTML
    const telFinal =
      aiResult?.telefone || Array.from(telefonesEncontrados)[0] || undefined;
    const emailFinal =
      aiResult?.email || Array.from(emailsEncontrados)[0] || undefined;
    const cnpjFinal =
      aiResult?.cnpj || cnpjEncontrado ? formatCNPJ(aiResult?.cnpj || cnpjEncontrado) : undefined;
    const nomeFinal =
      aiResult?.nome_fantasia || ogSiteName || pageTitle.replace(/[-|].*$/, "").trim() || nomeBase;

    const segmentos = Array.isArray(aiResult?.segmentos) && aiResult.segmentos.length > 0
      ? aiResult.segmentos
      : ["DOOH", "Mídia Exterior"];

    const particularidades = Array.isArray(aiResult?.particularidades)
      ? aiResult.particularidades
      : [];

    const produtos = Array.isArray(aiResult?.produtos)
      ? aiResult.produtos.map((p: any) => ({
          nome: p.nome || "Espaço Comercial",
          midia: p.midia || "DOOH",
          tipo: p.tipo || "Inserção Comercial",
          formato: p.formato || null,
          duracao_segundos: Number(p.duracao_segundos) || 15,
          insercoes_padrao: Number(p.insercoes_padrao) || 1,
          valor_unit: Number(p.valor_unit) || 0,
          detalhes_venda: p.detalhes_venda || (p.particularidades ? p.particularidades.join("; ") : undefined),
          particularidades: p.particularidades || [],
        }))
      : [];

    return {
      sucesso: true,
      nome_fantasia: nomeFinal,
      razao_social: aiResult?.razao_social || undefined,
      cnpj: cnpjFinal,
      descricao: aiResult?.descricao || metaDesc || undefined,
      site: siteUrl || undefined,
      instagram: instagramHandle || redesEncontradas.instagram || undefined,
      linkedin: redesEncontradas.linkedin || aiResult?.linkedin || undefined,
      facebook: redesEncontradas.facebook || aiResult?.facebook || undefined,
      telefone: telFinal,
      email: emailFinal,
      cidade: aiResult?.cidade || undefined,
      uf: aiResult?.uf || undefined,
      endereco: aiResult?.endereco || undefined,
      logo_url: ogImage || undefined,
      segmentos,
      particularidades,
      produtosDetectados: produtos,
    } as DadosEnriquecidosParceiro;
  });
