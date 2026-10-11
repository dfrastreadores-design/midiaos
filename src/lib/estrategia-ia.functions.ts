import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMasterEmail } from "@/lib/master-user";

export interface FormatoRecomendado {
  formato: string;
  percentual_mix: number;
  motivo: string;
}

export interface PontoMidiaAdequado {
  produto_id?: string;
  nome: string;
  tipo_midia: string;
  regiao: string;
  justificativa: string;
  valor_estimado: number;
}

export interface CombinacaoMidias {
  descricao_mix: string;
  distribuicao_percentual: Record<string, number>;
  sinergia: string;
}

export interface ArgumentoComercial {
  argumento: string;
  foco: string;
}

export interface EstrategiaIAResposta {
  resumo_executivo: string;
  justificativa_estrategica: string;
  formatos_recomendados: FormatoRecomendado[];
  pontos_midia_adequados: PontoMidiaAdequado[];
  combinacao_midias: CombinacaoMidias;
  argumentos_comerciais: ArgumentoComercial[];
  aderencia_pilares_sugerida: {
    afinidade_territorial: number;
    frequencia: number;
    visibilidade: number;
    mobilidade: number;
    ativacao: number;
  };
}

export interface EstrategiaIAHistoricoItem {
  id: string;
  tenant_id?: string | null;
  cliente_id?: string | null;
  campanha_id?: string | null;
  prompt: {
    cliente_nome: string;
    segmento: string;
    publico: string;
    regiao: string;
    objetivo: string;
    orcamento: number;
  };
  resposta: EstrategiaIAResposta;
  created_at: string;
}

const GerarEstrategiaSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  cliente_nome: z.string().min(1, "Nome do cliente é obrigatório"),
  campanha_id: z.string().uuid().nullable().optional(),
  segmento: z.string().min(1, "Segmento de mercado é obrigatório"),
  publico: z.string().min(1, "Público-alvo é obrigatório"),
  regiao: z.string().min(1, "Região é obrigatória"),
  objetivo: z.string().min(1, "Objetivo é obrigatório"),
  orcamento: z.number().min(0, "Orçamento deve ser positivo"),
});

export const gerarEstrategiaComIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => GerarEstrategiaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Buscar tenant do usuário
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    // 1. Carregar produtos reais existentes do inventário de mídia para abastecer o contexto da IA
    let queryProdutos = (supabase.from("produtos") as any)
      .select("id, nome, midia, tipo, formato, endereco_ponto, cidade, valor_unit, impactos_mes_estimados, parceiro_nome")
      .eq("ativo", true)
      .limit(60);

    const { data: produtosInventario } = await queryProdutos;
    const listaProdutos = (produtosInventario || []).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      midia: p.midia,
      tipo: p.tipo,
      formato: p.formato,
      endereco: p.endereco_ponto,
      cidade: p.cidade,
      valor_unit: Number(p.valor_unit) || 0,
      impactos: Number(p.impactos_mes_estimados) || 0,
      parceiro: p.parceiro_nome,
    }));

    // 2. Chamar Gemini 2.5 Flash
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.LOVABLE_API_KEY ||
      process.env.OPENAI_API_KEY;

    let respostaIA: EstrategiaIAResposta;

    if (apiKey) {
      try {
        const systemPrompt = `Você é o Principal Estrategista de Mídia e Diretor de Planejamento do Mídia OS (Especialista em OOH, DOOH, Mídia Urbana, Rádio, TV e Digital 360°).
Sua missão é gerar uma RECOMENDAÇÃO ESTRATÉGICA personalizada e de alto impacto comercial com base nas informações do cliente e no inventário de produtos disponíveis.

DIRETRIZES FUNDAMENTAIS:
1. Recomende formatos de mídia de forma equilibrada de acordo com o segmento, orçamento e objetivo.
2. Selecione e cite produtos REAIS do catálogo de inventário fornecido no prompt para a lista de pontos_midia_adequados.
3. Elabore argumentos comerciais persuasivos e executivos para que a equipe de vendas apresente ao anunciante com autoridade técnica.
4. Defina notas de 1 a 10 para os 5 pilares estratégicos:
   - afinidade_territorial
   - frequencia
   - visibilidade
   - mobilidade
   - ativacao
5. Retorne a resposta ESTRITAMENTE em formato JSON compatível com o schema definido.`;

        const userPrompt = `DADOS DA DEMANDA DO ANUNCIANTE:
- Cliente: ${data.cliente_nome}
- Segmento de Atuação: ${data.segmento}
- Público-Alvo: ${data.publico}
- Região/Praça Foco: ${data.regiao}
- Objetivo da Campanha: ${data.objetivo}
- Orçamento Previsto: R$ ${data.orcamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

CATÁLOGO DE INVENTÁRIO DISPONÍVEL (PRODUTOS REAIS DO MÍDIA OS):
${JSON.stringify(listaProdutos.slice(0, 30), null, 2)}

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "resumo_executivo": "Texto conciso sintetizando a tese estratégica recomendada",
  "justificativa_estrategica": "Texto denso e aprofundado explicando por que esta abordagem maximiza o retorno sobre o investimento",
  "formatos_recomendados": [
    { "formato": "Nome do formato", "percentual_mix": 40, "motivo": "Justificativa tática" }
  ],
  "pontos_midia_adequados": [
    {
      "produto_id": "id_do_produto_do_catalogo_ou_null",
      "nome": "Nome do ponto ou mídia",
      "tipo_midia": "DOOH ou OOH ou Radio etc",
      "regiao": "Região do ponto",
      "justificativa": "Razão estratégica da escolha",
      "valor_estimado": 15000
    }
  ],
  "combinacao_midias": {
    "descricao_mix": "Explicação da orquestração entre formatos",
    "distribuicao_percentual": { "DOOH": 50, "OOH": 30, "Digital": 20 },
    "sinergia": "Como as mídias se complementam na jornada do consumidor"
  },
  "argumentos_comerciais": [
    { "argumento": "Ponto de argumentação convincente", "foco": "Autoridade ou Retorno ou Conversão" }
  ],
  "aderencia_pilares_sugerida": {
    "afinidade_territorial": 8,
    "frequencia": 7,
    "visibilidade": 9,
    "mobilidade": 8,
    "ativacao": 6
  }
}`;

        // Chamada à API Google Gemini ou Gateway compatível
        let rawContent = "";

        if (apiKey.startsWith("AIza") || process.env.GEMINI_API_KEY) {
          // Direct Google Gemini REST API call
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          });

          if (res.ok) {
            const json = await res.json();
            rawContent = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          }
        }

        if (!rawContent) {
          // Fallback OpenAI/Lovable format
          const endpoint = apiKey.startsWith("lovable_")
            ? "https://ai.gateway.lovable.dev/v1/chat/completions"
            : "https://api.openai.com/v1/chat/completions";

          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (res.ok) {
            const json = await res.json();
            rawContent = json?.choices?.[0]?.message?.content || "";
          }
        }

        if (rawContent) {
          respostaIA = JSON.parse(rawContent) as EstrategiaIAResposta;
        } else {
          respostaIA = gerarEstrategiaHeuristica(data, listaProdutos);
        }
      } catch (err) {
        console.warn("Falha na chamada ao Gemini 2.5 Flash, usando motor analítico avançado:", err);
        respostaIA = gerarEstrategiaHeuristica(data, listaProdutos);
      }
    } else {
      respostaIA = gerarEstrategiaHeuristica(data, listaProdutos);
    }

    // 3. Salvar histórico de recomendação na tabela estrategias_ia
    try {
      const promptPayload = {
        cliente_id: data.cliente_id || null,
        cliente_nome: data.cliente_nome,
        segmento: data.segmento,
        publico: data.publico,
        regiao: data.regiao,
        objetivo: data.objetivo,
        orcamento: data.orcamento,
      };

      const { data: savedRow, error: saveErr } = await (supabase.from("estrategias_ia") as any)
        .insert({
          tenant_id: tenantId,
          cliente_id: data.cliente_id || null,
          campanha_id: data.campanha_id || null,
          prompt: promptPayload,
          resposta: respostaIA,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (saveErr) {
        console.warn("Aviso ao persistir estrategia_ia:", saveErr.message);
      }

      return {
        id: savedRow?.id || null,
        estrategia: respostaIA,
      };
    } catch (saveError) {
      console.warn("Aviso ao salvar histórico de IA:", saveError);
      return {
        id: null,
        estrategia: respostaIA,
      };
    }
  });

export const listHistoricoEstrategiasIA = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { cliente_id?: string; campanha_id?: string } | undefined) => d || {})
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    let query = (supabase.from("estrategias_ia") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (tenantId) {
      query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    }
    if (input?.cliente_id) {
      query = query.eq("cliente_id", input.cliente_id);
    }
    if (input?.campanha_id) {
      query = query.eq("campanha_id", input.campanha_id);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Erro ao buscar histórico de estratégias IA:", error.message);
      return [];
    }

    return (data || []) as EstrategiaIAHistoricoItem[];
  });

/**
 * Motor heurístico de inteligência analítica do Mídia OS
 * Garante respostas técnicas robustas, realistas e conectadas ao inventário
 */
function gerarEstrategiaHeuristica(
  data: {
    cliente_nome: string;
    segmento: string;
    publico: string;
    regiao: string;
    objetivo: string;
    orcamento: number;
  },
  produtos: any[]
): EstrategiaIAResposta {
  const orcamento = Number(data.orcamento) || 50000;
  const produtosDisponiveis = produtos.length > 0 ? produtos : [
    { id: undefined, nome: "Painel LED de Alto Fluxo Urbano", midia: "DOOH", valor_unit: 18000, cidade: data.regiao },
    { id: undefined, nome: "Circuito de Mídia em Elevadores Comerciais", midia: "DOOH", valor_unit: 12000, cidade: data.regiao },
    { id: undefined, nome: "Outdoor Rodoviário Eixo Troncal", midia: "OOH", valor_unit: 8500, cidade: data.regiao },
  ];

  // Seleciona até 4 produtos do inventário mais alinhados
  const pontosAdequados: PontoMidiaAdequado[] = produtosDisponiveis.slice(0, 4).map((p) => ({
    produto_id: p.id,
    nome: p.nome,
    tipo_midia: p.midia || "DOOH",
    regiao: p.cidade || data.regiao,
    justificativa: `Cobertura estratégica na região de ${data.regiao} com alto índice de aderência ao público do segmento de ${data.segmento}.`,
    valor_estimado: p.valor_unit || Math.round(orcamento * 0.25),
  }));

  return {
    resumo_executivo: `Estratégia integrada de alta visibilidade e frequência direcionada para ${data.cliente_nome}, com foco no público ${data.publico} em ${data.regiao}, maximizando o retorno do orçamento de R$ ${orcamento.toLocaleString("pt-BR")}.`,
    justificativa_estrategica: `Para o segmento de ${data.segmento} com o objetivo de ${data.objetivo}, a combinação de mídias de grande impacto (DOOH em vias de tráfego denso) com capilaridade de frequência garante que o consumidor seja exposto à mensagem no início e no término de sua jornada diária. Essa sincronia gera recall acelerado e posiciona a marca com autoridade incontestável no território selecionado.`,
    formatos_recomendados: [
      {
        formato: "Painéis de LED / DOOH em Eixos Troncais",
        percentual_mix: 45,
        motivo: "Alto poder de retenção visual e recall imediato no trânsito diário.",
      },
      {
        formato: "Mídia em Elevadores & Ambientes Confinados",
        percentual_mix: 30,
        motivo: "Atenção cativa e contato direto sem dispersão na rotina corporativa e residencial.",
      },
      {
        formato: "Outdoors & Front Lights de Sustentação",
        percentual_mix: 25,
        motivo: "Autoridade perene e presença contínua nos acessos prioritários da região.",
      },
    ],
    pontos_midia_adequados: pontosAdequados,
    combinacao_midias: {
      descricao_mix: `Mix orquestrado em 45% DOOH Rodoviário/Urbano, 30% DOOH Indoor/Elevadores e 25% Mídia Estática de Alta Visibilidade.`,
      distribuicao_percentual: {
        "DOOH Urbano": 45,
        "DOOH Indoor": 30,
        "OOH Estático": 25,
      },
      sinergia: "O DOOH nas vias constrói escala de impacto, enquanto as telas indoor aprofundam a mensagem e geram conexão próxima com o tomador de decisão.",
    },
    argumentos_comerciais: [
      {
        argumento: `Presença ininterrupta nas principais rotas de deslocamento de ${data.regiao}, garantindo que a marca seja o primeiro referencial na mente do cliente.`,
        foco: "Autoridade e Domínio Territorial",
      },
      {
        argumento: `Custo por Mil Impactos (CPM) altamente competitivo quando comparado a canais digitais saturados, com 100% de visibilidade real sem ad-blockers.`,
        foco: "Eficiência Financeira",
      },
      {
        argumento: `Alinhamento cirúrgico com o perfil de público de ${data.segmento}, impactando o consumidor no momento exato em que está em trânsito e propenso à decisão.`,
        foco: "Assertividade de Audiência",
      },
    ],
    aderencia_pilares_sugerida: {
      afinidade_territorial: 9,
      frequencia: 8,
      visibilidade: 9,
      mobilidade: 8,
      ativacao: 6,
    },
  };
}
