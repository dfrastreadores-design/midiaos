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
Sua missão é extrair rigorosamente todos os produtos, cotas de patrocínio, formatos comerciais e espaços de mídia apresentados no material do parceiro.

Regras de Extração:
1. Identifique cada espaço/produto como um item independente na lista de "produtos".
2. Para cada produto, defina:
   - "nome": Nome claro do produto ou programa/espaço (ex.: "Jornal do Meio-Dia - Cota Master", "Spot 30s Rotativo Comercial", "Painel LED Eixo Monumental", "Banner Super Topo 728x90").
   - "midia": Um dos valores padrão: "TV", "Radio", "DOOH", "Digital", "OOH", "Impresso" ou "Outro".
   - "tipo": Formato comercial (ex: "VT 30s", "Spot 30s", "Banner", "Merchandising", "Cota Ouro", "Testemunhal").
   - "programa": Nome do programa, veículo ou canal associado.
   - "faixa": Faixa horária, periodicidade ou localização física (ex: "12:00 às 13:30", "Rotativo das 06h às 19h", "Avenida Principal - Semáforo 3").
   - "duracao_segundos": Duração em segundos se aplicável (30 por padrão para rádio/TV/spots, 10 para DOOH, 0 para banners).
   - "insercoes_padrao": 1 por padrão.
   - "valor_unit": Preço de tabela ou valor unitário (se for pacote mensal, informe o valor mensal). Apenas números decimais positivos (ex: 4500.00). Nunca retorne 0 se houver preço na tabela.
   - "formato": Resolução ou dimensões (ex: "1920x1080", "Spot Áudio", "300x250").
   - "detalhes_venda": Breve defesa com dados de audiência, público-alvo, alcance, visualizações ou impactos mencionados no mídia kit.
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
      "tipo": string,
      "programa": string,
      "faixa": string,
      "duracao_segundos": number,
      "insercoes_padrao": number,
      "valor_unit": number,
      "formato": string,
      "detalhes_venda": string
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

          const produtos: ProdutoExtraidoMidiaKit[] = rawProds.map((p, idx) => ({
            id_temp: `temp-${Date.now()}-${idx}`,
            nome: String(p.nome || `Produto ${idx + 1}`).trim(),
            midia: String(p.midia || "Digital").trim(),
            tipo: p.tipo ? String(p.tipo).trim() : "Comercial",
            programa: p.programa ? String(p.programa).trim() : undefined,
            faixa: p.faixa ? String(p.faixa).trim() : undefined,
            duracao_segundos: Number(p.duracao_segundos) || 30,
            insercoes_padrao: Number(p.insercoes_padrao) || 1,
            valor_unit: Number(p.valor_unit) || 0,
            formato: p.formato ? String(p.formato).trim() : undefined,
            detalhes_venda: p.detalhes_venda ? String(p.detalhes_venda).trim() : undefined,
            selecionado: true,
            fotos: [],
          }));

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
      if (matchPreco || linha.length > 5 && linha.length < 80) {
        const valor = matchPreco ? Number(matchPreco[1].replace(/\./g, "").replace(",", ".")) : 0;
        const midiaDetectada = /rádio|fm|som|spot/i.test(linha)
          ? "Radio"
          : /led|painel|totem|dooh/i.test(linha)
          ? "DOOH"
          : /portal|banner|site|digital|stories/i.test(linha)
          ? "Digital"
          : "TV";

        if (linha.length >= 4 && !linha.startsWith("http") && !linha.includes("@")) {
          produtosFallback.push({
            id_temp: `temp-${Date.now()}-${i}`,
            nome: linha.replace(/R\$.*$/, "").trim() || `Produto ${produtosFallback.length + 1}`,
            midia: midiaDetectada,
            tipo: "Inserção Comercial",
            duracao_segundos: 30,
            insercoes_padrao: 1,
            valor_unit: valor,
            detalhes_venda: linhas[i + 1] ? linhas[i + 1].slice(0, 150) : undefined,
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
      tipo: z.string().optional().nullable(),
      programa: z.string().optional().nullable(),
      faixa: z.string().optional().nullable(),
      duracao_segundos: z.number().optional().nullable(),
      insercoes_padrao: z.number().optional().nullable(),
      valor_unit: z.number(),
      formato: z.string().optional().nullable(),
      detalhes_venda: z.string().optional().nullable(),
      observacao: z.string().optional().nullable(),
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
      const payload: any = {
        nome: prod.nome,
        midia: prod.midia || "TV",
        tipo: prod.tipo || "Comercial",
        programa: prod.programa || null,
        faixa: prod.faixa || null,
        duracao_segundos: prod.duracao_segundos || 30,
        insercoes_padrao: prod.insercoes_padrao || 1,
        valor_unit: prod.valor_unit || 0,
        formato: prod.formato || null,
        detalhes_venda: prod.detalhes_venda || null,
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
        // Tenta fallback sem colunas que possam não existir em ambientes legados
        if (
          insErr.message.toLowerCase().includes("parceiro") ||
          insErr.message.toLowerCase().includes("foto") ||
          insErr.message.toLowerCase().includes("tenant_id")
        ) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.parceiro_cnpj;
          delete fallbackPayload.parceiro_nome;
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
